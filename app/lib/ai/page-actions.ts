export const SAFE_CLICK_TARGETS = new Set([
  'nav-home',
  'nav-scanner',
  'nav-builder',
  'nav-bots',
  'nav-charts',
  'nav-kol-mapper',
  'nav-wallets',
  'nav-inspector',
  'desk-start-paper',
  'desk-stop',
  'desk-replay',
  'desk-disarm',
  'desk-rearm',
  'header-disarm',
  'header-rearm',
  'wallet-connect-phantom',
  'wallet-use-phantom',
  'wallet-use-studio',
  'wallet-create-studio',
]);

export const HIGHLIGHT_ONLY_TARGETS = new Set([
  'builder-execute',
  'builder-build',
  'desk-start-live',
  'desk-confirm-live',
  'connect-wallet',
  'firewall-override',
  'handshake-create',
  'handshake-counter',
]);

const HIGHLIGHT_CLASS = 'sealevel-ai-focus';

export function highlightTarget(target: string, ms = 4200): { ok: boolean; target: string } {
  if (typeof document === 'undefined') return { ok: false, target };
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => el.classList.remove(HIGHLIGHT_CLASS));
  const node = document.querySelector<HTMLElement>(`[data-sealevel-target="${cssEscape(target)}"]`);
  if (!node) {
    window.dispatchEvent(new CustomEvent('sealevel-highlight', { detail: { target } }));
    return { ok: false, target };
  }
  node.classList.add(HIGHLIGHT_CLASS);
  node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => node.classList.remove(HIGHLIGHT_CLASS), ms);
  return { ok: true, target };
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/"/g, '\\"');
}

export function clickSafeTarget(target: string): { ok: boolean; clicked?: boolean; highlighted?: boolean; reason?: string } {
  if (HIGHLIGHT_ONLY_TARGETS.has(target)) {
    highlightTarget(target);
    return {
      ok: true,
      highlighted: true,
      clicked: false,
      reason: 'This control spends funds or broadcasts. Highlighted — you must click it.',
    };
  }

  if (target.startsWith('nav-')) {
    const view = target.slice(4);
    window.dispatchEvent(new CustomEvent('sealevel-navigate', { detail: view === 'kol' ? 'kol-mapper' : view }));
    highlightTarget(target);
    return { ok: true, clicked: true, target } as any;
  }

  if (target === 'desk-replay') {
    window.dispatchEvent(new CustomEvent('sealevel-navigate', { detail: 'bots' }));
    window.dispatchEvent(new CustomEvent('sealevel-start-replay'));
    highlightTarget(target);
    return { ok: true, clicked: true };
  }

  if (!SAFE_CLICK_TARGETS.has(target)) {
    highlightTarget(target);
    return { ok: false, highlighted: true, reason: `Target "${target}" is not in the safe-click allowlist.` };
  }

  const node = document.querySelector<HTMLElement>(`[data-sealevel-target="${cssEscape(target)}"]`);
  if (!node) {
    if (target === 'desk-start-paper') {
      window.dispatchEvent(new CustomEvent('sealevel-navigate', { detail: 'bots' }));
      window.dispatchEvent(new CustomEvent('sealevel-start-paper'));
      return { ok: true, clicked: true, reason: 'Dispatched desk paper start (control not mounted yet).' };
    }
    return { ok: false, reason: `No element [data-sealevel-target="${target}"] on this page.` };
  }
  node.click();
  highlightTarget(target);
  return { ok: true, clicked: true };
}
