'use client';

import { useCallback, useEffect, useState, type FocusEvent } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  History,
  ShieldCheck,
  Sparkles,
  TreePine,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface Capability {
  icon: LucideIcon;
  title: string;
  body: string;
}

const CAPABILITIES: readonly Capability[] = [
  {
    icon: TreePine,
    title: 'Worlds and Tricks',
    body: 'Group Tricks into Worlds. Author each method and worked example once.',
  },
  {
    icon: BookOpen,
    title: 'Curricula and Sequences',
    body: 'Order Tricks into Sequences with Introduce, Retain, and Revisit roles.',
  },
  {
    icon: ShieldCheck,
    title: 'Vetting and review',
    body: 'Track Draft, Under review, Verified, and Needs revision. Nothing publishes until it is approved.',
  },
  {
    icon: History,
    title: 'Version history',
    body: 'Every Trick change is snapshotted and attributed. Restores add a new version, they never erase history.',
  },
];

const AUTOPLAY_MS = 6000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Sparkles aria-hidden="true" className="size-5 text-sidebar-ring" />
      <span className="text-sm font-semibold tracking-wide">MathsAlot Studio</span>
    </div>
  );
}

/**
 * Brand panel for the login split layout (D-034). On large screens it holds the
 * product summary and an auto-rotating capability carousel; on small screens it
 * collapses to a compact header below the form. The carousel is keyboard
 * operable, pauses while hovered or focused, and never autoplays under reduced
 * motion. Dots keep a 24px hit area around a 10px visual mark.
 */
export function LoginBrandPanel() {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Hover and focus are tracked independently: autoplay only resumes when the
  // pointer has left AND focus is outside the panel.
  const paused = hovered || focused;

  useEffect(() => {
    if (reducedMotion || paused) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % CAPABILITIES.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion, paused]);

  const goTo = useCallback((next: number) => {
    setIndex(((next % CAPABILITIES.length) + CAPABILITIES.length) % CAPABILITIES.length);
  }, []);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
  }

  return (
    <section
      aria-label="About MathsAlot Studio"
      className="order-2 bg-sidebar text-sidebar-foreground lg:order-1 lg:border-r lg:border-sidebar-muted"
    >
      {/* Compact header on small screens: the form stays first. */}
      <div className="flex flex-col gap-1 p-6 lg:hidden">
        <BrandMark />
        <p className="text-body-sm text-sidebar-foreground/85">
          Curriculum authoring console for MathsAlot staff. Studio does not create learner Levels.
        </p>
      </div>

      <div
        className="hidden h-full flex-col justify-between p-10 lg:flex xl:p-14"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={handleBlur}
      >
        <div className="flex flex-col gap-8">
          <BrandMark />

          <div className="max-w-md">
            <p className="text-display font-bold tracking-tight text-balance">
              Curriculum authoring console
            </p>
            <p className="mt-3 text-body text-sidebar-foreground/85">
              Author Worlds, Tricks, Curricula, and Sequences for the MathsAlot learning platform.
              Staff and Admin accounts only.
            </p>
          </div>

          <div
            role="group"
            aria-roledescription="carousel"
            aria-label="Studio capabilities"
            className="max-w-md"
          >
            <div aria-live={paused ? 'polite' : 'off'}>
              {CAPABILITIES.map((capability, slideIndex) => {
                const Icon = capability.icon;
                return (
                  <div
                    key={capability.title}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${slideIndex + 1} of ${CAPABILITIES.length}`}
                    hidden={slideIndex !== index}
                  >
                    <Icon aria-hidden="true" className="size-6 text-sidebar-ring" />
                    <h2 className="mt-3 text-heading-2 font-semibold">{capability.title}</h2>
                    <p className="mt-1 text-body text-sidebar-foreground/85">{capability.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Previous capability"
                className="inline-flex size-9 items-center justify-center rounded-md border border-sidebar-muted text-sidebar-foreground transition-colors hover:bg-sidebar-muted focus-visible:outline-sidebar-ring active:bg-sidebar-muted"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Next capability"
                className="inline-flex size-9 items-center justify-center rounded-md border border-sidebar-muted text-sidebar-foreground transition-colors hover:bg-sidebar-muted focus-visible:outline-sidebar-ring active:bg-sidebar-muted"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>

              <ul className="ml-2 flex items-center gap-0.5">
                {CAPABILITIES.map((capability, dotIndex) => {
                  const active = dotIndex === index;
                  return (
                    <li key={capability.title}>
                      <button
                        type="button"
                        onClick={() => goTo(dotIndex)}
                        aria-label={`Show ${capability.title}`}
                        aria-current={active ? 'true' : undefined}
                        className="group flex size-6 items-center justify-center rounded-full focus-visible:outline-sidebar-ring"
                      >
                        <span
                          className={cn(
                            'block h-2.5 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none',
                            active
                              ? 'w-5 bg-sidebar-ring'
                              : 'w-2.5 bg-sidebar-foreground/60 group-hover:bg-sidebar-foreground/80',
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <p className="text-body-sm text-sidebar-foreground/75">
          Studio writes Worlds, Tricks, Curricula, and Sequences. It never creates learner Levels.
        </p>
      </div>
    </section>
  );
}
