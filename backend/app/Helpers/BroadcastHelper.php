<?php

namespace App\Helpers;

use App\Events\BoardUpdated;
use App\Models\Board;

class BroadcastHelper
{
    public static function boardUpdated(Board $board): void
    {
        try {
            broadcast(new BoardUpdated($board))->toOthers();
        } catch (\Exception $e) {
            \Log::warning('Broadcast failed: '.$e->getMessage());
        }
    }
}
