import { useState, useRef } from "react";
import { Plus, Camera, X, Search, Play, Users, Globe, Heart, MessageCircle, Send, UserPlus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStories, type StoryGroup } from "@/hooks/useStories";
import { useStoryEngagement, useFollowUser } from "@/hooks/useStoryEngagement";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function StoriesPage() {
  const { user } = useAuth();
  const { storyGroups, myStories, createStory, viewStory } = useStories();
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Caption dialog state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setCaption("");
    setVisibility("private");
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handlePublish = async () => {
    if (!pendingFile) return;
    setUploading(true);
    await createStory(pendingFile, caption || undefined, visibility);
    setUploading(false);
    setPendingFile(null);
    setPreviewUrl(null);
    setCaption("");
  };

  const handleCancelCreate = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setCaption("");
  };

  const openStory = async (group: StoryGroup) => {
    setViewingGroup(group);
    setCurrentIndex(0);
    setShowComments(false);
    setCommentText("");
    if (!group.stories[0].viewed) {
      await viewStory(group.stories[0].id);
    }
  };

  const nextStory = async () => {
    if (!viewingGroup) return;
    setShowComments(false);
    setCommentText("");
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

  const filteredGroups = storyGroups.filter((g) =>
    g.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentStory = viewingGroup?.stories[currentIndex];
  const isVideo = currentStory?.media_type === "video";
  const { likeCount, liked, comments, toggleLike, addComment } = useStoryEngagement(currentStory?.id ?? null);
  const { status: followStatus, follow } = useFollowUser(viewingGroup?.user_id ?? null);

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    await addComment(commentText);
    setCommentText("");
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border space-y-3">
        <div>
          <h2 className="text-2xl font-bold">Stories</h2>
          <p className="text-sm text-muted-foreground mt-1">View and share moments with friends</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Your Story */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Story</h3>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-4 w-full p-3 rounded-xl hover:bg-accent transition-colors"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center relative">
              {myStories.length > 0 ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">You</div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                    <Plus className="w-3 h-3 text-primary-foreground" />
                  </div>
                </>
              ) : (
                <Camera className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="text-left">
              <p className="font-medium text-[15px]">Add to your story</p>
              <p className="text-[13px] text-muted-foreground">Share a photo or video</p>
            </div>
          </button>

          {/* Own stories thumbnails */}
          {myStories.length > 0 && (
            <div className="flex gap-3 mt-3 px-3 overflow-x-auto">
              {myStories.map((story) => (
                <div key={story.id} className="w-24 h-36 rounded-xl overflow-hidden flex-shrink-0 relative">
                  {story.media_type === "video" ? (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <Play className="w-6 h-6 text-muted-foreground" />
                    </div>
                  ) : (
                    <img src={story.media_url} alt="Your story" className="w-full h-full object-cover" />
                  )}
                  {story.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/50">
                      <span className="text-white text-[10px] line-clamp-2">{story.caption}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friend Stories */}
        {filteredGroups.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Updates</h3>
            <div className="space-y-1">
              {filteredGroups.map((group) => (
                <button
                  key={group.user_id}
                  onClick={() => openStory(group)}
                  className="flex items-center gap-4 w-full p-3 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className={`w-16 h-16 rounded-full p-[2px] ${group.all_viewed ? "bg-muted" : "bg-gradient-to-tr from-primary to-purple-500"}`}>
                    <div className="w-full h-full rounded-full bg-card p-[2px]">
                      <div className="w-full h-full rounded-full bg-secondary overflow-hidden relative flex items-center justify-center">
                        {group.stories[0].media_type === "video" ? (
                          <>
                            <video
                              src={group.stories[0].media_url}
                              className="w-full h-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                            />
                            <Play className="w-4 h-4 text-white absolute drop-shadow" />
                          </>
                        ) : (
                          <img
                            src={group.stories[0].media_url}
                            alt={group.user_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[15px]">{group.user_name}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {group.stories.length} {group.stories.length === 1 ? "story" : "stories"}
                      {group.all_viewed ? "" : " · New"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredGroups.length === 0 && myStories.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
              <Camera className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No stories yet. Be the first to share!</p>
          </div>
        )}

        {searchQuery && filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No stories found for "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Create Story Dialog (caption input) */}
      <Dialog open={!!pendingFile} onOpenChange={(open) => { if (!open) handleCancelCreate(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            {previewUrl && pendingFile && (
              <div className="rounded-xl overflow-hidden max-h-64 flex items-center justify-center bg-secondary">
                {pendingFile.type.startsWith("video") ? (
                  <video src={previewUrl} className="max-h-64 rounded-xl" controls muted />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-64 object-contain rounded-xl" />
                )}
              </div>
            )}
            <Input
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
            />
            {/* Visibility choice */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  visibility === "private"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Users className="w-4 h-4" /> Private
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Only friends can see it</p>
              </button>
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  visibility === "public"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Globe className="w-4 h-4" /> Public
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Anyone can see it</p>
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancelCreate}>Cancel</Button>
              <Button onClick={handlePublish} disabled={uploading}>
                {uploading ? "Sharing..." : "Share Story"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {viewingGroup && currentStory && (
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
                  <div className={`h-full rounded-full transition-all duration-300 ${i <= currentIndex ? "w-full bg-white" : "w-0"}`} />
                </div>
              ))}
            </div>

            {/* Header: creator + follow */}
            <div className="absolute top-8 left-4 right-14 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-foreground flex-shrink-0">
                {viewingGroup.user_avatar}
              </div>
              <span className="text-white text-sm font-medium truncate">{viewingGroup.user_name}</span>
              {followStatus === "none" && (
                <button
                  onClick={follow}
                  className="ml-1 px-3 py-1.5 rounded-full bg-white text-black text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Follow
                </button>
              )}
              {followStatus === "pending" && (
                <span className="ml-1 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" /> Requested
                </span>
              )}
            </div>

            {/* Story content: image or video */}
            {isVideo ? (
              <video
                key={currentStory.id}
                src={currentStory.media_url}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                autoPlay
                playsInline
                muted={false}
                onClick={(e) => e.stopPropagation()}
                onEnded={nextStory}
              />
            ) : (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}

            {/* Caption */}
            {currentStory.caption && (
              <div className="absolute bottom-24 left-4 right-4 text-center pointer-events-none">
                <span className="text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                  {currentStory.caption}
                </span>
              </div>
            )}

            {/* Like + comment bar */}
            <div
              className="absolute bottom-6 left-4 right-4 flex items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={toggleLike}
                className="flex items-center gap-1.5 text-white"
              >
                <Heart
                  className={`w-7 h-7 transition-colors ${liked ? "fill-red-500 text-red-500" : ""}`}
                />
                {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
              </button>
              <button
                onClick={() => setShowComments(true)}
                className="flex items-center gap-1.5 text-white"
              >
                <MessageCircle className="w-7 h-7" />
                {comments.length > 0 && <span className="text-sm font-medium">{comments.length}</span>}
              </button>
            </div>

            {/* Comments panel */}
            <AnimatePresence>
              {showComments && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "tween", duration: 0.2 }}
                  className="absolute bottom-0 left-0 right-0 max-h-[55vh] bg-background rounded-t-2xl flex flex-col z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                    <span className="font-semibold text-sm">
                      Comments{comments.length > 0 ? ` (${comments.length})` : ""}
                    </span>
                    <button
                      onClick={() => setShowComments(false)}
                      className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No comments yet. Be the first!
                      </p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                            {c.user_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold">{c.user_name}</p>
                            <p className="text-sm text-foreground break-words">{c.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-3 py-2 border-t border-border flex items-center gap-2 shrink-0">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSendComment(); }}
                      placeholder="Add a comment..."
                      maxLength={500}
                      className="flex-1 px-4 py-2.5 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <button
                      onClick={handleSendComment}
                      disabled={!commentText.trim()}
                      className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); setViewingGroup(null); }}
              className="absolute top-4 right-4 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
