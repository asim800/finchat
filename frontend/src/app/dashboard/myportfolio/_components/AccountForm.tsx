// AccountForm — polymorphic create/edit form for an Account inside a Portfolio.
// Posts to /api/accounts (create) or /api/accounts/[id] (update). Both endpoints accept an
// optional `realEstate` block so the polymorphic submit is one round-trip.

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { httpPost, httpPut, HttpError } from '@/lib/http';
import type { AccountType, AccountWithRealEstate, RealEstateDetailsInput } from '@/lib/accounts/types';
import { ACCOUNT_TYPE_SHORT_LABELS } from '@/lib/accounts/types';
import { AccountTypeSelect } from './AccountTypeSelect';
import { RealEstateFields } from './RealEstateFields';

interface Props {
  portfolioId: string;
  /** Provide for edit; omit for create. */
  account?: AccountWithRealEstate;
  onSaved: (account: AccountWithRealEstate) => void;
  onCancel: () => void;
}

interface FormState {
  accountName: string;
  accountType: AccountType;
  isRetirement: boolean;
  balance: string; // string for input control; coerced on submit
  realEstate: RealEstateDetailsInput;
}

const emptyRealEstate: RealEstateDetailsInput = {
  propertyType: 'primary_home',
  currentValue: 0,
  outstandingLoan: null,
  interestRate: null,
  monthlyPayment: null,
};

function initialState(account?: AccountWithRealEstate): FormState {
  return {
    accountName: account?.accountName ?? '',
    accountType: account?.accountType ?? 'Other',
    isRetirement: account?.isRetirement ?? false,
    balance: account?.balance != null ? String(account.balance) : '',
    realEstate: account?.realEstate
      ? {
          propertyType: account.realEstate.propertyType as RealEstateDetailsInput['propertyType'],
          currentValue: account.realEstate.currentValue,
          outstandingLoan: account.realEstate.outstandingLoan,
          interestRate: account.realEstate.interestRate,
          monthlyPayment: account.realEstate.monthlyPayment,
        }
      : emptyRealEstate,
  };
}

export function AccountForm({ portfolioId, account, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => initialState(account));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(account);
  const isRealEstate = form.accountType === 'RealEstate';
  const isMortgage = form.accountType === 'MortgageLoan';
  // "Balance owed" for mortgages is just the existing balance field rendered with a label twist.
  const balanceLabel = isMortgage ? 'Balance Owed' : 'Current Balance';

  const handleSubmit = async () => {
    setError(null);
    // On create, an empty name is fine — we auto-fill from the type's short label
    // (declutter: the type already conveys most of the identity).
    if (isEdit && !form.accountName.trim()) {
      setError('Account name is required');
      return;
    }
    if (isRealEstate && (!form.realEstate.currentValue || form.realEstate.currentValue <= 0)) {
      setError('Real Estate accounts require a current value > 0');
      return;
    }

    setSubmitting(true);
    try {
      const effectiveName = form.accountName.trim() || ACCOUNT_TYPE_SHORT_LABELS[form.accountType];
      const body: Record<string, unknown> = {
        portfolioId,
        accountName: effectiveName,
        accountType: form.accountType,
        isRetirement: form.isRetirement,
        balance: form.balance === '' ? null : Number(form.balance),
      };
      if (isRealEstate) body.realEstate = form.realEstate;

      const res = isEdit
        ? await httpPut<{ account: AccountWithRealEstate }>(`/api/accounts/${account!.id}`, body)
        : await httpPost<{ account: AccountWithRealEstate }>(`/api/accounts`, body);

      onSaved(res.account);
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-md border bg-card">
      <div className="text-sm font-medium">{isEdit ? 'Edit Account' : 'Add Account'}</div>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/40 rounded p-2">
          {error}
        </div>
      )}

      {/* Phase 2 declutter: on CREATE, no name prompt — name auto-derives from type.
          On EDIT, the name field stays so users can disambiguate (e.g. two Roth accounts). */}
      {isEdit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Account Name *</Label>
            <Input
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              placeholder={isRealEstate ? 'e.g. 123 Oak St.' : isMortgage ? 'e.g. Primary Mortgage' : 'e.g. Fidelity Roth'}
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">Account Type *</Label>
            <AccountTypeSelect
              value={form.accountType}
              onChange={(t) => setForm({ ...form, accountType: t })}
            />
          </div>
        </div>
      ) : (
        <div>
          <Label className="text-xs">Account Type *</Label>
          <AccountTypeSelect
            value={form.accountType}
            onChange={(t) => setForm({ ...form, accountType: t })}
          />
        </div>
      )}

      {/* Type-dependent secondary fields */}
      {isRealEstate ? (
        <RealEstateFields
          value={form.realEstate}
          onChange={(re) => setForm({ ...form, realEstate: re })}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{balanceLabel}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: e.target.value })}
              placeholder={isMortgage ? '350000' : '10000'}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={form.isRetirement}
                onChange={(e) => setForm({ ...form, isRetirement: e.target.checked })}
              />
              Earmarked for retirement
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Account'}
        </Button>
      </div>
    </div>
  );
}
