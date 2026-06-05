<?php

use App\Models\Board;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('boards.{board}', function ($user, Board $board) {
    return $board->owner_id === $user->id || $board->isMember($user->id);
});

Broadcast::channel('users.{userId}', function ($user, int $userId) {
    return (int) $user->id === $userId;
});
