class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, message, details);
const unauthorized = (message = 'Authentication required') => new HttpError(401, message);
const notFound = (message = 'Not found') => new HttpError(404, message);
const conflict = (message, details) => new HttpError(409, message, details);
const validationError = (details) => new HttpError(422, 'Validation failed', details);

module.exports = { HttpError, badRequest, unauthorized, notFound, conflict, validationError };
