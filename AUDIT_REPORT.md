# Expo Router/npm Transformation Audit

Date: 2026-08-13

## Transformation result

The application layer has been converted from Kotlin Android + Ktor to an npm workspaces monorepo:

- `apps/mobile`: Expo SDK 57, Expo Router, React Native, TypeScript
- `apps/server`: Node.js 22+, TypeScript control backend
- `packages/contracts`: shared typed REST/WebSocket/state contracts
- PostgreSQL, Redis, and LiveKit remain infrastructure because they are runtime services, not application package managers.

No Kotlin, `.kts`, or maintained Gradle application source is included. Expo generates Android native files locally during prebuild because LiveKit/WebRTC requires native modules.

## Preserved product rules

- installation -> device -> place identity
- no human accounts, roles, RBAC, departments, meetings, chat, social discovery, or recording
- unique restricted-alphabet Portal codes
- QR resolve/preview before connection
- Redis online presence and persistent realtime control WebSocket
- PENDING/ACCEPTED/DECLINED/CANCELLED/EXPIRED/BUSY request states
- one active session per physical device enforced in PostgreSQL
- backend-generated short-lived LiveKit credentials
- fullscreen remote video, local preview, mute/camera/switch/speaker/end controls
- reconnect behavior
- local favorites/recents/preferences via Expo SQLite
- directional trusted places and 3-second auto-accept safety countdown
- metadata-only history
- push notification fallback

## Verification performed in this sandbox

- static project audit: **92/92 PASS**
- `@portal/contracts` TypeScript compilation: **PASS**
- contracts unit test: **PASS**
- TypeScript/TSX syntax parser gate over apps/packages: **PASS**
- development/production Docker Compose YAML parse: **PASS**
- LiveKit YAML parse: **PASS**
- GitHub Actions YAML parse: **PASS**
- forbidden Kotlin/Gradle/native-secret file scan: **PASS**
- 20-item physical acceptance checklist present: **PASS**

## Gate not executed here

`npm install` could not finish because this sandbox cannot access the npm registry. An offline attempt confirms the Expo/LiveKit dependencies are not cached. Therefore dependency-resolved `npm run typecheck`, full Node tests/build, Expo prebuild, Android compilation, and physical two-device WebRTC tests are not falsely marked as passed.

`.github/workflows/ci.yml` runs install, verification, typecheck, tests, and build on a networked CI runner.

## Runtime certification still required

Use `docs/HARDWARE_ACCEPTANCE.md` with two physical Android devices to certify actual camera, microphone, WebRTC, QR camera scanning, reconnect, busy, and trusted auto-connect behavior.
