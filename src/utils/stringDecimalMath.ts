/**
 * High-Precision String Decimal Arithmetic Engine for Mika Games & SoftSwiss (S7S) Game Aggregator
 * 
 * Complies strictly with SoftSwiss / S7S API 2.0 Money Amount specification:
 * - Money Amount is passed as a String
 * - Integer part: up to 18 digits
 * - Fractional part: up to 12 digits
 * - Evolution and other providers transmit currencies with up to 6 decimal places.
 * - Jackpot amounts can feature high decimal precision (up to 12 places).
 * - Avoids IEEE 754 floating point precision loss entirely by using scaled BigInt arithmetic.
 */

const MAX_INTEGER_DIGITS = 18;
const MAX_FRACTION_DIGITS = 12;
const SCALE_DECIMALS = 12;
const SCALE_FACTOR = 1000000000000n; // 10^12

/**
 * Validates whether a given string is a valid money string within SoftSwiss limits
 */
export function validateMoneyString(amountStr: string): { isValid: boolean; error?: string } {
  if (typeof amountStr !== 'string') {
    return { isValid: false, error: 'Money amount must be passed as a string.' };
  }

  const trimmed = amountStr.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Money amount cannot be empty.' };
  }

  // Regex to match optional sign, integer digits, and optional fraction digits
  const match = trimmed.match(/^(-)?(\d+)(?:\.(\d+))?$/);
  if (!match) {
    return { isValid: false, error: `Invalid decimal format: "${amountStr}". Expected digits with optional decimal point.` };
  }

  const integerPart = match[2].replace(/^0+(?=\d)/, ''); // strip leading zeros
  const fractionPart = match[3] || '';

  if (integerPart.length > MAX_INTEGER_DIGITS) {
    return { 
      isValid: false, 
      error: `Integer part exceeds maximum of ${MAX_INTEGER_DIGITS} digits (got ${integerPart.length}).` 
    };
  }

  if (fractionPart.length > MAX_FRACTION_DIGITS) {
    return { 
      isValid: false, 
      error: `Fractional part exceeds maximum of ${MAX_FRACTION_DIGITS} digits (got ${fractionPart.length}).` 
    };
  }

  return { isValid: true };
}

/**
 * Parses a string decimal into a scaled BigInt (scaled by 10^12)
 */
export function parseStringToScaledBigInt(amountStr: string | number): bigint {
  const str = typeof amountStr === 'number' ? amountStr.toFixed(6) : String(amountStr).trim();
  const isNegative = str.startsWith('-');
  const unsigned = isNegative ? str.slice(1) : str;

  const parts = unsigned.split('.');
  const intPart = parts[0] || '0';
  let fracPart = parts[1] || '';

  if (fracPart.length > SCALE_DECIMALS) {
    fracPart = fracPart.slice(0, SCALE_DECIMALS);
  } else {
    fracPart = fracPart.padEnd(SCALE_DECIMALS, '0');
  }

  const combined = BigInt(intPart) * SCALE_FACTOR + BigInt(fracPart);
  return isNegative ? -combined : combined;
}

/**
 * Formats a scaled BigInt back to a string with requested decimal precision
 */
export function formatScaledBigIntToString(value: bigint, decimals: number = 6, trimTrailingZeros: boolean = false): string {
  const isNegative = value < 0n;
  const absValue = isNegative ? -value : value;

  const intPart = absValue / SCALE_FACTOR;
  const fracPart = absValue % SCALE_FACTOR;

  let fracStr = fracPart.toString().padStart(SCALE_DECIMALS, '0');
  
  if (decimals < SCALE_DECIMALS) {
    fracStr = fracStr.slice(0, decimals);
  } else if (decimals > SCALE_DECIMALS) {
    fracStr = fracStr.padEnd(decimals, '0');
  }

  if (trimTrailingZeros && fracStr.length > 2) {
    fracStr = fracStr.replace(/0+$/, '');
    if (fracStr.length < 2) {
      fracStr = fracStr.padEnd(2, '0');
    }
  }

  const result = `${isNegative ? '-' : ''}${intPart}.${fracStr}`;
  return result;
}

/**
 * High-precision addition of two string money amounts
 */
export function addMoneyStrings(amountA: string | number, amountB: string | number, decimals: number = 6): string {
  const a = parseStringToScaledBigInt(amountA);
  const b = parseStringToScaledBigInt(amountB);
  return formatScaledBigIntToString(a + b, decimals);
}

/**
 * High-precision subtraction of two string money amounts (A - B)
 */
export function subMoneyStrings(amountA: string | number, amountB: string | number, decimals: number = 6): string {
  const a = parseStringToScaledBigInt(amountA);
  const b = parseStringToScaledBigInt(amountB);
  return formatScaledBigIntToString(a - b, decimals);
}

/**
 * Compare two string money amounts:
 * Returns -1 if A < B, 0 if A == B, 1 if A > B
 */
export function compareMoneyStrings(amountA: string | number, amountB: string | number): number {
  const a = parseStringToScaledBigInt(amountA);
  const b = parseStringToScaledBigInt(amountB);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Safely converts a standard number (e.g. from existing DB balance) to a compliant money string
 */
export function numberToCompliantString(num: number, decimals: number = 6): string {
  if (isNaN(num)) return '0.000000';
  return num.toFixed(decimals);
}

/**
 * Safely parses a compliant money string back to a Javascript float for UI display where numbers are accepted
 */
export function compliantStringToNumber(str: string): number {
  const val = parseFloat(str);
  return isNaN(val) ? 0 : val;
}
