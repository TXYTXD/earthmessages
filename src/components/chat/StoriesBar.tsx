import { useState, useRef } from "react";
import { Plus, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStories, type StoryGroup } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";

export function StoriesBar() {
  const { user } = useAuth();
  const { storyGroups, myStories, createStory, viewStory } = useStories();
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await createStory(file);
    e.target.value = "";
  };

  const openStory = async (group: StoryGroup) => {
    setViewingGroup(group);
    setCurrentIndex(0);
    if (!group.stories[0].viewed) {
      await viewStory(group.stories[0].id);
    }
  };

  const nextStory = async () => {
    if (!viewingGroup) return;
    if (currentIndex < viewingGroup.stories.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      if (!viewingGroup.stories[next].viewed) {
        await viewStory(viewingGroup.stories[next].id);
      }
    } else {
      setViewingGroup(null);
    }
  };

  if (storyGroups.length === 0 && myStories.length === 0) {
    return (
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddStory} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">Your story</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
          {/* Add story */}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddStory} />
          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center relative">
              {myStories.length > 0 ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                    You
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                    <Plus className="w-3 h-3 text-primary-foreground" />
                  </div>
                </>
              ) : (
                <Plus className="w-5 h-5 text-primary" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">Your story</span>
          </button>

          {/* Friend stories */}
          {storyGroups.map((group) => (
            <button
              key={group.user_id}
              onClick={() => openStory(group)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className={`w-14 h-14 rounded-full p-[2px] ${group.all_viewed ? "bg-muted" : "bg-gradient-to-tr from-primary to-purple-500"}`}>
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-xs font-semibold p-[2px]">
                  <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center">
                    {group.user_avatar}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[56px] truncate">{group.user_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Story viewer modal */}
      <AnimatePresence>
        {viewingGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={nextStory}
          >
            {/* Progress bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1">
              {viewingGroup.stories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      i < currentIndex ? "w-full bg-white" : i === currentIndex ? "w-full bg-white" : "w-0"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-foreground">
                {viewingGroup.user_avatar}
              </div>
              <span className="text-white text-sm font-medium">{viewingGroup.user_name}</span>
            </div>

            {/* Story content */}
            <img
              src={viewingGroup.stories[currentIndex]?.media_url}
              alt="Story"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            {/* Caption */}
            {viewingGroup.stories[currentIndex]?.caption && (
              <div className="absolute bottom-8 left-4 right-4 text-center">
                <span className="text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                  {viewingGroup.stories[currentIndex].caption}
                </span>
              </div>
            )}

            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); setViewingGroup(null); }}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
