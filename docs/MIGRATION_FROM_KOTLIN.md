# Kotlin/Ktor -> Expo Router/npm Mapping

| Original | npm/Expo transformation |
|---|---|
| Kotlin Android / Jetpack Compose | Expo SDK 57 / React Native / Expo Router / TypeScript |
| Navigation Compose | file-based routes in `apps/mobile/src/app` |
| Hilt | React context + module composition |
| Coroutines / Flow | async/await + React state/effects |
| Ktor Client | `fetch` |
| Ktor WebSockets | React Native WebSocket client |
| Room | Expo SQLite |
| Proto DataStore | typed local SQLite settings + SecureStore for secrets |
| Android Keystore wrapper | Expo SecureStore |
| CameraX + ML Kit | Expo Camera barcode scanner |
| ZXing generation | react-native-qrcode-svg |
| LiveKit Android SDK | LiveKit React Native SDK + Expo config plugin |
| Ktor Server | Node.js/TypeScript HTTP server |
| Exposed/Hikari/Flyway | `pg` pool + ordered SQL migrations |
| Kotlin server models | shared `@portal/contracts` TypeScript package |
| Redis | Redis via ioredis |
| Docker services | unchanged infrastructure, invoked through npm scripts |

All product rules are retained: device-based identity, one-to-one Portal requests, typed request/session state, Redis presence, LiveKit media, directional trust, local favorites/recents, metadata-only history, and no human accounts/RBAC/chat/recording.
