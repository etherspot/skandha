export default class ApplicationError extends Error {
  public message: string = 'ApplicationError';

  public status: number = 500;

  constructor(message?: string, status?: number) {
    super();
    if (message != null) {
      this.message = message;
    }
    if (status != null) {
      this.status = status;
    }
  }
}
