import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMediaUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File): Promise<{ url: string; metadata: any } | null> => {
    if (!user) return null;
    setUploading(true);

    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("chat-media").upload(filePath, file);

    if (error) {
      setUploading(false);
      return null;
    }

    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(filePath);

    setUploading(false);
    return {
      url: urlData.publicUrl,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
    };
  };

  return { uploadFile, uploading };
}
