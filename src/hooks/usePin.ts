import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "_ums_pin_salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function usePin() {
  const { user } = useAuth();
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("pin_hash")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        const hash = data?.pin_hash ?? null;
        setPinHash(hash);
        setHasPin(!!hash);
        setLoading(false);
      });
  }, [user]);

  const savePin = useCallback(
    async (pin: string) => {
      if (!user) return false;
      const hash = await hashPin(pin);
      const { error } = await supabase
        .from("profiles")
        .update({ pin_hash: hash } as any)
        .eq("user_id", user.id);
      if (error) return false;
      setPinHash(hash);
      setHasPin(true);
      return true;
    },
    [user]
  );

  const verifyPin = useCallback(
    async (pin: string) => {
      if (!pinHash) return false;
      const hash = await hashPin(pin);
      return hash === pinHash;
    },
    [pinHash]
  );

  const changePin = useCallback(
    async (oldPin: string, newPin: string) => {
      const valid = await verifyPin(oldPin);
      if (!valid) return false;
      return savePin(newPin);
    },
    [verifyPin, savePin]
  );

  return { hasPin, loading, savePin, verifyPin, changePin };
}
