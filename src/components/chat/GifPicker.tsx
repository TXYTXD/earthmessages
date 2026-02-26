import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GifResult {
  id: string;
  title: string;
  preview: string;
  url: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gif-search", {
        body: { query: searchQuery, limit: 24 },
      });
      if (!error && data?.gifs) {
        setGifs(data.gifs);
      }
    } catch (e) {
      console.error("GIF search error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on mount
  useEffect(() => {
    fetchGifs("");
    inputRef.current?.focus();
  }, [fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchGifs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
      style={{ maxHeight: 360 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-y-auto p-1.5" style={{ maxHeight: 300 }}>
        {loading && gifs.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No GIFs found
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.url)}
                className="relative aspect-square overflow-hidden rounded-lg hover:ring-2 hover:ring-primary transition-all"
              >
                <img
                  src={gif.preview || gif.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tenor attribution */}
      <div className="px-2 py-1 border-t border-border">
        <span className="text-[10px] text-muted-foreground">Powered by Tenor</span>
      </div>
    </motion.div>
  );
}
