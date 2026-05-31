// AccountsSection — lists Accounts inside a Portfolio (Phase 2 UI surface).
// Per-account row shows type badge, name, asset count, balance/details, and
// [Add Asset] / [Edit] / [Delete] actions. Also surfaces an "Unassigned" bucket for
// assets whose accountId is null (chat-writes land here until Phase 5 decoupling).
//
// All persistence goes through /api/accounts (lib/accounts capability) and /api/portfolio
// (for asset add). Pages stay thin: nothing here calls Prisma directly.

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { httpGet, httpDelete, httpPost, HttpError } from '@/lib/http';
import type { AccountWithRealEstate } from '@/lib/accounts/types';
import { ACCOUNT_TYPE_LABELS } from '@/lib/accounts/types';
import type { DisplayAsset } from '@/lib/types/portfolio';
import { AccountTypeBadge } from './AccountTypeBadge';
import { AccountForm } from './AccountForm';
import { AssetAdditionWizard } from '@/components/portfolio/asset-addition-wizard';
import { PortfolioTable } from '@/components/portfolio/portfolio-table';

interface Props {
  portfolioId: string;
  /** Pass the portfolio's assets so we can compute per-account counts without a re-fetch. */
  portfolioAssets: DisplayAsset[];
  /** Needed by the nested per-account PortfolioTable for CRUD context. */
  userId?: string;
  /** Called whenever accounts or assets change so the parent can reload its data. */
  onChange: () => void;
}

