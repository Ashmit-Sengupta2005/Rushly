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
