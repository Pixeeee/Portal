# Phase-by-phase transformation

The original implementation order is preserved even though the technologies changed.

1. **Phase 0 — Repository foundation:** npm workspaces, Expo app, Node backend, PostgreSQL, Redis, LiveKit, Docker, docs.
2. **Phase 1 — Device bootstrap:** SecureStore installation ID + 256-bit device secret, backend bootstrap and device authentication.
3. **Phase 2 — Portal onboarding:** Expo Router onboarding route, place creation, generated code, QR, Home.
4. **Phase 3 — Discovery:** code validation, resolution, Expo Camera QR scanning, preview-before-connect.
5. **Phase 4 — Presence:** persistent WebSocket, Redis TTL presence, online/offline, bounded reconnect.
6. **Phase 5 — Connection request:** pending/accept/decline/cancel/expire/busy control state before media.
7. **Phase 6 — LiveKit:** backend room/token generation, React Native WebRTC join/publish/subscribe/disconnect.
8. **Phase 7 — Live UX:** fullscreen remote video, local preview, media controls, 3-second auto-hide, keep-awake.
9. **Phase 8 — Reliability:** network/control reconnect, LiveKit reconnect UI, session cleanup, DB active-session invariant, idempotency.
10. **Phase 9 — Recents/Favorites/Trust:** Expo SQLite recents/favorites; server directional trust, auto-accept countdown, history.
11. **Phase 10 — Background notifications:** Expo Notifications token, Expo push fallback, deep-link incoming request.
12. **Phase 11 — Production hardening:** validation/rate limiting/log-safe auth, production env fail-fast, migrations, Docker production skeleton, audit docs.

The technology change does not change the acceptance definition. The 20-scenario runtime checklist is `HARDWARE_ACCEPTANCE.md`.
