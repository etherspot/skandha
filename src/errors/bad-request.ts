import ApplicationError from './application-error';

export default class BadRequest extends ApplicationError {
  constructor(message?: string) {
    super(message || 'Bad request', 400);
  }
}
