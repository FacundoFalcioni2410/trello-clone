<?php

namespace App\Http\Controllers;

use App\Models\Board;

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
}
