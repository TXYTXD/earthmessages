import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Phone, Video, Info, Send, Smile, Image, ThumbsUp, Globe, MessageCircle } from "lucide-react";
import { FriendRequestBar } from "@/components/FriendRequestBar";

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  online: boolean;
  unread?: number;
  language?: string;
}

const contacts: Contact[] = [];

interface Message {
  id: string;
  text: string;
  translated?: string;
  sender: "me" | "them";
  time: string;
}

const messages: Message[] = [];

export default function ChatsPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-1 h-screen">
      {/* Contact List */}
      <div className="w-[360px] flex flex-col border-r border-border bg-card">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Chats</h1>
            <FriendRequestBar />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search Messenger"
              className="w-full pl-10 pr-4 py-2 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add friends to start chatting</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-2.5 flex items-center gap-3 rounded-lg transition-colors ${
                  selectedContact?.id === contact.id
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground">
                    {contact.avatar}
                  </div>
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[15px] ${contact.unread ? "font-semibold" : "font-normal"}`}>
                      {contact.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-[13px] truncate ${contact.unread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {contact.lastMessage}
                    </p>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">{contact.time}</span>
                  </div>
                </div>
                {contact.unread && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-primary-foreground">{contact.unread}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                    {selectedContact.avatar}
                  </div>
                  {selectedContact.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold leading-tight">{selectedContact.name}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedContact.online ? "Active now" : "Offline"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary">
                  <Video className="w-5 h-5" />
                </button>
                <button className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary">
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[65%]">
                    <div
                      className={`px-3 py-2 rounded-2xl text-[15px] leading-relaxed ${
                        msg.sender === "me"
                          ? "messenger-bubble-sent rounded-br-sm"
                          : "messenger-bubble-received rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.translated && (
                      <div className="mt-0.5 px-3 py-1 text-[11px] text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3 text-primary" />
                        {msg.translated}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-border">
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0">
                  <Image className="w-5 h-5" />
                </button>
                <button className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0">
                  <Smile className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Aa"
                    className="w-full px-4 py-2 bg-accent rounded-full text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                {message.trim() ? (
                  <button className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0">
                    <Send className="w-5 h-5" />
                  </button>
                ) : (
                  <button className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-primary flex-shrink-0">
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--messenger-gradient)" }}>
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1">Your Messages</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Send private messages or add friends to start a conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
