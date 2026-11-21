<?php

namespace App\Controllers\Api;

use App\Models\Guest;
use App\Models\Invitation;
use App\Models\WaMessage;
use App\Models\WaSession;
use App\Models\WaSetting;
use App\Response\JsonResponse;
use App\Support\InvitationContent;
use Core\Auth\Auth;
use Core\Http\Request;
use Core\Routing\Controller;

/**
 * Jembatan CMS ↔ gateway WhatsApp (Baileys).
 * Semua endpoint butuh JWT admin (DashboardMiddleware).
 * Gateway hanya bisa dihubungi dari network internal Docker.
 */
class WaController extends Controller
{
    private const DEFAULT_TEMPLATE = "Assalamualaikum {nama} 🤍\n\nTanpa mengurangi rasa hormat, kami mengundang {nama} untuk hadir di acara pernikahan kami.\n\nDetail acara, lokasi, dan RSVP:\n{link}\n\nMerupakan suatu kebahagiaan bagi kami apabila Bapak/Ibu/Saudara berkenan hadir.\n\nTerima kasih 🙏";

    private JsonResponse $json;

    public function __construct(JsonResponse $json)
    {
        $this->json = $json;
    }

    private function userId(): int
    {
        return intval(Auth::id());
    }

    private function baseUrl(): string
    {
        $invitation = Invitation::where('user_id', $this->userId())->limit(1)->first();

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
        $invitation = Invitation::where('user_id', intval(Auth::id()))->limit(1)->first();
        $public = $invitation->exist() ? (string) ($invitation->public_token ?? '') : '';

        $credential = $public !== ''
            ? '&t=' . rawurlencode($public)
            : '&k=' . rawurlencode((string) Auth::user()->access_key);

        $token = $this->shareToken();

        return $this->baseUrl()
            . '/?to=' . rawurlencode($name)
            . '&g=' . rawurlencode($slug)
            . $credential
            . ($token !== '' ? '&p=' . $token : '');
    }

    /**
     * Token pendek di link tamu. Berubah saat gambar share / konten di-publish
     * ulang, jadi crawler WhatsApp membuat preview baru alih-alih memakai
     * cache URL lama (yang bisa tersimpan tanpa gambar).
     */
    private function shareToken(): string
    {
        static $cached = null;

        if ($cached !== null) {
            return $cached;
        }

        $invitation = Invitation::where('user_id', $this->userId())->limit(1)->first();

        if (!$invitation->exist()) {
            return $cached = '';
        }

        $content = InvitationContent::decode($invitation->content_published);
        $raw = implode('|', [
            (string) ($content['meta']['og_image'] ?? ''),
            (string) ($content['cover']['photo'] ?? ''),
            (string) ($invitation->version ?? ''),
            (string) ($invitation->published_at ?? ''),
        ]);

        return $cached = substr(sha1($raw), 0, 8);
    }

    private function sessionRow(): WaSession
    {
        $row = WaSession::where('user_id', $this->userId())->where('name', 'default')->limit(1)->first();

        if (!$row->exist()) {
            $row = WaSession::create([
                'user_id' => $this->userId(),
                'name' => 'default',
                'status' => 'disconnected',
            ]);
        }

        return $row;
    }

    private function settingsRow(): WaSetting
    {
        $row = WaSetting::where('user_id', $this->userId())->limit(1)->first();

        if (!$row->exist()) {
            WaSetting::create([
                'user_id' => $this->userId(),
                'template' => self::DEFAULT_TEMPLATE,
            ]);

            $row = WaSetting::where('user_id', $this->userId())->limit(1)->first();
        }

        return $row;
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array<string, mixed>
     */
    private function gateway(string $method, string $path, array|null $body = null): array
    {
        $base = rtrim((string) env('WA_GATEWAY_URL', 'http://wa-gateway:8099'), '/');
        $token = (string) env('WA_TOKEN', '');

        if ($token === '') {
            return ['ok' => false, 'error' => 'WA_TOKEN belum diset di environment API'];
        }

        $ch = curl_init($base . $path);
        $headers = ['Content-Type: application/json', 'x-wa-token: ' . $token];

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $raw = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return ['ok' => false, 'error' => $error !== '' ? $error : 'gateway tidak merespons'];
        }

        $data = json_decode((string) $raw, true);

        return is_array($data) ? $data : ['ok' => false, 'error' => 'respons gateway tidak valid'];
    }

    private function countStatus(string $status): int
    {
        $row = WaMessage::where('user_id', $this->userId())
            ->where('status', $status)
            ->count('id', 'total')
            ->first();

        return intval($row->total ?? 0);
    }

