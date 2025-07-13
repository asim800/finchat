// ============================================================================
// FILE: lib/tax-utils.ts
// Tax-related utility functions for portfolio management
// ============================================================================

export type TaxStatus = 'long-term' | 'short-term' | 'unknown';

/**
 * Calculate tax status based on purchase date
 * @param purchaseDate - Date when the asset was purchased
 * @param currentDate - Current date (defaults to now)
 * @returns Tax status: 'long-term' (>1 year), 'short-term' (≤1 year), or 'unknown' (no purchase date)
 */
export function calculateTaxStatus(
  purchaseDate: Date | string | null | undefined,
  currentDate: Date = new Date()
): TaxStatus {
  if (!purchaseDate) {
    return 'unknown';
  }

  const purchase = typeof purchaseDate === 'string' ? new Date(purchaseDate) : purchaseDate;
  
  // Invalid date check
  if (isNaN(purchase.getTime())) {
    return 'unknown';
  }

  // Calculate the difference in milliseconds
  const diffMs = currentDate.getTime() - purchase.getTime();
  
  // Convert to days (1 year = 365.25 days to account for leap years)
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const oneYearInDays = 365.25;

  return diffDays > oneYearInDays ? 'long-term' : 'short-term';
}

/**
 * Get human-readable tax status label
 * @param taxStatus - The tax status enum value
 * @returns User-friendly label
 */
export function getTaxStatusLabel(taxStatus: TaxStatus): string {
  switch (taxStatus) {
    case 'long-term':
      return 'Long-term';
    case 'short-term':
      return 'Short-term';
    case 'unknown':
      return 'Unknown';
  }
}

/**
 * Get CSS class for tax status badge styling
 * @param taxStatus - The tax status enum value
 * @returns CSS class names for styling
 */
export function getTaxStatusBadgeVariant(taxStatus: TaxStatus): string {
  switch (taxStatus) {
    case 'long-term':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'short-term':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'unknown':
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Calculate days remaining until long-term status
 * @param purchaseDate - Date when the asset was purchased
 * @param currentDate - Current date (defaults to now)
 * @returns Number of days until long-term status, or null if already long-term or no purchase date
 */
export function getDaysUntilLongTerm(
  purchaseDate: Date | string | null | undefined,
  currentDate: Date = new Date()
): number | null {
  if (!purchaseDate) {
    return null;
  }

  const purchase = typeof purchaseDate === 'string' ? new Date(purchaseDate) : purchaseDate;
  
  if (isNaN(purchase.getTime())) {
    return null;
  }

  const diffMs = currentDate.getTime() - purchase.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const oneYearInDays = 365.25;

  if (diffDays >= oneYearInDays) {
    return null; // Already long-term
  }

  return Math.ceil(oneYearInDays - diffDays);
}

/**
 * Format purchase date for display
 * @param purchaseDate - Date when the asset was purchased
 * @returns Formatted date string or 'Not set'
 */
export function formatPurchaseDate(purchaseDate: Date | string | null | undefined): string {
  if (!purchaseDate) {
    return 'Not set';
  }

  const date = typeof purchaseDate === 'string' ? new Date(purchaseDate) : purchaseDate;
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return date.toLocaleDateString();
}

/**
 * Parse date string in various formats for CSV import
 * @param dateStr - Date string to parse
 * @returns Date object or null if invalid
 */
export function parsePurchaseDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) {
    return null;
  }

  const trimmed = dateStr.trim();

  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }

  // Try MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [month, day, year] = trimmed.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  }

  // Try MM-DD-YYYY format
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const [month, day, year] = trimmed.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  }

  // Try generic Date parsing as fallback
  const date = new Date(trimmed);
  return isNaN(date.getTime()) ? null : date;
}