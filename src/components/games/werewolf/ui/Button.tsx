'use client';

import type { ComponentProps } from 'react';

// Nút tối thiểu của GĐ1 (GĐ3 thay bằng bộ nhận diện riêng): cao ≥ 44px, một
// màu nhấn (chàm) cho việc chính.
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-indigo-500 text-white hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-400',
  secondary: 'bg-slate-800 text-slate-100 ring-1 ring-inset ring-slate-600 hover:bg-slate-700 disabled:text-slate-500',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 disabled:text-slate-600',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-400',
};

export default function Button({
  variant = 'secondary',
  block = false,
  className = '',
  type = 'button',
  ...rest
}: ComponentProps<'button'> & { variant?: Variant; block?: boolean }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed ${VARIANT[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  );
}
