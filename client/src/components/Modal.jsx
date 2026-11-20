import { useEffect, useRef } from 'react'

/** Minimal accessible modal: closes on Escape / backdrop click, restores focus on close. */
export default function Modal({ title, onClose, children, size = 'md' }) {
  const ref = useRef(null)
  // Keep the latest onClose without re-running the mount effect (which would steal focus mid-typing).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Focus the first form control, falling back to the dialog itself.
    ;(ref.current.querySelector('input, select, button.primary, button.danger') || ref.current).focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [])

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        {children}
      </div>
    </div>
  )
}