    private function sentToday(): int
    {
        $row = WaMessage::where('user_id', $this->userId())
            ->where('status', 'sent')
            ->where('sent_at', date('Y-m-d') . ' 00:00:00', '>=')
            ->count('id', 'total')
            ->first();

        return intval($row->total ?? 0);
    }

    /** @return array<string, mixed> */
    private function settingsPayload(WaSetting $row): array
    {
        return [
            'template' => (string) ($row->template ?? self::DEFAULT_TEMPLATE),
            'delay_min' => intval($row->delay_min ?? 10),
            'delay_max' => intval($row->delay_max ?? 10),
            'daily_cap' => intval($row->daily_cap ?? 50),
            'hour_start' => intval($row->hour_start ?? 8),
            'hour_end' => intval($row->hour_end ?? 21),
            'paused' => boolval($row->paused ?? false),
        ];
    }

    public function status(): JsonResponse
    {
        $session = $this->sessionRow();
        $settings = $this->settingsPayload($this->settingsRow());

        $perDay = max(1, $settings['daily_cap']);
        $avgDelay = max(1, intval($settings['delay_min']));
        $queued = $this->countStatus('queued');
        $sentToday = $this->sentToday();

        return $this->json->successOK([
            'session' => [
                'status' => (string) ($session->status ?? 'disconnected'),
                'phone' => $session->phone,
                'connected_at' => $session->connected_at,
                'last_error' => $session->last_error,
            ],
            'settings' => $settings,
            'stats' => [
                'queued' => $queued,
                'sent_today' => $sentToday,
                'sent_total' => $this->countStatus('sent'),
                'failed' => $this->countStatus('failed'),
                'skipped' => $this->countStatus('skipped'),
                'remaining_today' => max(0, $perDay - $sentToday),
                'eta_minutes' => $queued === 0 ? 0 : intval(ceil($queued * $avgDelay / 60)),
            ],
            'gateway' => $this->gateway('GET', '/health'),
        ]);
    }

    public function start(): JsonResponse
    {
        $session = $this->sessionRow();
        $res = $this->gateway('POST', '/session/' . $this->userId() . '/start');

        if (!($res['ok'] ?? false)) {
            return $this->json->errorBadRequest([$res['error'] ?? 'gagal memulai sesi WhatsApp']);
        }

        $session->fill(['status' => (string) ($res['status'] ?? 'connecting')])->save();

        return $this->json->successOK(['status' => (string) ($res['status'] ?? 'connecting')]);
    }

    public function logout(): JsonResponse
    {
        $res = $this->gateway('POST', '/session/' . $this->userId() . '/logout');

        if (!($res['ok'] ?? false)) {
            return $this->json->errorBadRequest([$res['error'] ?? 'gagal logout sesi WhatsApp']);
        }

        $session = $this->sessionRow();
        $session->fill(['status' => 'disconnected', 'phone' => null, 'connected_at' => null])->save();

        return $this->json->successOK(['status' => 'disconnected']);
    }

    public function qr(): JsonResponse
    {
        $res = $this->gateway('GET', '/session/' . $this->userId() . '/qr');

        if (!($res['ok'] ?? false)) {
            return $this->json->errorBadRequest([$res['error'] ?? 'QR tidak tersedia']);
        }

        return $this->json->successOK([
            'status' => (string) ($res['status'] ?? 'disconnected'),
            'phone' => $res['phone'] ?? null,
            'qr' => $res['qr'] ?? null,
        ]);
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $body = $this->body($request);
        $template = trim((string) ($body['template'] ?? ''));

        if (mb_strlen($template) < 10 || mb_strlen($template) > 2000) {
            return $this->json->errorBadRequest(['Template wajib 10–2000 karakter.']);
        }

        $clamp = static function (mixed $value, int $min, int $max, int $default): int {
            $n = $value === null || $value === '' ? $default : intval($value);

            return max($min, min($max, $n));
        };

        $min = $clamp($body['delay_min'] ?? null, 5, 900, 10);
        $max = $clamp($body['delay_max'] ?? null, 5, 900, $min);

        if ($max < $min) {
            return $this->json->errorBadRequest(['delay_max tidak boleh lebih kecil dari delay_min.']);
        }

        $row = $this->settingsRow();
        $row->fill([
            'template' => $template,
            'delay_min' => $min,
            'delay_max' => $max,
            'daily_cap' => $clamp($body['daily_cap'] ?? null, 1, 500, 50),
            'hour_start' => $clamp($body['hour_start'] ?? null, 0, 23, 8),
            'hour_end' => $clamp($body['hour_end'] ?? null, 1, 24, 21),
            'paused' => $this->toBool($body['paused'] ?? false),
        ])->save();

        return $this->json->successOK($this->settingsPayload($row));
    }

