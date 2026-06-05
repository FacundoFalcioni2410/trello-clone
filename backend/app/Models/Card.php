<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['title', 'description', 'due_date', 'position', 'board_list_id'])]
class Card extends Model
{
    use HasFactory, SoftDeletes;

    public function list()
    {
        return $this->belongsTo(BoardList::class);
    }
}
