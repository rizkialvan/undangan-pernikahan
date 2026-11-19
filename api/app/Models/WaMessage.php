<?php

namespace App\Models;

use Core\Model\Model;

final class WaMessage extends Model
{
    protected $table = 'wa_messages';

    protected $primaryKey = 'id';

    protected $typeKey = 'int';

    protected $fillable = [
        'user_id',
        'guest_id',
        'phone',
        'jid',
        'body',
        'status',
        'attempts',
        'error',
        'wa_message_id',
        'scheduled_at',
        'sent_at',
    ];
}