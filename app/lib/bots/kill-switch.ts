export const DISARM_EVENT = 'sealevel-disarm';

let disarmed = false;
let reason = '';

export function isDisarmed(): boolean {
  return disarmed;
}

export function disarmReason(): string {
  return reason;
}

export function disarmAll(why = 'manual'): void {
  disarmed = true;
  reason = why;
  try {
    localStorage.removeItem('sealevel-sniper-arm');
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DISARM_EVENT, { detail: { reason: why, disarmed: true } }));
    window.dispatchEvent(new CustomEvent('sealevel-sniper-arm'));
    window.dispatchEvent(new CustomEvent('sealevel-paper-bot'));
  }
}

export function clearDisarm(): void {
  disarmed = false;
  reason = '';
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DISARM_EVENT, { detail: { reason: '', disarmed: false } }));
  }
}

export function subscribeDisarm(fn: (state: { disarmed: boolean; reason: string }) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => fn({ disarmed, reason });
  window.addEventListener(DISARM_EVENT, handler);
  fn({ disarmed, reason });
  return () => window.removeEventListener(DISARM_EVENT, handler);
}
