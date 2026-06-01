// Read-only compact view of a reference user's cash flows.
// Groups by Income/Expense; shows monthly equivalent + date range.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FREQ_PER_MONTH } from '@/lib/income';
import type { ReferenceProfileDetail } from '@/lib/reference/types';

interface Props {
  profile: ReferenceProfileDetail;
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toISOString().slice(0, 10);
}

export function IncomeReadOnly({ profile }: Props) {
  const income = profile.cashFlows.filter((cf) => cf.kind === 'Income');
  const expense = profile.cashFlows.filter((cf) => cf.kind === 'Expense');

  const sumMonthly = (rows: typeof profile.cashFlows) =>
    rows.reduce((sum, cf) => sum + cf.amount * (FREQ_PER_MONTH[cf.frequency] ?? 1), 0);

  const incomeMonthly = sumMonthly(income);
  const expenseMonthly = sumMonthly(expense);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Income / mo</p>
            <p className="text-xl font-bold tabular-nums text-success">{fmt.format(incomeMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expense / mo</p>
            <p className="text-xl font-bold tabular-nums text-destructive">{fmt.format(expenseMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net / mo</p>
            <p className={`text-xl font-bold tabular-nums ${incomeMonthly - expenseMonthly >= 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt.format(incomeMonthly - expenseMonthly)}
            </p>
          </CardContent>
        </Card>
      </div>

      <CashFlowSection title="Income" rows={income} />
      <CashFlowSection title="Expense" rows={expense} />
    </div>
  );
}

function CashFlowSection({ title, rows }: { title: string; rows: import('@/lib/income').CashFlow[] }) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Category</th>
              <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Source</th>
              <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Frequency</th>
              <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Start</th>
              <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">End</th>
              <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Inflation?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cf) => (
              <tr key={cf.id} className="border-b last:border-b-0">
                <td className="px-3 py-1.5"><Badge variant="outline" className="text-[10px]">{cf.category}</Badge></td>
                <td className="px-3 py-1.5 text-muted-foreground">{cf.source ?? '—'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmt.format(cf.amount)}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{cf.frequency}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{fmtDate(cf.startDate)}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{fmtDate(cf.endDate)}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{cf.inflationAdjusted ? 'yes' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
