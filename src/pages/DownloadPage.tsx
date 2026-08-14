import { Download, Monitor, Smartphone, ArrowLeft, MessageCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SETUP_URL = "/downloads/UMS-Messages-Setup.exe";
const PORTABLE_URL = "/downloads/UMS-Messages-Portable.exe";

export default function DownloadPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => navigate("/welcome")}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--messenger-gradient)" }}
          >
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold font-display">UMS Messages</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold font-display mb-2">Downloads</h1>
          <p className="text-muted-foreground mb-10">
            Get UMS Messages on your devices. Same account, same messages, everywhere.
          </p>

          {/* Windows */}
          <div className="rounded-2xl border border-border p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Monitor className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold">Windows</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  The full UMS Messages experience as a desktop app — chats, stories, and
                  video calls in its own window. Updates automatically.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="rounded-full gap-2">
                    <a href={SETUP_URL}>
                      <Download className="w-4 h-4" /> Download for Windows
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full gap-2">
                    <a href={PORTABLE_URL}>
                      <Download className="w-4 h-4" /> Portable version
                    </a>
                  </Button>
                </div>
                <p className="text-[12px] text-muted-foreground mt-3 flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  If Windows shows a SmartScreen warning, click "More info" then "Run anyway".
                </p>
              </div>
            </div>
          </div>

          {/* Phone / tablet */}
          <div className="rounded-2xl border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold">Phone &amp; tablet</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Install UMS Messages straight from your browser — it works like a native
                  app on iPhone, iPad, and Android.
                </p>
                <Button
                  variant="outline"
                  className="rounded-full gap-2"
                  onClick={() => navigate("/install")}
                >
                  How to install on mobile
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
