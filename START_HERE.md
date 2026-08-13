# Start Here

This edition is npm + Expo Router + TypeScript.

```bash
npm install
cp .env.example .env
# edit the LAN IP and DEVICE_SECRET_PEPPER in .env
npm run infra:up
npm run db:migrate
npm run dev:server
```

In a second terminal:

```bash
npm run android
```

Use the installed Portal development build. Do **not** use Expo Go because LiveKit/WebRTC requires native modules.

For physical phones, set all three values to your computer's LAN IP before starting:

```env
LIVEKIT_NODE_IP=192.168.1.10
LIVEKIT_PUBLIC_URL=ws://192.168.1.10:7880
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080
```

Run `npm run verify` any time. After the backend is running, `npm run test:integration` exercises the two-device control-plane flow without camera hardware.
