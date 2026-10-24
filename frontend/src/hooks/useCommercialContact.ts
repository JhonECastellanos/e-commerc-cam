import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { configuredWhatsapp } from '../utils/whatsapp';
let pending: Promise<string | undefined> | undefined;
export function useCommercialContact() {
  const [number, setNumber] = useState<string>();
  useEffect(() => {
    let alive = true;
    pending ??= Promise.allSettled([api.getPublicSettings(), api.getSocialLinks()]).then(([settings, links]) => configuredWhatsapp(settings.status === 'fulfilled' ? settings.value : {}, links.status === 'fulfilled' ? links.value : [], import.meta.env.VITE_WHATSAPP_NUMBER));
    pending.then(value => { if (alive)
      setNumber(value); });
    return () => { alive = false; };
  }, []);
  return number;
}
