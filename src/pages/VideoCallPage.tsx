import { useState } from "react";
import { motion } from "framer-motion";
import { Video, MessageCircle } from "lucide-react";

export default function VideoCallPage() {
  const [isInCall, setIsInCall] = useState(false);

  if (!isInCall) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "var(--messenger-gradient)" }}>
            <Video className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Video Calls</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Start a video call with real-time translation.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsInCall(true)}
            className="w-full py-3 rounded-full font-medium text-sm text-white"
            style={{ background: "var(--messenger-gradient)" }}
          >
            Start New Call
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative">
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <Video className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">Waiting for someone to join...</p>
          </div>
        </div>
      </div>
      <div className="p-6 flex items-center justify-center gap-4 border-t border-border">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsInCall(false)}
          className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center"
        >
          <Video className="w-5 h-5 text-destructive-foreground" />
        </motion.button>
      </div>
    </div>
  );
}
