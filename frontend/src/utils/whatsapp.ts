export function whatsappNumber(value?: string | null): string | undefined {
  if (!value || /COMPLETAR|DEFINIR|[\[\]<>]/i.test(value))
    return;
  let candidate = value;
  if (/^https?:/i.test(value)) {
    try {
      const url = new URL(value);
      if (['wa.me', 'www.wa.me'].includes(url.hostname))
        candidate = url.pathname.slice(1);
      else if (['api.whatsapp.com', 'web.whatsapp.com'].includes(url.hostname))
        candidate = url.searchParams.get('phone') || '';
      else
        return;
    }
    catch {
      return;
    }
  }
  if (!/^[+\d\s()-]+$/.test(candidate))
    return;
  const number = candidate.replace(/\D/g, '');
  return /^[1-9]\d{7,14}$/.test(number) ? number : undefined;
}
export function whatsappURL(number: string | undefined, message: string): string | undefined {
  const clean = whatsappNumber(number);
  return clean ? `https://wa.me/${clean}?text=${encodeURIComponent(message.trim())}` : undefined;
}
export function configuredWhatsapp(settings: {
  whatsapp_number?: string;
}, links: {
  platform: string;
  url: string;
}[], env?: string) {
  return whatsappNumber(settings.whatsapp_number) || whatsappNumber(links.find(l => l.platform === 'whatsapp')?.url) || whatsappNumber(env);
}
