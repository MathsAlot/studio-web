'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface PageCrumb {
  label: string;
  href?: string;
}

export interface PageTitleState {
  title: string | null;
  crumbs: PageCrumb[];
}

interface PageTitleApi {
  set: (state: PageTitleState) => void;
  clear: () => void;
}

const PageTitleApiContext = createContext<PageTitleApi | null>(null);
const PageTitleValueContext = createContext<PageTitleState>({ title: null, crumbs: [] });

/**
 * Lets the server-rendered `PageHeader` publish the current page's title and
 * breadcrumbs to the client app shell, so the top bar reflects the actual page
 * instead of a static section label.
 */
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageTitleState>({ title: null, crumbs: [] });
  const set = useCallback((next: PageTitleState) => setState(next), []);
  const clear = useCallback(() => setState({ title: null, crumbs: [] }), []);
  const api = useMemo(() => ({ set, clear }), [set, clear]);

  return (
    <PageTitleApiContext.Provider value={api}>
      <PageTitleValueContext.Provider value={state}>{children}</PageTitleValueContext.Provider>
    </PageTitleApiContext.Provider>
  );
}

export function usePageTitleValue(): PageTitleState {
  return useContext(PageTitleValueContext);
}

/** Rendered by `PageHeader`; syncs the page title/crumbs into the shell. */
export function PageTitleSync({ title, crumbs }: PageTitleState) {
  const api = useContext(PageTitleApiContext);
  const crumbsKey = JSON.stringify(crumbs);

  useEffect(() => {
    if (!api) {
      return;
    }
    api.set({ title, crumbs });
    return () => api.clear();
    // crumbsKey is a stable serialization of crumbs.
  }, [api, title, crumbsKey]);

  return null;
}
