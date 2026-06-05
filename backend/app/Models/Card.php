<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['title', 'description', 'due_date', 'position', 'board_list_id', 'labels'])]
class Card extends Model
{
    use HasFactory, SoftDeletes;

    protected $casts = [
        'labels' => 'array',
    ];

    public function list()
    {
        return $this->belongsTo(BoardList::class);
    }

    public function checklistItems()
    {
        return $this->hasMany(ChecklistItem::class)->orderBy('position', 'asc')->orderBy('id', 'asc');
    }

    public function activities()
    {
        return $this->hasMany(CardActivity::class)->orderBy('created_at', 'desc');
    }
}
