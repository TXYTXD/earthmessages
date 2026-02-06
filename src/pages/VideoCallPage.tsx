import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, Phone, Monitor, MessageSquare, Globe, Users, Settings } from "lucide-react";

export default function VideoCallPage() {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);

  if (!isInCall) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 rounded-3xl bg-primary/15 flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Start a Video Call</h2>
          <p className="text-muted-foreground mb-8">
            Call your friends with real-time translation. Break language barriers effortlessly.
          </p>
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsInCall(true)}
              className="w-full py-3 rounded-xl font-medium text-sm text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              Start New Call
            </motion.button>
            <div className="grid grid-cols-2 gap-3">
              {["Sarah Chen", "Marco Rossi", "Yuki Tanaka", "Ana García"].map((name) => (
                <motion.button
                  key={name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsInCall(true)}
                  className="glass-card-hover p-3 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold mb-2">
                    {name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Globe className="w-3 h-3 text-primary" /> Auto-translate
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative">
      {/* Main video area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Remote video (mock) */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
          <div className="text-center">
            <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-muted-foreground">SC</span>
            </div>
            <p className="text-lg font-semibold">Sarah Chen</p>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 mt-1">
              <Globe className="w-3.5 h-3.5 text-primary" />
              Translating: 中文 → English
            </p>
          </div>
        </div>

        {/* Self video */}
        <motion.div
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          className="absolute bottom-4 right-4 w-44 h-32 rounded-xl bg-card border border-border overflow-hidden shadow-2xl"
        >
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <span className="text-sm text-muted-foreground">You</span>
          </div>
        </motion.div>

        {/* Translation overlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 right-52 glass-card p-3"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">Live Translation</span>
          </div>
          <p className="text-sm text-foreground">"Let's discuss the project timeline for next week"</p>
          <p className="text-xs text-muted-foreground mt-1">Original: "我们来讨论下周的项目时间表吧"</p>
        </motion.div>

        {/* Call duration */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-card px-4 py-1.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium text-foreground">12:34</span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 flex items-center justify-center gap-3 bg-card/50 backdrop-blur-xl border-t border-border">
        <ControlButton icon={isMuted ? MicOff : Mic} active={!isMuted} onClick={() => setIsMuted(!isMuted)} label={isMuted ? "Unmute" : "Mute"} />
        <ControlButton icon={isVideoOn ? Video : VideoOff} active={isVideoOn} onClick={() => setIsVideoOn(!isVideoOn)} label="Camera" />
        <ControlButton icon={Monitor} active={false} onClick={() => {}} label="Share" />
        <ControlButton icon={MessageSquare} active={false} onClick={() => {}} label="Chat" />
        <ControlButton icon={Users} active={false} onClick={() => {}} label="People" />
        <ControlButton icon={Settings} active={false} onClick={() => {}} label="Settings" />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsInCall(false)}
          className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center ml-4"
        >
          <Phone className="w-5 h-5 text-destructive-foreground rotate-[135deg]" />
        </motion.button>
      </div>
    </div>
  );
}

function ControlButton({ icon: Icon, active, onClick, label }: { icon: any; active: boolean; onClick: () => void; label: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
        active ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </motion.button>
  );
}
