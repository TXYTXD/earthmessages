import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Newspaper, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface NewsPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function NewsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("news_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPosts(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => navigate("/welcome")}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--messenger-gradient)" }}>
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold font-display">UMS Messages</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold font-display mb-2 flex items-center gap-3">
          <Newspaper className="w-7 h-7 text-primary" /> News
        </h1>
        <p className="text-muted-foreground mb-10">Announcements and updates from UMS Messages.</p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-border">
            <Newspaper className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No news yet — check back soon!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border p-6"
              >
                <p className="text-[12px] text-muted-foreground mb-1.5">
                  {new Date(post.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <h2 className="text-lg font-semibold font-display mb-2">{post.title}</h2>
                <div className="text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
