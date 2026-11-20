const { STATUSES, SOURCES } = require('./constants');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Validate a lead payload. Returns { errors, value }.
 * `errors` is an object keyed by field name; empty when valid.
 */
function validateLead(body = {}) {
  const value = {
    name: str(body.name),
    email: str(body.email).toLowerCase(),
    phone: str(body.phone),
    company: str(body.company),
    source: str(body.source),
    status: str(body.status) || 'New',
  };
  const errors = {};

  if (!value.name) errors.name = 'Name is required';
  else if (value.name.length > 100) errors.name = 'Name must be 100 characters or fewer';

  if (!value.email) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(value.email) || value.email.length > 254) errors.email = 'Enter a valid email address';

  if (!value.phone) errors.phone = 'Phone is required';
  else if (!PHONE_RE.test(value.phone)) errors.phone = 'Enter a valid phone number (7-20 digits)';
  else if (value.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid phone number (7-20 digits)';

  if (!value.company) errors.company = 'Company is required';
  else if (value.company.length > 100) errors.company = 'Company must be 100 characters or fewer';

  if (!value.source) errors.source = 'Source is required';
  else if (!SOURCES.includes(value.source)) errors.source = `Source must be one of: ${SOURCES.join(', ')}`;

  if (!STATUSES.includes(value.status)) errors.status = `Status must be one of: ${STATUSES.join(', ')}`;

  return { errors, value };
}

function validateSignup(body = {}) {
  const value = { name: str(body.name), email: str(body.email).toLowerCase(), password: typeof body.password === 'string' ? body.password : '' };
  const errors = {};

  if (!value.name) errors.name = 'Name is required';
  else if (value.name.length > 100) errors.name = 'Name must be 100 characters or fewer';

  if (!value.email) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(value.email)) errors.email = 'Enter a valid email address';

  if (!value.password) errors.password = 'Password is required';
  else if (value.password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (value.password.length > 72) errors.password = 'Password must be 72 characters or fewer';

  return { errors, value };
}

function validateLogin(body = {}) {
  const value = { email: str(body.email).toLowerCase(), password: typeof body.password === 'string' ? body.password : '' };
  const errors = {};
  if (!value.email) errors.email = 'Email is required';
  if (!value.password) errors.password = 'Password is required';
  return { errors, value };
}

module.exports = { validateLead, validateSignup, validateLogin };
