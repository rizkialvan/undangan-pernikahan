<?php

namespace App\Repositories;

use Core\Model\Model;

interface CommentContract
{
    public function create(array $data): Model;
    public function getAll(int $user_id, bool $is_admin, string $user_name, int $limit, int $offset, string|null $search = null): array;
    public function count(int $user_id, string|null $search = null): int;
    public function getByUuid(int $user_id, string $uuid): Model;
    public function getByOwnId(int $user_id, string $own_id): Model;
    public function deleteAllByUuid(int $userId, string $uuid): bool;
    public function deleteByParentID(string $uuid): int;
    public function countCommentByUserID(int $id): int;
    public function countPresenceByUserID(int $id): Model;
    public function downloadCommentByUserID(int $id): Model;
}
