<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'position', 'board_id'])]
class BoardList extends Model
{
    use HasFactory, SoftDeletes;

    public function board()
    {
        return $this->belongsTo(Board::class);
    }
}
