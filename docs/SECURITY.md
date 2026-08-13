# Security

- No human account system exists.
- Mobile creates a UUID installation identity and a random 256-bit device secret.
- Device secret is stored with Expo SecureStore; backend stores only an HMAC-SHA256 hash salted with the deployment pepper.
- Raw secrets are never intentionally logged.
- A revoked installation cannot authenticate again.
- Connection/session ownership is resolved from the authenticated device; Android-supplied IDs are not trusted blindly.
- Portal public codes use a restricted alphabet that excludes confusing 0/O and 1/I/L characters.
- Connection requests expire after 30 seconds.
- Session credentials are generated only for devices that belong to the session.
- LiveKit API secret exists only on the backend/infrastructure.
- Production refuses a short device-secret pepper and a non-`wss://` public LiveKit URL.
- Redis-backed rate limiting protects bootstrap/discovery/control paths.
- Audit events contain device/session metadata only; V1 stores no video/audio recordings.
- Camera/microphone permissions are requested explicitly before media. There is no hidden monitoring/background recording path.
