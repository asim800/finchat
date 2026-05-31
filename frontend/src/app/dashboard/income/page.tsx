// Income & Expenses page — thin server wrapper.
// Workhorse: lib/income (via /api/income). No business logic here.

import { IncomePageClient } from './_components/IncomePageClient';

export const metadata = {
  title: 'Income & Expenses',
};

export default function IncomePage() {
  return <IncomePageClient />;
}
