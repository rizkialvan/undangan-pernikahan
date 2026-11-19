<?php

namespace App\Controllers\Api;

use App\Models\Comment;
use App\Models\Guest;
use App\Models\Invitation;
use App\Response\JsonResponse;
use App\Support\InvitationContent;
use Core\Auth\Auth;
use Core\Http\Request;
use Core\Http\Stream;
use Core\Routing\Controller;

class GuestController extends Controller
{
    private JsonResponse $json;

    public function __construct(JsonResponse $json)
    {
        $this->json = $json;
    }

    private function baseUrl(): string
    {
        $invitation = Invitation::where('user_id', intval(Auth::id()))->limit(1)->first();

        if ($invitation->exist()) {
            $content = InvitationContent::decode($invitation->content_published);
            $url = $content['meta']['url'] ?? '';
            if (is_string($url) && $url !== '') {
                return rtrim($url, '/');
            }
        }

        return rtrim(base_url(), '/');
    }

    private function link(string $name, string $slug): string
    {
        $key = (string) Auth::user()->access_key;

        return $this->baseUrl()
            . '/?to=' . rawurlencode($name)
            . '&g=' . rawurlencode($slug)
            . '&k=' . rawurlencode($key);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function rsvpMap(int $userId, array $guestIds): array
    {
        if ($guestIds === []) {
            return [];
        }

        $rows = Comment::where('user_id', $userId)
            ->whereIn('guest_id', $guestIds)
            ->select(['guest_id', 'presence', 'comment', 'created_at'])
            ->orderBy('id', 'DESC')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $gid = intval($row->guest_id);
            if (isset($map[$gid])) {
                continue;
            }
            $map[$gid] = [
                'presence' => boolval($row->presence),
                'message' => $row->comment,
                'at' => $row->created_at,
            ];
        }

        return $map;
    }

    private function slugify(string $name): string
    {
        $slug = strtolower($name);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-');

        if ($slug === '') {
            $slug = 'tamu';
        }

        return mb_substr($slug, 0, 48, 'UTF-8');
    }

    private function uniqueSlug(int $userId, string $base): string
    {
        $slug = $base;
        $i = 2;

        while (Guest::where('user_id', $userId)->where('slug', $slug)->limit(1)->first()->exist()) {
            $slug = $base . '-' . $i;
            $i++;
        }

        return $slug;
    }

