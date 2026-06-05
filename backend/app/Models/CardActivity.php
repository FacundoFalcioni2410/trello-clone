<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['card_id', 'user_id', 'type', 'description', 'metadata'])]
class CardActivity extends Model
{
    use HasFactory;

    protected $casts = [
        'metadata' => 'array',
    ];

    public function card()
    {
        return $this->belongsTo(Card::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
