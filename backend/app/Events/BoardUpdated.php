<?php

namespace App\Events;

use App\Models\Board;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BoardUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Board $board) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('boards.'.$this->board->id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'board_id' => $this->board->id,
        ];
    }

    public function broadcastAs(): string
    {
        return 'board.updated';
    }
}
