import { motion } from "framer-motion";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Globe, Video, Clock } from "lucide-react";

interface CallRecord {
  id: string;
  name: string;
  avatar: string;
  type: "incoming" | "outgoing" | "missed";
  isVideo: boolean;
  time: string;
  duration?: string;
  language?: string;
}

const callHistory: CallRecord[] = [
  { id: "1", name: "Sarah Chen", avatar: "SC", type: "incoming", isVideo: true, time: "Today, 10:30 AM", duration: "12:34", language: "中文" },
  { id: "2", name: "Marco Rossi", avatar: "MR", type: "outgoing", isVideo: false, time: "Today, 9:15 AM", duration: "5:21", language: "Italiano" },
  { id: "3", name: "Yuki Tanaka", avatar: "YT", type: "missed", isVideo: true, time: "Yesterday, 6:00 PM", language: "日本語" },
  { id: "4", name: "Ana García", avatar: "AG", type: "outgoing", isVideo: true, time: "Yesterday, 2:30 PM", duration: "23:45", language: "Español" },
  { id: "5", name: "Pierre Dubois", avatar: "PD", type: "incoming", isVideo: false, time: "2 days ago", duration: "8:12", language: "Français" },
];

const typeIcon = {
  incoming: PhoneIncoming,
  outgoing: PhoneOutgoing,
  missed: PhoneMissed,
};

const typeColor = {
  incoming: "text-success",
  outgoing: "text-primary",
  missed: "text-destructive",
};

export default function CallsPage() {
  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Call History</h2>
      <div className="space-y-2">
        {callHistory.map((call, i) => {
          const TypeIcon = typeIcon[call.type];
          return (
            <motion.div
              key={call.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-4 flex items-center gap-4 cursor-pointer"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-semibold text-foreground">
                  {call.avatar}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card flex items-center justify-center`}>
                  <TypeIcon className={`w-3 h-3 ${typeColor[call.type]}`} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{call.name}</p>
                  {call.isVideo && <Video className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {call.time}
                  </span>
                  {call.duration && <span>{call.duration}</span>}
                  {call.language && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-primary" /> {call.language}
                    </span>
                  )}
                </div>
              </div>
              <button className="p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-success">
                <Phone className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
