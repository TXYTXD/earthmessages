import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Checks every minute (and whenever the app comes back to the foreground)
// whether a newer build has been deployed, and prompts the user to update.
// Solves "my friend has the new button, I don't" — devices holding a cached
// bundle otherwise never notice a new version until a manual refresh.
export function useAppUpdate() {
  const prompted = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (prompted.current) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.id && data.id !== __BUILD_ID__) {
          prompted.current = true;
          toast("Update available ✨", {
            description: "A new version of UMS Messages is ready.",
            action: { label: "Update", onClick: () => window.location.reload() },
            duration: Infinity,
          });
        }
      } catch {
        /* offline or dev server — try again later */
      }
    };

    const interval = setInterval(check, 60_000);
    const onVisible = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", onVisible);
    check();
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
