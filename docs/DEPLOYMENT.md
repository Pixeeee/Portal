# Deployment

## Mobile

Use an Expo development build for development and EAS/Android release build for internal distribution. Expo Go is not supported because LiveKit requires native WebRTC modules.

Set production environment before building:

```env
EXPO_PUBLIC_API_URL=https://portal-api.example.com
EXPO_PROJECT_ID=...
```

## Backend

Node.js 22+ is required by the repository engine constraint. Run PostgreSQL migrations before starting the server.

## LiveKit

Production media needs a publicly reachable secure LiveKit endpoint and its WebRTC ports/TURN configuration. Prefer LiveKit Cloud unless you specifically need self-hosting. If self-hosting, terminate TLS with trusted certificates and follow LiveKit firewall guidance.

## Docker production skeleton

Copy `infrastructure/production/.env.example` to `.env`, replace every placeholder secret/domain, then run from that directory:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Put a TLS reverse proxy/load balancer in front of the Node API and LiveKit signaling endpoint. Never expose PostgreSQL or Redis publicly.
