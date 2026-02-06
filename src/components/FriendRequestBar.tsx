import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, Check, X, Clock, Bell } from "lucide-react";
import { useFriendRequests, type SearchedUser } from "@/hooks/useFriendRequests";
import { Badge } from "@/components/ui/badge";

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

  // Debounced search
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

  // Close dropdowns on outside click
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
    <div className="flex items-center gap-2">
      {/* Search */}
      <div ref={searchRef} className="relative">
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search users..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-48"
          />
        </div>

        <AnimatePresence>
          {showSearch && (query.length >= 2 || results.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full mt-2 left-0 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
            >
              {searching ? (
                <div className="p-4 text-sm text-muted-foreground text-center">Searching...</div>
              ) : results.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No users found</div>
              ) : (
                results.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                        {(user.display_name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {user.display_name || "Unknown"}
                      </span>
                    </div>
                    {sentIds.has(user.user_id) ? (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </Badge>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => sendRequest(user.user_id)}
                        className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Incoming requests bell */}
      <div ref={requestsRef} className="relative">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowRequests(!showRequests)}
          className="relative p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-5 h-5" />
          {incomingRequests.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              {incomingRequests.length}
            </span>
          )}
        </motion.button>

        <AnimatePresence>
          {showRequests && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full mt-2 right-0 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
            >
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Friend Requests</h3>
              </div>

              {incomingRequests.length === 0 && sentRequests.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">No pending requests</div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                          {(req.sender_name || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground block">{req.sender_name}</span>
                          <span className="text-xs text-muted-foreground">Wants to be friends</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => respondToRequest(req.id, true)}
                          className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => respondToRequest(req.id, false)}
                          className="p-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  ))}

                  {sentRequests.length > 0 && (
                    <>
                      <div className="px-4 py-2 border-t border-border">
                        <span className="text-xs text-muted-foreground font-medium">Sent</span>
                      </div>
                      {sentRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                              {(req.receiver_name || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground block">{req.receiver_name}</span>
                              <Badge variant="secondary" className="text-[10px] gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> Pending
                              </Badge>
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => cancelRequest(req.id)}
                            className="p-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
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
