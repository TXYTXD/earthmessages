import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (supabase.rpc as any)("user_has_pin").then(({ data }: any) => {
      setHasPin(!!data);
      setLoading(false);
    });
  }, [user]);

  const savePin = useCallback(
    async (pin: string) => {
      if (!user) return false;
      const { error } = await (supabase.rpc as any)("set_user_pin", { _pin: pin });
      if (error) return false;
      setHasPin(true);
      return true;
    },
    [user]
  );

  const verifyPin = useCallback(async (pin: string) => {
    const { data, error } = await (supabase.rpc as any)("verify_user_pin", { _pin: pin });
    if (error) return false;
    return !!data;
  }, []);

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
