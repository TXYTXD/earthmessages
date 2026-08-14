import { ArrowLeft, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => navigate("/welcome")}
          className="w-9 h-9 rounded-full hover:bg-accent transition-colors flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--messenger-gradient)" }}>
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold font-display">UMS Messages</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold font-display mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {updated}</p>
        <div className="space-y-8 text-[15px] leading-relaxed text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:font-display [&_h2]:mb-2 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
}
