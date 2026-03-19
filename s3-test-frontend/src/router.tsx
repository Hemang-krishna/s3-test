import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface RouterContextValue {
  path: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const value = useMemo(
    () => ({
      path,
      navigate: (to: string) => {
        if (to !== window.location.pathname) {
          window.history.pushState({}, '', to)
          setPath(to)
        }
      },
    }),
    [path],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function Routes({ children }: { children: ReactNode }) {
  const router = useContext(RouterContext)
  if (!router) return null

  const routes = Array.isArray(children) ? children : [children]
  const activeRoute = routes.find((route) => route?.props?.path === router.path) || routes.find((route) => route?.props?.path === '*')
  return activeRoute ?? null
}

export function Route({ element }: { path: string; element: ReactNode }) {
  return <>{element}</>
}

export function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const router = useContext(RouterContext)
  if (!router) return null
  const isActive = router.path === to

  return (
    <a
      href={to}
      className={isActive ? 'active' : undefined}
      onClick={(event) => {
        event.preventDefault()
        router.navigate(to)
      }}
    >
      {children}
    </a>
  )
}
