<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['card_id', 'text', 'completed', 'position'])]
class ChecklistItem extends Model
{
    use HasFactory;

    protected $casts = [
        'completed' => 'boolean',
    ];

    public function card()
    {
        return $this->belongsTo(Card::class);
    }
}
