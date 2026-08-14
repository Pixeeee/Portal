# Company Portal — Expo Router / npm Edition

Internal Android place-to-place live video Portal. Every installation represents a physical place. There are no human accounts, usernames, passwords, roles, RBAC, meetings, chat, social discovery, or recording in V1.

This is the npm/TypeScript transformation of the original Kotlin/Ktor specification. Application source is now Expo Router + React Native + TypeScript on mobile, Node.js + TypeScript on the backend, and shared TypeScript contracts in an npm workspace.

## Stack

- Mobile: Expo SDK 56, Expo Router, React Native, TypeScript
- Media: LiveKit React Native/WebRTC
- QR: Expo Camera + react-native-qrcode-svg
- Local data: Expo SQLite
- Device secret: Expo SecureStore
- Push fallback: Expo Notifications
- Backend: Node.js 22+, TypeScript, native `http` + `ws`
- Database: PostgreSQL
- Presence/cache: Redis
- Media server: LiveKit
- Package manager: npm workspaces

> LiveKit requires native WebRTC modules. This project intentionally uses an Expo **development build**, not Expo Go. `npm run android` generates the native Android project through Expo prebuild/CNG when needed; you do not maintain Kotlin/Gradle application source.

## Repository

```text
company-portal-expo-router/
├── apps/
│   ├── mobile/          # Expo Router app
│   └── server/          # Node/TypeScript control backend
├── packages/
│   └── contracts/       # shared API/WebSocket types
├── infrastructure/
│   ├── livekit/
│   └── production/
├── docs/
├── scripts/
├── docker-compose.yml
└── package.json
```

## Requirements

- Node.js 22.13+ and npm 10+
- Android Studio + Android SDK 36 for local Android builds
- JDK required by the Android toolchain managed by Android Studio/Expo
- Docker only when self-hosting PostgreSQL, Redis, and LiveKit locally
- Two physical Android devices recommended for final video/audio validation

## Fastest local start

### 1. Install npm dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set your computer LAN IP, for example `192.168.1.25`:

```env
LIVEKIT_NODE_IP=192.168.1.25
LIVEKIT_PUBLIC_URL=ws://192.168.1.25:7880
EXPO_PUBLIC_API_URL=http://192.168.1.25:8080
DEVICE_SECRET_PEPPER=replace-with-at-least-32-random-characters
```

For the Android emulator, use `10.0.2.2` instead of the LAN IP.

### 3. Start local infrastructure

```bash
npm run infra:up
```

This starts PostgreSQL, Redis, and LiveKit. The application backend remains a normal npm process.

### 4. Apply migrations

```bash
npm run db:migrate
```

### 5. Start the backend

```bash
npm run dev:server
```

Verify:

```bash
curl http://localhost:8080/health/ready
```

### 6. Build/run Android

In a second terminal:

```bash
npm run android
```

This invokes Expo's Android development-build workflow. The first build generates `apps/mobile/android/` locally; that generated directory is gitignored.

After the development build is installed once, JavaScript-only changes can usually be served with:

```bash
npm run dev:mobile
```

Then open the installed **Portal development build**, not Expo Go.

## Two-device acceptance test

1. Install the development build/APK on Device A and Device B.
2. Device A creates `Head Office`.
3. Device B creates `Davao Farm`.
4. Confirm both receive unique `XXXX-XXXX` codes and show Online.
5. A resolves B by code.
6. Repeat using B's QR code; QR scanning must only resolve/preview, not auto-call.
7. A sends a connection request.
8. B declines once; confirm A returns to Ready.
9. Retry; B accepts.
10. Confirm two-way video and audio.
11. Test mute/unmute, camera off/on, front/back switch, speaker/earpiece, end.
12. Confirm history metadata is saved and no media is recorded.
13. Interrupt networking temporarily and confirm reconnect behavior.
14. During one active session, attempt another call and confirm Busy.
15. Add a directional trusted place, enable auto-accept, and confirm the 3-second safety countdown/cancel path.

See `docs/HARDWARE_ACCEPTANCE.md` for the complete checklist.

## Common commands

```bash
npm install
npm run verify
npm run verify:production
npm run build
npm test
npm run typecheck
npm run infra:up
npm run infra:logs
npm run infra:down
npm run db:migrate
npm run dev:server
npm run dev:mobile
npm run prebuild:android
npm run android
```

## Expo configuration

`apps/mobile/app.config.ts` preserves Android minSdk 26 and API 36 through `expo-build-properties`. The app is Android-only in Expo configuration and uses the `portal://` URL scheme for QR/deep links.

## Device identity

On first launch the mobile app generates:

- `installationId` — UUID
- `deviceSecret` — cryptographically random 256-bit value

The secret is stored in SecureStore. The backend stores only an HMAC hash. Requests authenticate as a device, never as a human user.

## Local database

Expo SQLite stores only:

- favorites
- recents
- cached place records
- pending safe actions
- local media preferences

PostgreSQL remains the authoritative server database.

## Production

For production, use TLS for the API and `wss://` for LiveKit. Do not use the development LiveKit keys. A production skeleton is in `infrastructure/production/`.

If using LiveKit Cloud instead of self-hosting LiveKit, point `LIVEKIT_URL`, `LIVEKIT_PUBLIC_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` at the cloud project and you can omit the local LiveKit container.

Read:

- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT.md`
- `docs/MIGRATION_FROM_KOTLIN.md`
- `docs/PHASES.md`
- `docs/HARDWARE_ACCEPTANCE.md`
