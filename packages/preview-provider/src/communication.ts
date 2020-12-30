export function notify(
  event: 'missing-request-handler',
  payload: { method: string; url: string }
): void;

export function notify(event: string, payload: any): void {
  console.log('[preview]', event, payload);
  window.dispatchEvent(new CustomEvent('preview:notify', { detail: { event, payload } }));
}
