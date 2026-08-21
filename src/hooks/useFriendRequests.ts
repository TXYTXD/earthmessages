import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender_name?: string;
  receiver_name?: string;
  sender_verified?: boolean;
}

export interface SearchedUser {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
}

export function useFriendRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [incoming, sent] = await Promise.all([
      supabase
        .from("friend_requests")
        .select("*")
        .eq("receiver_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("friend_requests")
        .select("*")
        .eq("sender_id", user.id)
        .eq("status", "pending"),
    ]);

    if (incoming.data) {
      // Fetch sender names
      const senderIds = incoming.data.map((r) => r.sender_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, is_verified")
        .in("user_id", senderIds);

      const profMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setIncomingRequests(
        incoming.data.map((r) => ({
          ...r,
          sender_name: profMap.get(r.sender_id)?.display_name || "Unknown",
          sender_verified: (profMap.get(r.sender_id) as any)?.is_verified || false,
        }))
      );
    }

    if (sent.data) {
      const receiverIds = sent.data.map((r) => r.receiver_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", receiverIds);

      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) || []);
      setSentRequests(
        sent.data.map((r) => ({ ...r, receiver_name: nameMap.get(r.receiver_id) || "Unknown" }))
      );
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRequests();

    // Real-time subscription for friend requests
    const channel = supabase
      .channel('friend-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const searchUsers = async (query: string): Promise<SearchedUser[]> => {
    if (!user || query.trim().length < 2) return [];
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, avatar_url, is_verified")
      .neq("user_id", user.id)
      .ilike("display_name", `%${query}%`)
      .limit(10);
    return data || [];
  };

  const sendRequest = async (receiverId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("friend_requests")
      .insert({ sender_id: user.id, receiver_id: receiverId });

    if (error) {
      toast({
        title: "Error",
        description: error.code === "23505" ? "Request already sent" : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Friend request sent!" });
      fetchRequests();
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: accept ? "Friend request accepted!" : "Friend request declined" });
      fetchRequests();
    }
  };

  const cancelRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request cancelled" });
      fetchRequests();
    }
  };

  return {
    incomingRequests,
    sentRequests,
    loading,
    searchUsers,
    sendRequest,
    respondToRequest,
    cancelRequest,
    refetch: fetchRequests,
  };
}
