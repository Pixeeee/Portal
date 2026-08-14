import { useEffect, useState } from 'react';
import type { SessionResponse } from '@portal/contracts';
import { Body, EmptyState, Header, ListRow, Loading, Panel, Screen, StatusPill } from '@/components/ui';
import { usePortal } from '@/state/PortalProvider';

export default function History() {
  const { api } = usePortal();
  const [rows, setRows] = useState<SessionResponse[] | null>(null);
  useEffect(() => { if (api) void api.history().then(setRows); }, [api]);
  if (!rows) return <Loading />;
  return <Screen>
    <Header title="History" subtitle="Portal sessions" />
    {rows.length === 0 ? <EmptyState title="No sessions yet" body="Completed, missed, and ended sessions appear here as metadata only." /> : <Panel style={{ paddingVertical: 0 }}>{rows.map(s => {
      const duration = s.startedAt && s.endedAt ? `${Math.max(0, Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000))} min` : s.endReason || 'Session metadata only';
      return <ListRow key={s.id} title={`${s.callerPlaceName || 'Portal'} -> ${s.receiverPlaceName || 'Portal'}`} meta={`${new Date(s.createdAt).toLocaleString()} · ${duration}`} trailing={<StatusPill tone={s.status === 'ACTIVE' ? 'live' : 'ended'} label={s.status} />} />;
    })}</Panel>}
    <Body muted>Portal never stores video or audio, only session metadata.</Body>
  </Screen>;
}
