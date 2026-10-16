let loaded: Promise<void> | null = null;

function loadScript(): Promise<void> {
  loaded ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // a failed load is retriable: clear the cache so the next attempt fetches the script again
      loaded = null;
      reject(new Error("The human check could not load."));
    };
    document.head.appendChild(script);
  });
  return loaded;
}

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: { sitekey: string; callback: (token: string) => void; "error-callback": () => void },
  ) => void;
};

// Renders the Turnstile widget into the element and resolves with its token.
export async function renderTurnstile(element: HTMLElement): Promise<string> {
  await loadScript();
  const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
  const sitekey: string = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";
  if (!api) throw new Error("The human check could not load.");
  return new Promise<string>((resolve, reject) => {
    api.render(element, {
      sitekey,
      callback: (token) => resolve(token),
      "error-callback": () => reject(new Error("The human check failed. Try again.")),
    });
  });
}
