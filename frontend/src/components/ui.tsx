import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'outline' | 'electric'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const styles: Record<Variant, string> = {
  primary:
    'bg-carbon text-white hover:opacity-85 disabled:opacity-40 disabled:hover:opacity-40',
  outline:
    'bg-transparent text-carbon border border-carbon hover:bg-tile-gray disabled:opacity-40',
  electric: 'bg-electric-blue text-white hover:opacity-90 disabled:opacity-40',
}

/** Compact conversion control: Carbon fill, white text, 2px radius. */
export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded-sm px-3 py-[5px] font-nbinternationalpro text-nav font-normal transition-opacity duration-150 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-micro leading-micro font-normal text-steel uppercase">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-md border border-black/10 bg-white px-3 py-2 text-body leading-body text-carbon outline-none transition-colors focus:border-carbon'

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-black/10 bg-tile-gray px-3 py-2 text-nav leading-nav text-carbon">
      {children}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-black/15 px-6 py-12 text-center">
      <p className="text-body-strong leading-body-strong text-carbon">{title}</p>
      {hint && <p className="text-nav leading-nav text-steel">{hint}</p>}
    </div>
  )
}
