import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";
import { formatDistanceToNow } from "date-fns";

interface CallRecord {
  id: string;
  caller_id: string;
  receiver_id: string;
  type: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  remote_name: string;
  remote_avatar: string;
}

export default function CallsPage() {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCalls = async () => {
      const { data } = await (supabase.from("call_records") as any)
        .select("*")
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data) {
        setCallHistory([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(data.flatMap((c: any) => [c.caller_id, c.receiver_id]))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds as string[]);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) || []);

      setCallHistory(
        data.map((call: any) => {
          const remoteId = call.caller_id === user.id ? call.receiver_id : call.caller_id;
          const remoteName = profileMap.get(remoteId) || "Unknown";
          return {
            ...call,
            remote_name: remoteName,
            remote_avatar: (remoteName || "?").slice(0, 2).toUpperCase(),
          };
        })
      );
      setLoading(false);
    };

    fetchCalls();
  }, [user]);

  const getCallDirection = (call: CallRecord) => {
    if (call.caller_id === user?.id) return "outgoing";
    if (call.status === "missed" || call.status === "declined") return "missed";
    return "incoming";
  };

  const getDuration = (call: CallRecord) => {
    if (!call.started_at || !call.ended_at) return null;
    const secs = Math.round((new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const typeIcon = { incoming: PhoneIncoming, outgoing: PhoneOutgoing, missed: PhoneMissed };
  const typeColor = { incoming: "text-success", outgoing: "text-primary", missed: "text-destructive" };

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">Calls</h2>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : callHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
            <Phone className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No calls yet</p>
          <p className="text-xs text-muted-foreground mt-1">Go to Video Calls to start calling friends</p>
        </div>
      ) : (
        <div className="space-y-1">
          {callHistory.map((call, i) => {
            const dir = getCallDirection(call);
            const TypeIcon = typeIcon[dir];
            const duration = getDuration(call);
            return (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-3 flex items-center gap-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-semibold text-foreground">
                    {call.remote_avatar}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card flex items-center justify-center">
                    <TypeIcon className={`w-3 h-3 ${typeColor[dir]}`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[15px]">{call.remote_name}</p>
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    {call.type === "video" && <Video className="w-3 h-3" />}
                    <span>{formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}</span>
                    {duration && <span>· {duration}</span>}
                  </div>
                </div>
                <button
                  onClick={() => startCall(
                    call.caller_id === user?.id ? call.receiver_id : call.caller_id,
                    call.type as "voice" | "video"
                  )}
                  className="w-9 h-9 rounded-full hover:bg-secondary transition-colors flex items-center justify-center text-primary"
                >
                  {call.type === "video" ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
