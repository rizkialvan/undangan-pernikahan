<?php

namespace App\Controllers\Api;

use App\Models\Media;
use App\Response\JsonResponse;
use Core\Auth\Auth;
use Core\File\UploadedFile;
use Core\Http\Request;
use Core\Routing\Controller;

class MediaController extends Controller
{
    private const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const AUDIO_MIMES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/ogg'];
    private const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/ogg'];

    private const MAX_IMAGE = 12 * 1024 * 1024;
    private const MAX_AUDIO = 20 * 1024 * 1024;
    private const MAX_VIDEO = 40 * 1024 * 1024;

    /** Sisi terpanjang gambar simpanan (hemat kuota tamu). */
    private const MAX_IMAGE_DIMENSION = 1600;
    private const WEBP_QUALITY = 82;

    private JsonResponse $json;

    public function __construct(JsonResponse $json)
    {
        $this->json = $json;
    }

    private function storageDir(int $userId): string
    {
        $dir = base_path('/storage/uploads/' . $userId);

        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        return $dir;
    }

    /**
     * @param Media|object $media
     */
    private function toArray($media): array
    {
        return [
            'id' => intval($media->id),
            'filename' => $media->filename,
            'original_name' => $media->original_name,
            'mime' => $media->mime,
            'size' => intval($media->size),
            'kind' => $media->kind,
            'width' => $media->width === null ? null : intval($media->width),
            'height' => $media->height === null ? null : intval($media->height),
            'url' => '/api/media?f=' . $media->filename,
            'created_at' => $media->created_at,
        ];
    }

    public function index(): JsonResponse
    {
        $rows = Media::where('user_id', intval(Auth::id()))->orderBy('id', 'DESC')->get();

        $items = [];
        foreach ($rows as $row) {
            $items[] = $this->toArray($row);
        }

        return $this->json->successOK(['items' => $items, 'total' => count($items)]);
    }

    /**
     * Simpan file baru (multipart/form-data, field "file").
     */
    public function store(Request $request): JsonResponse
    {
        /** @var UploadedFile|null $file */
        $file = $request->file('file');

        if (!$file instanceof UploadedFile || !$file->exists()) {
            return $this->json->errorBadRequest(['File tidak ditemukan.']);
        }

        $info = $this->inspect($file);
        if (isset($info['error'])) {
            return $this->json->errorBadRequest([$info['error']]);
        }

        $userId = intval(Auth::id());
        $filename = bin2hex(random_bytes(16)) . '.' . $info['ext'];
        $target = $this->storageDir($userId) . '/' . $filename;

        if (!@move_uploaded_file($file->getPathname(), $target)) {
            return $this->json->errorServer();
        }

        @chmod($target, 0644);

        // Kompresi otomatis: foto besar diperkecil & diubah ke WebP supaya
        // halaman tamu tidak perlu mengunduh file 3 MB.
        $final = [
            'filename' => $filename,
            'mime' => $info['mime'],
            'size' => intval(filesize($target)),
            'width' => $info['width'],
            'height' => $info['height'],
        ];

        $opt = $info['kind'] === 'image' ? $this->optimizeImage($target, $info['mime']) : null;
        if (is_array($opt) && isset($opt['tmp']) && @rename($opt['tmp'], $target)) {
            $final = [
                'filename' => $filename,
                'mime' => $opt['mime'],
                'size' => intval(filesize($target)),
                'width' => $opt['width'],
                'height' => $opt['height'],
            ];
        }

        $media = Media::create([
            'user_id' => $userId,
            'filename' => $final['filename'],
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 200),
            'mime' => $final['mime'],
            'size' => $final['size'],
            'kind' => $info['kind'],
            'width' => $final['width'],
            'height' => $final['height'],
        ]);

