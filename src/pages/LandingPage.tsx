import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import {
  MessageCircle,
  Shield,
  Video,
  Globe,
  Zap,
  Users,
  ArrowRight,
  Phone,
  Lock,
  Image,
  ChevronRight,
  Sparkles,
  Check,
  X,
  Send,
  Mic,
  Smile,
  Mail,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/* ─── Data ─── */

const features = [
  {
    icon: MessageCircle,
    title: "Real-Time Messaging",
    desc: "Instant delivery with read receipts, reactions, replies, stickers, and rich media. Conversations that feel alive.",
  },
  {
    icon: Video,
    title: "HD Video & Voice Calls",
    desc: "WebRTC-powered crystal-clear calls with screen sharing. Connect face-to-face from anywhere.",
  },
  {
    icon: Shield,
    title: "End-to-End Encryption",
    desc: "Every message, call, and file encrypted by default. Not even we can read your conversations.",
  },
  {
    icon: Globe,
    title: "Live Translation",
    desc: "Send in English, they read in French. 50+ languages translated in real time, seamlessly.",
  },
  {
    icon: Image,
    title: "Stories & Media",
    desc: "Share disappearing stories, full-res photos, and rich media with your network.",
  },
  {
    icon: Users,
    title: "Groups & Channels",
    desc: "Team channels with admin roles, mentions, and pinned messages. Built for collaboration.",
  },
];

const steps = [
  { num: "01", title: "Create your account", desc: "Sign up in seconds with just an email. No phone number required." },
  { num: "02", title: "Add your people", desc: "Find friends by email or invite link. Start conversations instantly." },
  { num: "03", title: "Communicate freely", desc: "Message, call, translate, and share — all encrypted, all private." },
];

const comparisons = [
  { feature: "End-to-end encryption", ums: true, others: "Partial" },
  { feature: "Built-in translation", ums: true, others: false },
  { feature: "HD video calls", ums: true, others: true },
  { feature: "No ads, ever", ums: true, others: false },
  { feature: "Stories & media", ums: true, others: true },
  { feature: "Group admin controls", ums: true, others: "Limited" },
  { feature: "GDPR compliant", ums: true, others: "Varies" },
  { feature: "Open protocols", ums: true, others: false },
];

/* ─── Animations ─── */

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const childFade = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

/* ─── Contact Form ─── */

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({ name: name.trim(), email: email.trim(), message: message.trim() });
    setSending(false);

    if (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
    } else {
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setName("");
      setEmail("");
      setMessage("");
    }
  };

  return (
    <motion.form onSubmit={handleSubmit} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
      className="space-y-4 p-6 rounded-2xl border border-border/40 bg-card">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] font-medium mb-1.5 block">Name</label>
          <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required className="rounded-xl h-10 text-[13px]" />
        </div>
        <div>
          <label className="text-[13px] font-medium mb-1.5 block">Email</label>
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required className="rounded-xl h-10 text-[13px]" />
        </div>
      </div>
      <div>
        <label className="text-[13px] font-medium mb-1.5 block">Message</label>
        <Textarea placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} required className="rounded-xl text-[13px] min-h-[120px] resize-none" />
      </div>
      <Button type="submit" disabled={sending} className="rounded-full px-6 h-10 text-[13px] gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? "Sending…" : "Send message"}
      </Button>
    </motion.form>
  );
}

