<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Services\ContactMessageReplyMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    public function adminIndex(Request $request): JsonResponse
    {
        $messages = ContactMessage::query()
            ->select([
                'id',
                'name',
                'email',
                'phone',
                'subject',
                'message',
                'is_read',
                'admin_reply',
                'replied_at',
                'created_at',
            ])
            ->latest()
            ->paginate(min(max($request->integer('per_page', 10), 1), 100));

        return response()->json([
            'data' => $messages->items(),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ],
        ]);
    }

    public function adminShow(ContactMessage $contactMessage): JsonResponse
    {
        return response()->json(['data' => $contactMessage]);
    }

    public function reply(Request $request, ContactMessage $contactMessage, ContactMessageReplyMailer $mailer): JsonResponse
    {
        $data = $request->validate([
            'reply' => ['required', 'string', 'max:5000'],
        ]);
        $status = $mailer->send($contactMessage, $data['reply']);

        if ($status === 'not_configured') {
            return response()->json([
                'message' => 'Chưa cấu hình SMTP. Phản hồi chưa được gửi.',
            ], 503);
        }

        if ($status === 'failed') {
            return response()->json([
                'message' => 'Không gửi được email phản hồi. Vui lòng kiểm tra cấu hình email và thử lại.',
            ], 502);
        }

        $contactMessage->update([
            'admin_reply' => $data['reply'],
            'replied_at' => now(),
            'is_read' => true,
        ]);

        return response()->json([
            'message' => 'Đã gửi phản hồi qua email.',
            'data' => $contactMessage->refresh(),
        ]);
    }

    public function updateReadStatus(Request $request, ContactMessage $contactMessage): JsonResponse
    {
        $data = $request->validate([
            'is_read' => ['required', 'boolean'],
        ]);

        $contactMessage->update($data);

        return response()->json(['data' => $contactMessage->refresh()]);
    }

    public function destroy(ContactMessage $contactMessage): JsonResponse
    {
        $contactMessage->delete();

        return response()->json(['message' => 'Liên hệ đã được xóa.']);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        ContactMessage::create($data);

        return response()->json(['message' => 'Cảm ơn bạn đã liên hệ.'], 201);
    }
}
