import type { FirewallReport } from './firewall';

export type LiveCapabilityInput = {
  signerSource: 'phantom' | 'studio' | null;
  canSignVersioned: boolean;
  disarmed: boolean;
  patternAllowed: boolean;
  replayOk: boolean;
  riskAck: boolean;
  riskAckAt?: number | null;
  dailyLossSol: number;
  dailyLossCap: number;
  firewall?: FirewallReport | null;
  attestationOk?: boolean;
  requireAttestation?: boolean;
  now?: number;
  ackMaxAgeMs?: number;
};

export type LiveCapability = {
  ok: boolean;
  blockers: string[];
  warnings: string[];
  ackAgeMs: number | null;
};

export function evaluateLiveCapability(input: LiveCapabilityInput): LiveCapability {
  const now = input.now ?? Date.now();
  const blockers: string[] = [];
  const warnings: string[] = [];
  const ackMax = input.ackMaxAgeMs ?? 24 * 60 * 60 * 1000;
  const ackAgeMs =
    input.riskAck && input.riskAckAt ? Math.max(0, now - input.riskAckAt) : input.riskAck ? 0 : null;

  if (input.disarmed) blockers.push('Kill switch is on.');
  if (!input.patternAllowed) blockers.push('Pattern is paper-only.');
  if (input.signerSource !== 'phantom' || !input.canSignVersioned) {
    blockers.push('Live capability requires Phantom (versioned txs).');
  }
  if (!input.replayOk) blockers.push('Quote replay has not unlocked this mint.');
  if (!input.riskAck) blockers.push('Risk acknowledgement missing.');
  if (ackAgeMs != null && ackAgeMs > ackMax) {
    blockers.push('Risk ack expired — re-check the live box.');
  }
  if (input.dailyLossSol >= input.dailyLossCap) {
    blockers.push(`Daily loss ${input.dailyLossSol.toFixed(4)} ≥ cap ${input.dailyLossCap}.`);
  }
  if (input.requireAttestation && !input.attestationOk) {
    blockers.push('Live run requires a held beta/subscription attestation.');
  }
  if (input.firewall && !input.firewall.ok) {
    blockers.push(`Firewall blocked: ${input.firewall.violations.map((v) => v.message).join(' ')}`);
  } else if (input.firewall?.violations.some((v) => v.code === 'disabled')) {
    warnings.push('Signing firewall is off.');
  }

  return { ok: blockers.length === 0, blockers, warnings, ackAgeMs };
}
