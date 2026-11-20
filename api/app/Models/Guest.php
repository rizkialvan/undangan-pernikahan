<?php

namespace App\Models;

use Core\Model\Model;

final class Guest extends Model
{
    protected $table = 'guests';

    protected $primaryKey = 'id';

    protected $typeKey = 'int';

    protected $dates = [
        'created_at',
        'updated_at',
    ];

    protected $fillable = [
        'user_id',
        'slug',
        'name',
        'phone',
        'category',
        'note',
        'sent_at',
        'opened_at',
        'visit_count',
    ];
}