import type { StateDiffResult } from '../tx/state-diff';
import type { BuiltInstruction, TransactionDraft } from '../instructions/types';
import { DEFAULT_ALLOWED_PROGRAMS, programLabel } from './programs';

export type FirewallPolicy = {
  enabled: boolean;
  maxPayerSolSpend: number;
  maxWritableAccounts: number;
  allowUnknownPrograms: boolean;
  allowedPrograms: string[];
  requireKnownOwnerUnchanged: boolean;
};

export type FirewallViolation = {
  code:
    | 'disabled'
    | 'no-sim'
    | 'sim-failed'
    | 'payer-spend'
    | 'adversary-spend'
    | 'unknown-program'
    | 'writable-cap'
    | 'owner-change';
  message: string;
};

export type FirewallReport = {
  ok: boolean;
  violations: FirewallViolation[];
  payerDeltaSol: number | null;
  programs: string[];
  writable: string[];
};

export const DEFAULT_FIREWALL_POLICY: FirewallPolicy = {
  enabled: true,
  maxPayerSolSpend: 0.05,
  maxWritableAccounts: 24,
  allowUnknownPrograms: false,
  allowedPrograms: DEFAULT_ALLOWED_PROGRAMS,
  requireKnownOwnerUnchanged: true,
};

export const FIREWALL_STORAGE_KEY = 'sealevel-signing-firewall';

export function loadFirewallPolicy(): FirewallPolicy {
  if (typeof window === 'undefined') return { ...DEFAULT_FIREWALL_POLICY };
  try {
    const raw = localStorage.getItem(FIREWALL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FIREWALL_POLICY };
    const parsed = JSON.parse(raw) as Partial<FirewallPolicy>;
    return {
      ...DEFAULT_FIREWALL_POLICY,
      ...parsed,
      allowedPrograms: parsed.allowedPrograms?.length
        ? parsed.allowedPrograms
        : DEFAULT_FIREWALL_POLICY.allowedPrograms,
    };
  } catch {
    return { ...DEFAULT_FIREWALL_POLICY };
  }
}

export function saveFirewallPolicy(policy: FirewallPolicy) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FIREWALL_STORAGE_KEY, JSON.stringify(policy));
    window.dispatchEvent(new CustomEvent('sealevel-firewall', { detail: policy }));
  } catch {
    /* ignore */
  }
}

export function collectDraftSurface(draft: TransactionDraft): {
  programs: string[];
  writable: string[];
  signers: string[];
} {
  const programs = new Set<string>();
  const writable = new Set<string>();
  const signers = new Set<string>();
  for (const ix of draft.instructions || []) {
    if (ix.template.programId) programs.add(ix.template.programId);
    for (const acc of ix.template.accounts || []) {
      const pk = ix.accounts[acc.name];
      if (!pk) continue;
      if (acc.type === 'signer') signers.add(pk);
      if (acc.type !== 'readonly') writable.add(pk);
    }
  }
  return { programs: [...programs], writable: [...writable], signers: [...signers] };
}

export function evaluateFirewall(opts: {
  policy: FirewallPolicy;
  sim?: StateDiffResult | null;
  draft?: TransactionDraft | null;
  extraPrograms?: string[];
  /** Worst successful-sim payer Δ (SOL) from live adversarial forks. */
  worstAdversaryDeltaSol?: number | null;
}): FirewallReport {
  const { policy } = opts;
  const surface = opts.draft
    ? collectDraftSurface(opts.draft)
    : { programs: [] as string[], writable: [] as string[], signers: [] as string[] };
  const programs = [...new Set([...(opts.extraPrograms || []), ...surface.programs])];
  const writable = surface.writable;
  const payerRow = opts.sim?.diffs.find((d) => d.role === 'payer');
  const payerDeltaSol =
    payerRow != null ? payerRow.deltaLamports / 1e9 : opts.sim?.diffs.length ? null : null;

  if (!policy.enabled) {
    return {
      ok: true,
      violations: [{ code: 'disabled', message: 'Firewall off — any sim may be signed.' }],
      payerDeltaSol: payerDeltaSol ?? null,
      programs,
      writable,
    };
  }

  const violations: FirewallViolation[] = [];
  if (!opts.sim) {
    violations.push({ code: 'no-sim', message: 'Build & simulate before signing. Firewall needs a diff.' });
  } else if (opts.sim.err) {
    violations.push({ code: 'sim-failed', message: `Simulation failed: ${opts.sim.err}` });
  }

  if (payerRow && payerRow.deltaLamports < 0) {
    const spend = Math.abs(payerRow.deltaLamports) / 1e9;
    if (spend > policy.maxPayerSolSpend + 1e-12) {
      violations.push({
        code: 'payer-spend',
        message: `Payer would spend ${spend.toFixed(6)} SOL > cap ${policy.maxPayerSolSpend} SOL.`,
      });
    }
  }

  if (
    opts.worstAdversaryDeltaSol != null &&
    opts.worstAdversaryDeltaSol < 0 &&
    Math.abs(opts.worstAdversaryDeltaSol) > policy.maxPayerSolSpend + 1e-12
  ) {
    violations.push({
      code: 'adversary-spend',
      message: `Worst live adversarial fork spends ${Math.abs(opts.worstAdversaryDeltaSol).toFixed(6)} SOL > cap ${policy.maxPayerSolSpend} SOL.`,
    });
  }

  if (!policy.allowUnknownPrograms) {
    const allow = new Set(policy.allowedPrograms);
    for (const p of programs) {
      if (p && !allow.has(p)) {
        violations.push({
          code: 'unknown-program',
          message: `Program ${programLabel(p)} is not on the allowlist.`,
        });
      }
    }
  }

  if (writable.length > policy.maxWritableAccounts) {
    violations.push({
      code: 'writable-cap',
      message: `${writable.length} writable accounts > cap ${policy.maxWritableAccounts}.`,
    });
  }

  if (policy.requireKnownOwnerUnchanged && opts.sim) {
    for (const d of opts.sim.diffs) {
      if (d.ownerBefore && d.ownerAfter && d.ownerBefore !== d.ownerAfter) {
        violations.push({
          code: 'owner-change',
          message: `Account ${d.address.slice(0, 4)}… owner changes ${d.ownerBefore.slice(0, 4)}… → ${d.ownerAfter.slice(0, 4)}….`,
        });
      }
    }
  }

  const blocking = violations.filter((v) => v.code !== 'disabled');
  return {
    ok: blocking.length === 0,
    violations,
    payerDeltaSol: payerRow != null ? payerRow.deltaLamports / 1e9 : null,
    programs,
    writable,
  };
}

export function draftFromInstructions(instructions: BuiltInstruction[]): TransactionDraft {
  return { instructions };
}
