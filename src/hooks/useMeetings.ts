import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Meeting {
  id: string;
  code: string;
  title: string;
  host_id: string;
  starts_at: string | null;
  created_at: string;
  ended_at: string | null;
}

// Letters and digits that cannot be mistaken for one another when someone
// reads a code aloud or copies it off a screen: no 0/o, no 1/l/i.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomCode(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const pick = (i: number) => ALPHABET[bytes[i] % ALPHABET.length];
  return `ums-${pick(0)}${pick(1)}${pick(2)}${pick(3)}-${pick(4)}${pick(5)}${pick(6)}`;
}

/** The link to put in front of someone. */
export function meetingLink(code: string): string {
  return `${window.location.origin}/meet/${code}`;
}

export function useMeetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setMeetings([]);
      setLoading(false);
      return [];
    }
    // Row-level security already limits this to meetings you host or have
    // been in, so there is nothing to filter here.
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .is("ended_at", null)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Meetings] could not load:", error);
      setLoading(false);
      return [];
    }
    const rows = (data ?? []) as Meeting[];
    setMeetings(rows);
    setLoading(false);
    return rows;
  }, [user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  /**
   * @param startsAt when the meeting is for, or null for one starting now
   */
  const createMeeting = useCallback(
    async (title: string, startsAt: string | null): Promise<Meeting | null> => {
      if (!user) return null;
      const clean = title.trim() || "Meeting";

      // A collision is vanishingly unlikely, but a code that is already taken
      // must not become a failed "New meeting" button.
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await supabase
          .from("meetings")
          .insert({ code: randomCode(), title: clean, host_id: user.id, starts_at: startsAt })
          .select()
          .single();

        if (!error && data) {
          const row = data as Meeting;
          setMeetings((prev) => [row, ...prev]);
          return row;
        }
        if (error && error.code !== "23505") {
          console.error("[Meetings] could not create:", error);
          toast({ title: "Could not start the meeting", description: error.message, variant: "destructive" });
          return null;
        }
      }
      toast({ title: "Could not start the meeting", variant: "destructive" });
      return null;
    },
    [user]
  );

  /** Closes the room for good. The link stops working. */
  const endMeeting = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase
        .from("meetings")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        toast({ title: "Could not end the meeting", description: error.message, variant: "destructive" });
        return false;
      }
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      return true;
    },
    []
  );

  return { meetings, loading, refetch, createMeeting, endMeeting };
}
