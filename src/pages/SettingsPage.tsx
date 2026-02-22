import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Volume2, Languages, Zap, Check, Shield, Bell, Palette, Sun, Moon, Lock } from "lucide-react";
import { useThemeContext, ThemeName } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { usePin } from "@/hooks/usePin";
import { PinVerifyDialog } from "@/components/PinVerifyDialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
  { code: "el", name: "Greek", flag: "🇬🇷" },
];

export default function SettingsPage() {
  const { theme, setTheme, colorMode, toggleColorMode } = useThemeContext();
  const {
    primaryLang,
    setPrimaryLang,
    autoTranslate,
    setAutoTranslate,
    showOriginal,
    setShowOriginal,
    voiceTranslation,
    setVoiceTranslation,
  } = useTranslation();
  const { hasPin, changePin, savePin, verifyPin } = usePin();
  const { toast } = useToast();
  const [staySignedIn, setStaySignedIn] = useState(() => {
    return localStorage.getItem("stay_signed_in") !== "false";
  });
  const [notifications, setNotifications] = useState(true);
  const [showPinChange, setShowPinChange] = useState(false);
  const [pinVerifyOpen, setPinVerifyOpen] = useState(false);
  const [changePinStep, setChangePinStep] = useState<"new" | "confirm">("new");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const handleStaySignedIn = (value: boolean) => {
    setStaySignedIn(value);
    localStorage.setItem("stay_signed_in", String(value));
  };

  const handlePinChangeVerified = () => {
    setPinVerifyOpen(false);
    setShowPinChange(true);
    setChangePinStep("new");
    setNewPin("");
    setConfirmNewPin("");
  };

  const handleNewPinSubmit = async () => {
    if (changePinStep === "new") {
      if (newPin.length < 4) return;
      setChangePinStep("confirm");
      return;
    }
    if (confirmNewPin !== newPin) {
      toast({ variant: "destructive", title: "PINs don't match" });
      setConfirmNewPin("");
      return;
    }
    setPinLoading(true);
    const ok = await savePin(newPin);
    setPinLoading(false);
    if (ok) {
      toast({ title: "PIN updated!" });
      setShowPinChange(false);
    } else {
      toast({ variant: "destructive", title: "Failed to update PIN" });
    }
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

        {/* PIN Code */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[15px] font-medium">Security PIN</p>
                <p className="text-[13px] text-muted-foreground">
                  {hasPin ? "PIN is set — required for sensitive actions" : "No PIN set"}
                </p>
              </div>
            </div>
            {hasPin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPinVerifyOpen(true)}
                className="rounded-lg text-xs"
              >
                Change PIN
              </Button>
            )}
          </div>

          {showPinChange && (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium">
                {changePinStep === "new" ? "Enter new PIN" : "Confirm new PIN"}
              </p>
              <div className="flex justify-center">
                {changePinStep === "new" ? (
                  <InputOTP maxLength={6} value={newPin} onChange={setNewPin}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} /><InputOTPSlot index={1} />
                      <InputOTPSlot index={2} /><InputOTPSlot index={3} />
                      <InputOTPSlot index={4} /><InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                ) : (
                  <InputOTP maxLength={6} value={confirmNewPin} onChange={setConfirmNewPin}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} /><InputOTPSlot index={1} />
                      <InputOTPSlot index={2} /><InputOTPSlot index={3} />
                      <InputOTPSlot index={4} /><InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowPinChange(false)} className="rounded-lg">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleNewPinSubmit}
                  disabled={pinLoading || (changePinStep === "new" ? newPin.length < 4 : confirmNewPin.length < 4)}
                  className="rounded-lg"
                >
                  {changePinStep === "new" ? "Next" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <PinVerifyDialog
          open={pinVerifyOpen}
          onVerified={handlePinChangeVerified}
          onCancel={() => setPinVerifyOpen(false)}
          verifyPin={verifyPin}
          title="Verify current PIN"
        />


        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                {colorMode === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              </div>
              <div>
                <h3 className="font-semibold text-[15px]">Appearance</h3>
                <p className="text-[13px] text-muted-foreground">{colorMode === "dark" ? "Dark mode" : "Light mode"}</p>
              </div>
            </div>
            <button
              onClick={toggleColorMode}
              className={`w-11 h-6 rounded-full transition-colors relative ${colorMode === "dark" ? "bg-primary" : "bg-muted"}`}
            >
              <motion.div
                animate={{ x: colorMode === "dark" ? 20 : 2 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-white"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
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
            {languages.map((lang) => {
              const isSelected = primaryLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPrimaryLang(lang.code);
                  }}
                  className={`p-2.5 rounded-lg text-sm flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "bg-accent text-foreground hover:bg-accent/80"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="truncate">{lang.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                </button>
              );
            })}
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
