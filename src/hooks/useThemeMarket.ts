import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isValidDefinition, type CustomTheme, type ThemeDefinition } from "@/lib/customThemes";
import { normalizeEffects, type ThemeEffects } from "@/lib/themeEffects";
import { normalizeCustomization, type ThemeCustomization } from "@/lib/themeCustomization";

const table = () => supabase.from("custom_themes") as any;

function normalize(rows: any[]): CustomTheme[] {
  return (rows || [])
    .filter((r) => isValidDefinition(r.definition))
    .map((r) => ({
      ...r,
      effects: normalizeEffects(r.effects),
      customization: normalizeCustomization(r.customization),
    })) as CustomTheme[];
}

// Themes this user made or added from the market
export function useMyThemes() {
  const { user } = useAuth();
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: mine }, { data: installs }] = await Promise.all([
      table().select("*").eq("author_id", user.id).order("created_at", { ascending: false }),
      (supabase.from("theme_installs") as any).select("theme_id").eq("user_id", user.id),
    ]);
    const ids = new Set<string>((installs || []).map((i: any) => i.theme_id));
    let added: any[] = [];
    if (ids.size) {
      const { data } = await table().select("*").in("id", [...ids]);
      added = data || [];
    }
    const merged = new Map<string, CustomTheme>();
    normalize([...(mine || []), ...added]).forEach((t) => merged.set(t.id, t));
    setThemes([...merged.values()]);
    setInstalledIds(ids);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { themes, installedIds, loading, refetch };
}

export function useThemeMarket() {
  const { user } = useAuth();
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"popular" | "new">("popular");

  const refetch = useCallback(async () => {
    setLoading(true);
    const q = table().select("*").eq("is_public", true).limit(200);
    const { data } = sort === "popular"
      ? await q.order("installs", { ascending: false }).order("created_at", { ascending: false })
      : await q.order("created_at", { ascending: false });
    setThemes(normalize(data || []));
    setLoading(false);
  }, [sort]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const publish = useCallback(
    async (
      name: string,
      definition: ThemeDefinition,
      isPublic: boolean,
      effects?: ThemeEffects,
      customization?: ThemeCustomization
    ): Promise<CustomTheme | null> => {
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      const { data, error } = await table()
        .insert({
          author_id: user.id,
          author_name: profile?.display_name || "Someone",
          name: name.trim(),
          definition,
          effects: normalizeEffects(effects),
          customization: normalizeCustomization(customization),
          is_public: isPublic,
        })
        .select("*")
        .single();
      if (error) throw error;
      return {
        ...(data as CustomTheme),
        effects: normalizeEffects((data as any).effects),
        customization: normalizeCustomization((data as any).customization),
      };
    },
    [user]
  );

  // Authors can revise a theme they published. Everyone who added it sees
  // the new version, which is why the install list is not touched here.
  const updateTheme = useCallback(
    async (
      themeId: string,
      patch: { name?: string; definition?: ThemeDefinition; effects?: ThemeEffects; customization?: ThemeCustomization; isPublic?: boolean }
    ): Promise<CustomTheme | null> => {
      if (!user) return null;
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name.trim();
      if (patch.definition) row.definition = patch.definition;
      if (patch.effects) row.effects = normalizeEffects(patch.effects);
      if (patch.customization) row.customization = normalizeCustomization(patch.customization);
      if (patch.isPublic !== undefined) row.is_public = patch.isPublic;
      if (!Object.keys(row).length) return null;

      const { data, error } = await table()
        .update(row)
        .eq("id", themeId)
        .eq("author_id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      const updated = {
        ...(data as CustomTheme),
        effects: normalizeEffects((data as any).effects),
        customization: normalizeCustomization((data as any).customization),
      };
      setThemes((prev) => prev.map((t) => (t.id === themeId ? updated : t)));
      return updated;
    },
    [user]
  );

  const install = useCallback(async (themeId: string) => {
    const { error } = await supabase.rpc("install_theme" as any, { p_theme: themeId } as any);
    if (error) throw error;
    setThemes((prev) => prev.map((t) => (t.id === themeId ? { ...t, installs: t.installs + 1 } : t)));
  }, []);

  const uninstall = useCallback(async (themeId: string) => {
    const { error } = await supabase.rpc("uninstall_theme" as any, { p_theme: themeId } as any);
    if (error) throw error;
    setThemes((prev) => prev.map((t) => (t.id === themeId ? { ...t, installs: Math.max(0, t.installs - 1) } : t)));
  }, []);

  return { themes, loading, sort, setSort, refetch, publish, updateTheme, install, uninstall };
}
