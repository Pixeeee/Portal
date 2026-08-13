COMMENT ON TABLE audit_event IS 'Device/session audit metadata only; never stores video or audio.';
COMMENT ON COLUMN portal_device.device_secret_hash IS 'HMAC-SHA256 digest. Raw device secrets are never persisted.';
COMMENT ON TABLE portal_session IS 'Stores session metadata only. Recording is out of scope for V1.';
