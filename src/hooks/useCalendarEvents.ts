import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CalendarEvent {
  id: string;
  title: string;
  note: string | null;
  event_type: "call" | "chat" | "other";
  starts_at: string;
}

export function useCalendarEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const notifiedIds = useRef<Set<string>>(new Set());

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("calendar_events")
      .select("id, title, note, event_type, starts_at")
      .eq("user_id", user.id)
      .order("starts_at", { ascending: true });
    setEvents(
      (data || []).map((e) => ({
        ...e,
        event_type: (["call", "chat", "other"].includes(e.event_type) ? e.event_type : "other") as CalendarEvent["event_type"],
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = useCallback(
    async (event: { title: string; note?: string; event_type: string; starts_at: string }) => {
      if (!user) return false;
      const { error } = await supabase.from("calendar_events").insert({
        user_id: user.id,
        title: event.title.trim(),
        note: event.note?.trim() || null,
        event_type: event.event_type,
        starts_at: event.starts_at,
      });
      if (error) {
        toast.error("Could not save the event");
        return false;
      }
      await fetchEvents();
      return true;
    },
    [user, fetchEvents]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      await supabase.from("calendar_events").delete().eq("id", id);
    },
    []
  );

  // In-app reminders: when an event's start time arrives while the app is
  // open, show a notification + toast (once per event).
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      for (const e of events) {
        const t = new Date(e.starts_at).getTime();
        if (t <= now && t > now - 90_000 && !notifiedIds.current.has(e.id)) {
          notifiedIds.current.add(e.id);
          const label = e.event_type === "call" ? "📞 Call" : e.event_type === "chat" ? "💬 Chat" : "📌 Event";
          toast(`${label}: ${e.title}`, { description: "It's time!" });
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`${label}: ${e.title}`, { body: "It's time!", tag: `cal-${e.id}` });
            } catch {
              /* ignore */
            }
          }
        }
      }
    };
    check();
    const interval = setInterval(check, 20_000);
    return () => clearInterval(interval);
  }, [events]);

  return { events, loading, addEvent, deleteEvent, refetch: fetchEvents };
}
