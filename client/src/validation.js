// Mirrors server/src/validation.js so users get instant feedback.
// The server remains the source of truth and re-validates everything.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/

export function validateLead(values, sources) {
  const errors = {}
  const v = Object.fromEntries(Object.entries(values).map(([k, val]) => [k, String(val ?? '').trim()]))

  if (!v.name) errors.name = 'Name is required'
  else if (v.name.length > 100) errors.name = 'Name must be 100 characters or fewer'

  if (!v.email) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(v.email)) errors.email = 'Enter a valid email address'

  if (!v.phone) errors.phone = 'Phone is required'
  else if (!PHONE_RE.test(v.phone) || v.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid phone number (7-20 digits)'

  if (!v.company) errors.company = 'Company is required'
  else if (v.company.length > 100) errors.company = 'Company must be 100 characters or fewer'

  if (!v.source) errors.source = 'Choose a source'
  else if (sources.length && !sources.includes(v.source)) errors.source = 'Choose a valid source'

  return errors
}

export function validateCredentials({ name, email, password }, mode) {
  const errors = {}
  if (mode === 'signup' && !name.trim()) errors.name = 'Name is required'
  if (!email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address'
  if (!password) errors.password = 'Password is required'
  else if (mode === 'signup' && password.length < 8) errors.password = 'Password must be at least 8 characters'
  return errors
}
