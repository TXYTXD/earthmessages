import { useState, useEffect } from "react";
import { Download, Smartphone, Check, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-10 h-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Install Earth Messages</h1>
          <p className="text-muted-foreground">
            Get the full app experience — fast, offline-ready, and always one tap away.
          </p>
        </div>

        {isInstalled ? (
          <div className="flex items-center justify-center gap-2 text-primary">
            <Check className="w-5 h-5" />
            <span className="font-medium">App is installed!</span>
          </div>
        ) : isIOS ? (
          <div className="bg-accent rounded-xl p-5 text-left space-y-3">
            <p className="font-medium text-foreground">To install on iPhone/iPad:</p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground">1.</span>
                Tap the <Share className="w-4 h-4 inline text-primary" /> Share button in Safari
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground">2.</span>
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground">3.</span>
                Tap <strong>"Add"</strong> to confirm
              </li>
            </ol>
          </div>
        ) : deferredPrompt ? (
          <Button size="lg" onClick={handleInstall} className="gap-2 w-full">
            <Download className="w-5 h-5" />
            Install App
          </Button>
        ) : (
          <div className="bg-accent rounded-xl p-5 text-left space-y-3">
            <p className="font-medium text-foreground">To install:</p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground">1.</span>
                Open this page in Chrome or Edge
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground">2.</span>
                Tap the menu (⋮) and select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>
              </li>
            </ol>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Works on Android, iPhone, and desktop browsers.
        </p>
      </div>
    </div>
  );
}
