import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useLogin } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

function FieldError({ message }) {
  if (!message) return null;
  return <p className="font-body text-xs text-rust-500 mt-1.5" role="alert">{message}</p>;
}

export default function Login() {
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((data) => login(data));

  return (
    <div className="min-h-screen bg-cream-200 flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="lg:w-[45%] bg-ink-900 p-8 sm:p-12 flex flex-col justify-between min-h-[220px] lg:min-h-screen">
        <div>
          <Link to="/" className="font-display font-extrabold text-2xl text-cream-200 tracking-tight hover:opacity-90">
            bloom<span className="text-rust-500">later</span>
          </Link>
        </div>
        <div className="my-auto py-8">
          <p className="serif-accent text-cream-200/90 text-2xl sm:text-3xl leading-snug mb-4">
            "write for the self you haven't met yet."
          </p>
          <p className="font-body text-sm text-cream-200/50">
            Digital Time Capsules
          </p>
        </div>
        <div className="hidden lg:block text-xs font-body text-cream-200/40">
          © {new Date().getFullYear()} BloomLater. All rights reserved.
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 lg:py-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full mx-auto"
        >
          <h1 className="text-display-md font-display font-extrabold text-ink-900 mb-2">
            Open your vault
          </h1>
          <p className="font-body text-ink-600 mb-8">
            Sign in to access your sealed capsules
          </p>

          <form onSubmit={onSubmit} className="space-y-5" noValidate aria-label="Login form">
            <div>
              <label htmlFor="login-email" className="block font-body font-semibold text-ink-800 mb-1.5 text-sm">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={clsx('input-base', errors.email && 'input-error')}
                {...register('email')}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div>
              <label htmlFor="login-password" className="block font-body font-semibold text-ink-800 mb-1.5 text-sm">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={clsx('input-base', errors.password && 'input-error')}
                {...register('password')}
              />
              <FieldError message={errors.password?.message} />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full mt-2 btn-lg"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-cream-200/30 border-t-cream-200 animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="font-body text-sm text-ink-600 text-center mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-rust-500 hover:text-rust-600 font-semibold transition-colors">
              Get started free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

