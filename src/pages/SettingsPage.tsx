import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Volume2, Languages, Zap, Check, Shield, Bell, Palette } from "lucide-react";
import { useThemeContext, ThemeName } from "@/contexts/ThemeContext";

const themes: { id: ThemeName; name: string; colors: string[] }[] = [
  { id: "default", name: "Default", colors: ["hsl(270 70% 55%)", "hsl(214 100% 55%)", "hsl(190 100% 50%)"] },
  { id: "ocean", name: "Ocean", colors: ["hsl(195 100% 45%)", "hsl(210 100% 50%)", "hsl(180 100% 40%)"] },
  { id: "sunset", name: "Sunset", colors: ["hsl(350 80% 55%)", "hsl(25 95% 55%)", "hsl(45 100% 55%)"] },
  { id: "forest", name: "Forest", colors: ["hsl(130 50% 35%)", "hsl(150 60% 40%)", "hsl(170 70% 45%)"] },
  { id: "midnight", name: "Midnight", colors: ["hsl(280 80% 55%)", "hsl(265 85% 60%)", "hsl(240 80% 65%)"] },
  { id: "rose", name: "Rose", colors: ["hsl(340 82% 55%)", "hsl(320 75% 50%)", "hsl(290 70% 55%)"] },
];

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useThemeContext();
  const [primaryLang, setPrimaryLang] = useState("en");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);
  const [voiceTranslation, setVoiceTranslation] = useState(true);
  const [staySignedIn, setStaySignedIn] = useState(() => {
    return localStorage.getItem("stay_signed_in") !== "false";
  });
  const [notifications, setNotifications] = useState(true);

  const handleStaySignedIn = (value: boolean) => {
    setStaySignedIn(value);
    localStorage.setItem("stay_signed_in", String(value));
  };

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="space-y-4">
        {/* Account & Security */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="text-[15px] font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Account & Security
          </h3>
          <ToggleRow
            icon={<Shield className="w-5 h-5 text-primary" />}
            title="Stay signed in"
            desc="Keep you logged in between sessions"
            value={staySignedIn}
            onChange={handleStaySignedIn}
          />
          <div className="border-t border-border" />
          <ToggleRow
            icon={<Bell className="w-5 h-5 text-warning" />}
            title="Call notifications"
            desc="Get notified for incoming calls"
            value={notifications}
            onChange={setNotifications}
          />
        </div>

        {/* Theme Picker */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-[15px]">App Theme</h3>
              <p className="text-[13px] text-muted-foreground">Choose a color theme for the entire app</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-3 rounded-lg text-sm flex flex-col items-center gap-2 transition-all ${
                  theme === t.id
                    ? "ring-2 ring-primary bg-primary/10"
                    : "bg-accent hover:bg-accent/80"
                }`}
              >
                <div
                  className="w-full h-6 rounded-md"
                  style={{ background: `linear-gradient(135deg, ${t.colors.join(", ")})` }}
                />
                <span className="text-xs font-medium">{t.name}</span>
                {theme === t.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Language */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-[15px]">Your Language</h3>
              <p className="text-[13px] text-muted-foreground">Messages will be translated to this language</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setPrimaryLang(lang.code)}
                className={`p-2.5 rounded-lg text-sm flex items-center gap-2 transition-all ${
                  primaryLang === lang.code
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "bg-accent text-foreground hover:bg-accent/80"
                }`}
              >
                <span>{lang.flag}</span>
                <span className="truncate">{lang.name}</span>
                {primaryLang === lang.code && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Translation toggles */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <ToggleRow
            icon={<Zap className="w-5 h-5 text-warning" />}
            title="Auto-translate messages"
            desc="Automatically translate incoming messages"
            value={autoTranslate}
            onChange={setAutoTranslate}
          />
          <div className="border-t border-border" />
          <ToggleRow
            icon={<Languages className="w-5 h-5 text-primary" />}
            title="Show original text"
            desc="Display the original message alongside the translation"
            value={showOriginal}
            onChange={setShowOriginal}
          />
          <div className="border-t border-border" />
          <ToggleRow
            icon={<Volume2 className="w-5 h-5 text-success" />}
            title="Voice translation"
            desc="Translate voice during calls in real-time"
            value={voiceTranslation}
            onChange={setVoiceTranslation}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon, title, desc, value, onChange }: { icon: React.ReactNode; title: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-[15px] font-medium">{title}</p>
          <p className="text-[13px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? "bg-primary" : "bg-muted"}`}
      >
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
