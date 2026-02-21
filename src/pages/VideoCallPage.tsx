import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Video, Phone, Mic } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { useCall } from "@/contexts/CallContext";
import { toast } from "@/hooks/use-toast";

export default function VideoCallPage() {
  const { friends } = useFriends();
  const { startCall } = useCall();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Proactively request media permissions when page loads
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        // Stop tracks immediately - we just needed the permission
        stream.getTracks().forEach((t) => t.stop());
        setPermissionGranted(true);
      })
      .catch(() => {
        setPermissionGranted(false);
      });
  }, []);

  const handleCall = useCallback(
    (friendId: string, type: "voice" | "video") => {
      // Call startCall directly - it handles getUserMedia internally
      startCall(friendId, type);
    },
    [startCall]
  );

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto overflow-y-auto">
      <h2 className="text-2xl font-bold mb-2">Video Calls</h2>
      <p className="text-sm text-muted-foreground mb-6">Start a video call with a friend</p>

      {permissionGranted === false && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <Mic className="w-4 h-4" />
          Camera/microphone access denied. Please enable it in your browser settings and reload.
        </div>
      )}

      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--messenger-gradient)" }}>
            <Video className="w-9 h-9 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Add friends to start video calling</p>
        </div>
      ) : (
        <div className="space-y-1">
          {friends.map((friend, i) => (
            <motion.div
              key={friend.user_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-3 flex items-center gap-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-semibold text-foreground">
                  {(friend.display_name || "?").slice(0, 2).toUpperCase()}
                </div>
                {friend.is_online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[15px]">{friend.display_name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {friend.is_online ? "Active now" : "Offline"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCall(friend.user_id, "voice")}
                  className="w-10 h-10 rounded-full hover:bg-secondary transition-colors flex items-center justify-center text-primary"
                >
                  <Phone className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCall(friend.user_id, "video")}
                  className="w-10 h-10 rounded-full hover:bg-secondary transition-colors flex items-center justify-center text-primary"
                >
                  <Video className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
