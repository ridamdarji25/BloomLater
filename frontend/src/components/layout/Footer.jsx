import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Footer() {
  const year = format(new Date(), 'yyyy');

  return (
    <footer className="bg-ink-900 border-t border-cream-200/10 text-cream-200 py-16 px-6 sm:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-cream-200">
            bloom<span className="text-rust-500">later</span>
          </span>
          <p className="font-body text-cream-200/60 text-sm mt-2">
            Seal the moment. Open the future.
          </p>
        </div>

        <nav className="flex flex-wrap gap-8" aria-label="Footer navigation">
          {[
            { to: '/', label: 'Home' },
            { to: '/vault', label: 'Vault' },
            { to: '/create', label: 'New Capsule' },
            { to: '/login', label: 'Sign in' },
            { to: '/register', label: 'Get Started' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="font-body text-sm font-medium text-cream-200/70 hover:text-cream-200 transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-cream-200/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-body text-cream-200/40">
        <p>© {year} BloomLater. All rights reserved.</p>
        <p className="serif-accent italic text-sm text-cream-200/60">
          bloom later. always on time.
        </p>
      </div>
    </footer>
  );
}

