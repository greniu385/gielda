// Błąd z kodem HTTP — komunikat trafia do aplikacji i jest pokazywany użytkownikowi.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
