// Backend money is integer paise. Show whole rupees without decimals (₹499),
// but keep paise when present (₹499.50) — rounding them away would display
// a different price than the one Stripe actually charges.
export function formatMoney(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

const compactMoney = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Axis/summary labels: "₹1.2L", "₹45K". Not for prices people pay. */
export function formatCompactMoney(paise: number): string {
  return compactMoney.format(paise / 100);
}