    /** @param array<string, mixed> $guest */
    private function renderTemplate(string $template, array $guest): string
    {
        return str_replace(
            ['{nama}', '{link}'],
            [$guest['name'], $guest['link']],
            $template,
        );
    }

    /** @return array<string, mixed>|null */
    private function guestPayload(mixed $guest): array|null
    {
        if (!is_object($guest) || !method_exists($guest, 'exist') || !$guest->exist()) {
            return null;
        }

        return [
            'id' => intval($guest->id),
            'name' => (string) $guest->name,
            'phone' => (string) ($guest->phone ?? ''),
            'link' => $this->link((string) $guest->name, (string) $guest->slug),
        ];
    }

    private function inFlight(int $guestId): bool
    {
        $row = WaMessage::where('user_id', $this->userId())
            ->where('guest_id', $guestId)
            ->whereIn('status', ['queued', 'sending'])
            ->limit(1)
            ->first();

        return $row->exist();
    }

    private function pendingCountExcept(int $messageId): int
    {
        $row = WaMessage::where('user_id', $this->userId())
            ->whereIn('status', ['queued', 'sending'])
            ->where('id', $messageId, '<>')
            ->count('id', 'total')
            ->first();

        return intval($row->total ?? 0);
    }

    /**
     * Kirim satu baris pesan SEKARANG lewat gateway (tanpa menunggu antrean).
     *
     * @param array<string, mixed> $extra
     */
    private function sendDirect(int $messageId, int $queued, int $skipped, array $extra): JsonResponse
    {
        $res = $this->gateway('POST', '/session/' . $this->userId() . '/send-now', ['id' => $messageId]);

        if (!($res['ok'] ?? false)) {
            $error = (string) ($res['error'] ?? 'gagal mengirim WhatsApp');

            return $this->json->errorBadRequest([$error]);
        }

        return $this->json->successOK(array_merge([
            'direct' => true,
            'sent' => 1,
            'queued' => $queued,
            'skipped' => $skipped,
            'message_id' => $messageId,
            'wa_id' => $res['wa_id'] ?? null,
            'eta_minutes' => 0,
        ], $extra));
    }

    /** @return array<string, mixed> */
    private function body(Request $request): array
    {
        $raw = json_decode((string) $request->getContent(), true);

        return is_array($raw) ? $raw : [];
    }