        return $this->json->success($this->toArray($media), 201);
    }

    /**
     * Ganti isi file (URL tetap) atau ganti nama tampilan.
     */
    public function update(string $id, Request $request): JsonResponse
    {
        $media = Media::where('id', intval($id))->where('user_id', intval(Auth::id()))->limit(1)->first();

        if (!$media->exist()) {
            return $this->json->errorNotFound();
        }

        /** @var UploadedFile|null $file */
        $file = $request->file('file');

        if (!$file instanceof UploadedFile || !$file->exists()) {
            $name = $request->get('original_name');
            if (is_string($name) && trim($name) !== '') {
                $media->fill(['original_name' => mb_substr(trim($name), 0, 200)])->save();
            }

            return $this->json->successOK($this->toArray(Media::where('id', $media->id)->limit(1)->first()));
        }

        $info = $this->inspect($file);
        if (isset($info['error'])) {
            return $this->json->errorBadRequest([$info['error']]);
        }

        $dir = $this->storageDir(intval($media->user_id));
        $oldPath = $dir . '/' . $media->filename;

        $filename = $media->filename;
        if (strtolower(pathinfo($filename, PATHINFO_EXTENSION)) !== $info['ext']) {
            $filename = bin2hex(random_bytes(16)) . '.' . $info['ext'];
        }

        $target = $dir . '/' . $filename;

        if (!@move_uploaded_file($file->getPathname(), $target)) {
            return $this->json->errorServer();
        }

        @chmod($target, 0644);

        if ($filename !== $media->filename && is_file($oldPath)) {
            @unlink($oldPath);
        }

        $opt = $info['kind'] === 'image' ? $this->optimizeImage($target, $info['mime']) : null;
        if (is_array($opt) && isset($opt['tmp']) && @rename($opt['tmp'], $target)) {
            $info['mime'] = $opt['mime'];
            $info['width'] = $opt['width'];
            $info['height'] = $opt['height'];
        }

        $media->fill([
            'filename' => $filename,
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 200),
            'mime' => $info['mime'],
            'size' => intval(filesize($target)),
            'kind' => $info['kind'],
            'width' => $info['width'],
            'height' => $info['height'],
        ])->save();

        return $this->json->successOK($this->toArray(Media::where('id', $media->id)->limit(1)->first()));
    }

    public function destroy(string $id): JsonResponse
    {
        $media = Media::where('id', intval($id))->where('user_id', intval(Auth::id()))->limit(1)->first();

        if (!$media->exist()) {
            return $this->json->errorNotFound();
        }

        $path = $this->storageDir(intval($media->user_id)) . '/' . $media->filename;
        if (is_file($path)) {
            @unlink($path);
        }

        $media->destroy();

        return $this->json->successStatusTrue();
    }

