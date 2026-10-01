/**
 * Human-friendly order reference. Uses the LAST 8 chars: cuids start with a
 * timestamp, so the first 8 are near-identical for orders placed close together
 * (e.g. "cmupezyn…" vs "cmuperzz…") while the tail is random.
 */
export const shortOrderId = (id: string) => id.slice(-8).toUpperCase();
