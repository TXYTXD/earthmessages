import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, Check, X, Clock, Bell, Edit } from "lucide-react";
import { useFriendRequests, type SearchedUser } from "@/hooks/useFriendRequests";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export function FriendRequestBar() {
  const {
    incomingRequests,
    sentRequests,
    searchUsers,
    sendRequest,
    respondToRequest,
    cancelRequest,
  } = useFriendRequests();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const requestsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const users = await searchUsers(query);
      setResults(users);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
      if (requestsRef.current && !requestsRef.current.contains(e.target as Node)) setShowRequests(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sentIds = new Set(sentRequests.map((r) => r.receiver_id));

  return (
    <div className="flex items-center gap-1">
      {/* Search */}
      <div ref={searchRef} className="relative">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-9 h-9 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-colors text-foreground"
        >
          <Edit className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              className="absolute top-full mt-2 right-0 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
            >
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                    placeholder="Search people..."
                    className="w-full pl-10 pr-4 py-2 bg-accent rounded-full text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {(query.length >= 2 || results.length > 0) && (
                <div className="border-t border-border max-h-60 overflow-y-auto">
                  {searching ? (
                    <div className="p-4 text-[13px] text-muted-foreground text-center">Searching...</div>
                  ) : results.length === 0 ? (
                    <div className="p-4 text-[13px] text-muted-foreground text-center">No users found</div>
                  ) : (
                    results.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                            {(user.display_name || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[15px] font-medium text-foreground">
                            <span className="inline-flex items-center gap-1">{user.display_name || "Unknown"}<VerifiedBadge verified={user.is_verified} /></span>
                          </span>
                        </div>
                        {sentIds.has(user.user_id) ? (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => sendRequest(user.user_id)}
                            className="w-8 h-8 rounded-full bg-primary/15 text-primary hover:bg-primary/25 transition-colors flex items-center justify-center"
                          >
                            <UserPlus className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Requests bell */}
      <div ref={requestsRef} className="relative">
        <button
          onClick={() => setShowRequests(!showRequests)}
          className="relative w-9 h-9 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-colors text-foreground"
        >
          <Bell className="w-4 h-4" />
          {incomingRequests.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] rounded-full bg-destructive flex items-center justify-center text-[10px] font-bold text-white">
              {incomingRequests.length}
            </span>
          )}
        </button>

        <AnimatePresence>
          {showRequests && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              className="absolute top-full mt-2 right-0 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
            >
              <div className="p-3 border-b border-border">
                <h3 className="text-[15px] font-semibold text-foreground">Friend Requests</h3>
              </div>

              {incomingRequests.length === 0 && sentRequests.length === 0 ? (
                <div className="p-6 text-[13px] text-muted-foreground text-center">No pending requests</div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                          {(req.sender_name || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[15px] font-medium text-foreground flex items-center gap-1">{req.sender_name}<VerifiedBadge verified={req.sender_verified} /></span>
                          <span className="text-[11px] text-muted-foreground">Wants to connect</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => respondToRequest(req.id, true)}
                          className="w-8 h-8 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center"
                        >
                          <Check className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => respondToRequest(req.id, false)}
                          className="w-8 h-8 rounded-full bg-accent text-muted-foreground hover:bg-accent/80 transition-colors flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  ))}

                  {sentRequests.length > 0 && (
                    <>
                      <div className="px-4 py-2 border-t border-border">
                        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Sent</span>
                      </div>
                      {sentRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                              {(req.receiver_name || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-[15px] font-medium text-foreground block">{req.receiver_name}</span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => cancelRequest(req.id)}
                            className="w-8 h-8 rounded-full bg-accent text-muted-foreground hover:bg-accent/80 transition-colors flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
