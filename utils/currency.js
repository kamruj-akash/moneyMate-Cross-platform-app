const CURRENCY_SYMBOLS = {
  BDT: '৳',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
};

export const getCurrencySymbol = (code = 'BDT') => CURRENCY_SYMBOLS[code] || code;

export const formatAmount = (value, currency = 'BDT', options = {}) => {
  const { showSymbol = true, decimals = 0 } = options;
  const num = Number(value || 0);
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  const fixed = abs.toFixed(decimals);
  const [whole, frac] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = frac ? `${withCommas}.${frac}` : withCommas;
  if (!showSymbol) return `${sign}${formatted}`;
  return `${sign}${getCurrencySymbol(currency)}${formatted}`;
};

export const formatSigned = (value, type, currency = 'BDT') => {
  const num = Math.abs(Number(value || 0));
  const symbol = getCurrencySymbol(currency);
  const prefix = type === 'income' ? '+' : '-';
  const fixed = num.toFixed(0);
  const withCommas = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${prefix}${symbol}${withCommas}`;
};

export const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS).map((code) => ({
  code,
  symbol: CURRENCY_SYMBOLS[code],
  label: `${code} (${CURRENCY_SYMBOLS[code]})`,
}));
