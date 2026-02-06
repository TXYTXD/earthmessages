import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Phone, Video, MoreVertical, Globe } from "lucide-react";
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

const mockContacts: Contact[] = [
  { id: "1", name: "Sarah Chen", lastMessage: "See you on the call! 🎥", time: "2m", avatar: "SC", online: true, unread: 2, language: "中文" },
  { id: "2", name: "Marco Rossi", lastMessage: "Translation was perfect!", time: "15m", avatar: "MR", online: true, language: "Italiano" },
  { id: "3", name: "Yuki Tanaka", lastMessage: "ありがとう！", time: "1h", avatar: "YT", online: false, language: "日本語" },
  { id: "4", name: "Ana García", lastMessage: "¡Hola! ¿Cómo estás?", time: "3h", avatar: "AG", online: true, unread: 1, language: "Español" },
  { id: "5", name: "Pierre Dubois", lastMessage: "Merci beaucoup!", time: "1d", avatar: "PD", online: false, language: "Français" },
];

interface Message {
  id: string;
  text: string;
  translated?: string;
  sender: "me" | "them";
  time: string;
}

const mockMessages: Message[] = [
  { id: "1", text: "Hey Sarah! Ready for our meeting?", sender: "me", time: "10:30 AM" },
  { id: "2", text: "你好！是的，我准备好了", translated: "Hi! Yes, I'm ready", sender: "them", time: "10:31 AM" },
  { id: "3", text: "Great! Let me start the video call", sender: "me", time: "10:32 AM" },
  { id: "4", text: "好的，我在等你的视频通话邀请 🎥", translated: "Okay, I'm waiting for your video call invite 🎥", sender: "them", time: "10:32 AM" },
  { id: "5", text: "See you on the call! 🎥", sender: "them", time: "10:33 AM" },
];

export default function ChatsPage() {
  const [selectedContact, setSelectedContact] = useState<Contact>(mockContacts[0]);
  const [message, setMessage] = useState("");

  return (
    <div className="flex h-screen">
      {/* Contact List */}
      <div className="w-80 border-r border-border flex flex-col bg-card/30">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Messages</h2>
            <FriendRequestBar />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mockContacts.map((contact) => (
            <motion.button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-3 flex items-center gap-3 transition-colors ${
                selectedContact.id === contact.id
                  ? "bg-primary/10 border-l-2 border-primary"
                  : "hover:bg-secondary/50 border-l-2 border-transparent"
              }`}
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground">
                  {contact.avatar}
                </div>
                {contact.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-card" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{contact.name}</span>
                  <span className="text-xs text-muted-foreground">{contact.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {contact.language && <Globe className="w-3 h-3 text-primary flex-shrink-0" />}
                  <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                </div>
              </div>
              {contact.unread && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">{contact.unread}</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-border bg-card/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                {selectedContact.avatar}
              </div>
              {selectedContact.online && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{selectedContact.name}</h3>
              <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">{selectedContact.language} → English</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Video className="w-4 h-4" />
            </button>
            <button className="p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex justify-center">
            <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
              🌐 Auto-translating {selectedContact.language} ↔ English
            </span>
          </div>
          {mockMessages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[70%] ${msg.sender === "me" ? "order-1" : ""}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm ${
                    msg.sender === "me"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "glass-card rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.translated && (
                  <div className="mt-1 px-4 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-primary" />
                    {msg.translated}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground mt-1 px-2 block">{msg.time}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card/30">
          <div className="flex items-center gap-3">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-110 transition-all"
            >
              Send
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
