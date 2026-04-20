import { useEffect } from 'react'

export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative bg-slate-800 rounded-t-2xl w-full max-h-[90dvh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Title */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 shrink-0">
            <h2 className="text-white font-semibold text-lg">{title}</h2>
            <button onClick={onClose} className="text-slate-400 text-2xl leading-none p-1">×</button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  )
}
