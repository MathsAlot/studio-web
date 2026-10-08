'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  Activity,
  Gauge,
  LayoutDashboard,
  Layers,
  Menu,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TreePine,
} from 'lucide-react';

import { LogoutButton } from '@/components/logout-button';
import {
  PageTitleProvider,
  usePageTitleValue,
  type PageCrumb,
} from '@/components/page-title-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { MeView } from '@/lib/api-client';

const ROLE_LABELS: Record<MeView['role'], string> = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  LEARNER: 'Learner',
};

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/worlds', label: 'Worlds & Tricks', icon: TreePine },
  { href: '/families', label: 'Nitty Gritty', icon: Layers },
  { href: '/admin', label: 'Dashboard', icon: Gauge, adminOnly: true, exact: true },
  { href: '/admin/activity', label: 'Activity', icon: Activity, adminOnly: true },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare, adminOnly: true },
  { href: '/admin/permissions', label: 'Permissions', icon: ShieldCheck, adminOnly: true },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

interface RouteContext {
  title: string;
  crumbs: PageCrumb[];
}

/** Contextual top-bar labels derived from the route, used until a page reports its own title. */
function routeContext(pathname: string): RouteContext {
  if (pathname === '/') {
    return { title: 'Overview', crumbs: [] };
  }
  if (pathname.startsWith('/admin')) {
    const sub = pathname.split('/').filter(Boolean)[1];
    const titles: Record<string, string> = {
      activity: 'Recent activity',
      comments: 'Comment coordination',
      permissions: 'Permissions',
    };
    const title = sub ? (titles[sub] ?? 'Administration') : 'Operations dashboard';
    return {
      title,
      crumbs: [{ label: 'Overview', href: '/' }, { label: 'Administration' }, { label: title }],
    };
  }
  if (pathname.startsWith('/tricks')) {
    return {
      title: 'Trick',
      crumbs: [{ label: 'Worlds & Tricks', href: '/worlds' }, { label: 'Trick' }],
    };
  }
  if (pathname.startsWith('/families')) {
    const isDetail = pathname.split('/').filter(Boolean).length > 1;
    return {
      title: isDetail ? 'Family' : 'Nitty Gritty',
      crumbs: [
        { label: 'Overview', href: '/' },
        { label: 'Nitty Gritty', href: '/families' },
        ...(isDetail ? [{ label: 'Family' }] : []),
      ],
    };
  }
  if (pathname.startsWith('/worlds')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.includes('curriculums')) {
      const isDetail = segments.length > 3;
      return {
        title: isDetail ? 'Curriculum' : 'Curricula',
        crumbs: [
          { label: 'Worlds & Tricks', href: '/worlds' },
          { label: 'World' },
          { label: isDetail ? 'Curriculum' : 'Curricula' },
        ],
      };
    }
    if (segments.length > 1) {
      return {
        title: 'World',
        crumbs: [{ label: 'Worlds & Tricks', href: '/worlds' }, { label: 'World' }],
      };
    }
    return {
      title: 'Worlds & Tricks',
      crumbs: [{ label: 'Overview', href: '/' }, { label: 'Worlds & Tricks' }],
    };
  }
  return { title: 'Overview', crumbs: [] };
}

/** Top-bar page identity: the current page title with its breadcrumb trail. */
function TopBarContext() {
  const pathname = usePathname();
  const { title, crumbs } = usePageTitleValue();
  const fallback = routeContext(pathname);
  const effectiveTitle = title ?? fallback.title;
  const effectiveCrumbs = crumbs.length > 0 ? crumbs : fallback.crumbs;

  return (
    <div className="flex min-w-0 flex-col">
      {effectiveCrumbs.length > 0 ? (
        <span className="truncate text-xs text-muted-foreground">
          {effectiveCrumbs.map((crumb) => crumb.label).join(' / ')}
        </span>
      ) : null}
      <p className="truncate text-sm font-medium text-foreground">{effectiveTitle}</p>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

function NavLinks({ user, onNavigate }: { user: MeView; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user.isAdmin);

  return (
    <nav aria-label="Studio sections" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/90 hover:bg-surface-muted hover:text-primary',
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooterNote() {
  return (
    <p className="px-3 text-xs leading-relaxed text-sidebar-foreground/70">
      Curriculum authoring console. Studio does not author learner Levels.
    </p>
  );
}

interface AppShellProps {
  user: MeView;
  children: ReactNode;
}

/**
 * Persistent Studio chrome: fixed forest-green sidebar navigation, a top bar
 * with the current section and session identity, and a scrollable content
 * region. Mobile widths collapse navigation into a sheet.
 */
export function AppShell({ user, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const roleLabel = ROLE_LABELS[user.role];

  return (
    <PageTitleProvider>
      <div className="min-h-dvh bg-background">
        <aside
          data-slot="app-sidebar"
          aria-label="Studio navigation"
          className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar text-sidebar-foreground lg:flex"
        >
          <div className="flex h-16 items-center gap-2 px-4">
            <Sparkles aria-hidden="true" className="size-5 text-sidebar-ring" />
            <Link href="/" className="text-sm font-semibold tracking-wide text-sidebar-foreground">
              MathsAlot Studio
            </Link>
          </div>
          <Separator className="bg-sidebar-muted" />
          <div className="flex-1 overflow-y-auto px-2 py-3">
            <NavLinks user={user} />
          </div>
          <Separator className="bg-sidebar-muted" />
          <div className="py-3">
            <SidebarFooterNote />
          </div>
        </aside>

        <div className="flex min-h-dvh flex-col lg:pl-60">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-backdrop-filter:bg-surface/80 sm:px-6">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger
                    className="inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-surface-muted lg:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu aria-hidden="true" className="size-5" />
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent>Open navigation</TooltipContent>
              </Tooltip>
              <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
                    <Sparkles aria-hidden="true" className="size-5 text-sidebar-ring" />
                    MathsAlot Studio
                  </SheetTitle>
                  <SheetDescription className="text-sidebar-foreground/70">
                    Curriculum authoring console
                  </SheetDescription>
                </SheetHeader>
                <div data-slot="app-sidebar" className="px-2">
                  <NavLinks user={user} onNavigate={() => setMobileNavOpen(false)} />
                </div>
                <div className="mt-auto px-4 pb-4">
                  <SidebarFooterNote />
                </div>
              </SheetContent>
            </Sheet>

            <TopBarContext />

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground">
                    {initials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="max-w-[16rem] truncate text-sm font-medium text-foreground">
                    {user.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground">{roleLabel}</span>
                </span>
              </div>
              <LogoutButton />
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>

          <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
            Curriculum authoring console. Studio does not author learner Levels.
          </footer>
        </div>
      </div>
    </PageTitleProvider>
  );
}
