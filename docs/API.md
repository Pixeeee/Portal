# API

Base path: `/api/v1`

## Device
- `POST /devices/bootstrap`
- `POST /devices/push-token`
- `POST /devices/revoke-self`

## Place
- `POST /places`
- `GET /places/me`
- `PATCH /places/me`
- `GET /places/resolve/{publicCode}`

## Connection requests
- `POST /connections/requests`
- `GET /connections/requests/{id}`
- `POST /connections/requests/{id}/accept`
- `POST /connections/requests/{id}/decline`
- `POST /connections/requests/{id}/cancel`

## Sessions
- `GET /sessions/recent`
- `GET /sessions/{id}`
- `POST /sessions/{id}/credentials`
- `POST /sessions/{id}/started`
- `POST /sessions/{id}/end`

## Trusted places
- `GET /trusted`
- `POST /trusted`
- `PATCH /trusted/{id}`
- `DELETE /trusted/{id}`

## Diagnostics
- `GET /diagnostics`
- `GET /health/live`
- `GET /health/ready`

Authenticated requests use `Authorization: PortalDevice <deviceId>:<deviceSecret>` over TLS in production.
