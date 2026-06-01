// Read-only compact view of a reference user's portfolios + accounts + assets.
// Server component (no interactivity). Reuses ACCOUNT_TYPE_SHORT_LABELS for type chips.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ACCOUNT_TYPE_SHORT_LABELS } from '@/lib/accounts/types';
import type { ReferenceProfileDetail } from '@/lib/reference/types';

interface Props {
  profile: ReferenceProfileDetail;
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function PortfolioReadOnly({ profile }: Props) {
  return (
    <div className="space-y-4">
      {profile.portfolios.map((p) => {
        const assetsByAccount = new Map<string, typeof p.assets>();
        for (const a of p.assets) {
          if (!a.accountId) continue;
          const arr = assetsByAccount.get(a.accountId) ?? [];
          arr.push(a);
          assetsByAccount.set(a.accountId, arr);
        }

        const portfolioValue = p.assets.reduce(
          (sum, a) => sum + (a.price ? a.quantity * a.price : 0),
          0,
        );

        return (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {p.assets.length} {p.assets.length === 1 ? 'asset' : 'assets'} · {fmt.format(portfolioValue)}
                </span>
              </div>
              {p.description && (
                <p className="text-sm text-muted-foreground">{p.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {p.accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No accounts in this portfolio.</p>
              ) : (
                p.accounts.map((acc) => {
                  const accAssets = assetsByAccount.get(acc.id) ?? [];
                  const isRealEstate = acc.accountType === 'RealEstate';
                  const accValue = accAssets.reduce(
                    (sum, a) => sum + (a.price ? a.quantity * a.price : 0),
                    0,
                  );

                  return (
                    <div key={acc.id} className="rounded-md border bg-card">
                      <div className="flex items-center justify-between gap-2 p-2.5 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <Badge variant="outline">{ACCOUNT_TYPE_SHORT_LABELS[acc.accountType]}</Badge>
                          <span className="text-sm font-medium">{acc.accountName}</span>
                          {acc.isRetirement && <Badge variant="secondary" className="text-[10px]">Retirement</Badge>}
                          {!isRealEstate && accAssets.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {accAssets.length} {accAssets.length === 1 ? 'asset' : 'assets'} · {fmt.format(accValue)}
                            </span>
                          )}
                          {isRealEstate && acc.realEstate && (
                            <span className="text-xs text-muted-foreground">
                              Value {fmt.format(acc.realEstate.currentValue)}
                              {acc.realEstate.outstandingLoan && acc.realEstate.outstandingLoan > 0 && (
                                <> · Loan {fmt.format(acc.realEstate.outstandingLoan)}</>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {accAssets.length > 0 && (
                        <div className="border-t overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Symbol</th>
                                <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Type</th>
                                <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Quantity</th>
                                <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Avg Cost</th>
                                <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Price</th>
                                <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {accAssets.map((a) => (
                                <tr key={a.id} className="border-b last:border-b-0">
                                  <td className="px-3 py-1.5 font-medium">{a.symbol}</td>
                                  <td className="px-3 py-1.5 text-muted-foreground">{a.assetType}</td>
                                  <td className="px-3 py-1.5 text-right tabular-nums">{a.quantity}</td>
                                  <td className="px-3 py-1.5 text-right tabular-nums">
                                    {a.avgCost != null ? fmt.format(a.avgCost) : '—'}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums">
                                    {a.price != null ? fmt.format(a.price) : '—'}
                                  </td>
                                  <td className="px-3 py-1.5 text-right tabular-nums">
                                    {a.price != null ? fmt.format(a.quantity * a.price) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
