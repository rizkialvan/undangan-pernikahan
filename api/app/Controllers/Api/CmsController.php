<?php

namespace App\Controllers\Api;

use App\Models\Comment;
use App\Models\Guest;
use App\Models\Invitation;
use App\Models\Like;
use App\Models\Media;
use App\Response\JsonResponse;
use App\Support\InvitationContent;
use Core\Auth\Auth;
use Core\Http\Request;
use Core\Http\Respond;
use Core\Routing\Controller;

class CmsController extends Controller
{
    private JsonResponse $json;

    public function __construct(JsonResponse $json)
    {
        $this->json = $json;
    }

    private function invitation(): Invitation
    {
        $userId = intval(Auth::id());

        $invitation = Invitation::where('user_id', $userId)->limit(1)->first();

        if (!$invitation->exist()) {
            $defaults = InvitationContent::defaults();
            $invitation = Invitation::create([
                'user_id' => $userId,
                'content_draft' => InvitationContent::encode($defaults),
                'content_published' => InvitationContent::encode($defaults),
                'version' => 1,
                'is_live' => true,
                'published_at' => now(),
            ]);
        }

        return $invitation;
    }

    private function responseContent(Invitation $invitation): array
    {
        $draft = InvitationContent::decode($invitation->content_draft);
        $published = InvitationContent::decode($invitation->content_published);

        return [
            'draft' => $draft,
            'published' => $published,
            'version' => intval($invitation->version),
            'is_live' => boolval($invitation->is_live),
            'published_at' => $invitation->published_at,
            'updated_at' => $invitation->updated_at,
            'has_changes' => InvitationContent::encode($draft) !== InvitationContent::encode($published),
        ];
    }

    public function content(): JsonResponse
    {
        return $this->json->successOK($this->responseContent($this->invitation()));
    }

    public function save(Request $request): JsonResponse
    {
        $raw = $request->getContent();

        if (strlen((string) $raw) > InvitationContent::MAX_JSON_BYTES) {
            return $this->json->errorBadRequest(['Konten terlalu besar.']);
        }

        $payload = json_decode((string) $raw, true);
        if (!is_array($payload) || !isset($payload['content']) || !is_array($payload['content'])) {
            return $this->json->errorBadRequest(['Format konten tidak valid.']);
        }

        $content = InvitationContent::normalize($payload['content']);
        $invitation = $this->invitation();
        $invitation->fill([
            'content_draft' => InvitationContent::encode($content),
            'is_live' => $content['settings']['is_live'],
        ])->save();

        return $this->json->successOK($this->responseContent($this->invitation()));
    }

    public function publish(): JsonResponse
    {
        $invitation = $this->invitation();
        $content = InvitationContent::decode($invitation->content_draft);

        $invitation->fill([
            'content_published' => InvitationContent::encode($content),
            'version' => intval($invitation->version) + 1,
            'is_live' => $content['settings']['is_live'],
            'published_at' => now(),
        ])->save();

        return $this->json->successOK($this->responseContent($this->invitation()));
    }

    public function revert(): JsonResponse
    {
        $invitation = $this->invitation();
        $published = InvitationContent::decode($invitation->content_published);

        $invitation->fill([
            'content_draft' => InvitationContent::encode($published),
        ])->save();

        return $this->json->successOK($this->responseContent($this->invitation()));
    }

    /**
     * Token preview draft (HMAC, 30 menit) supaya admin bisa lihat hasil
     * sebelum publish tanpa membocorkan draft ke publik.
     */
    public function previewToken(): JsonResponse
    {
        $exp = time() + 1800;
        $payload = Auth::id() . '.' . $exp;
        $signature = hash_hmac('sha256', $payload, (string) env('JWT_KEY'));

        return $this->json->successOK([
            'token' => $payload . '.' . $signature,
            'expires_in' => 1800,
        ]);
    }

    private function verifyPreview(?string $token): bool
    {
        if (!is_string($token) || substr_count($token, '.') !== 2) {
            return false;
        }

        [$userId, $exp, $signature] = explode('.', $token);

        if (intval($exp) < time()) {
            return false;
        }

        if (intval($userId) !== intval(Auth::id())) {
            return false;
        }

        $expected = hash_hmac('sha256', $userId . '.' . $exp, (string) env('JWT_KEY'));

        return hash_equals($expected, $signature);
    }

