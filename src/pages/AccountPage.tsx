import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mail, LogOut, Camera, Pencil, Trash2, Save, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null }>({
    display_name: "",
    avatar_url: null,
  });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            display_name: data.display_name || user.email || "User",
            avatar_url: data.avatar_url,
          });
          setNameInput(data.display_name || "");
        }
      });
  }, [user]);

  const handleSaveName = async () => {
    if (!user || !nameInput.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nameInput.trim() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update name");
    } else {
      setProfile((p) => ({ ...p, display_name: nameInput.trim() }));
      setEditingName(false);
      toast.success("Display name updated");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload avatar");
      setUploading(false);
      return;
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from("chat-media")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    const avatarUrl = urlData?.signedUrl || null;

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", user.id);

    setUploading(false);
    if (updateError) {
      toast.error("Failed to update profile");
    } else {
      setProfile((p) => ({ ...p, avatar_url: avatarUrl }));
      toast.success("Avatar updated");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== "DELETE") return;
    setDeleting(true);

    // Delete profile data
    await supabase.from("profiles").delete().eq("user_id", user.id);
    
    // Sign out (full account deletion requires admin, so we sign out and clear data)
    await signOut();
    toast.success("Account data deleted. You have been signed out.");
    navigate("/auth");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName = profile.display_name || user?.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6">Account</h2>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-6 mb-4"
      >
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-foreground overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-foreground animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Name & Email */}
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="bg-accent rounded-lg px-3 py-1.5 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30 text-foreground w-full max-w-[200px]"
                  autoFocus
                  maxLength={50}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving || !nameInput.trim()}
                  className="w-8 h-8 rounded-full bg-primary/15 hover:bg-primary/25 flex items-center justify-center transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 text-primary" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameInput(profile.display_name);
                  }}
                  className="w-8 h-8 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{displayName}</h3>
                <button
                  onClick={() => {
                    setNameInput(profile.display_name);
                    setEditingName(true);
                  }}
                  className="w-7 h-7 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
            <p className="text-[13px] text-muted-foreground flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="space-y-1">
        {/* Sign Out */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={handleSignOut}
          className="w-full p-3 flex items-center gap-4 rounded-lg hover:bg-destructive/10 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <p className="text-[15px] font-medium text-destructive">Sign Out</p>
        </motion.button>

        {/* Delete Account */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full p-3 flex items-center gap-4 rounded-lg hover:bg-destructive/10 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div className="text-left">
            <p className="text-[15px] font-medium text-destructive">Delete Account</p>
            <p className="text-[12px] text-muted-foreground">Permanently remove your data</p>
          </div>
        </motion.button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl border border-border p-6 max-w-md w-full space-y-4"
          >
            <h3 className="text-lg font-bold text-destructive">Delete Account</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently delete your profile data and sign you out. This action cannot be undone.
            </p>
            <p className="text-sm text-foreground">
              Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-4 py-2 bg-accent rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-destructive/30"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Account
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
