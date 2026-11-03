<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminEmail
{
    public function handle(Request $request, Closure $next): Response
    {
        $adminEmail = strtolower(trim((string) config('admin.email')));
        $userEmail = strtolower((string) $request->user()?->email);

        if ($adminEmail === '' || ! hash_equals($adminEmail, $userEmail)) {
            return response()->json([
                'message' => 'Tài khoản này không có quyền quản trị.',
            ], 403);
        }

        return $next($request);
    }
}
