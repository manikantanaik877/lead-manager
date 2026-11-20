import { cloneElement, useId } from 'react'

/** Label + input + error text, wired together for accessibility. */
export default function Field({ label, error, hint, children }) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <span className="field-error" id={`${id}-error`}>{error}</span>
      ) : hint ? (
        <span className="field-hint" id={`${id}-hint`}>{hint}</span>
      ) : null}
    </div>
  )
}
