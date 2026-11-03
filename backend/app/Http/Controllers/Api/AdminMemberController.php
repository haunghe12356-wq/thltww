<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminMemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,locked'],
        ]);
        $adminEmail = mb_strtolower(trim((string) config('admin.email')));
        $query = User::query()
            ->whereRaw('LOWER(email) <> ?', [$adminEmail])
            ->withCount('orders')
            ->latest();

        if (! empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($members) use ($search): void {
                if (ctype_digit($search)) {
                    $members->orWhere('id', (int) $search);
                }

                $members->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if (($filters['status'] ?? null) === 'active') {
            $query->where('is_active', true);
        } elseif (($filters['status'] ?? null) === 'locked') {
            $query->where('is_active', false);
        }

        $members = $query->paginate(min(max($request->integer('per_page', 10), 1), 100));

        return response()->json([
            'data' => $members->getCollection()->map(fn (User $member): array => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'phone' => $member->phone,
                'is_active' => $member->is_active,
                'orders_count' => $member->orders_count,
                'created_at' => $member->created_at,
            ]),
            'meta' => [
                'current_page' => $members->currentPage(),
                'last_page' => $members->lastPage(),
                'per_page' => $members->perPage(),
                'total' => $members->total(),
            ],
        ]);
    }

    public function show(int $member): JsonResponse
    {
        $member = $this->findMember($member);
        $orders = $member->orders()->latest()->limit(10)->get([
            'id',
            'total',
            'status',
            'payment_method',
            'created_at',
        ]);

        return response()->json([
            'data' => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'phone' => $member->phone,
                'address' => $member->address,
                'is_active' => $member->is_active,
                'created_at' => $member->created_at,
                'orders_count' => $member->orders()->count(),
                'orders_total' => (float) $member->orders()->sum('total'),
                'orders' => $orders,
            ],
        ]);
    }

    public function updateStatus(Request $request, int $member): JsonResponse
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);
        $member = $this->findMember($member);

        if ($member->is($request->user())) {
            throw ValidationException::withMessages([
                'member' => ['Không thể khóa hoặc mở khóa tài khoản quản trị đang đăng nhập.'],
            ]);
        }

        DB::transaction(function () use ($member, $data): void {
            $member->update(['is_active' => $data['is_active']]);
            if (! $data['is_active']) {
                $member->tokens()->delete();
            }
        });

        return response()->json([
            'data' => [
                'id' => $member->id,
                'is_active' => $member->fresh()->is_active,
            ],
        ]);
    }

    public function destroy(Request $request, int $member): JsonResponse
    {
        $member = $this->findMember($member);

        if ($member->is($request->user())) {
            throw ValidationException::withMessages([
                'member' => ['Không thể xóa tài khoản quản trị đang đăng nhập.'],
            ]);
        }

        DB::transaction(function () use ($member): void {
            Order::query()->where('user_id', $member->id)->update(['user_id' => null]);
            $member->tokens()->delete();
            DB::table('password_reset_tokens')->where('email', $member->email)->delete();
            $member->delete();
        });

        return response()->json(['message' => 'Đã xóa tài khoản thành viên.']);
    }

    private function findMember(int $id): User
    {
        $adminEmail = mb_strtolower(trim((string) config('admin.email')));

        return User::query()
            ->whereRaw('LOWER(email) <> ?', [$adminEmail])
            ->findOrFail($id);
    }
}
