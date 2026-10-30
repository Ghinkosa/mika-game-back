/**
 * String-based Fixed-Point Arithmetic for Casino & Game Aggregator Integrations.
 *
 * Implements exact arbitrary-precision decimal mathematics for strings with up to
 * 18 digits in the integer part and up to 12 digits in the fractional part.
 */

const SCALE = 12n;
const MULTIPLIER = 10n ** SCALE; // 1,000,000,000,000

export function validateMoneyString(amountStr: string): boolean {
  if (typeof amountStr !== 'string') return false;
  const trimmed = amountStr.trim();
  const regex = /^-?\d{1,18}(\.\d{1,12})?$/;
  return regex.test(trimmed);
}

export function parseStringToScaledBigInt(amountStr: string): bigint {
  const trimmed = amountStr.trim();
  if (!validateMoneyString(trimmed)) {
    throw new Error(`Invalid money string representation: "${amountStr}". Must have up to 18 digits integer and 12 digits fraction.`);
  }

  const isNegative = trimmed.startsWith('-');
  const unsigned = isNegative ? trimmed.slice(1) : trimmed;
  const [intPart, fracPart = ''] = unsigned.split('.');

  const paddedFrac = (fracPart + '000000000000').slice(0, 12);
  const value = BigInt(intPart) * MULTIPLIER + BigInt(paddedFrac);

  return isNegative ? -value : value;
}

export function formatScaledBigIntToString(value: bigint): string {
  const isNegative = value < 0n;
  const absValue = isNegative ? -value : value;

  const intPart = absValue / MULTIPLIER;
  const fracPart = absValue % MULTIPLIER;

  const fracStr = fracPart.toString().padStart(12, '0');
  const trimmedFrac = fracStr.replace(/0+$/, '');

  const result = trimmedFrac.length > 0 ? `${intPart}.${trimmedFrac}` : `${intPart}.00`;
  return isNegative ? `-${result}` : result;
}

export function addMoneyStrings(a: string, b: string): string {
  const sum = parseStringToScaledBigInt(a) + parseStringToScaledBigInt(b);
  return formatScaledBigIntToString(sum);
}

export function subMoneyStrings(a: string, b: string): string {
  const diff = parseStringToScaledBigInt(a) - parseStringToScaledBigInt(b);
  return formatScaledBigIntToString(diff);
}

export function compareMoneyStrings(a: string, b: string): number {
  const aVal = parseStringToScaledBigInt(a);
  const bVal = parseStringToScaledBigInt(b);
  if (aVal > bVal) return 1;
  if (aVal < bVal) return -1;
  return 0;
}

export function numberToCompliantString(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '0.00';
  const fixed = num.toFixed(12);
  const [intPart, fracPart] = fixed.split('.');
  const trimmedFrac = fracPart.replace(/0+$/, '');
  return trimmedFrac.length > 0 ? `${intPart}.${trimmedFrac}` : `${intPart}.00`;
}

export function compliantStringToNumber(str: string): number {
  return parseFloat(str) || 0;
}
