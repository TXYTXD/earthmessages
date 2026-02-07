import { useState } from "react";
import { MessageCircle, Edit, Users } from "lucide-react";
import { FriendRequestBar } from "@/components/FriendRequestBar";
import { ContactList } from "@/components/chat/ContactList";
import { ChatArea } from "@/components/chat/ChatArea";
import { StoriesBar } from "@/components/chat/StoriesBar";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { NewGroupDialog } from "@/components/chat/NewGroupDialog";
import { useConversations, type Conversation } from "@/hooks/useConversations";

export default function ChatsPage() {
  const { conversations, loading, createDirectConversation, createGroupConversation, refetch } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const handleSelectFriend = async (userId: string) => {
    const convId = await createDirectConversation(userId);
    if (convId) {
      await refetch();
      const conv = conversations.find((c) => c.id === convId);
      if (conv) setSelectedConversation(conv);
      // If not found yet, wait for refetch
      setTimeout(async () => {
        await refetch();
      }, 500);
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

  // Sync selected conversation with latest data
  const activeConv = selectedConversation
    ? conversations.find((c) => c.id === selectedConversation.id) || selectedConversation
    : null;

  return (
    <div className="flex flex-1 h-screen">
      {/* Contact List Sidebar */}
      <div className="w-[360px] flex flex-col border-r border-border bg-card">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Chats</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewChat(true)}
                className="w-9 h-9 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-colors text-foreground"
                title="New message"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowNewGroup(true)}
                className="w-9 h-9 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-colors text-foreground"
                title="New group"
              >
                <Users className="w-4 h-4" />
              </button>
              <FriendRequestBar />
            </div>
          </div>
        </div>

        {/* Stories */}
        <StoriesBar />

        {/* Contacts */}
        <ContactList
          conversations={conversations}
          selectedId={activeConv?.id || null}
          onSelect={setSelectedConversation}
          loading={loading}
        />
      </div>

      {/* Chat Area */}
      {activeConv ? (
        <ChatArea conversation={activeConv} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-background">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--messenger-gradient)" }}>
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">Your Messages</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Send private messages or add friends to start a conversation
          </p>
        </div>
      )}

      {/* Dialogs */}
      <NewChatDialog open={showNewChat} onClose={() => setShowNewChat(false)} onSelect={handleSelectFriend} />
      <NewGroupDialog open={showNewGroup} onClose={() => setShowNewGroup(false)} onCreate={handleCreateGroup} />
    </div>
  );
}
