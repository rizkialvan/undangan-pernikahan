-- CMS undangan: skema tambahan (idempotent, aman dijalankan berulang)
CREATE TABLE IF NOT EXISTS invitations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    content_draft TEXT,
    content_published TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    is_live BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS media (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL UNIQUE,
    original_name VARCHAR(255),
    mime VARCHAR(100),
    size BIGINT DEFAULT 0,
    kind VARCHAR(20) DEFAULT 'image',
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS media_user_id_idx ON media(user_id);

CREATE TABLE IF NOT EXISTS guests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30),
    category VARCHAR(60),
    note TEXT,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT guests_user_slug_unique UNIQUE (user_id, slug)
);
CREATE INDEX IF NOT EXISTS guests_user_id_idx ON guests(user_id);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS guest_id BIGINT NULL;
CREATE INDEX IF NOT EXISTS comments_guest_id_idx ON comments(guest_id);

-- Pelacakan kunjungan link personal (?g=slug): diisi oleh GuestController::track()
ALTER TABLE guests ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP NULL;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0;
-- Token publik per undangan (menggantikan access_key pada tautan tamu)
create extension if not exists pgcrypto;
alter table invitations add column if not exists public_token text;
update invitations set public_token = encode(gen_random_bytes(24), 'hex') where public_token is null;
create unique index if not exists invitations_public_token_key on invitations (public_token);
