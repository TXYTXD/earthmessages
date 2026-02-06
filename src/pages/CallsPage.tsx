import { motion } from "framer-motion";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Clock, MessageCircle } from "lucide-react";

interface CallRecord {
  id: string;
  name: string;
  avatar: string;
  type: "incoming" | "outgoing" | "missed";
  isVideo: boolean;
  time: string;
  duration?: string;
}

const callHistory: CallRecord[] = [];

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
      <h2 className="text-2xl font-bold mb-6">Calls</h2>
      {callHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
            <Phone className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No calls yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {callHistory.map((call, i) => {
            const TypeIcon = typeIcon[call.type];
            return (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-3 flex items-center gap-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-semibold text-foreground">
                    {call.avatar}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card flex items-center justify-center">
                    <TypeIcon className={`w-3 h-3 ${typeColor[call.type]}`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[15px]">{call.name}</p>
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    {call.isVideo && <Video className="w-3 h-3" />}
                    <span>{call.time}</span>
                    {call.duration && <span>· {call.duration}</span>}
                  </div>
                </div>
                <button className="w-9 h-9 rounded-full hover:bg-secondary transition-colors flex items-center justify-center text-primary">
                  <Phone className="w-5 h-5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
