import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { validateCredentials } from '../validation'
import Field from './Field'

export default function AuthPage() {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState('login')
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isSignup = mode === 'signup'
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup')
    setErrors({})
    setFormError('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const found = validateCredentials(values, mode)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return

    setSubmitting(true)
    try {
      await (isSignup ? signup : login)({ ...values, email: values.email.trim(), name: values.name.trim() })
    } catch (err) {
      setErrors(err.details || {})
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="auth">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Lead Manager</h1>
        <p className="muted">{isSignup ? 'Create an account to start tracking leads.' : 'Sign in to see your leads.'}</p>

        {formError && <div className="alert" role="alert">{formError}</div>}

        {isSignup && (
          <Field label="Name" error={errors.name}>
            <input value={values.name} onChange={set('name')} autoComplete="name" autoFocus />
          </Field>
        )}
        <Field label="Email" error={errors.email}>
          <input type="email" value={values.email} onChange={set('email')} autoComplete="email" autoFocus={!isSignup} />
        </Field>
        <Field label="Password" error={errors.password} hint={isSignup ? 'At least 8 characters' : undefined}>
          <input
            type="password"
            value={values.password}
            onChange={set('password')}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
        </Field>

        <button className="btn primary block" disabled={submitting}>
          {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
        </button>

        <p className="muted center">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="link" onClick={switchMode}>
            {isSignup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </main>
  )
}
