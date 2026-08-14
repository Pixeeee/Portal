# Environment

This repository has three distinct environment shapes. Do not reuse local LAN settings for staging or production Android builds.

## Local Development

Use this when the backend, PostgreSQL, Redis, LiveKit, and Android device are on the same developer LAN.

```bash
cp .env.example .env
npm install
npm run infra:up
npm run db:migrate
npm run dev:server
```

Set `.env` to your actual LAN IP:

```env
LIVEKIT_NODE_IP=192.168.1.25
LIVEKIT_PUBLIC_URL=ws://192.168.1.25:7880
EXPO_PUBLIC_API_URL=http://192.168.1.25:8080
CLIENT_NETWORK_TARGET=physical-device
EXPO_PUBLIC_CLIENT_NETWORK_TARGET=physical-device
```

For Android emulator development only, use `10.0.2.2` and set both client network targets to `android-emulator`. Never use that address for a physical device or production build.

## Physical Phone Development

Install an Expo development build. Expo Go is not supported because LiveKit React Native/WebRTC needs native modules.

```bash
npm run prebuild:android
npm run android
npm run dev:mobile
```

The phone must reach the backend and LiveKit URLs over Wi-Fi or mobile data. For local LAN testing, disable VPNs/firewalls that block inbound TCP 8080, TCP 7880-7881, and UDP 7882.

## Staging

Staging must use public HTTPS and WSS endpoints:

```env
NODE_ENV=production
EXPO_PUBLIC_API_URL=https://portal-api-staging.example.com
LIVEKIT_PUBLIC_URL=wss://portal-livekit-staging.example.com
```

The backend generates LiveKit tokens. The mobile app must never include `LIVEKIT_API_SECRET`.

## Production

Production must use public DNS, trusted TLS certificates, and non-placeholder secrets:

```env
NODE_ENV=production
DATABASE_URL=postgres://...
REDIS_URL=redis://...
LIVEKIT_URL=http://livekit:7880
LIVEKIT_PUBLIC_URL=wss://livekit.example.com
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
DEVICE_SECRET_PEPPER=at-least-32-random-characters
EXPO_PUBLIC_API_URL=https://portal-api.example.com
```

Production config validation rejects private client-facing endpoints such as `localhost`, `127.0.0.1`, `10.0.2.2`, `10.*`, `172.16-31.*`, and `192.168.*`.

## Remote City Test

The final remote test requires two Android devices on different internet connections. A Wi-Fi versus cellular test is acceptable as a pre-production proxy; Manila versus Lucena is the final human acceptance scenario.

1. Device A creates a Portal place.
2. Device B creates a Portal place.
3. Both connect to the same public backend and LiveKit deployment.
4. A resolves B by code and QR.
5. A sends a request.
6. B declines once.
7. A retries.
8. B accepts.
9. Both publish camera and microphone.
10. Both render remote media.
11. One side ends.
12. Both return to Ready with session state cleaned up.
