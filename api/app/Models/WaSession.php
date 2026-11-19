<?php

namespace App\Models;

use Core\Model\Model;

final class WaSession extends Model
{
    protected $table = 'wa_sessions';

    protected $primaryKey = 'id';

    protected $typeKey = 'int';

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'status',
        'qr',
        'qr_at',
        'last_error',
        'connected_at',
    ];
}