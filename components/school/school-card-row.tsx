'use client';

import { useState, useTransition } from 'react';

import { schoolReplaceCardAction, schoolSetCardStatusAction } from '@/app/actions/cards';
import { FormError, FormSuccess } from '@/components/auth/form-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SchoolCardRowProps = {
  cardId: string;
  status: string;
  credentialReference: string;
  learnerName: string;
  allowUidPilot: boolean;
};

export function SchoolCardRow({
  cardId,
  status,
  credentialReference,
  learnerName,
  allowUidPilot,
}: SchoolCardRowProps) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [newUid, setNewUid] = useState('');
  const [reason, setReason] = useState('');

  const runStatus = (newStatus: string, defaultReason: string) => {
    setMessage(undefined);
    setError(undefined);
    start(async () => {
      const result = await schoolSetCardStatusAction(cardId, newStatus, reason.trim() || defaultReason);
      if (result.error) setError(result.error);
      else setMessage(result.success);
    });
  };

  const runReplace = () => {
    setMessage(undefined);
    setError(undefined);
    start(async () => {
      const result = await schoolReplaceCardAction(cardId, newUid, reason.trim() || 'Replacement card');
      if (result.error) setError(result.error);
      else {
        setMessage(result.success);
        setReplaceOpen(false);
        setNewUid('');
      }
    });
  };

  const terminal = ['lost', 'stolen', 'deactivated', 'replaced'].includes(status);

  return (
    <li className="space-y-3 p-4">
      <div>
        <span className="font-medium">{learnerName}</span>
        <span className="text-muted-foreground"> · {status}</span>
        <span className="block text-xs text-muted-foreground">{credentialReference}</span>
      </div>
      <FormError message={error} />
      <FormSuccess message={message} />
      {!terminal ? (
        <div className="flex flex-wrap gap-2">
          {status === 'active' ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runStatus('frozen', 'Admin freeze')}>
              Freeze
            </Button>
          ) : null}
          {status === 'frozen' ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runStatus('active', 'Unfrozen by admin')}>
              Unfreeze
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runStatus('lost', 'Reported lost')}>
            Mark lost
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runStatus('stolen', 'Reported stolen')}>
            Mark stolen
          </Button>
          {allowUidPilot ? (
            <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => setReplaceOpen((v) => !v)}>
              Replace UID
            </Button>
          ) : null}
        </div>
      ) : null}
      {replaceOpen && allowUidPilot ? (
        <div className="space-y-2 rounded-md border border-border p-3">
          <Label htmlFor={`new-uid-${cardId}`}>New card UID</Label>
          <Input
            id={`new-uid-${cardId}`}
            value={newUid}
            onChange={(e) => setNewUid(e.target.value)}
            placeholder="New blank card UID"
          />
          <Label htmlFor={`reason-${cardId}`}>Reason (optional)</Label>
          <Input id={`reason-${cardId}`} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button type="button" size="sm" disabled={pending || !newUid.trim()} onClick={runReplace}>
            Issue replacement
          </Button>
        </div>
      ) : null}
    </li>
  );
}
