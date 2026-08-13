export type PortalState =
  | 'UNINITIALIZED' | 'BOOTSTRAPPING' | 'NEEDS_PLACE' | 'CONNECTING_CONTROL_CHANNEL'
  | 'READY' | 'REQUESTING_CONNECTION' | 'INCOMING_REQUEST' | 'PREPARING_SESSION'
  | 'CONNECTING_MEDIA' | 'LIVE' | 'RECONNECTING' | 'ENDING' | 'OFFLINE' | 'ERROR';

export type ConnectionRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED' | 'BUSY';
export type PortalSessionStatus = 'CREATED' | 'CONNECTING' | 'ACTIVE' | 'RECONNECTING' | 'ENDED' | 'FAILED';

export interface DeviceBootstrapRequest {
  installationId: string;
  deviceSecret: string;
  deviceName?: string;
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
  appVersion?: string;
}
export interface DeviceBootstrapResponse { deviceId: string; placeId: string | null; }
export interface PortalPlace {
  id: string; publicCode: string; name: string; location: string | null;
  description: string | null; online: boolean;
}
export interface CreatePlaceRequest { name: string; location?: string; description?: string; }
export interface CreateConnectionRequest { receiverPlaceId: string; }
export interface ConnectionRequestResponse { id: string; status: ConnectionRequestStatus; expiresAt: string; }
export interface SessionResponse {
  id: string; roomName: string; status: PortalSessionStatus;
  callerPlaceId: string; receiverPlaceId: string; callerPlaceName?: string; receiverPlaceName?: string; createdAt: string;
  startedAt: string | null; endedAt: string | null; endReason: string | null;
}
export interface SessionCredentials {
  sessionId: string; serverUrl: string; participantToken: string; roomName: string;
}
export interface TrustedPlace {
  id: string; trustedPlaceId: string; name: string; publicCode: string; autoAccept: boolean;
}

export type RealtimeEventType =
  | 'HELLO' | 'PORTAL_PRESENCE_CHANGED' | 'CONNECTION_REQUESTED' | 'CONNECTION_CANCELLED'
  | 'CONNECTION_ACCEPTED' | 'CONNECTION_DECLINED' | 'CONNECTION_EXPIRED' | 'CONNECTION_BUSY'
  | 'SESSION_READY' | 'SESSION_STARTED' | 'SESSION_ENDED' | 'PEER_DISCONNECTED'
  | 'TRUST_UPDATED' | 'PING' | 'PONG' | 'ERROR';

export interface RealtimeEnvelope<T = unknown> {
  type: RealtimeEventType;
  messageId: string;
  timestamp: string;
  payload: T;
}
export interface ConnectionRequestedPayload {
  requestId: string; callerPlace: PortalPlace; receiverPlace: PortalPlace; expiresAt: string; autoAcceptInSeconds?: number;
}
export interface SessionReadyPayload { sessionId: string; requestId: string; }
export interface SessionEndedPayload { sessionId: string; reason: string; }

export const PORTAL_CODE_REGEX = /^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/;
export function normalizePortalCode(value: string): string { return value.trim().toUpperCase(); }
export function isPortalCode(value: string): boolean { return PORTAL_CODE_REGEX.test(normalizePortalCode(value)); }
export function portalQrPayload(code: string): string { return `portal://connect?code=${normalizePortalCode(code)}`; }
