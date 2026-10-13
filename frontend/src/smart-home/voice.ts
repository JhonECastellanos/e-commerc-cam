type RecognitionEvent = { results: { [n: number]: { [n: number]: { transcript: string } } }; error?: string };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; processLocally?: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null; start: () => void; abort: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function speakHome(text: string): boolean {
  if (!('speechSynthesis' in window)) return false;
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => v.localService && v.lang.startsWith('es')) || voices.find(v => v.localService);
  // No escoger voces remotas para una demostración centrada en procesamiento local.
  if (!voice) return false;
  speechSynthesis.cancel();
  const phrase = new SpeechSynthesisUtterance(text); phrase.lang = 'es-CO'; phrase.rate = .96; phrase.voice = voice;
  speechSynthesis.speak(phrase); return true;
}

export function startHomeDictation(allowOnline: boolean, onText: (text: string) => void, onStatus: (message: string) => void, onEnd: () => void): (() => void) | undefined {
  const browser = window as SpeechWindow;
  const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  if (!Constructor) { onStatus('Este navegador no ofrece dictado. Puedes escribir la orden.'); onEnd(); return; }
  const recognition = new Constructor();
  if ('processLocally' in recognition) recognition.processLocally = !allowOnline;
  else if (!allowOnline) { onStatus('Activa el permiso de dictado del navegador para usar voz aquí, o escribe tu orden. La instalación de voz local se configura en el servidor del hogar.'); onEnd(); return; }
  recognition.lang = 'es-ES'; recognition.continuous = false; recognition.interimResults = false;
  recognition.onresult = event => onText(event.results[0][0].transcript);
  recognition.onerror = event => onStatus(event.error === 'not-allowed' ? 'El navegador no tiene permiso para usar el micrófono.' : 'El dictado no pudo iniciar. La voz local puede requerir un paquete de idioma; puedes seguir escribiendo.');
  recognition.onend = onEnd;
  try { recognition.start(); onStatus('Escuchando una orden…'); } catch { onStatus('No se pudo iniciar el micrófono. Puedes escribir la orden.'); onEnd(); return; }
  return () => recognition.abort();
}
