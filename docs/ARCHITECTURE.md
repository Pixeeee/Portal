# Architecture

## Product invariant

One Android installation represents one physical Portal place in V1. Identity is `installation -> device -> place`; there is no user or role layer.

## Runtime

```text
Expo Router Android app
  |-- HTTPS REST -----------------> Node/TypeScript backend
  |-- WebSocket ------------------> Node realtime control channel
  |-- WebRTC ---------------------> LiveKit SFU
                                      ^
Node backend -------------------------| token/room control
  |-- PostgreSQL  authoritative metadata
  `-- Redis       online presence, rate limits
```

Video/audio never pass through the control WebSocket or Node backend.

## npm workspaces

- `@portal/mobile`: Expo Router app
- `@portal/server`: backend
- `@portal/contracts`: typed request/state/realtime contracts shared by both

## Mobile routing

Expo Router routes represent the product state transitions: onboarding, home, connect/scan/preview, outgoing/incoming request, live session, recents/favorites/trust/history/settings/diagnostics.

Critical control state uses the typed `PortalState` union from `@portal/contracts`, not a collection of unrelated booleans.
