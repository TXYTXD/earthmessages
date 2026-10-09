import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle, Edit, Users, Search } from "lucide-react";
import { motion } from "framer-motion";
import { springy, snappy, riseIn } from "@/lib/motion";
import { FriendRequestBar } from "@/components/FriendRequestBar";
import { ContactList } from "@/components/chat/ContactList";
import { ChatArea } from "@/components/chat/ChatArea";
import { StoriesBar } from "@/components/chat/StoriesBar";
import { FriendsList } from "@/components/chat/FriendsList";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { NewGroupDialog } from "@/components/chat/NewGroupDialog";
import AIChatPage from "@/pages/AIChatPage";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { useIsSinglePane } from "@/hooks/use-mobile";
import { useT } from "@/contexts/LanguageContext";
import { type Friend } from "@/hooks/useFriends";

export default function ChatsPage() {
  const { conversations, loading, createDirectConversation, createGroupConversation, refetch } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  // Held here rather than inside the list, because the field that drives it
  // now lives in the header.
  const [search, setSearch] = useState("");
  // On a narrow window the list and the chat take turns rather than share
  const singlePane = useIsSinglePane();
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link from a notification: /?chat=<conversationId>
  const chatParam = searchParams.get("chat");
  useEffect(() => {
    if (!chatParam || loading) return;
    const conv = conversations.find((c) => c.id === chatParam);
    if (conv) {
      setShowAI(false);
      setSelectedConversation(conv);
    }
    // Clear the param so back/refresh behave normally
    const next = new URLSearchParams(searchParams);
    next.delete("chat");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatParam, loading, conversations]);

  // A notification tapped while the app is already open
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const d = event.data;
      if (!d || d.type !== "open-url" || typeof d.url !== "string") return;
      const id = new URL(d.url, window.location.origin).searchParams.get("chat");
      if (!id) return;
      const conv = conversations.find((c) => c.id === id);
      if (conv) {
        setShowAI(false);
        setSelectedConversation(conv);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [conversations]);

  const handleSelectFriend = async (friend: Friend) => {
    setShowAI(false);
    const convId = await createDirectConversation(friend.user_id);
    if (!convId) {
      console.error("Failed to create conversation with", friend.display_name);
      return;
    }
    const updated = await refetch();
    const conv = updated.find((c) => c.id === convId);
    setSelectedConversation(conv || {
      id: convId,
      type: "direct",
      name: null,
      avatar_url: friend.avatar_url,
      theme_color: "#0084ff",
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_name: friend.display_name,
      display_avatar: (friend.display_name || "?").slice(0, 2).toUpperCase(),
      unread_count: 0,
      is_online: friend.is_online,
      members: [],
    });
  };

  const handleSelectFriendById = async (userId: string) => {
    // Used by NewChatDialog which only passes userId
    const convId = await createDirectConversation(userId);
    if (convId) {
      const updated = await refetch();
      const conv = updated.find((c) => c.id === convId);
      if (conv) setSelectedConversation(conv);
    }
  };

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    const convId = await createGroupConversation(name, memberIds);
    if (convId) {
      await refetch();
      setTimeout(async () => {
        await refetch();
      }, 500);
    }
  };

  const activeConv = selectedConversation
    ? conversations.find((c) => c.id === selectedConversation.id) || selectedConversation
    : null;

  const showChatArea = singlePane && (activeConv || showAI);
  const showSidebar = !singlePane || (!activeConv && !showAI);

  return (
    <div className={`flex flex-1 h-full min-h-0 ${singlePane ? "" : "gap-3 p-3"}`}>
      {/* The chat list. On a wide screen it is a panel floating on the
          ambient background; on a phone it fills the screen and the header
          floats above it. */}
      {showSidebar && (
        <motion.div
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={springy}
          className={
            singlePane
              // Centred and capped, so a wide screen does not stretch a
              // phone-shaped row across 800 pixels of nothing.
              ? "w-full max-w-[44rem] mx-auto flex flex-col relative overflow-x-clip"
              : "w-[320px] xl:w-[368px] flex-shrink-0 flex flex-col rounded-[28px] overflow-hidden overflow-x-clip glass-tint glass-float"
          }
        >
          <div className={singlePane ? "px-3.5 pt-3.5 pb-2 sticky top-0 z-20" : "px-4 pt-4 pb-2"}>
            <div className={singlePane ? "rounded-[28px] glass-tint glass-float px-3 xs:px-4 pt-3.5 pb-3.5" : ""}>
              <div className="flex items-center justify-between">
                <motion.h1
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springy}
                  className={`font-bold tracking-tight min-w-0 truncate ${
                    singlePane
                      ? "text-[17px] xs:text-[26px] sm:text-[28px]"
                      // The side panel is 320px until xl, whatever the window
                      // is doing, and four buttons leave about 130px of it.
                      : "text-[20px] xl:text-[24px]"
                  }`}
                >
                  {t("chats.title")}
                </motion.h1>
                <div className={`flex items-center flex-shrink-0 ${singlePane ? "gap-1 xs:gap-1.5" : "gap-1 xl:gap-1.5"}`}>
                  <FriendRequestBar compact={!singlePane} />
                  <motion.button
                    whileTap={{ scale: 0.86, rotate: -8 }}
                    whileHover={{ scale: 1.06 }}
                    transition={snappy}
                    onClick={() => setShowNewGroup(true)}
                    className={`rounded-full glass-inset flex items-center justify-center text-foreground press tap-pad ${
                      singlePane ? "w-[38px] h-[38px] xs:w-10 xs:h-10" : "w-9 h-9 xl:w-10 xl:h-10"
                    }`}
                    title={t("chats.newGroup")}
                    aria-label={t("chats.newGroup")}
                  >
                    <Users className="w-[18px] h-[18px]" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.86, rotate: -8 }}
                    whileHover={{ scale: 1.06 }}
                    transition={snappy}
                    onClick={() => setShowNewChat(true)}
                    className={`rounded-full bg-primary text-primary-foreground flex items-center justify-center press-lift shadow-soft tap-pad ${
                      singlePane ? "w-[38px] h-[38px] xs:w-10 xs:h-10" : "w-9 h-9 xl:w-10 xl:h-10"
                    }`}
                    title={t("chats.newMessage")}
                    aria-label={t("chats.newMessage")}
                  >
                    <Edit className="w-[18px] h-[18px]" />
                  </motion.button>
                </div>
              </div>

              {/* Search belongs up here with the title, not on a row of its
                  own below the stories — it was costing a whole band of the
                  screen for one field. */}
              <div className="relative mt-2.5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("chats.search")}
                  aria-label={t("chats.search")}
                  className="w-full h-11 pl-11 pr-4 glass-inset rounded-full text-[16px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>
          </div>
          <StoriesBar />
          <FriendsList onSelect={handleSelectFriend} />
          <ContactList
            search={search}
            conversations={conversations}
            selectedId={activeConv?.id || null}
            onSelect={(conv) => { setShowAI(false); setSelectedConversation(conv); }}
            onSelectAI={() => { setSelectedConversation(null); setShowAI(true); }}
            isAISelected={showAI}
            loading={loading}
          />

        </motion.div>
      )}

      {/* Chat Area */}
      {showAI ? (
        <AIChatPage onBack={singlePane ? () => setShowAI(false) : undefined} />
      ) : showChatArea || (!singlePane && activeConv) ? (
        <ChatArea
          conversation={activeConv!}
          conversations={conversations}
          onBack={singlePane ? () => setSelectedConversation(null) : undefined}
          panel={!singlePane}
        />
      ) : !singlePane ? (
        <motion.div
          variants={riseIn}
          initial="hidden"
          animate="show"
          className="flex-1 flex flex-col items-center justify-center text-center px-8 rounded-[28px] glass-tint glass-float"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-premium"
            style={{ background: "var(--messenger-gradient)" }}
          >
            <MessageCircle className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-xl font-bold mb-1">{t("chats.emptyTitle")}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("chats.emptyBody")}
          </p>
        </motion.div>
      ) : null}

      <NewChatDialog open={showNewChat} onClose={() => setShowNewChat(false)} onSelect={handleSelectFriendById} />
      <NewGroupDialog open={showNewGroup} onClose={() => setShowNewGroup(false)} onCreate={handleCreateGroup} />
    </div>
  );
}
