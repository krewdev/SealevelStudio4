import type { BuiltInstruction } from '../instructions/types';
import { getTemplateById } from '../instructions/templates';
import { mapParsedIxToBuilt, type ParsedMessageLike } from '../transaction-importer';

export type TimeTravelStep = {
  index: number;
  outerIndex: number;
  inner: boolean;
  programId: string;
  name: string;
  accounts: string[];
  built: BuiltInstruction | null;
};

export type ParsedTxLike = {
  transaction: { message: ParsedMessageLike & { instructions: any[] } };
  meta?: {
    innerInstructions?: Array<{ index: number; instructions: any[] }>;
  };
};

function pk(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v.toBase58 === 'function') return v.toBase58();
  if (v.pubkey) return pk(v.pubkey);
  return String(v);
}

export function flattenToTimeTravelSteps(tx: ParsedTxLike, signature = 'imported'): TimeTravelStep[] {
  const message = tx.transaction.message;
  const outers = message.instructions || [];
  const inners = tx.meta?.innerInstructions || [];
  const steps: TimeTravelStep[] = [];
  let n = 0;

  outers.forEach((ix: any, outerIndex: number) => {
    const built = mapParsedIxToBuilt(ix, signature, message.accountKeys || []);
    steps.push({
      index: n++,
      outerIndex,
      inner: false,
      programId: pk(ix.programId),
      name: built?.template.name || ix.program || 'Instruction',
      accounts: built ? Object.values(built.accounts).filter(Boolean) : (ix.accounts || []).map(pk),
      built,
    });
    const group = inners.find((g) => g.index === outerIndex);
    for (const inner of group?.instructions || []) {
      const b = mapParsedIxToBuilt(inner, signature, message.accountKeys || []);
      steps.push({
        index: n++,
        outerIndex,
        inner: true,
        programId: pk(inner.programId),
        name: `↳ ${b?.template.name || inner.program || 'CPI'}`,
        accounts: b ? Object.values(b.accounts).filter(Boolean) : (inner.accounts || []).map(pk),
        built: b,
      });
    }
  });

  return steps;
}

/** Remaining outer instructions from this step onward, as builder cards. */
export function forkDraftFromStep(steps: TimeTravelStep[], fromIndex: number): BuiltInstruction[] {
  const start = Math.max(0, fromIndex);
  const custom = getTemplateById('custom_instruction');
  return steps
    .slice(start)
    .filter((s) => !s.inner)
    .map((s) => {
      if (s.built) return s.built;
      const accounts: Record<string, string> = {};
      const accDefs =
        custom?.accounts.slice() ||
        s.accounts.map((addr, i) => {
          const name = `Account ${i + 1}`;
          accounts[name] = addr;
          return { name, type: 'writable' as const, description: name };
        });
      s.accounts.forEach((addr, i) => {
        accounts[`Account ${i + 1}`] = addr;
      });
      return {
        template: {
          ...(custom || {
            id: 'custom_instruction',
            programId: s.programId,
            name: s.name,
            description: 'Forked',
            category: 'custom' as const,
            accounts: accDefs,
            args: [],
          }),
          programId: s.programId || custom?.programId || '',
          name: s.name,
        },
        accounts,
        args: {},
      };
    });
}
