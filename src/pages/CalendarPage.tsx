import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  MessageCircle,
  Pin,
  Trash2,
  CalendarDays,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
} from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendarEvents";

const TYPE_META = {
  call: { icon: Phone, label: "Call", color: "text-green-500", bg: "bg-green-500/15" },
  chat: { icon: MessageCircle, label: "Chat", color: "text-primary", bg: "bg-primary/15" },
  other: { icon: Pin, label: "Other", color: "text-orange-500", bg: "bg-orange-500/15" },
} as const;

export default function CalendarPage() {
  const { events, loading, addEvent, deleteEvent } = useCalendarEvents();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  // Add dialog state
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"call" | "chat" | "other">("call");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("18:00");
  const [note, setNote] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const eventsOn = (day: Date) => events.filter((e) => isSameDay(new Date(e.starts_at), day));
  const dayEvents = eventsOn(selectedDay);
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= Date.now()).slice(0, 5);

  const openAdd = () => {
    setTitle("");
    setType("call");
    setDate(format(selectedDay, "yyyy-MM-dd"));
    setTime("18:00");
    setNote("");
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !date || !time) return;
    setSavingEvent(true);
    const ok = await addEvent({
      title,
      note,
      event_type: type,
      starts_at: new Date(`${date}T${time}`).toISOString(),
    });
    setSavingEvent(false);
    if (ok) setShowAdd(false);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-primary" /> Calendar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Plan calls, chats, and more</p>
        </div>
        <Button onClick={openAdd} className="rounded-full gap-2">
          <Plus className="w-4 h-4" /> New event
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold font-display">{format(month, "MMMM yyyy")}</h3>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 gap-1 mb-6">
          {days.map((day) => {
            const inMonth = isSameMonth(day, month);
            const selected = isSameDay(day, selectedDay);
            const dayEvts = eventsOn(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isToday(day)
                    ? "bg-primary/15 text-primary font-semibold hover:bg-primary/25"
                    : inMonth
                    ? "hover:bg-accent text-foreground"
                    : "text-muted-foreground/40 hover:bg-accent/50"
                }`}
              >
                {format(day, "d")}
                {dayEvts.length > 0 && (
                  <div className="absolute bottom-1.5 flex gap-0.5">
                    {dayEvts.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          selected ? "bg-primary-foreground" : e.event_type === "call" ? "bg-green-500" : e.event_type === "chat" ? "bg-primary" : "bg-orange-500"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {format(selectedDay, "EEEE, MMMM d")}
        </h4>
        {dayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-8">
            Nothing planned. Tap <span className="font-medium text-foreground">New event</span> to add something.
          </p>
        ) : (
          <div className="space-y-2 mb-8">
            {dayEvents.map((e) => (
              <EventRow key={e.id} event={e} onDelete={() => deleteEvent(e.id)} />
            ))}
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h4>
            <div className="space-y-2">
              {upcoming.map((e) => (
                <EventRow key={e.id} event={e} showDate onDelete={() => deleteEvent(e.id)} />
              ))}
            </div>
          </>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-10">
            <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Your calendar is empty. Plan your first call or chat!</p>
          </div>
        )}
      </div>

      {/* Add event dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => !open && setShowAdd(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="What's happening? (e.g. Call with Orfeas)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((t) => {
                const meta = TYPE_META[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`p-3 rounded-xl border text-center transition-colors ${
                      type === t ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <meta.icon className={`w-4 h-4 mx-auto mb-1 ${meta.color}`} />
                    <span className="text-xs font-medium">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <Input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!title.trim() || savingEvent}>
                {savingEvent ? "Saving…" : "Save event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventRow({ event, showDate, onDelete }: { event: CalendarEvent; showDate?: boolean; onDelete: () => void }) {
  const meta = TYPE_META[event.event_type];
  const when = new Date(event.starts_at);
  const past = isBefore(when, new Date());
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-center gap-3 p-3 rounded-xl border border-border ${past ? "opacity-55" : ""}`}
    >
      <div className={`w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0`}>
        <meta.icon className={`w-5 h-5 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium truncate">{event.title}</p>
        <p className="text-[12px] text-muted-foreground">
          {showDate ? format(when, "EEE, MMM d · HH:mm") : format(when, "HH:mm")}
          {event.note ? ` · ${event.note}` : ""}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