interface AccountsListResponse {
  accounts: AccountWithRealEstate[];
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function AccountsSection({ portfolioId, portfolioAssets, userId, onChange }: Props) {
  const [accounts, setAccounts] = useState<AccountWithRealEstate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modes for the inline forms (only one open at a time per portfolio).
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingAssetTo, setAddingAssetTo] = useState<string | null>(null); // accountId or null

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await httpGet<AccountsListResponse>(`/api/accounts?portfolioId=${encodeURIComponent(portfolioId)}`);
      setAccounts(data.accounts);
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId]);

  const handleAccountSaved = () => {
    setCreating(false);
    setEditingId(null);
    load();
    onChange();
  };

  const handleDelete = async (acc: AccountWithRealEstate) => {
    const assetCount = portfolioAssets.filter((a) => a.accountId === acc.id).length;
    const msg = assetCount > 0
      ? `Delete "${acc.accountName}"? ${assetCount} asset${assetCount === 1 ? '' : 's'} will become Unassigned (you can recategorize them after).`
      : `Delete "${acc.accountName}"?`;
    if (!confirm(msg)) return;
    try {
      await httpDelete(`/api/accounts/${acc.id}`);
      load();
      onChange();
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Failed to delete account');
    }
  };

  // After the wizard submits, POST to /api/portfolio with accountId bound.
  const handleAssetSubmit = async (
    accountId: string | null,
    asset: { symbol: string; quantity: number; avgCost?: number | null; assetType: string; purchaseDate?: string; optionType?: string; expirationDate?: string; strikePrice?: number }
  ) => {
    try {
      await httpPost('/api/portfolio', {
        portfolioId,
        accountId,
        assets: [asset],
      });
      setAddingAssetTo(null);
      onChange(); // parent reloads the full portfolio
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Failed to add asset');
    }
  };

  // ---- per-account summary helpers ----
  const assetsFor = (accountId: string) => portfolioAssets.filter((a) => a.accountId === accountId);
  const unassigned = portfolioAssets.filter((a) => !a.accountId);
  const valueOf = (assets: DisplayAsset[]) =>
    assets.reduce((s, a) => s + (a.price ? a.quantity * a.price : a.avgCost ? a.quantity * a.avgCost : 0), 0);

  return (
    <div className="px-4 py-3 border-b dark:border-slate-700 bg-muted/20 space-y-2">
      {/* Phase 2 declutter: no section header. Account rows render directly; the
          + Add Account button lives at the bottom of the list so the visual flow goes
          accounts → assets without a header band in between. */}
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/40 rounded p-2">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading accounts…</p>
      ) : accounts.length === 0 && !creating ? (
        <p className="text-xs text-muted-foreground">
          No accounts in this portfolio yet. Add one to start categorizing your holdings.
        </p>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc) => {
            const accAssets = assetsFor(acc.id);
            const isEditing = editingId === acc.id;
            const isAdding = addingAssetTo === acc.id;
            const isRealEstate = acc.accountType === 'RealEstate';

            return (
              <div key={acc.id} className="rounded-md border bg-card">
                {/* Header row */}
                <div className="flex items-center justify-between gap-3 p-2.5">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <AccountTypeBadge type={acc.accountType} short />
                    <span className="text-sm font-medium truncate">{acc.accountName}</span>
                    {acc.isRetirement && (
                      <Badge variant="secondary" className="text-[10px]">Retirement</Badge>
                    )}
                    {!isRealEstate && (
                      <span className="text-xs text-muted-foreground">
                        {accAssets.length} {accAssets.length === 1 ? 'asset' : 'assets'}
                        {accAssets.length > 0 && <> · {fmt.format(valueOf(accAssets))}</>}
                      </span>
                    )}
                    {isRealEstate && acc.realEstate && (
                      <span className="text-xs text-muted-foreground">
                        Value {fmt.format(acc.realEstate.currentValue)}
                        {acc.realEstate.outstandingLoan != null && acc.realEstate.outstandingLoan > 0 && (
                          <> · Loan {fmt.format(acc.realEstate.outstandingLoan)}</>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isRealEstate && acc.accountType !== 'MortgageLoan' && (
                      <Button
                        size="sm"
                        variant={isAdding ? 'default' : 'outline'}
                        onClick={() => {
                          setAddingAssetTo(isAdding ? null : acc.id);
                          setEditingId(null);
                          setCreating(false);
                        }}
                      >
                        {isAdding ? 'Cancel' : 'Add Asset'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingId(isEditing ? null : acc.id); setCreating(false); setAddingAssetTo(null); }}
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(acc)}>
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="p-2.5 border-t">
                    <AccountForm
                      portfolioId={portfolioId}
                      account={acc}
                      onSaved={handleAccountSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                )}

                {/* Inline asset-add wizard, scoped to this account */}
                {isAdding && (
                  <div className="p-2.5 border-t">
                    <div className="text-xs text-muted-foreground mb-2">
                      Adding to <span className="font-medium">{acc.accountName}</span> ({ACCOUNT_TYPE_LABELS[acc.accountType]})
                    </div>
                    <AssetAdditionWizard
                      onSubmit={(a) => handleAssetSubmit(acc.id, a)}
                      onCancel={() => setAddingAssetTo(null)}
                    />
                  </div>
                )}

                {/* Per-account asset table — declutter refinement #2.
                    RealEstate and MortgageLoan model the property/debt themselves; no
                    asset rows. For everything else, render the existing PortfolioTable
                    fed with this account's slice. Parent's onChange reload re-feeds
                    each instance via initialAssets (usePortfolioState syncs on prop
                    change), so CRUD inside any sub-table updates the parent cleanly. */}
                {!isRealEstate && acc.accountType !== 'MortgageLoan' && (
                  <div className="border-t p-2.5">
                    <PortfolioTable
                      isGuestMode={false}
                      userId={userId}
                      portfolioId={portfolioId}
                      initialAssets={accAssets}
                      onAssetsChange={onChange}
                      showSummary={false}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned bucket — surfaces chat-writes & legacy data until Phase 5. */}
          {unassigned.length > 0 && (
            <div className="rounded-md border border-dashed bg-muted/30 p-2.5 flex items-center gap-2">
              <Badge variant="outline">Unassigned</Badge>
              <span className="text-xs text-muted-foreground">
                {unassigned.length} {unassigned.length === 1 ? 'asset' : 'assets'} · {fmt.format(valueOf(unassigned))} —
                recategorize via delete-and-re-add.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Inline create form OR + Add Account launcher (bottom-aligned). */}
      {creating ? (
        <AccountForm
          portfolioId={portfolioId}
          onSaved={handleAccountSaved}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <div className="pt-1">
          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => { setCreating(true); setEditingId(null); }}>
            + Add Account
          </Button>
        </div>
      )}
    </div>
  );
}
