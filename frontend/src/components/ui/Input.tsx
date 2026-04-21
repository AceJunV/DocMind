import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary-500/20',
        error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500',
        className
      )}
      {...props}
    />
  )
)

Input.displayName = 'Input'
