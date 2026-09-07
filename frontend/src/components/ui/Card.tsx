import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
