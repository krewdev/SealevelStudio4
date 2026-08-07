import type { TransactionDraft } from '../instructions/types';

export type FailurePatch = {
  id: string;
  title: string;
  detail: string;
  severity: 'fix' | 'warn';
  apply: {
    type: 'hint' | 'clear-account' | 'set-arg' | 'remove-ix';
    instructionIndex?: number;
    accountName?: string;
    argName?: string;
    value?: string;
  };
};

function blob(err?: string | null, logs?: string[]): string {
  return `${err || ''}\n${(logs || []).join('\n')}`.toLowerCase();
}

export function suggestFailurePatches(
  err: string | null | undefined,
  logs: string[] | undefined,
  draft?: TransactionDraft | null
): FailurePatch[] {
  const text = blob(err, logs);
  const patches: FailurePatch[] = [];
  const ixs = draft?.instructions || [];

  const push = (p: FailurePatch) => {
    if (!patches.some((x) => x.id === p.id)) patches.push(p);
  };

  if (!err && !(logs && logs.length)) return patches;

  if (/insufficient(?: funds|lamports)|transfer: insufficient|0x1\b/.test(text)) {
    push({
      id: 'insufficient-funds',
      title: 'Payer lacks lamports',
      detail: 'Simulation ran out of SOL for rent, tip, or transfer. Lower amount or switch to a funded Phantom.',
      severity: 'fix',
      apply: { type: 'hint' },
    });
    const transferIdx = ixs.findIndex((ix) => ix.template.id === 'system_transfer');
    if (transferIdx >= 0) {
      push({
        id: 'halve-transfer',
        title: 'Halve the transfer amount',
        detail: `Instruction ${transferIdx + 1} is a SOL transfer — try a smaller lamport amount.`,
        severity: 'fix',
        apply: {
          type: 'set-arg',
          instructionIndex: transferIdx,
          argName: 'amount',
          value: String(Math.max(1, Math.floor(Number(ixs[transferIdx]!.args?.amount || 0) / 2))),
        },
      });
    }
  }

  if (/account(?:notfound| does not exist)|could not find account|invalid account data/.test(text)) {
    push({
      id: 'missing-account',
      title: 'Account missing or wrong type',
      detail: 'An account in the write set is empty or not the type the program expected. Often mint vs ATA mix-up.',
      severity: 'fix',
      apply: { type: 'hint' },
    });
    ixs.forEach((ix, index) => {
      const mintish = Object.entries(ix.accounts).find(([name]) => /mint/i.test(name));
      const dest = Object.entries(ix.accounts).find(([name]) =>
        /dest|ata|tokenaccount|associated/i.test(name)
      );
      if (mintish && dest && mintish[1] && dest[1] && mintish[1] === dest[1]) {
        push({
          id: `mint-as-ata-${index}`,
          title: `Ix ${index + 1}: mint passed as destination`,
          detail: `${dest[0]} equals mint. Clear destination and paste the ATA.`,
          severity: 'fix',
          apply: { type: 'clear-account', instructionIndex: index, accountName: dest[0] },
        });
      }
    });
  }

  if (/associated.?token|ata\b/.test(text)) {
    push({
      id: 'need-ata',
      title: 'Create ATA first',
      detail: 'Add an “Create ATA” instruction before the token transfer/mint, same wallet + mint.',
      severity: 'fix',
      apply: { type: 'hint' },
    });
  }

  if (/writable privilege|cannot debit|privilege escalated|not a signer/.test(text)) {
    push({
      id: 'signer-writable',
      title: 'Signer / writable bit wrong',
      detail: 'A key was passed readonly but the program must debit it, or a non-signer was marked signer.',
      severity: 'fix',
      apply: { type: 'hint' },
    });
  }

  if (/blockhash|expired|0x0\b.*blockhash/.test(text)) {
    push({
      id: 'stale-blockhash',
      title: 'Stale blockhash',
      detail: 'Hit Build again to refresh recentBlockhash before Execute.',
      severity: 'warn',
      apply: { type: 'hint' },
    });
  }

  if (/custom program error|0x/.test(text) && patches.length === 0) {
    push({
      id: 'custom-error',
      title: 'Program rejected the ix',
      detail: 'Read the last program log line. Grok can only highlight — apply the account/arg edit yourself.',
      severity: 'warn',
      apply: { type: 'hint' },
    });
  }

  return patches.slice(0, 6);
}

export function applyFailurePatch(draft: TransactionDraft, patch: FailurePatch): TransactionDraft {
  const instructions = draft.instructions.map((ix) => ({
    ...ix,
    accounts: { ...ix.accounts },
    args: { ...ix.args },
  }));
  const idx = patch.apply.instructionIndex;
  if (patch.apply.type === 'clear-account' && idx != null && patch.apply.accountName) {
    const ix = instructions[idx];
    if (ix) delete ix.accounts[patch.apply.accountName];
  }
  if (patch.apply.type === 'set-arg' && idx != null && patch.apply.argName) {
    const ix = instructions[idx];
    if (ix) {
      const n = Number(patch.apply.value);
      ix.args[patch.apply.argName] = Number.isFinite(n) ? n : patch.apply.value;
    }
  }
  if (patch.apply.type === 'remove-ix' && idx != null) {
    instructions.splice(idx, 1);
  }
  return { ...draft, instructions };
}
