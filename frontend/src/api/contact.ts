export function configuredPublicLink(value?: string): boolean {
  if (!value || /COMPLETAR|DEFINIR|[\[\]<>]/i.test(value)) return false;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}
