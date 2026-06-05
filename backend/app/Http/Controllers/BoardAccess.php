<?php

namespace App\Http\Controllers;

use App\Models\Board;
use Illuminate\Http\JsonResponse;

trait BoardAccess
{
    private function canAccessBoard(int $userId, Board $board): bool
    {
        return $board->owner_id === $userId || $board->isMember($userId);
    }

    private function canManageBoard(int $userId, Board $board): bool
    {
        return $board->owner_id === $userId;
    }

    private function denyAccess(): JsonResponse
    {
        return response()->json(['error' => "You don't have access to this board."], 403);
    }
}
