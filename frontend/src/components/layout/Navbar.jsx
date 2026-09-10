import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { clsx } from 'clsx';

export default function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const { mutate: logout, isPending } = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Hide header on login / register screens for a clean layout
  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  const navLinks = isAuthenticated
    ? [
        { to: '/vault', label: 'Vault' },
        { to: '/create', label: 'New Capsule' },
      ]
    : [];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream-200/90 backdrop-blur-sm border-b border-ink-900/8">
      <nav
        className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Wordmark */}
        <Link
          to="/"
          className="font-display font-extrabold text-xl text-ink-900 tracking-tight hover:text-rust-500 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-rust-500 focus-visible:outline-offset-2 rounded-sm"
        >
          bloom<span className="text-rust-500">later</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'font-body text-sm font-medium transition-all duration-200 relative',
                  'after:absolute after:bottom-[-2px] after:left-0 after:h-px after:bg-rust-500 after:transition-all after:duration-200',
                  isActive
                    ? 'text-rust-500 after:w-full'
                    : 'text-ink-700 hover:text-ink-900 after:w-0 hover:after:w-full'
                )
              }
            >
              {label}
            </NavLink>
          ))}

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="font-body text-sm font-semibold text-ink-800 max-w-[140px] truncate">
                {user?.username}
              </span>
              <button
                onClick={() => logout()}
                disabled={isPending}
                className="btn-ghost btn-sm"
                aria-label="Log out"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Get started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 rounded-md hover:bg-ink-900/5 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          <span className={clsx('block w-5 h-px bg-ink-900 transition-all duration-200', mobileOpen && 'rotate-45 translate-y-2')} />
          <span className={clsx('block w-5 h-px bg-ink-900 transition-all duration-200', mobileOpen && 'opacity-0')} />
          <span className={clsx('block w-5 h-px bg-ink-900 transition-all duration-200', mobileOpen && '-rotate-45 -translate-y-2')} />
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-cream-100 border-b border-ink-900/8"
          >
            <div className="px-4 py-5 flex flex-col gap-4">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx('font-body font-medium text-sm', isActive ? 'text-rust-500' : 'text-ink-800')
                  }
                >
                  {label}
                </NavLink>
              ))}
              {isAuthenticated ? (
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="btn-ghost btn-sm self-start"
                >
                  Log out
                </button>
              ) : (
                <div className="flex gap-3">
                  <Link to="/login" className="btn-ghost btn-sm" onClick={() => setMobileOpen(false)}>Log in</Link>
                  <Link to="/register" className="btn-primary btn-sm" onClick={() => setMobileOpen(false)}>Get started</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