    public function index(Request $request): JsonResponse
    {
        $userId = intval(Auth::id());
        $search = trim((string) $request->get('q', ''));
        $per = max(5, min(200, intval($request->get('per', 50))));
        $page = max(1, intval($request->get('page', 1)));

        $query = Guest::where('user_id', $userId);

        if ($search !== '') {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('name', $like, 'ILIKE')
                    ->where('category', $like, 'ILIKE', 'OR')
                    ->where('phone', $like, 'ILIKE', 'OR');
            });
        }

        $total = Guest::where('user_id', $userId)->count('id', 'total')->first();
        $rows = $query->orderBy('id', 'DESC')->limit($per)->offset(($page - 1) * $per)->get();

        $guests = [];
        $ids = [];
        foreach ($rows as $row) {
            $ids[] = intval($row->id);
            $guests[] = [
                'id' => intval($row->id),
                'slug' => $row->slug,
                'name' => $row->name,
                'phone' => $row->phone,
                'category' => $row->category,
                'note' => $row->note,
                'sent_at' => $row->sent_at,
                'created_at' => $row->created_at,
                'link' => $this->link($row->name, $row->slug),
            ];
        }

        $rsvp = $this->rsvpMap($userId, $ids);

        foreach ($guests as &$guest) {
            $data = $rsvp[$guest['id']] ?? null;
            $guest['rsvp'] = $data === null ? null : [
                'presence' => $data['presence'],
                'message' => $data['message'],
                'at' => $data['at'],
            ];
        }
        unset($guest);

        return $this->json->successOK([
            'items' => $guests,
            'total' => intval($total->total ?? 0),
            'page' => $page,
            'per' => $per,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $valid = $this->validate($request, [
            'name' => ['required', 'str', 'trim', 'min:2', 'max:120'],
            'phone' => ['nullable', 'str', 'trim', 'max:30'],
            'category' => ['nullable', 'str', 'trim', 'max:60'],
            'note' => ['nullable', 'str', 'trim', 'max:300'],
        ]);

        if ($valid->fails()) {
            return $this->json->errorBadRequest($valid->messages());
        }

        $userId = intval(Auth::id());
        $name = $valid->name;

        $guest = Guest::create([
            'user_id' => $userId,
            'slug' => $this->uniqueSlug($userId, $this->slugify($name)),
            'name' => $name,
            'phone' => $valid->phone,
            'category' => $valid->category,
            'note' => $valid->note,
        ]);

        return $this->json->success([
            'id' => intval($guest->id),
            'slug' => $guest->slug,
            'name' => $guest->name,
            'phone' => $guest->phone,
            'category' => $guest->category,
            'note' => $guest->note,
            'link' => $this->link($guest->name, $guest->slug),
            'rsvp' => null,
        ], 201);
    }

    public function update(string $id, Request $request): JsonResponse
    {
        $guest = Guest::where('id', intval($id))->where('user_id', intval(Auth::id()))->limit(1)->first();

        if (!$guest->exist()) {
            return $this->json->errorNotFound();
        }

        $valid = $this->validate($request, [
            'name' => ['required', 'str', 'trim', 'min:2', 'max:120'],
            'phone' => ['nullable', 'str', 'trim', 'max:30'],
            'category' => ['nullable', 'str', 'trim', 'max:60'],
            'note' => ['nullable', 'str', 'trim', 'max:300'],
        ]);

        if ($valid->fails()) {
            return $this->json->errorBadRequest($valid->messages());
        }

        $guest->fill([
            'name' => $valid->name,
            'phone' => $valid->phone,
            'category' => $valid->category,
            'note' => $valid->note,
        ])->save();

        return $this->json->successOK([
            'id' => intval($guest->id),
            'slug' => $guest->slug,
            'name' => $guest->name,
            'phone' => $guest->phone,
            'category' => $guest->category,
            'note' => $guest->note,
            'link' => $this->link($guest->name, $guest->slug),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $guest = Guest::where('id', intval($id))->where('user_id', intval(Auth::id()))->limit(1)->first();

        if (!$guest->exist()) {
            return $this->json->errorNotFound();
        }

        $guest->destroy();

        return $this->json->successStatusTrue();
    }

    public function markSent(string $id): JsonResponse
    {
        $guest = Guest::where('id', intval($id))->where('user_id', intval(Auth::id()))->limit(1)->first();

        if (!$guest->exist()) {
            return $this->json->errorNotFound();
        }

        $guest->fill(['sent_at' => now()])->save();

        return $this->json->successOK(['id' => intval($guest->id), 'sent_at' => $guest->sent_at]);
    }

    public function export(Stream $stream): Stream
    {
        $userId = intval(Auth::id());
        $rows = Guest::where('user_id', $userId)->orderBy('id')->get();

        $guests = [];
        $ids = [];
        foreach ($rows as $row) {
            $ids[] = intval($row->id);
            $guests[] = $row;
        }

        $rsvp = $this->rsvpMap($userId, $ids);

        $resource = $stream->getStream();

        fputcsv($resource, ['nama', 'kategori', 'whatsapp', 'catatan', 'link_undangan', 'status_rsvp', 'ucapan', 'waktu_rsvp']);

        foreach ($guests as $guest) {
            $data = $rsvp[intval($guest->id)] ?? null;

            fputcsv($resource, [
                $guest->name,
                $guest->category,
                $guest->phone,
                $guest->note,
                $this->link($guest->name, $guest->slug),
                $data === null ? 'belum' : ($data['presence'] ? 'hadir' : 'tidak hadir'),
                $data['message'] ?? '',
                $data['at'] ?? '',
            ]);
        }

        return $stream->create(sprintf('tamu_%s.csv', now('Y-m-d')))->download();
    }

    /**
     * Endpoint publik untuk menyimpan konfirmasi tamu ketika tamu membuka
     * link personal. Dipakai dari halaman undangan (access key), bukan admin.
     */
    public function track(Request $request): JsonResponse
    {
        $slug = trim((string) $request->get('g', ''));

        if ($slug === '') {
            return $this->json->errorBadRequest(['Parameter tamu tidak valid.']);
        }

        $guest = Guest::where('user_id', intval(Auth::id()))->where('slug', $slug)->limit(1)->first();

        if (!$guest->exist()) {
            return $this->json->errorNotFound();
        }

        return $this->json->successOK([
            'id' => intval($guest->id),
            'slug' => $guest->slug,
            'name' => $guest->name,
            'category' => $guest->category,
        ]);
    }
}