import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useRegister } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(32, 'Username must be 32 characters or fewer')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, underscores, and hyphens only'),
  displayName: z.string().max(64, 'Display name must be 64 characters or fewer').optional(),
  password: z
    .string()
    .min(8, 'Must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

function FieldError({ message }) {
  if (!message) return null;
  return <p className="font-body text-xs text-rust-500 mt-1.5" role="alert">{message}</p>;
}

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];
  return (
    <div className="flex gap-3 mt-2">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-1.5">
          <span className={clsx('w-1.5 h-1.5 rounded-full', c.ok ? 'bg-olive-500' : 'bg-ink-900/20')} />
          <span className={clsx('font-body text-xs font-medium', c.ok ? 'text-olive-700' : 'text-ink-600/60')}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Register() {
  const { mutate: register, isPending } = useRegister();

  const {
    register: rhfRegister,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', username: '', displayName: '', password: '', confirmPassword: '' },
  });

  const password = watch('password') || '';
  const onSubmit = handleSubmit((data) => {
    const { confirmPassword, ...rest } = data;
    register(rest);
  });

  return (
    <div className="min-h-screen bg-cream-200 flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="lg:w-[45%] bg-rust-500 p-8 sm:p-12 flex flex-col justify-between min-h-[220px] lg:min-h-screen text-cream-200">
        <div>
          <Link to="/" className="font-display font-extrabold text-2xl tracking-tight text-cream-200 hover:opacity-90">
            bloomlater
          </Link>
        </div>
        <div className="my-auto py-8">
          <p className="serif-accent text-cream-200/90 text-2xl sm:text-3xl leading-snug mb-4">
            "some things bloom best when you give them time."
          </p>
          <p className="font-body text-sm text-cream-200/60">
            Free forever. No credit card required.
          </p>
        </div>
        <div className="hidden lg:block text-xs font-body text-cream-200/50">
          © {new Date().getFullYear()} BloomLater. All rights reserved.
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 lg:py-0 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full mx-auto my-auto py-6"
        >
          <h1 className="text-display-md font-display font-extrabold text-ink-900 mb-2">
            Start sealing memories
          </h1>
          <p className="font-body text-ink-600 mb-8">
            Create your account to write your first time capsule
          </p>

          <form onSubmit={onSubmit} className="space-y-4" noValidate aria-label="Registration form">
            <div>
              <label htmlFor="reg-email" className="block font-body font-semibold text-ink-800 mb-1.5 text-sm">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={clsx('input-base', errors.email && 'input-error')}
                {...rhfRegister('email')}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div>
              <label htmlFor="reg-username" className="block font-body font-semibold text-ink-800 mb-1.5 text-sm">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                autoComplete="username"
                placeholder="futurethinker"
                maxLength={32}
                className={clsx('input-base', errors.username && 'input-error')}
                {...rhfRegister('username')}
              />
              <FieldError message={errors.username?.message} />
            </div>

            <div>
              <label htmlFor="reg-display-name" className="block font-body font-semibold text-ink-800 mb-1.5 text-sm">
                Display name <span className="text-ink-500/60 font-normal">(optional)</span>
              </label>
              <input
                id="reg-display-name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                maxLength={64}
                className="input-base"
                {...rhfRegister('displayName')}
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block font-body font-semibold text-ink-800 mb-1.5 text-sm">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                placeholder="8+ chars, uppercase, number"
                className={clsx('input-base', errors.password && 'input-error')}
                {...rhfRegister('password')}
              />
              <PasswordStrength password={password} />
              <FieldError message={errors.password?.message} />
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block font-body font-semibold text-ink-800 mb-1.5 text-sm">
                Confirm password
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                className={clsx('input-base', errors.confirmPassword && 'input-error')}
                {...rhfRegister('confirmPassword')}
              />
              <FieldError message={errors.confirmPassword?.message} />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-rust w-full mt-4 btn-lg"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-cream-200/30 border-t-cream-200 animate-spin" />
                  Creating account…
                </span>
              ) : (
                'Create my account'
              )}
            </button>
          </form>

          <p className="font-body text-sm text-ink-600 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-rust-500 hover:text-rust-600 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

