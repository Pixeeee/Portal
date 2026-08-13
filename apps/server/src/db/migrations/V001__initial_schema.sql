CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE portal_device (
    id UUID PRIMARY KEY,
    installation_id UUID NOT NULL UNIQUE,
    place_id UUID NULL,
    device_secret_hash VARCHAR(128) NOT NULL,
    device_name VARCHAR(120) NULL,
    manufacturer VARCHAR(120) NULL,
    model VARCHAR(120) NULL,
    android_version VARCHAR(40) NULL,
    app_version VARCHAR(40) NULL,
    fcm_token VARCHAR(4096) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL
);

CREATE TABLE portal_place (
    id UUID PRIMARY KEY,
    public_code VARCHAR(9) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    location_label VARCHAR(160) NULL,
    description TEXT NULL,
    created_by_device_id UUID NOT NULL REFERENCES portal_device(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ NULL,
    CONSTRAINT ck_portal_place_public_code CHECK (public_code ~ '^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$'),
    CONSTRAINT ck_portal_place_name_length CHECK (char_length(name) BETWEEN 1 AND 120)
);

ALTER TABLE portal_device
    ADD CONSTRAINT fk_portal_device_place
    FOREIGN KEY (place_id) REFERENCES portal_place(id);

CREATE TABLE connection_request (
    id UUID PRIMARY KEY,
    caller_device_id UUID NOT NULL REFERENCES portal_device(id),
    caller_place_id UUID NOT NULL REFERENCES portal_place(id),
    receiver_device_id UUID NOT NULL REFERENCES portal_device(id),
    receiver_place_id UUID NOT NULL REFERENCES portal_place(id),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ NULL,
    CONSTRAINT ck_connection_request_status CHECK (status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED','BUSY')),
    CONSTRAINT ck_connection_request_distinct_devices CHECK (caller_device_id <> receiver_device_id)
);

CREATE TABLE portal_session (
    id UUID PRIMARY KEY,
    room_name VARCHAR(180) NOT NULL UNIQUE,
    caller_device_id UUID NOT NULL REFERENCES portal_device(id),
    caller_place_id UUID NOT NULL REFERENCES portal_place(id),
    receiver_device_id UUID NOT NULL REFERENCES portal_device(id),
    receiver_place_id UUID NOT NULL REFERENCES portal_place(id),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,
    end_reason VARCHAR(80) NULL,
    CONSTRAINT ck_portal_session_status CHECK (status IN ('CREATED','CONNECTING','ACTIVE','RECONNECTING','ENDED','FAILED')),
    CONSTRAINT ck_portal_session_distinct_devices CHECK (caller_device_id <> receiver_device_id)
);

CREATE TABLE trusted_peer (
    id UUID PRIMARY KEY,
    owner_device_id UUID NOT NULL REFERENCES portal_device(id),
    trusted_place_id UUID NOT NULL REFERENCES portal_place(id),
    auto_accept BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(owner_device_id, trusted_place_id)
);

CREATE TABLE device_push_token (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES portal_device(id) ON DELETE CASCADE,
    token VARCHAR(4096) NOT NULL,
    platform VARCHAR(20) NOT NULL DEFAULT 'FCM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ NULL,
    UNIQUE(device_id, token)
);

CREATE TABLE audit_event (
    id UUID PRIMARY KEY,
    device_id UUID NULL REFERENCES portal_device(id),
    place_id UUID NULL REFERENCES portal_place(id),
    event_type VARCHAR(80) NOT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_idempotency (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES portal_device(id),
    idempotency_key VARCHAR(100) NOT NULL,
    operation VARCHAR(80) NOT NULL,
    resource_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(device_id, idempotency_key, operation)
);
