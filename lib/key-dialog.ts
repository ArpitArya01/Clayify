/**
 * A one-way channel for asking the API key sheet to open.
 *
 * The sheet lives in the header and Generate lives in the upload panel. Their
 * only common ancestor is `app/page.tsx`, a server component, so there is no
 * client parent to lift the dialog's open state into. A module-level
 * subscription carries the one imperative call across without turning the page
 * into a client component.
 *
 * Nothing about the key itself travels through here — only the request to open.
 */
const listeners = new Set<() => void>();

export function subscribeToKeyDialogRequests(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestKeyDialog(): void {
  for (const listener of listeners) listener();
}
