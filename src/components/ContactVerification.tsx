import { useEffect, useRef, useState } from 'react';

interface TurnstileApi {
  render: (element: HTMLElement, options: {
    sitekey: string; theme: 'dark'; size: 'flexible' | 'compact'; action: string;
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<TurnstileApi> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      const fail = () => {
        clearTimeout(timeout);
        script.remove();
        scriptPromise = undefined;
        reject(new Error('Verification could not load'));
      };
      const timeout = window.setTimeout(fail, 15000);
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => {
        if (!window.turnstile) { fail(); return; }
        clearTimeout(timeout);
        resolve(window.turnstile);
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function ContactVerification({ onToken, resetKey }: {
  onToken: (token: string) => void;
  resetKey: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Loading verification…');
  const [retry, setRetry] = useState(0);
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

  useEffect(() => {
    let disposed = false;
    let widgetId: string | undefined;
    let api: TurnstileApi | undefined;
    onToken('');
    if (!sitekey || (import.meta.env.PROD && /^[123]x00000000000000000000/.test(sitekey))) {
      setStatus('Verification is unavailable. Please email xantina@xantina.art.');
      return;
    }
    setStatus('Loading verification…');
    loadTurnstile().then(loaded => {
      if (disposed || !container.current) return;
      api = loaded;
      widgetId = api.render(container.current, {
        sitekey, theme: 'dark',
        size: container.current.clientWidth < 300 ? 'compact' : 'flexible', action: 'contact',
        callback: token => {
          if (disposed) return;
          onToken(token);
          setStatus('Verification complete. You can send your message.');
        },
        'expired-callback': () => {
          if (disposed) return;
          onToken('');
          setStatus('Verification expired. Please verify again.');
          setRetry(value => value + 1);
        },
        'error-callback': () => {
          if (disposed) return;
          onToken('');
          setStatus('Verification failed to load. Try again or email xantina@xantina.art.');
        },
      });
      setStatus('Please complete the verification before sending.');
    }).catch(() => {
      if (!disposed) setStatus('Verification failed to load. Try again or email xantina@xantina.art.');
    });
    return () => {
      disposed = true;
      if (widgetId !== undefined) api?.remove(widgetId);
    };
  }, [onToken, sitekey, resetKey, retry]);

  return (
    <div className="space-y-2 min-w-0">
      <div ref={container} className="w-full" />
      <p role="status" className="text-sm text-muted-foreground">{status}</p>
      {status.includes('failed') && (
        <button type="button" className="text-sm text-gold underline" onClick={() => setRetry(value => value + 1)}>
          Retry verification
        </button>
      )}
    </div>
  );
}
