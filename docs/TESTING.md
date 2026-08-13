# Testing

Run source verification and unit tests:

```bash
npm run verify
npm run typecheck
npm test
npm run build
```

Server tests cover secret hashing and Portal-code rules. Mobile tests cover bounded realtime reconnect behavior and the LiveKit/Expo Router bootstrap architecture. Contract tests validate public code rules.

Runtime integration additionally requires PostgreSQL, Redis, LiveKit, Android SDK, and two devices. The physical-device acceptance checklist is in `HARDWARE_ACCEPTANCE.md`.

Do not mark camera/audio/WebRTC acceptance as passed from static tests alone.