    /**
     * Endpoint publik (access key / JWT) yang dipakai halaman undangan.
     */
    public function publicContent(Request $request): JsonResponse
    {
        $invitation = $this->invitation();
        $preview = $this->verifyPreview($request->get('preview'));

        if ($preview) {
            return $this->json->successOK([
                'content' => InvitationContent::decode($invitation->content_draft),
                'version' => intval($invitation->version),
                'published_at' => $invitation->published_at,
                'is_live' => boolval($invitation->is_live),
                'preview' => true,
            ]);
        }

        if (!boolval($invitation->is_live)) {
            return $this->json->successOK([
                'content' => null,
                'version' => intval($invitation->version),
                'published_at' => $invitation->published_at,
                'is_live' => false,
                'preview' => false,
            ]);
        }

        return $this->json->successOK([
            'content' => InvitationContent::decode($invitation->content_published),
            'version' => intval($invitation->version),
            'published_at' => $invitation->published_at,
            'is_live' => true,
            'preview' => false,
        ]);
    }

    public function overview(): JsonResponse
    {
        $userId = intval(Auth::id());

        $presence = Comment::where('user_id', $userId)
            ->whereNull('parent_id')
            ->select([
                'SUM(CASE WHEN presence = TRUE THEN 1 ELSE 0 END) as present_count',
                'SUM(CASE WHEN presence = FALSE THEN 1 ELSE 0 END) as absent_count',
                'count(id) as total_count',
            ])
            ->first();

        $guestTotal = Guest::where('user_id', $userId)->count('id', 'total')->first();
        $guestOpened = Guest::where('user_id', $userId)->whereNotNull('opened_at')->count('id', 'total')->first();
        $mediaTotal = Media::where('user_id', $userId)->count('id', 'total')->first();
        $likeTotal = Like::where('user_id', $userId)->count('id', 'total')->first();

        $invitation = $this->invitation();
        $draft = InvitationContent::decode($invitation->content_draft);
        $published = InvitationContent::decode($invitation->content_published);

        return $this->json->successOK([
            'presence' => [
                'present' => intval($presence->present_count ?? 0),
                'absent' => intval($presence->absent_count ?? 0),
                'total' => intval($presence->total_count ?? 0),
            ],
            'guests' => intval($guestTotal->total ?? 0),
            'guest_open' => [
                'total' => intval($guestTotal->total ?? 0),
                'opened' => intval($guestOpened->total ?? 0),
                'pending' => max(0, intval($guestTotal->total ?? 0) - intval($guestOpened->total ?? 0)),
            ],
            'media' => intval($mediaTotal->total ?? 0),
            'likes' => intval($likeTotal->total ?? 0),
            'content' => [
                'version' => intval($invitation->version),
                'is_live' => boolval($invitation->is_live),
                'published_at' => $invitation->published_at,
                'updated_at' => $invitation->updated_at,
                'has_changes' => InvitationContent::encode($draft) !== InvitationContent::encode($published),
            ],
            'wedding' => [
                'date_iso' => $published['settings']['date_iso'] ?? null,
                'couple' => $published['meta']['couple_label'] ?? null,
                'gallery' => count($published['gallery'] ?? []),
                'story' => count($published['story']['items'] ?? []),
                'events' => count($published['events']['items'] ?? []),
            ],
            'recent' => $this->recentComments($userId),
        ]);
    }

    private function recentComments(int $userId): array
    {
        $rows = Comment::where('user_id', $userId)
            ->whereNull('parent_id')
            ->select(['uuid', 'name', 'presence', 'comment', 'created_at'])
            ->orderBy('id', 'DESC')
            ->limit(5)
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'uuid' => $row->uuid,
                'name' => $row->name,
                'presence' => boolval($row->presence),
                'comment' => $row->comment,
                'created_at' => $row->created_at,
            ];
        }

        return $out;
    }
}