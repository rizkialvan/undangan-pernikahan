<?php

namespace App\Models;

use Core\Model\Model;

final class WaSetting extends Model
{
    protected $table = 'wa_settings';

    protected $primaryKey = 'id';

    protected $typeKey = 'int';

    protected $fillable = [
        'user_id',
        'template',
        'delay_min',
        'delay_max',
        'daily_cap',
        'hour_start',
        'hour_end',
        'paused',
    ];
}