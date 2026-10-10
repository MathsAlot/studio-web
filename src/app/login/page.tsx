import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ForbiddenSessionCleanup } from '@/components/forbidden-session-cleanup';
import { LoginBrandPanel } from '@/components/login/brand-panel';
import { LoginForm } from '@/components/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerSession } from '@/lib/auth/server-session';
import { sanitizeNextPath } from '@/lib/redirect';

export const metadata: Metadata = {
  title: 'Sign in · MathsAlot Studio',
  description: 'Individual sign-in for the MathsAlot Studio console.',
};

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}

function errorMessage(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === 'forbidden') {
    return 'Studio access is limited to Staff and Admin accounts. Ask an Admin if you believe this is a mistake.';
  }
  if (candidate === 'session') {
    return 'Your session has ended. Please sign in again.';
  }
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);

  const existing = await getServerSession();
  if (existing) {
    redirect(nextPath);
  }

  const initialError = errorMessage(params.error);

  return (
    <main
      id="main-content"
      aria-labelledby="login-heading"
      className="flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-2"
    >
      <LoginBrandPanel />

      <section
        aria-label="Sign in"
        className="order-1 flex flex-1 items-center justify-center px-4 py-8 sm:py-10 lg:order-2 lg:px-8"
      >
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>
                <h1 id="login-heading" className="text-heading-1 font-semibold text-foreground">
                  Sign in to MathsAlot Studio
                </h1>
              </CardTitle>
              <CardDescription>
                Internal curriculum authoring console for MathsAlot staff.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {params.error === 'forbidden' ? <ForbiddenSessionCleanup /> : null}
              <LoginForm nextPath={nextPath} initialError={initialError} />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
