/**
 * Developer-only performance logging.
 *
 * All helpers are no-ops in production. In dev they emit a single grouped
 * console line so slow operations (wallpaper loads, proxy boot, search
 * navigation) are easy to spot without adding permanent overhead.
 *
 * Usage:
 *   const end = perfStart('wallpaper');
 *   ...
 *   end({ url });                // logs elapsed ms + payload
 *
 *   perfMark('search:navigate', { query });
 */

const enabled =
  typeof import.meta !== 'undefined' &&
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

const SLOW_MS = 500;

function color(ms: number): string {
  if (ms >= SLOW_MS * 2) return 'color:#f87171;font-weight:bold';
  if (ms >= SLOW_MS)     return 'color:#fbbf24;font-weight:bold';
  return 'color:#34d399';
}

export function perfStart(label: string): (payload?: Record<string, unknown>) => number {
  if (!enabled) return () => 0;
  const t0 = performance.now();
  return (payload) => {
    const ms = Math.round(performance.now() - t0);
    // eslint-disable-next-line no-console
    console.log(
      `%c[perf] ${label} %c${ms}ms`,
      'color:#94a3b8',
      color(ms),
      payload ?? '',
    );
    return ms;
  };
}

export function perfMark(label: string, payload?: Record<string, unknown>): void {
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.log(`%c[perf] ${label}`, 'color:#94a3b8', payload ?? '');
}
