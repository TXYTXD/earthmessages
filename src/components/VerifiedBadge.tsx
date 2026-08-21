import { BadgeCheck } from "lucide-react";

// The blue verified check, shown next to a verified user's name wherever
// their account appears in the app.
export function VerifiedBadge({ verified, className }: { verified?: boolean | null; className?: string }) {
  if (!verified) return null;
  return <BadgeCheck className={className || "w-3.5 h-3.5 text-primary inline-block flex-shrink-0"} />;
}
