/** A business-rule refusal the UI can show as-is. `field` points at the form input to blame. */
export type DomainError = {
  code: string;
  message: string;
  field?: string;
};
