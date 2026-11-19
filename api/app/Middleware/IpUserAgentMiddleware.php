<?php

namespace App\Middleware;

use App\Response\JsonResponse;
use Closure;
use Core\Http\Request;
use Core\Middleware\MiddlewareInterface;
use Core\Valid\Validator;

final class IpUserAgentMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, Closure $next)
    {
        // Health/root probes (curl, wget, monitoring) tidak membawa UA panjang.
        // Endpoint API tetap wajib UA >= 64 karakter.
        $path = rtrim(parse_url($request->server->get('REQUEST_URI', '/'), PHP_URL_PATH) ?: '/', '/');
        // '/health' dan '/api/health' (prefix api) tidak wajib UA panjang.
        if ($path === '' || str_ends_with($path, '/health')) {
            return $next($request);
        }

        $valid = Validator::make([
            'ip' => env('HTTP_CF_CONNECTING_IP') ? $request->server->get('HTTP_CF_CONNECTING_IP', $request->ip()) : $request->ip(),
            'user_agent' => $request->userAgent(),
        ], [
            'ip' => ['required', 'str', 'trim', 'min:2', 'max:45', 'ip'],
            'user_agent' => ['required', 'str', 'trim', 'min:64', 'max:512'],
        ]);

        if ($valid->fails()) {
            return (new JsonResponse)->errorBadRequest($valid->messages());
        }

        context('ip', $valid->ip);
        context('user_agent', $valid->user_agent);

        return $next($request);
    }
}
