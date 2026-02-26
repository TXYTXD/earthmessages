import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, X, Loader2, TrendingUp } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("gif-search", {
        body: { query: searchQuery, limit: 20 },
      });
      if (fnError) {
        throw new Error(fnError.message);
      }
      if (data?.gifs) {
        setGifs(data.gifs);
      } else {
        setGifs([]);
      }
    } catch (e: any) {
      console.error("GIF search error:", e);
      setError("Failed to load GIFs");
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifs("");
    inputRef.current?.focus();
  }, [fetchGifs]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchGifs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
      style={{ maxHeight: 380 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/30">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Label */}
      {!query && !loading && gifs.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          <TrendingUp className="w-3 h-3" />
          Trending
        </div>
      )}

      {/* Grid */}
      <div className="overflow-y-auto px-2 pb-2" style={{ maxHeight: 280 }}>
        {loading && gifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading GIFs...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-1">
            <span className="text-sm text-destructive font-medium">{error}</span>
            <button
              onClick={() => fetchGifs(query)}
              className="text-xs text-primary hover:underline mt-1"
            >
              Try again
            </button>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-1">
            <span className="text-sm text-muted-foreground">No GIFs found</span>
            <span className="text-xs text-muted-foreground/60">Try a different search</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {gifs.map((gif) => (
              <motion.button
                key={gif.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(gif.url)}
                className="relative aspect-square overflow-hidden rounded-xl bg-muted hover:ring-2 hover:ring-primary/60 transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  src={gif.preview || gif.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Attribution */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/20 flex items-center">
        <span className="text-[10px] text-muted-foreground/70">Powered by Tenor</span>
      </div>
    </motion.div>
  );
}
