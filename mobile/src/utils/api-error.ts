/** Error response from the API. `message` is the backend's text (or the first of several). */
export class ApiError extends Error {
  readonly status: number;
  /** All messages, e.g. one per invalid field for a 400. */
  readonly messages: string[];

  constructor(status: number, message: string, messages: string[] = [message]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}