    private function toBool(mixed $value, bool $default = false): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            return in_array(strtolower($value), ['1', 'true', 'on', 'yes'], true);
        }

        if (is_int($value) || is_float($value)) {
            return $value != 0;
        }

        return $default;
    }

    public function send(string $id): JsonResponse
    {
        $guest = Guest::where('id', intval($id))->where('user_id', $this->userId())->limit(1)->first();
        $payload = $this->guestPayload($guest);

        if ($payload === null) {
            return $this->json->errorNotFound();
        }

        if (trim($payload['phone']) === '') {
            return $this->json->errorBadRequest(['Tamu ini belum punya nomor WhatsApp']);
        }

        if ($this->inFlight($payload['id'])) {
            return $this->json->errorBadRequest(['Pesan untuk tamu ini sudah ada di antrean']);
        }

        $settings = $this->settingsPayload($this->settingsRow());

        $message = WaMessage::create([
            'user_id' => $this->userId(),
            'guest_id' => $payload['id'],
            'phone' => $payload['phone'],
            'body' => $this->renderTemplate($settings['template'], $payload),
            'status' => 'queued',
            'scheduled_at' => date('Y-m-d H:i:s'),
        ]);

        $messageId = intval($message->id);

        // Kirim tunggal tanpa antrean: langsung kirim sekarang.
        if ($this->pendingCountExcept($messageId) === 0) {
            return $this->sendDirect($messageId, 0, 0, []);
        }

        return $this->json->successOK([
            'queued' => 1,
            'message_id' => $messageId,
            'eta_minutes' => intval(ceil(max(1, intval($settings['delay_min'])) / 60)),
        ]);
    }

    public function bulk(Request $request): JsonResponse
    {
        $body = $this->body($request);
        $idsRaw = $body['ids'] ?? [];
        $all = $this->toBool($body['all'] ?? false);
        $force = $this->toBool($body['force'] ?? false);

        $ids = [];
        if (is_array($idsRaw)) {
            foreach ($idsRaw as $value) {
                $n = intval($value);
                if ($n > 0) {
                    $ids[] = $n;
                }
            }
        }

        if ($ids === [] && !$all) {
            return $this->json->errorBadRequest(['Pilih minimal satu tamu atau kirim ke semua']);
        }

        $settings = $this->settingsPayload($this->settingsRow());
        $template = $settings['template'];

        $query = Guest::where('user_id', $this->userId());

        if ($ids !== []) {
            $query->whereIn('id', $ids);
        }

        $rows = $query->get();

        $queued = 0;
        $skipped = 0;
        $queuedIds = [];
        $reasons = ['tanpa_nomor' => 0, 'sudah_terkirim' => 0, 'di_antrean' => 0];

        foreach ($rows as $row) {
            $guestId = intval($row->id ?? 0);

            if ($guestId <= 0) {
                continue;
            }

            $phone = trim((string) ($row->phone ?? ''));

            if ($phone === '') {
                $skipped++;
                $reasons['tanpa_nomor']++;
                continue;
            }

            if ($this->inFlight($guestId)) {
                $skipped++;
                $reasons['di_antrean']++;
                continue;
            }

            if (!$force) {
                $sent = WaMessage::where('user_id', $this->userId())
                    ->where('guest_id', $guestId)
                    ->where('status', 'sent')
                    ->limit(1)
                    ->first();

                if ($sent->exist()) {
                    $skipped++;
                    $reasons['sudah_terkirim']++;
                    continue;
                }
            }

            $payload = [
                'id' => $guestId,
                'name' => (string) ($row->name ?? ''),
                'phone' => $phone,
                'link' => $this->link((string) ($row->name ?? ''), (string) ($row->slug ?? '')),
            ];

            $created = WaMessage::create([
                'user_id' => $this->userId(),
                'guest_id' => $guestId,
                'phone' => $phone,
                'body' => $this->renderTemplate($template, $payload),
                'status' => 'queued',
                'scheduled_at' => date('Y-m-d H:i:s'),
            ]);

            $queuedIds[] = intval($created->id);
            $queued++;
        }

        $avgDelay = max(1, intval($settings['delay_min']));
        $remainingToday = max(0, $settings['daily_cap'] - $this->sentToday());
        $throughput = max(1, min($queued, $remainingToday));

        // Hanya 1 penerima (pilih 1 tamu / 1 yang lolos filter): kirim langsung.
        if (count($queuedIds) === 1 && $this->pendingCountExcept($queuedIds[0]) === 0) {
            return $this->sendDirect($queuedIds[0], 0, $skipped, [
                'reasons' => $reasons,
                'remaining_today' => $remainingToday,
                'spillover_days' => 0,
            ]);
        }

        return $this->json->successOK([
            'queued' => $queued,
            'skipped' => $skipped,
            'reasons' => $reasons,
            'remaining_today' => $remainingToday,
            'eta_minutes' => $queued === 0 ? 0 : intval(ceil($queued * $avgDelay / 60)),
            'spillover_days' => $queued > $throughput ? intval(ceil(($queued - $throughput) / max(1, $settings['daily_cap']))) : 0,
        ]);
    }

    public function cancelQueue(): JsonResponse
    {
        $rows = WaMessage::where('user_id', $this->userId())->where('status', 'queued')->get();
        $count = 0;

        foreach ($rows as $row) {
            WaMessage::where('id', intval($row->id))->update([
                'status' => 'canceled',
                'error' => 'dibatalkan admin',
            ]);
            $count++;
        }

        return $this->json->successOK(['canceled' => $count]);
    }

    public function messages(Request $request): JsonResponse
    {
        $per = max(5, min(100, intval($request->get('per', 30))));

        $rows = WaMessage::where('user_id', $this->userId())
            ->select(['id', 'guest_id', 'phone', 'status', 'attempts', 'error', 'sent_at', 'created_at'])
            ->orderBy('id', 'DESC')
            ->limit($per)
            ->get();

        $items = [];
        $guestIds = [];

        foreach ($rows as $row) {
            $guestIds[] = intval($row->guest_id);
            $items[] = [
                'id' => intval($row->id),
                'guest_id' => intval($row->guest_id),
                'phone' => $row->phone,
                'status' => $row->status,
                'attempts' => intval($row->attempts),
                'error' => $row->error,
                'sent_at' => $row->sent_at,
                'created_at' => $row->created_at,
                'name' => null,
            ];
        }

        $guestIds = array_values(array_filter($guestIds));

        if ($guestIds !== []) {
            $names = [];
            $guests = Guest::where('user_id', $this->userId())->select(['id', 'name'])->whereIn('id', $guestIds)->get();

            foreach ($guests as $guest) {
                $names[intval($guest->id)] = (string) $guest->name;
            }

            foreach ($items as &$item) {
                $item['name'] = $names[$item['guest_id']] ?? null;
            }
            unset($item);
        }

        return $this->json->successOK(['items' => $items]);
    }
}