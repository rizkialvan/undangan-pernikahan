<?php

namespace App\Models;

use Core\Model\Model;

final class Media extends Model
{
    protected $table = 'media';

    protected $primaryKey = 'id';

    protected $typeKey = 'int';

    protected $dates = [
        'created_at',
        'updated_at',
    ];

    protected $fillable = [
        'user_id',
        'filename',
        'original_name',
        'mime',
        'size',
        'kind',
        'width',
        'height',
    ];

    public function url(): string
    {
        return '/api/media?f=' . $this->filename;
    }
}