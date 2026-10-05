import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './ui'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

/** Flat tile-gray panel, 16px radius, no shadow, fixed centered overlay. */
export function Modal({ title, subtitle, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-carbon/20 p-4 backdrop-blur-[2px] sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        className="my-auto w-full max-w-md rounded-2xl border border-black/10 bg-paper p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-heading-small leading-heading-small font-medium tracking-heading-small">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-nav leading-nav text-steel">{subtitle}</p>}
          </div>
          <Button variant="outline" onClick={onClose} aria-label="Close dialog">
            Esc
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
