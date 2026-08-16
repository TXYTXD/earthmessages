import { useEffect, useState } from "react";
import { RefreshCw, MessageCircle } from "lucide-react";

// Mandatory update screen for the Android app. The native shell appends
// "UMSAndroid/<version>" to the WebView user agent; when that version is
// below the minVersion published in /android-version.json, the app is
// blocked behind this fullscreen prompt until it's updated from the
// Play Store. Regular web updates never trigger this — only bumping
// minVersion after a native shell change does.
export function AndroidUpdateGate() {
  const [blocked, setBlocked] = useState(false);
  const [storeUrl, setStoreUrl] = useState(
    "https://play.google.com/store/apps/details?id=net.umsmessages.app"
  );

  useEffect(() => {
    const match = navigator.userAgent.match(/UMSAndroid\/(\d+)/);
    if (!match) return; // not running inside the Android app
    const installed = parseInt(match[1], 10);

    fetch(`/android-version.json?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.minVersion === "number" && installed < data.minVersion) {
          if (typeof data.storeUrl === "string" && data.storeUrl) setStoreUrl(data.storeUrl);
          setBlocked(true);
        }
      })
      .catch(() => {
        /* offline — let the app load; we'll check again next launch */
      });
  }, []);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center px-8 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "var(--messenger-gradient)" }}
      >
        <MessageCircle className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-bold font-display mb-2">Update needed</h1>
      <p className="text-muted-foreground max-w-sm mb-8">
        To keep using UMS Messages, you need to update the app first. Get the latest
        version from the Play Store, then come back — it only takes a moment.
      </p>
      <a
        href={storeUrl}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="w-4 h-4" /> Update from the Play Store
      </a>
    </div>
  );
}
