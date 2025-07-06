// ============================================================================
// FILE: lib/number-utils.ts
// Number formatting utilities for consistent financial display
// ============================================================================

/**
 * Format a number as currency with exactly 2 decimal places
 * @param value - The number to format
 * @param currency - Currency symbol (default: '$')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | null | undefined, currency = '$'): string {
  if (value === null || value === undefined || isNaN(value)) {
    return `${currency}0.00`;
  }
  return `${currency}${value.toFixed(2)}`;
}

/**
 * Format a price/cost value with exactly 2 decimal places
 * @param value - The price to format
 * @returns Formatted price string without currency symbol
 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}

/**
 * Format a quantity as a whole number (no decimals for shares)
 * @param value - The quantity to format
 * @returns Formatted quantity string
 */
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return Math.round(value).toString();
}

/**
 * Format a percentage with 2 decimal places
 * @param value - The percentage value (e.g., 0.1234 for 12.34%)
 * @param includeSymbol - Whether to include the % symbol
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | null | undefined, includeSymbol = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return includeSymbol ? '0.00%' : '0.00';
  }
  const formatted = (value * 100).toFixed(2);
  return includeSymbol ? `${formatted}%` : formatted;
}

/**
 * Format a large number with appropriate suffixes (K, M, B)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string with suffix
 */
export function formatLargeNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toFixed(decimals)}B`;
  } else if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(decimals)}M`;
  } else if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(decimals)}K`;
  } else {
    return `${sign}${abs.toFixed(decimals)}`;
  }
}

/**
 * Parse a string to a number, handling various formats
 * @param value - The string to parse
 * @returns Parsed number or null if invalid
 */
export function parseNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  // Remove currency symbols and commas
  const cleaned = value.replace(/[$,%]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}