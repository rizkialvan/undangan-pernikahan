<?php

namespace App\Models;

use Core\Model\Model;

final class Invitation extends Model
{
    protected $table = 'invitations';

    protected $primaryKey = 'id';

    protected $typeKey = 'int';

    protected $dates = [
        'created_at',
        'updated_at',
        'published_at',
    ];

    protected $fillable = [
        'user_id',
        'content_draft',
        'content_published',
        'version',
        'is_live',
        'published_at',
    ];

    protected $casts = [
        'is_live' => 'bool',
    ];
}