/**
     * Optimalkan gambar yang sudah ada (dipakai tombol "Optimalkan" di CMS).
     */
    public function optimize(string $id): JsonResponse
    {
        $media = Media::where('id', intval($id))->where('user_id', intval(Auth::id()))->limit(1)->first();

        if (!$media->exist()) {
            return $this->json->errorNotFound();
        }

        if ($media->kind !== 'image' || $media->mime === 'image/gif') {
            return $this->json->errorBadRequest(['Hanya foto JPG/PNG/WEBP yang bisa dioptimalkan.']);
        }

        $dir = $this->storageDir(intval($media->user_id));
        $path = $dir . '/' . $media->filename;

        if (!is_file($path)) {
            return $this->json->errorNotFound();
        }

        $before = intval(@filesize($path));
        $opt = $this->optimizeImage($path, $media->mime);

        if (!is_array($opt)) {
            return $this->json->errorBadRequest(['Gambar tidak bisa dibaca ulang.']);
        }

        if (!isset($opt['tmp'])) {
            return $this->json->successOK([
                'item' => $this->toArray(Media::where('id', intval($id))->limit(1)->first()),
                'before' => $before,
                'saved' => 0,
            ]);
        }

        // Nama file TIDAK diubah: URL yang sudah dipakai konten tetap valid.
        if (!@rename($opt['tmp'], $path)) {
            @unlink($opt['tmp']);
            return $this->json->errorServer();
        }

        $media->fill([
            'filename' => $media->filename,
            'mime' => $opt['mime'],
            'size' => intval(@filesize($path)),
            'width' => $opt['width'],
            'height' => $opt['height'],
        ])->save();

        $fresh = Media::where('id', intval($id))->limit(1)->first();

        return $this->json->successOK([
            'item' => $this->toArray($fresh),
            'before' => $before,
            'saved' => max(0, $before - intval($fresh->size)),
        ]);
    }

    /**
     * Perkecil + encode ulang gambar. Null = tidak bisa diproses,
     * tanpa key 'tmp' = sudah cukup kecil (file asli dipertahankan).
     *
     * @return array{tmp?: string, ext?: string, mime?: string, size?: int, width: int, height: int, old?: int}|null
     */
    private function optimizeImage(string $path, string $mime): ?array
    {
        if (!function_exists('imagecreatefromstring') || $mime === 'image/gif') {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || $raw === '') {
            return null;
        }

        $img = @imagecreatefromstring($raw);
        if ($img === false) {
            return null;
        }

        $width = imagesx($img);
        $height = imagesy($img);

        // Foto HP sering menyimpan rotasi di EXIF; GD tidak membacanya sendiri.
        $orientation = 1;
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($path);
            $orientation = intval($exif['Orientation'] ?? 1);
        }

        $angle = match ($orientation) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };

        if ($angle !== 0) {
            $rotated = @imagerotate($img, $angle, 0);
            if ($rotated !== false) {
                imagedestroy($img);
                $img = $rotated;
                $width = imagesx($img);
                $height = imagesy($img);
            }
        }

        $scale = min(1.0, self::MAX_IMAGE_DIMENSION / max($width, $height));
        $resized = $scale < 0.999;

        if ($resized) {
            $newWidth = max(1, (int) round($width * $scale));
            $newHeight = max(1, (int) round($height * $scale));
            $dst = imagecreatetruecolor($newWidth, $newHeight);
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            imagecopyresampled($dst, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($img);
            $img = $dst;
            $width = $newWidth;
            $height = $newHeight;
        }

        $tmp = $path . '.opt';
        $ext = 'webp';
        $outMime = 'image/webp';

        imagealphablending($img, false);
        imagesavealpha($img, true);
        $ok = function_exists('imagewebp') ? @imagewebp($img, $tmp, self::WEBP_QUALITY) : false;

        if (!$ok) {
            // Fallback: JPEG (tanpa transparansi).
            $ext = 'jpg';
            $outMime = 'image/jpeg';
            $flat = imagecreatetruecolor($width, $height);
            imagefill($flat, 0, 0, imagecolorallocate($flat, 255, 255, 255));
            imagecopy($flat, $img, 0, 0, 0, 0, $width, $height);
            $ok = @imagejpeg($flat, $tmp, 85);
            imagedestroy($flat);
        }

        imagedestroy($img);

        if (!$ok || !is_file($tmp)) {
            @unlink($tmp);
            return null;
        }

        clearstatcache(true, $path);
        $oldSize = intval(@filesize($path));
        $newSize = intval(@filesize($tmp));

        // Sudah kecil & tidak perlu di-resize: biarkan file asli.
        if (!$resized && $newSize >= $oldSize * 0.92) {
            @unlink($tmp);
            return ['width' => $width, 'height' => $height];
        }

        return [
            'tmp' => $tmp,
            'ext' => $ext,
            'mime' => $outMime,
            'size' => $newSize,
            'width' => $width,
            'height' => $height,
            'old' => $oldSize,
        ];
    }

    /**
     * Sajikan file ke publik (dipakai halaman undangan lewat /api/media/...).
     */
    public function show(Request $request)
    {
        $file = (string) $request->get('f', '');

        if (!preg_match('/^[a-f0-9]{32}\.(jpg|jpeg|png|webp|gif|mp3|m4a|aac|wav|ogg|mp4|webm)$/', $file)) {
            http_response_code(404);
            exit;
        }

        $media = Media::where('filename', $file)->limit(1)->first();

        if (!$media->exist()) {
            http_response_code(404);
            exit;
        }

        $path = base_path('/storage/uploads/' . intval($media->user_id) . '/' . $media->filename);

        if (!is_file($path)) {
            http_response_code(404);
            exit;
        }

        $etag = '"' . md5($media->filename . '|' . intval($media->size)) . '"';

        header('Content-Type: ' . ($media->mime ?: 'application/octet-stream'));
        header('Cache-Control: public, max-age=31536000, immutable');
        header('ETag: ' . $etag);

        if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
            http_response_code(304);
            exit;
        }

        // Transfer byte ditangani nginx (sendfile + Range/206), bukan PHP.
        // PHP hanya memvalidasi kepemilikan & mime, lalu keluar.
        header('X-Accel-Redirect: /_media/' . intval($media->user_id) . '/' . $media->filename);
        exit;
    }

    /**
     * @return array{ext?:string,mime?:string,kind?:string,width?:int|null,height?:int|null,error?:string}
     */
    private function inspect(UploadedFile $file): array
    {
        $tmp = $file->getPathname();
        $size = intval(@filesize($tmp));

        if ($size <= 0) {
            return ['error' => 'File kosong.'];
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = (string) $finfo->file($tmp);

        $map = [
            'image/jpeg' => ['jpg', 'image'],
            'image/png' => ['png', 'image'],
            'image/webp' => ['webp', 'image'],
            'image/gif' => ['gif', 'image'],
            'audio/mpeg' => ['mp3', 'audio'],
            'audio/mp3' => ['mp3', 'audio'],
            'audio/mp4' => ['m4a', 'audio'],
            'audio/x-m4a' => ['m4a', 'audio'],
            'audio/aac' => ['aac', 'audio'],
            'audio/wav' => ['wav', 'audio'],
            'audio/x-wav' => ['wav', 'audio'],
            'audio/ogg' => ['ogg', 'audio'],
            'video/mp4' => ['mp4', 'video'],
            'video/webm' => ['webm', 'video'],
            'video/ogg' => ['ogg', 'video'],
        ];

        if (!isset($map[$mime])) {
            return ['error' => 'Tipe file tidak didukung (' . $mime . ').'];
        }

        [$ext, $kind] = $map[$mime];

        $limit = match ($kind) {
            'image' => self::MAX_IMAGE,
            'audio' => self::MAX_AUDIO,
            default => self::MAX_VIDEO,
        };

        if ($size > $limit) {
            return ['error' => 'Ukuran file melebihi batas ' . intval($limit / 1024 / 1024) . ' MB.'];
        }

        $width = null;
        $height = null;

        if ($kind === 'image') {
            $dim = @getimagesize($tmp);
            if ($dim === false) {
                return ['error' => 'Gambar tidak valid.'];
            }
            $width = intval($dim[0]);
            $height = intval($dim[1]);

            if ($width < 10 || $height < 10) {
                return ['error' => 'Dimensi gambar terlalu kecil.'];
            }
        }

        return [
            'ext' => $ext,
            'mime' => $mime,
            'kind' => $kind,
            'width' => $width,
            'height' => $height,
        ];
    }
}