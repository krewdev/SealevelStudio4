import type { BuiltInstruction } from '../instructions/types';
import { getTemplateById } from '../instructions/templates';
import type { HandshakeOffer } from './handshake';

export const CEREMONY_LAMPORTS = 1_000_000; // 0.001 SOL

export function ceremonyTransferIx(from: string, to: string, lamports: number): BuiltInstruction {
  const template = getTemplateById('system_transfer');
  if (!template) throw new Error('system_transfer template missing');
  return {
    template,
    accounts: { from, to },
    args: { amount: lamports },
  };
}

/** A sends 0.001 SOL to B. B sends 1 lamport ack + will pay Jito tip on prepare. */
export function buildCeremonyInstructions(partyA: string, partyB: string): {
  a: BuiltInstruction[];
  b: BuiltInstruction[];
} {
  return {
    a: [ceremonyTransferIx(partyA, partyB, CEREMONY_LAMPORTS)],
    b: [ceremonyTransferIx(partyB, partyA, 1)],
  };
}

export type CeremonyStepId =
  | 'phantom'
  | 'counterparty'
  | 'offer'
  | 'prepare'
  | 'signA'
  | 'signB'
  | 'submit'
  | 'landed';

export type CeremonyStep = { id: CeremonyStepId; label: string; done: boolean; detail?: string };

export function ceremonyChecklist(
  offer: HandshakeOffer | null,
  activeAddress: string | null
): CeremonyStep[] {
  const a = offer?.partyA.address;
  const b = offer?.partyB?.address;
  return [
    {
      id: 'phantom',
      label: 'Phantom connected',
      done: Boolean(activeAddress),
      detail: activeAddress ? activeAddress.slice(0, 4) + '…' : undefined,
    },
    {
      id: 'counterparty',
      label: 'Both addresses set',
      done: Boolean(a && b && a !== b),
      detail: a && b ? `${a.slice(0, 4)}… ↔ ${b.slice(0, 4)}…` : undefined,
    },
    {
      id: 'offer',
      label: 'Room created',
      done: Boolean(offer?.roomId || offer?.id),
      detail: offer?.roomId ? `/h/${offer.roomId}` : undefined,
    },
    {
      id: 'prepare',
      label: 'Shared blockhash frozen',
      done: Boolean(offer?.unsignedTxA && offer?.unsignedTxB),
    },
    {
      id: 'signA',
      label: 'Party A signed',
      done: Boolean(offer?.partyA.signedTxBase64),
    },
    {
      id: 'signB',
      label: 'Party B signed',
      done: Boolean(offer?.partyB?.signedTxBase64),
    },
    {
      id: 'submit',
      label: 'Bundle submitted',
      done: Boolean(offer?.bundleId) || offer?.status === 'landed' || offer?.status === 'submitted',
      detail: offer?.bundleId?.slice(0, 10),
    },
    {
      id: 'landed',
      label: 'Landed on-chain',
      done: offer?.status === 'landed' && Boolean(offer.landedSignatures?.length),
      detail: offer?.landedSignatures?.[0]?.slice(0, 10),
    },
  ];
}
