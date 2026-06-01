// Directory / Sitemap page (Phase 3.5 Package C).
// One-page index of every public surface in the app. Guest + auth aware: shows
// "Sign in to access" badges on auth-only sections rather than hiding them.

import { headers } from 'next/headers';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listReferenceProfiles } from '@/lib/reference';

interface Entry {
  href: string;
  label: string;
  description: string;
  /** "live" = navigable; "soon" = listed but not yet built. */
  status?: 'soon';
}

interface Section {
  title: string;
  /** When true and viewer is a guest, show "Sign in to access" badge on every entry. */
  authRequired?: boolean;
  entries: Entry[];
}

export const metadata = { title: 'Directory' };

export default async function DirectoryPage() {
  const headersList = await headers();
  const isGuest = headersList.get('x-guest-mode') === 'true';

  // Reference profiles are auto-listed (logged-in only). For guests we still show
  // the section header + "Sign in" badge but skip enumeration.
  const refProfiles = isGuest ? [] : await listReferenceProfiles();

  const sections: Section[] = [
    {
      title: 'For everyone',
      entries: [
        { href: '/', label: 'Home', description: 'Landing page.' },
        { href: '/dashboard/portfolio', label: 'Templates', description: 'Browse reference profiles you can pull as a starting point.' },
        { href: '/dashboard/chat', label: 'Chat', description: 'AI-assisted portfolio + retirement Q&A.' },
        { href: '/learning/financial-terms', label: 'Financial Terms', description: 'Glossary of investment + retirement vocabulary.' },
        { href: '/learning/supported-assets', label: 'Supported Assets', description: 'Asset types this app can track.' },
        { href: '/contact', label: 'Contact', description: 'Reach the team.' },
      ],
    },
    {
      title: 'Your account',
      authRequired: true,
      entries: [
        { href: '/dashboard/myportfolio', label: 'My Portfolio', description: 'Manage your portfolios, accounts, and assets.' },
        { href: '/dashboard/income', label: 'Income', description: 'Track income and expense cash flows over time.' },
        { href: '/dashboard/retirement', label: 'Retirement', description: 'Projection chart + readiness summary + asset matrix.' },
        { href: '/dashboard/retirement/diagnostic', label: 'Retirement diagnostic', description: 'Per-account breakdown + override Social Security / income / expenses to audit the projection.' },
        { href: '/dashboard/account', label: 'Account', description: 'Email, password, API keys.' },
        { href: '/dashboard/profile', label: 'Profile', description: 'Birth date, income, expenses, risk tolerance, SS estimate.' },
      ],
    },
    {
      title: 'Reference profiles',
      authRequired: true,
      entries: refProfiles.length > 0
        ? refProfiles.map((p) => ({
            href: `/dashboard/reference/${p.userId}/portfolio`,
            label: `${p.firstName} ${p.lastName}`,
            description: p.referenceTitle,
          }))
        : [
            { href: '/dashboard/portfolio', label: 'Sign in to see all reference profiles', description: 'Three example personas (single, near-retirement, dual-income couple) with full portfolios + income.' },
          ],
    },
    {
      title: 'Coming soon',
      entries: [
        { href: '/dashboard/monte-carlo', label: 'Monte Carlo sandbox', description: 'Phase 4 — probabilistic retirement projections with sequence-of-returns risk modeled honestly.', status: 'soon' },
      ],
    },
    {
      title: 'Auth',
      entries: [
        { href: '/login', label: 'Login', description: '' },
        { href: '/register', label: 'Register', description: '' },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every page in this app. Auth-only pages are marked when you&apos;re not signed in.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => (
          <SectionCard key={s.title} section={s} isGuest={isGuest} />
        ))}
      </div>
    </div>
  );
}

function SectionCard({ section, isGuest }: { section: Section; isGuest: boolean }) {
  const sectionLocked = section.authRequired && isGuest;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-base">{section.title}</CardTitle>
          {sectionLocked && <Badge variant="outline" className="text-[10px]">Sign in to access</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {section.entries.map((e) => {
          const disabled = e.status === 'soon' || sectionLocked;
          return (
            <div key={e.href + e.label} className="flex items-start gap-2">
              {disabled ? (
                <span className="text-sm font-medium text-muted-foreground">{e.label}</span>
              ) : (
                <Link href={e.href} className="text-sm font-medium hover:underline">{e.label}</Link>
              )}
              {e.status === 'soon' && <Badge variant="outline" className="text-[10px]">Coming soon</Badge>}
              {e.description && <span className="text-xs text-muted-foreground">— {e.description}</span>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
