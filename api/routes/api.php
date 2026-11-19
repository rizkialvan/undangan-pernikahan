<?php

use App\Controllers\Api\AuthController;
use App\Controllers\Api\CmsController;
use App\Controllers\Api\CommentController;
use App\Controllers\Api\DashboardController;
use App\Controllers\Api\GuestController;
use App\Controllers\Api\MediaController;
use App\Middleware\AuthMiddleware;
use App\Middleware\DashboardMiddleware;
use App\Middleware\RateLimitMiddleware;
use Core\Routing\Route;

/**
 * Make something great with this app
 * keep simple yeah.
 */

/**
 * Media publik — dipakai <img src> / <audio> di halaman undangan.
 * Nama file acak 32 hex, tidak bisa ditelusuri.
 * Catatan: router Kamu hanya menerima [\w-] pada parameter path,
 * jadi nama file (mengandung titik) dikirim lewat query ?f=
 */
Route::get('/media', [MediaController::class, 'show']);
Route::options('/media');

Route::middleware(RateLimitMiddleware::class)->prefix('/session')->group(function () {
    Route::post('/', [AuthController::class, 'login']);
    Route::options('/'); // Preflight request [/api/session]
});

Route::middleware([RateLimitMiddleware::class, AuthMiddleware::class])->group(function () {

    // Dashboard
    Route::middleware(DashboardMiddleware::class)->group(function () {
        Route::get('/download', [DashboardController::class, 'download']);
        Route::options('/download');

        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::options('/stats');

        Route::put('/key', [DashboardController::class, 'rotate']);
        Route::options('/key');

        Route::get('/user', [DashboardController::class, 'user']);
        Route::patch('/user', [DashboardController::class, 'update']);
        Route::options('/user');

        // CMS — ringkasan & konten
        Route::get('/admin/overview', [CmsController::class, 'overview']);
        Route::options('/admin/overview');

        Route::get('/admin/content', [CmsController::class, 'content']);
        Route::put('/admin/content', [CmsController::class, 'save']);
        Route::options('/admin/content');

        Route::post('/admin/publish', [CmsController::class, 'publish']);
        Route::post('/admin/revert', [CmsController::class, 'revert']);
        Route::post('/admin/preview-token', [CmsController::class, 'previewToken']);
        Route::options('/admin/publish');
        Route::options('/admin/revert');
        Route::options('/admin/preview-token');

        // CMS — media
        Route::get('/admin/media', [MediaController::class, 'index']);
        Route::post('/admin/media', [MediaController::class, 'store']);
        Route::put('/admin/media/{id}', [MediaController::class, 'update']);
        Route::delete('/admin/media/{id}', [MediaController::class, 'destroy']);
        Route::options('/admin/media');
        Route::options('/admin/media/{id}');

        // CMS — tamu
        Route::get('/admin/guests/export', [GuestController::class, 'export']);
        Route::options('/admin/guests/export');

        Route::get('/admin/guests', [GuestController::class, 'index']);
        Route::post('/admin/guests', [GuestController::class, 'store']);
        Route::put('/admin/guests/{id}', [GuestController::class, 'update']);
        Route::delete('/admin/guests/{id}', [GuestController::class, 'destroy']);
        Route::post('/admin/guests/{id}/sent', [GuestController::class, 'markSent']);
        Route::options('/admin/guests');
        Route::options('/admin/guests/{id}');
        Route::options('/admin/guests/{id}/sent');
    });

    // Comment
    Route::prefix('/comment')->group(function () {

        Route::controller(CommentController::class)->group(function () {
            Route::post('/', 'create');
        });

        Route::options('/'); // Preflight request [/api/comment]

        Route::prefix('/{id}')->group(function () {
            Route::controller(CommentController::class)->group(function () {

                Route::put('/', 'update');
                Route::delete('/', 'destroy');

                // Like or unlike comment
                Route::post('/', 'like');
                Route::patch('/', 'unlike');
            });

            Route::options('/'); // Preflight request [/api/comment/{id}]
        });
    });

    // api v2
    Route::prefix('/v2')->group(function () {

        Route::get('/config', [DashboardController::class, 'configV2']);
        Route::options('/config');

        // Konten undangan (published; ?preview=<token> untuk draft)
        Route::get('/content', [CmsController::class, 'publicContent']);
        Route::options('/content');

        // Resolusi link tamu personal (?g=slug)
        Route::get('/guest', [GuestController::class, 'track']);
        Route::options('/guest');

        Route::prefix('/comment')->group(function () {
            Route::get('/', [CommentController::class, 'getV2']);
            Route::options('/');
        });
    });
});