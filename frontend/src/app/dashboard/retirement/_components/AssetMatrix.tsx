// Cross-tab of account type × asset type. Diagnostic view that complements the
// projection: "here's where your money actually sits today."

'use client';

import type { AssetMatrix as Matrix } from '@/lib/retirement/types';
import { ACCOUNT_TYPE_SHORT_LABELS, type AccountType } from '@/lib/accounts/types';

interface Props {
  matrix: Matrix;
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Column display name for the synthetic + asset-type columns.
function colLabel(col: string): string {
  if (col === 'property') return 'Property';
  if (col === 'debt') return 'Debt';
  // 'stock' → 'Stock', 'mutual_fund' → 'Mutual Fund', etc.
  return col.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

export function AssetMatrix({ matrix }: Props) {
  if (matrix.rows.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold mb-3">Assets by account type × asset type</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left font-medium text-muted-foreground px-2 py-1.5">Account Type</th>
            {matrix.columns.map((c) => (
              <th key={c} className="text-right font-medium text-muted-foreground px-2 py-1.5 whitespace-nowrap">
                {colLabel(c)}
              </th>
            ))}
            <th className="text-right font-semibold px-2 py-1.5">Total</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((r) => (
            <tr key={r.accountType} className="border-b last:border-b-0">
              <td className="px-2 py-1.5 font-medium">
                {ACCOUNT_TYPE_SHORT_LABELS[r.accountType as AccountType]}
              </td>
              {matrix.columns.map((c) => {
                const v = r.byAssetType[c];
                return (
                  <td key={c} className="px-2 py-1.5 text-right tabular-nums">
                    {v ? fmt.format(v) : <span className="text-muted-foreground/50">—</span>}
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                {fmt.format(r.total)}
              </td>
            </tr>
          ))}
          <tr className="bg-muted/40">
            <td className="px-2 py-1.5 font-semibold text-muted-foreground">Total</td>
            {matrix.columns.map((c) => (
              <td key={c} className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                {matrix.colTotals[c] ? fmt.format(matrix.colTotals[c]) : '—'}
              </td>
            ))}
            <td className="px-2 py-1.5 text-right font-bold tabular-nums">
              {fmt.format(matrix.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-2 italic">
        Mortgage debt shown for transparency; real-estate equity reflected in the Real-estate wealth summary above.
      </p>
    </div>
  );
}
