<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserBoardsUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $userId) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('users.'.$this->userId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'user.boards.updated';
    }
}
