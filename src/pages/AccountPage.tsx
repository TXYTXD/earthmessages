import { motion } from "framer-motion";
import { Mail, Globe, Shield, Bell, Palette, LogOut, ChevronRight, Camera, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName = user?.user_metadata?.display_name || user?.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">Account</h2>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6 flex items-center gap-5 mb-4">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-foreground">
            {initials}
          </div>
          <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="w-5 h-5 text-foreground" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">{displayName}</h3>
          <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {user?.email}
          </p>
        </div>
      </motion.div>

      {/* Settings Sections */}
      <div className="space-y-1">
        {[
          { icon: User, label: "Edit Profile", desc: "Update your personal info" },
          { icon: Globe, label: "Language Preferences", desc: "Manage your translation settings" },
          { icon: Bell, label: "Notifications", desc: "Call & message alerts" },
          { icon: Shield, label: "Privacy & Security", desc: "Password, 2FA, blocked users" },
          { icon: Palette, label: "Appearance", desc: "Theme and display options" },
        ].map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="w-full p-3 flex items-center gap-4 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <item.icon className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-medium">{item.label}</p>
              <p className="text-[13px] text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        ))}

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={handleSignOut}
          className="w-full p-3 flex items-center gap-4 rounded-lg hover:bg-destructive/10 transition-colors mt-4"
        >
          <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <p className="text-[15px] font-medium text-destructive">Sign Out</p>
        </motion.button>
      </div>
    </div>
  );
}