/* ─── Component ─── */

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const goAuth = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 glass bg-background/70 border-b border-border/30"
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--messenger-gradient)" }}>
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight font-display">UMS Messages</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-muted-foreground">
            {[
              { label: "Features", id: "features" },
              { label: "Security", id: "security" },
              { label: "How it works", id: "how-it-works" },
              { label: "Compare", id: "compare" },
              { label: "Contact", id: "contact" },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => document.getElementById(link.id)?.scrollIntoView({ behavior: "smooth" })}
                className="hover:text-foreground transition-colors duration-200"
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground text-[13px] gap-1.5">
              <a href="/download">
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={goAuth} className="text-muted-foreground hover:text-foreground text-[13px]">
              Log in
            </Button>
            <Button size="sm" className="rounded-full px-5 h-9 text-[13px] shadow-lg shadow-primary/20" onClick={goAuth}>
              Start free <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative pt-28 pb-4 md:pt-40 md:pb-8 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full opacity-[0.05] blur-[160px]" style={{ background: "var(--messenger-gradient)" }} />
          <div className="absolute top-40 right-[8%] w-80 h-80 rounded-full opacity-[0.03] blur-[120px] bg-primary" />
          <div className="absolute top-72 left-[3%] w-64 h-64 rounded-full opacity-[0.025] blur-[100px] bg-primary" />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-[820px] mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-primary/15 bg-primary/5 text-primary text-[13px] font-medium mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Now in public beta — free to join
            </motion.div>

            <h1 className="font-display text-[2.5rem] sm:text-5xl md:text-[4.25rem] font-extrabold tracking-[-0.03em] leading-[1.08] mb-5 text-balance">
              Send in English.
              <br />
              <span className="gradient-text">They read in French.</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed text-balance">
              UMS Messages is the encrypted messaging platform with HD video calls and
              real-time translation in 50+ languages. No ads. No tracking. Just conversation.
            </p>

            <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 mb-9">
              {[
                { icon: Shield, text: "256-bit encryption" },
                { icon: Zap, text: "< 100ms delivery" },
                { icon: Globe, text: "50+ languages" },
              ].map((item) => (
                <motion.div key={item.text} variants={childFade} className="flex items-center gap-2 text-[13px] font-medium text-foreground/70">
                  <div className="w-5 h-5 rounded-full bg-primary/8 flex items-center justify-center">
                    <item.icon className="w-3 h-3 text-primary" />
                  </div>
                  {item.text}
                </motion.div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="rounded-full px-8 text-sm h-11 gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all" onClick={goAuth}>
                Create free account <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg" className="rounded-full px-8 text-sm h-11 border-border/50 text-muted-foreground" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                Explore features
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Product Screenshot ── */}
      <section className="pt-12 pb-20 md:pt-16 md:pb-28 px-6">
        <div className="max-w-[1080px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease }}
            className="relative rounded-2xl border border-border/40 bg-card overflow-hidden shadow-[0_20px_80px_-20px] shadow-primary/8"
          >
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-48 opacity-[0.04] blur-[100px] rounded-full" style={{ background: "var(--messenger-gradient)" }} />

            <div className="flex h-[400px] md:h-[500px]">
              {/* Sidebar */}
              <div className="w-[280px] border-r border-border/30 bg-muted/10 hidden md:flex flex-col">
                <div className="p-4 pb-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--messenger-gradient)" }}>
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-semibold text-sm font-display">Chats</span>
                  <div className="ml-auto w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <Send className="w-3 h-3 text-primary" />
                  </div>
                </div>
                <div className="mx-4 my-2 h-8 rounded-lg bg-muted/50 px-3 flex items-center text-[11px] text-muted-foreground gap-1.5">
                  🔍 Search…
                </div>
                <div className="flex-1 px-2 overflow-hidden">
                  {[
                    { name: "Alex Johnson", msg: "Hey! Are you free today?", time: "2m", online: true, unread: 2 },
                    { name: "Sarah Chen", msg: "Sent a photo 📷", time: "15m", online: true, unread: 0 },
                    { name: "Team Project", msg: "Meeting at 3pm 📅", time: "1h", online: false, unread: 5 },
                    { name: "Maria G.", msg: "👋 Hello!", time: "3h", online: false, unread: 0 },
                    { name: "Dev Channel", msg: "Deploy successful ✅", time: "5h", online: false, unread: 0 },
                  ].map((c, i) => (
                    <div key={c.name} className={`flex items-center gap-2.5 px-2 py-2.5 rounded-xl mb-0.5 transition-colors duration-150 ${i === 0 ? "bg-primary/8" : ""}`}>
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">{c.name[0]}</div>
                        {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-[2px] border-card" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium truncate">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{c.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground truncate">{c.msg}</span>
                          {c.unread > 0 && <span className="flex-shrink-0 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: "var(--messenger-gradient)" }}>{c.unread}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div className="flex-1 flex flex-col">
                <div className="border-b border-border/30 px-5 py-3 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">A</div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border-[2px] border-card" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold font-display">Alex Johnson</div>
                    <div className="text-[10px] text-muted-foreground">Active now</div>
                  </div>
                  <div className="flex gap-1">
                    {[Phone, Video].map((Icon, idx) => (
                      <div key={idx} className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-4 md:p-5 space-y-2.5 overflow-hidden">
                  <div className="text-center mb-2">
                    <span className="text-[10px] text-muted-foreground bg-muted/30 px-2.5 py-0.5 rounded-full">Today</span>
                  </div>
                  {[
                    { sent: false, text: "Hey! Are you free for a call today? 📞" },
                    { sent: true, text: "Sure! Let me finish this and I'll hop on 🎉" },
                    { sent: false, text: "Perfect, talk soon! 🙌" },
                    { sent: true, text: "Sounds good 👍" },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.sent ? "justify-end" : "justify-start"}`}>
                      <div className={`rounded-2xl ${m.sent ? "rounded-br-md text-white" : "rounded-bl-md bg-secondary text-secondary-foreground"} px-3.5 py-2 max-w-[70%] text-[13px]`}
                        style={m.sent ? { background: "var(--messenger-gradient)" } : undefined}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-start items-center gap-1 pl-1 pt-1">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: `${d * 200}ms` }} />
                    ))}
                    <span className="ml-1.5 text-[10px] text-muted-foreground">Alex is typing…</span>
                  </div>
                </div>
                <div className="border-t border-border/30 p-2.5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center"><Smile className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="flex-1 h-9 rounded-full bg-muted/30 px-3.5 flex items-center text-[13px] text-muted-foreground">Type a message…</div>
                  <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center"><Mic className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--messenger-gradient)" }}>
                    <Send className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 border-y border-border/30 bg-muted/10">
        <div className="max-w-[1000px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "256-bit", label: "AES Encryption" },
            { value: "< 100ms", label: "Message Latency" },
            { value: "50+", label: "Languages" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((stat, i) => (
            <motion.div key={stat.label} className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
              <div className="text-xl md:text-2xl font-bold font-display gradient-text">{stat.value}</div>
              <div className="text-[11px] md:text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-20 md:py-24 px-6">
        <div className="max-w-[1000px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} custom={0} variants={fadeUp} className="text-center mb-14">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-3">Trusted worldwide</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3 text-balance">Used by teams who care about privacy</h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto">From startups to universities — people rely on UMS daily.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp} className="flex flex-col items-center gap-3 mb-14">
            <div className="flex -space-x-2.5">
              {["E", "S", "M", "A", "J", "L", "R", "K", "D"].map((letter, i) => {
                const c = ["hsl(214 100% 50%)", "hsl(270 70% 55%)", "hsl(340 82% 50%)", "hsl(150 60% 40%)", "hsl(25 95% 50%)", "hsl(190 100% 40%)", "hsl(265 85% 55%)", "hsl(200 80% 50%)", "hsl(10 80% 55%)"];
                return (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04, duration: 0.25 }}
                    className="w-9 h-9 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c[i] }}>
                    {letter}
                  </motion.div>
                );
              })}
            </div>
            <p className="text-[13px] text-muted-foreground"><span className="font-semibold text-foreground">2,400+</span> professionals already on UMS</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { emoji: "🏢", title: "Remote Teams", quote: "We replaced 3 tools with UMS. Encrypted group chats and instant video calls keep our distributed team in sync.", name: "Elena P.", role: "Engineering Lead" },
              { emoji: "🎓", title: "Education", quote: "The built-in translation lets our international students communicate effortlessly across languages.", name: "Dr. Sarah K.", role: "University Professor" },
              { emoji: "💼", title: "Agencies", quote: "I share files, hop on quick video calls, and know everything stays private. The only messenger I trust for client work.", name: "Marco T.", role: "Creative Director" },
            ].map((item, i) => (
              <motion.div key={item.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} custom={i + 1} variants={fadeUp}
                className="group p-5 rounded-2xl border border-border/40 bg-card hover:border-primary/15 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500">
                <div className="text-2xl mb-2.5">{item.emoji}</div>
                <h3 className="text-sm font-semibold font-display mb-1.5">{item.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 italic">&ldquo;{item.quote}&rdquo;</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--messenger-gradient)" }}>{item.name[0]}</div>
                  <div>
                    <div className="text-[13px] font-medium">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground">{item.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 md:py-28 px-6 bg-muted/10 border-y border-border/20">
        <div className="max-w-[1100px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} custom={0} variants={fadeUp} className="text-center mb-14">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-3">Features</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3 text-balance">Everything you need to communicate</h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">One platform. No compromises. Every tool to stay connected.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} custom={i} variants={fadeUp}
                className="group p-5 rounded-2xl border border-border/40 bg-card hover:border-primary/15 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 shadow-md shadow-primary/10 group-hover:shadow-primary/20 transition-shadow duration-500" style={{ background: "var(--messenger-gradient)" }}>
                  <f.icon className="w-4.5 h-4.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold font-display mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how-it-works" className="py-20 md:py-28 px-6">
        <div className="max-w-[800px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} custom={0} variants={fadeUp} className="text-center mb-14">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-3">How it works</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3">Start messaging in 30 seconds</h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto">No phone number. No credit card. Just create and go.</p>
          </motion.div>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div key={step.num} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} custom={i + 1} variants={fadeUp}
                className="flex items-start gap-5 p-5 rounded-2xl border border-border/40 bg-card hover:border-primary/15 transition-colors duration-300">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-display text-lg font-bold gradient-text bg-primary/5 border border-primary/10">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-sm font-semibold font-display mb-1">{step.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="compare" className="py-20 md:py-28 px-6 bg-muted/10 border-y border-border/20">
        <div className="max-w-[700px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} custom={0} variants={fadeUp} className="text-center mb-12">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.2em] mb-3">Comparison</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3">UMS vs. the rest</h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto">See how UMS stacks up against other messaging platforms.</p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
            className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <div className="grid grid-cols-3 px-5 py-3 border-b border-border/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Feature</span>
              <span className="text-center gradient-text">UMS</span>
              <span className="text-center">Others</span>
            </div>
            {comparisons.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 px-5 py-3 text-[13px] ${i < comparisons.length - 1 ? "border-b border-border/20" : ""}`}>
                <span className="text-foreground/80">{row.feature}</span>
                <span className="text-center">
                  {row.ums === true ? <Check className="w-4 h-4 text-primary mx-auto" /> : <span className="text-muted-foreground">{String(row.ums)}</span>}
                </span>
                <span className="text-center">
                  {row.others === true ? <Check className="w-4 h-4 text-muted-foreground/50 mx-auto" /> : row.others === false ? <X className="w-4 h-4 text-muted-foreground/30 mx-auto" /> : <span className="text-muted-foreground text-[12px]">{row.others}</span>}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="py-20 md:py-28 px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} custom={0} variants={fadeUp}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-primary/8 border border-primary/10">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3">Privacy is not optional</h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto mb-8 leading-relaxed text-balance">
              Every message, call, and file is encrypted end-to-end. We don't sell data, don't serve ads, and never read your messages.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["End-to-end encrypted", "No data selling", "Open protocols", "GDPR compliant"].map((item, i) => (
                <motion.div key={item} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i + 1} variants={fadeUp}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-muted/40 border border-border/40 text-[12px] font-medium">
                  <Shield className="w-3 h-3 text-primary" />
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="py-20 md:py-28 px-6 bg-muted/10 border-y border-border/20">
        <div className="max-w-[560px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} custom={0} variants={fadeUp} className="text-center mb-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-primary/8 border border-primary/10">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3">Get in touch</h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto mb-4">Have a question, feedback, or partnership idea? We'd love to hear from you.</p>
          </motion.div>
          <ContactForm />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] rounded-full opacity-[0.04] blur-[140px]" style={{ background: "var(--messenger-gradient)" }} />
        </div>
        <div className="max-w-[600px] mx-auto text-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} custom={0} variants={fadeUp}>
            <h2 className="font-display text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-balance">
              Ready to switch to <span className="gradient-text">better messaging?</span>
            </h2>
            <p className="text-muted-foreground text-base mb-8 max-w-md mx-auto text-balance">
              Join 2,400+ professionals who already made the move. Free forever for personal use.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="rounded-full px-8 text-sm h-11 gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all" onClick={goAuth}>
                Create free account <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg" className="rounded-full px-8 text-sm h-11 border-border/50 text-muted-foreground" asChild>
                <a href="/download">
                  <Download className="w-4 h-4 mr-1.5" /> Download App
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 py-8 px-6 bg-muted/5">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--messenger-gradient)" }}>
                <MessageCircle className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-semibold font-display">UMS Messages</span>
            </div>
            <div className="flex items-center gap-6 text-[12px] text-muted-foreground">
              {["Features", "Security", "How it works", "Compare", "Contact"].map((label) => (
                <button key={label} onClick={() => document.getElementById(label.toLowerCase().replace(/ /g, "-"))?.scrollIntoView({ behavior: "smooth" })}
                  className="hover:text-foreground transition-colors">{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} UMS Messages. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
