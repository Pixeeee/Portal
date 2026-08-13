-- Enforce the product invariant that one physical Android device can participate in
-- only one non-terminal Portal session at a time, including races across callers/receivers.
CREATE TABLE portal_active_session_device (
    device_id UUID PRIMARY KEY REFERENCES portal_device(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES portal_session(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fail migration loudly if pre-existing data already violates the invariant.
INSERT INTO portal_active_session_device(device_id, session_id)
SELECT device_id, session_id
FROM (
    SELECT caller_device_id AS device_id, id AS session_id
    FROM portal_session
    WHERE status IN ('CREATED','CONNECTING','ACTIVE','RECONNECTING')
    UNION ALL
    SELECT receiver_device_id AS device_id, id AS session_id
    FROM portal_session
    WHERE status IN ('CREATED','CONNECTING','ACTIVE','RECONNECTING')
) active
ORDER BY device_id;

CREATE OR REPLACE FUNCTION portal_session_active_device_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    old_active BOOLEAN := FALSE;
    new_active BOOLEAN := FALSE;
    first_device UUID;
    second_device UUID;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        old_active := OLD.status IN ('CREATED','CONNECTING','ACTIVE','RECONNECTING');
    END IF;
    new_active := NEW.status IN ('CREATED','CONNECTING','ACTIVE','RECONNECTING');

    IF old_active AND NOT new_active THEN
        DELETE FROM portal_active_session_device WHERE session_id = OLD.id;
    ELSIF NOT old_active AND new_active THEN
        -- Stable UUID ordering avoids opposite-direction sessions acquiring locks in reverse order.
        IF NEW.caller_device_id::text < NEW.receiver_device_id::text THEN
            first_device := NEW.caller_device_id;
            second_device := NEW.receiver_device_id;
        ELSE
            first_device := NEW.receiver_device_id;
            second_device := NEW.caller_device_id;
        END IF;

        INSERT INTO portal_active_session_device(device_id, session_id) VALUES (first_device, NEW.id);
        INSERT INTO portal_active_session_device(device_id, session_id) VALUES (second_device, NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portal_session_active_device_guard
AFTER INSERT OR UPDATE OF status ON portal_session
FOR EACH ROW EXECUTE FUNCTION portal_session_active_device_guard();
