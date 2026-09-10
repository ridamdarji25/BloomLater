import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { addDays, addYears, format } from 'date-fns';
import apiClient from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';

const MIN_DATE = format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm");
const MAX_DATE = format(addYears(new Date(), 100), "yyyy-MM-dd'T'HH:mm");

const schema = z.object({
  title: z
    .string()
    .min(1, 'Give your capsule a title')
    .max(120, 'Title must be 120 characters or fewer'),
  message: z
    .string()
    .min(1, 'Write something worth sealing')
    .max(20000, 'Message must be 20,000 characters or fewer'),
  unlockAt: z
    .string()
    .min(1, 'Choose an unlock date')
    .refine((v) => new Date(v) > new Date(), 'Unlock date must be in the future'),
  tags: z.string().optional(),
});

const QUICK_DATES = [
  { label: '1 year', days: 365 },
  { label: '5 years', days: 365 * 5 },
  { label: '10 years', days: 365 * 10 },
  { label: '18 years', days: 365 * 18 },
];

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="font-mono text-label-sm text-rust-500 mt-1.5" role="alert">
      {message}
    </p>
  );
}

function CharCount({ current, max, warn = 0.85 }) {
  const ratio = current / max;
  return (
    <span
      className={clsx(
        'font-mono text-label-sm',
        ratio >= 1 ? 'text-rust-500' : ratio >= warn ? 'text-mustard-500' : 'text-ink-500/40'
      )}
    >
      {current}/{max}
    </span>
  );
}

export default function Create() {
  const navigate = useNavigate();
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: '', message: '', unlockAt: '', tags: '' },
  });

  const messageVal = watch('message') || '';
  const titleVal = watch('title') || '';

  const { mutateAsync: createCapsule } = useMutation({
    mutationFn: async (data) => {
      const parsedTags = tags;
      const res = await apiClient.post('/capsules', {
        title: data.title,
        message: data.message,
        unlockAt: new Date(data.unlockAt).toISOString(),
        tags: parsedTags,
      });
      return res.data.data.capsule;
    },
    onSuccess: (capsule) => {
      queryClient.invalidateQueries({ queryKey: ['capsules'] });
      queryClient.invalidateQueries({ queryKey: ['capsuleStats'] });
      toast.success('Capsule sealed!');
      navigate(`/capsule/${capsule._id}`);
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to seal capsule';
      toast.error(msg);
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    await createCapsule(data);
  });

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => setTags((prev) => prev.filter((t) => t !== tag));

  const setQuickDate = (days) => {
    const d = addDays(new Date(), days);
    setValue('unlockAt', format(d, "yyyy-MM-dd'T'HH:mm"), { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-cream-200 pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="pt-4 mb-10">
          <h1 className="text-display-lg font-display font-extrabold text-ink-900 mb-2">
            Seal a Capsule
          </h1>
          <p className="font-serif italic text-ink-700/80 text-xl">
            write it. seal it. let time do the rest.
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={onSubmit}
          className="space-y-8"
          noValidate
          aria-label="Create capsule form"
        >
          {/* Title */}
          <div>
            <label htmlFor="capsule-title" className="block font-display font-semibold text-ink-900 mb-2">
              Title
            </label>
            <div className="relative">
              <input
                id="capsule-title"
                type="text"
                autoComplete="off"
                maxLength={120}
                placeholder="A letter to my future self"
                className={clsx('input-base pr-20', errors.title && 'input-error')}
                {...register('title')}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CharCount current={titleVal.length} max={120} />
              </div>
            </div>
            <FieldError message={errors.title?.message} />
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="capsule-message" className="font-display font-semibold text-ink-900">
                Message
              </label>
              <CharCount current={messageVal.length} max={20000} />
            </div>
            <textarea
              id="capsule-message"
              rows={10}
              maxLength={20000}
              placeholder="Write what you want your future self — or someone else — to read when the time comes. There are no rules here. Only honesty."
              className={clsx('input-base resize-y min-h-[200px]', errors.message && 'input-error')}
              {...register('message')}
            />
            <FieldError message={errors.message?.message} />
          </div>

          {/* Unlock date */}
          <div>
            <label htmlFor="capsule-unlock-at" className="block font-display font-semibold text-ink-900 mb-2">
              Unlock date
            </label>
            <input
              id="capsule-unlock-at"
              type="datetime-local"
              min={MIN_DATE}
              max={MAX_DATE}
              className={clsx('input-base', errors.unlockAt && 'input-error')}
              {...register('unlockAt')}
            />
            <FieldError message={errors.unlockAt?.message} />

            {/* Quick date buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_DATES.map(({ label, days }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setQuickDate(days)}
                  className="font-mono text-label-sm px-3 py-1 rounded-full border border-ink-900/20 text-ink-700 hover:border-rust-500 hover:text-rust-500 transition-colors duration-200"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="capsule-tags" className="block font-display font-semibold text-ink-900 mb-2">
              Tags
              <span className="font-mono text-label-sm text-ink-500/60 font-normal ml-2">(optional, max 10)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="capsule-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="future, nostalgia, family…"
                maxLength={32}
                className="input-base flex-1"
                aria-describedby="tags-hint"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 10}
                className="btn-ghost btn-sm shrink-0"
              >
                Add
              </button>
            </div>
            <p id="tags-hint" className="font-mono text-label-sm text-ink-500/50 mt-1">
              Press Enter or click Add
            </p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 font-mono text-label-sm px-2.5 py-1 rounded-full bg-ink-900/8 text-ink-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="text-ink-500 hover:text-rust-500 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-ink-900/10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-rust w-full btn-lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-cream-200/30 border-t-cream-200 animate-spin" />
                  Sealing capsule…
                </span>
              ) : (
                'Seal this capsule'
              )}
            </button>
            <p className="font-mono text-label-sm text-ink-500/50 text-center mt-4">
              Once sealed, you cannot edit the message or change the unlock date.
            </p>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
