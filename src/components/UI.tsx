// src/components/UI.tsx
import React from 'react';

export function Button(
  { children, onClick, disabled, variant = 'primary', title, className }:
    {
      children: React.ReactNode; onClick?: () => void; disabled?: boolean;
      variant?: 'primary' | 'ghost' | 'secondary'; title?: string; className?: string
    }
) {
  const base =
    'px-3 py-2 rounded-xl border text-sm font-medium transition ' +
    (disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm');
  const styles: Record<string, string> = {
    primary: `${base} bg-gray-900 text-white border-transparent`,
    ghost: `${base} bg-white text-gray-900 border-gray-300`,
    secondary: `${base} bg-gray-100 text-gray-900 border-gray-200`,
  };
  return (
    <button title={title} onClick={disabled ? undefined : onClick} className={`${styles[variant]} ${className || ''}`}>
      {children}
    </button>
  );
}

const fieldBase =
  'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ' +
  'focus:ring-2 focus:ring-gray-300 focus:border-gray-400';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className || ''}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className || ''}`} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldBase} ${props.className || ''}`} />;
}

/* ใช้ติดป้ายเล็กๆ ในหน้า ReceiveIn */
export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-full bg-gray-100 text-gray-700 text-xs px-2 py-1">{children}</span>;
}
