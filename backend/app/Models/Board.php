<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'background_image', 'background_color', 'owner_id'])]
class Board extends Model
{
    use HasFactory, SoftDeletes;

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function lists()
    {
        return $this->hasMany(BoardList::class);
    }

    public function members()
    {
        return $this->hasMany(BoardMember::class);
    }

    public function isMember(int $userId): bool
    {
        return $this->members()->where('user_id', $userId)->exists();
    }
}
