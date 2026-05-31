'use client';

// Thin UI over /api/income. Per the architecture philosophy:
//   - No business logic here (composition + display only).
//   - All persistence + validation lives in lib/income; this file talks to
//     the HTTP face (/api/income) via lib/http and renders results.
//   - Forms accept partial data; only category + positive amount are required.

import { useEffect, useState } from 'react';
import { httpDelete, httpGet, httpPost, httpPut, HttpError } from '@/lib/http';
import {
  CASH_FLOW_CATEGORY_LABELS,
  CASH_FLOW_FREQUENCIES,
  CASH_FLOW_FREQUENCY_LABELS,
  EXPENSE_CATEGORIES,
  FREQ_PER_MONTH,
  INCOME_CATEGORIES,
  type CashFlow,
  type CashFlowCategory,
  type CashFlowFrequency,
  type CashFlowKind,
} from '@/lib/income/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------- helpers ----------

// CashFlow returns from the API as JSON, so date fields are strings (or null).
type WireCashFlow = Omit<CashFlow, 'startDate' | 'endDate'> & {
  startDate: string | null;
  endDate: string | null;
};

function monthlyEquivalent(amount: number, freq: CashFlowFrequency): number {
  return amount * (FREQ_PER_MONTH[freq] ?? 1);
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function fmtDate(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

function toDateInput(d: string | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

// ---------- form state ----------

interface FormState {
  id?: string;
  kind: CashFlowKind;
  category: CashFlowCategory;
  amount: number | '';
  frequency: CashFlowFrequency;
  startDate: string;
  endDate: string;
  source: string;
  notes: string;
  inflationAdjusted: boolean;
}

function blankForm(kind: CashFlowKind): FormState {
  const category: CashFlowCategory = kind === 'Income' ? 'Salary' : 'Housing';
  return {
    kind,
    category,
    amount: '',
    frequency: 'Monthly',
    startDate: '',
    endDate: '',
    source: '',
    notes: '',
    inflationAdjusted: false,
  };
}

function formFromFlow(f: WireCashFlow): FormState {
  return {
    id: f.id,
    kind: f.kind,
    category: f.category,
    amount: f.amount,
    frequency: f.frequency,
    startDate: toDateInput(f.startDate),
    endDate: toDateInput(f.endDate),
    source: f.source ?? '',
    notes: f.notes ?? '',
    inflationAdjusted: f.inflationAdjusted,
  };
}

// ---------- main client ----------

export function IncomePageClient() {
  const [cashFlows, setCashFlows] = useState<WireCashFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await httpGet<{ cashFlows: WireCashFlow[] }>('/api/income');
      setCashFlows(data.cashFlows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cash flows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleSubmit = async () => {
    if (!form) return;
    if (typeof form.amount !== 'number' || form.amount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      kind: form.kind,
      category: form.category,
      amount: form.amount,
      frequency: form.frequency,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      source: form.source || null,
      notes: form.notes || null,
      inflationAdjusted: form.inflationAdjusted,
    };
    try {
      if (form.id) {
        await httpPut(`/api/income/${form.id}`, payload);
      } else {
        await httpPost('/api/income', payload);
      }
      setForm(null);
      await refresh();
    } catch (e) {
      const msg = e instanceof HttpError ? e.message : e instanceof Error ? e.message : 'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    setError(null);
    try {
      await httpDelete(`/api/income/${id}`, { parseJson: false });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const income = cashFlows.filter((c) => c.kind === 'Income');
  const expense = cashFlows.filter((c) => c.kind === 'Expense');
  const monthlyIncome = income.reduce((a, c) => a + monthlyEquivalent(c.amount, c.frequency), 0);
  const monthlyExpense = expense.reduce((a, c) => a + monthlyEquivalent(c.amount, c.frequency), 0);
  const net = monthlyIncome - monthlyExpense;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Income &amp; Expenses</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track recurring inflows (salary, Social Security, pensions, …) and outflows
          (housing, living, …) that feed your retirement projection. Partial information
          is fine — fill in details as you go.
        </p>
      </header>

      {/* Monthly totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <TotalCard label="Monthly income" value={monthlyIncome} tone="positive" />
        <TotalCard label="Monthly expense" value={monthlyExpense} tone="negative" />
        <TotalCard label="Net monthly" value={net} tone={net >= 0 ? 'positive' : 'negative'} />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {form && (
        <CashFlowForm
          form={form}
          saving={saving}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={() => {
            setForm(null);
            setError(null);
          }}
        />
      )}

      <CashFlowSection
        title="Income"
        emptyHint="Add salary, Social Security, pensions, or other inflows."
        flows={income}
        loading={loading}
        disabled={!!form}
        onAdd={() => setForm(blankForm('Income'))}
        onEdit={(f) => setForm(formFromFlow(f))}
        onDelete={handleDelete}
      />

      <CashFlowSection
        title="Expenses"
        emptyHint="Add housing, living, healthcare, or other outflows."
        flows={expense}
        loading={loading}
        disabled={!!form}
        onAdd={() => setForm(blankForm('Expense'))}
        onEdit={(f) => setForm(formFromFlow(f))}
        onDelete={handleDelete}
      />
    </div>
  );
}

// ---------- presentational helpers ----------

function TotalCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'positive' | 'negative';
}) {
  return (
    <Card className="bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700">
      <CardContent className="p-4">
        <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
        <div
          className={`text-2xl font-bold mt-1 ${
            tone === 'positive'
              ? 'text-green-700 dark:text-green-300'
              : 'text-red-700 dark:text-red-300'
          }`}
        >
          {fmtCurrency(value)}
        </div>
      </CardContent>
    </Card>
  );
}

interface SectionProps {
  title: string;
  emptyHint: string;
  flows: WireCashFlow[];
  loading: boolean;
  disabled: boolean;
  onAdd: () => void;
  onEdit: (f: WireCashFlow) => void;
  onDelete: (id: string) => void;
}

function CashFlowSection({ title, emptyHint, flows, loading, disabled, onAdd, onEdit, onDelete }: SectionProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <Button onClick={onAdd} size="sm" disabled={disabled}>
          + Add {title === 'Expenses' ? 'expense' : 'income'}
        </Button>
      </div>
      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      ) : flows.length === 0 ? (
        <Card className="bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6 text-center text-gray-600 dark:text-gray-400 text-sm">
            No {title.toLowerCase()} yet. {emptyHint}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {flows.map((f) => (
            <CashFlowRow
              key={f.id}
              flow={f}
              onEdit={() => onEdit(f)}
              onDelete={() => onDelete(f.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CashFlowRow({
  flow,
  onEdit,
  onDelete,
}: {
  flow: WireCashFlow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const monthly = monthlyEquivalent(flow.amount, flow.frequency);
  return (
    <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {CASH_FLOW_CATEGORY_LABELS[flow.category]}
            </span>
            {flow.source && (
              <span className="text-sm text-gray-500 dark:text-gray-400">· {flow.source}</span>
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {fmtCurrency(flow.amount)} / {CASH_FLOW_FREQUENCY_LABELS[flow.frequency]}
            {flow.frequency !== 'Monthly' && flow.frequency !== 'OneTime' && (
              <> (≈ {fmtCurrency(monthly)}/mo)</>
            )}
            {flow.startDate && <> · from {fmtDate(flow.startDate)}</>}
            {flow.endDate && <> · until {fmtDate(flow.endDate)}</>}
            {flow.inflationAdjusted && <> · inflation-adjusted</>}
          </div>
          {flow.notes && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{flow.notes}</div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface FormProps {
  form: FormState;
  saving: boolean;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function CashFlowForm({ form, saving, onChange, onSubmit, onCancel }: FormProps) {
  const categories = form.kind === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isValid = typeof form.amount === 'number' && form.amount > 0 && !!form.category;
  const verb = form.id ? 'Save' : 'Add';
  const noun = form.kind === 'Income' ? 'income' : 'expense';

  return (
    <Card className="mb-6 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900">
      <CardHeader>
        <CardTitle className="text-base text-gray-900 dark:text-gray-100">
          {form.id ? `Edit ${noun}` : `Add ${noun}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Category *</Label>
            <Select
              value={form.category}
              onValueChange={(v) => onChange({ ...form, category: v as CashFlowCategory })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CASH_FLOW_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Amount *</Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.amount === '' ? '' : form.amount}
              onChange={(e) => {
                const v = e.target.value;
                onChange({ ...form, amount: v === '' ? '' : parseFloat(v) || 0 });
              }}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <Label>Frequency</Label>
            <Select
              value={form.frequency}
              onValueChange={(v) => onChange({ ...form, frequency: v as CashFlowFrequency })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASH_FLOW_FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {CASH_FLOW_FREQUENCY_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Source (optional)</Label>
            <Input
              value={form.source}
              onChange={(e) => onChange({ ...form, source: e.target.value })}
              placeholder="e.g., Pension from XYZ"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Starts (optional)</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => onChange({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Ends (optional)</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => onChange({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Notes (optional)</Label>
          <Input
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            placeholder="Anything to remember about this entry"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="inflationAdjusted"
            type="checkbox"
            checked={form.inflationAdjusted}
            onChange={(e) => onChange({ ...form, inflationAdjusted: e.target.checked })}
            className="h-4 w-4"
          />
          <Label htmlFor="inflationAdjusted" className="cursor-pointer text-sm">
            Inflation-adjusted (e.g., Social Security, COLA pensions)
          </Label>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!isValid || saving}>
            {saving ? 'Saving…' : verb}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
