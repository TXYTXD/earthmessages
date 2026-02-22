import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageCircle,
    title: "Real-Time Messaging",
    description:
      "Send texts, images, stickers, and voice notes instantly. Reactions and replies keep every conversation alive.",
  },
  {
    icon: Video,
    title: "Video & Voice Calls",
    description:
      "Crystal-clear HD video and voice calls powered by WebRTC. Connect face-to-face from anywhere in the world.",
  },
  {
    icon: Shield,
    title: "End-to-End Encryption",
    description:
      "Your conversations stay private. Every message is encrypted so only you and the recipient can read it.",
  },
  {
    icon: Globe,
    title: "Built-in Translation",
    description:
      "Chat with anyone in any language. Messages are translated in real time so nothing gets lost in translation.",
  },
  {
    icon: Image,
    title: "Stories & Media",
    description:
      "Share moments with disappearing stories, rich media sharing, and full-resolution photo attachments.",
  },
  {
    icon: Users,
    title: "Group Conversations",
    description:
      "Create groups for teams, friends, or communities. Assign admins and manage members with ease.",
  },
];

const stats = [
  { value: "256-bit", label: "AES Encryption" },
  { value: "< 100ms", label: "Message Latency" },
  { value: "50+", label: "Languages" },
  { value: "99.9%", label: "Uptime SLA" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const childFade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 glass bg-background/70 border-b border-border/40"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20"
              style={{ background: "var(--messenger-gradient)" }}
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight font-display">UMS</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => document.getElementById("security")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-foreground transition-colors"
            >
              Security
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Button>
            <Button
              size="sm"
              className="rounded-full px-5 shadow-lg shadow-primary/20"
              onClick={() => navigate("/auth")}
            >
              Get Started
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-28 pb-16 md:pt-40 md:pb-28 px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full opacity-[0.06] blur-[140px]"
            style={{ background: "var(--messenger-gradient)" }}
          />
          <div className="absolute top-40 right-[10%] w-72 h-72 rounded-full opacity-[0.04] blur-[100px] bg-primary" />
          <div className="absolute top-60 left-[5%] w-56 h-56 rounded-full opacity-[0.03] blur-[80px] bg-primary" />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Private by default. Secure by design.
            </motion.div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 text-balance">
              Your conversations.
              <br />
              <span className="gradient-text">Nobody else's.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed text-balance">
              UMS Messages is the private messaging platform where every text,
              call, and file is end-to-end encrypted. Talk freely — no ads, no
              tracking, no compromises.
            </p>

            {/* 3 key benefits */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-10"
            >
              {[
                { icon: Shield, text: "End-to-end encrypted" },
                { icon: Zap, text: "Instant HD video calls" },
                { icon: Globe, text: "Real-time translation" },
              ].map((item) => (
                <motion.div
                  key={item.text}
                  variants={childFade}
                  className="flex items-center gap-2 text-sm font-medium text-foreground/80"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {item.text}
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button
                size="lg"
                className="rounded-full px-8 text-base h-12 gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/35 transition-shadow"
                onClick={() => navigate("/auth")}
              >
                Create free account
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 text-base h-12 border-border/60"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                See features
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-14 border-y border-border/40 bg-muted/20">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              custom={i}
              variants={fadeUp}
            >
              <div className="text-2xl md:text-3xl font-bold font-display gradient-text">
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1.5 font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">
              Trusted worldwide
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4 text-balance">
              Trusted by teams & professionals
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From startups to enterprise — people rely on UMS every day.
            </p>
          </motion.div>

          {/* Avatar cluster */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeUp}
            className="flex flex-col items-center gap-4 mb-16"
          >
            <div className="flex -space-x-3">
              {["E", "S", "M", "A", "J", "L", "R", "K", "D"].map((letter, i) => {
                const colors = [
                  "hsl(214 100% 50%)",
                  "hsl(270 70% 55%)",
                  "hsl(340 82% 50%)",
                  "hsl(150 60% 40%)",
                  "hsl(25 95% 50%)",
                  "hsl(190 100% 40%)",
                  "hsl(265 85% 55%)",
                  "hsl(200 80% 50%)",
                  "hsl(10 80% 55%)",
                ];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="w-10 h-10 rounded-full border-[2.5px] border-background flex items-center justify-center text-xs font-bold text-white shadow-sm"
                    style={{ background: colors[i % colors.length] }}
                  >
                    {letter}
                  </motion.div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">2,400+</span>{" "}
              professionals already on UMS
            </p>
          </motion.div>

          {/* Use case cards */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                emoji: "🏢",
                title: "Remote Teams",
                quote:
                  "We replaced 3 tools with UMS. Encrypted group chats and instant video calls keep our distributed team in sync.",
                name: "Elena P.",
                role: "Engineering Lead",
              },
              {
                emoji: "🎓",
                title: "Education",
                quote:
                  "The built-in translation lets our international students communicate effortlessly across languages.",
                name: "Dr. Sarah K.",
                role: "University Professor",
              },
              {
                emoji: "💼",
                title: "Freelancers & Agencies",
                quote:
                  "I share files, hop on quick video calls, and know everything stays private. It's the only messenger I trust for client work.",
                name: "Marco T.",
                role: "Creative Director",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                custom={i + 1}
                variants={fadeUp}
                className="group p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500"
              >
                <div className="text-3xl mb-3">{item.emoji}</div>
                <h3 className="text-base font-semibold font-display mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "var(--messenger-gradient)" }}
                  >
                    {item.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.role}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">
              Product Preview
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
              A workspace you'll actually enjoy
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Clean, fast, and distraction-free. Built for conversations that matter.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-2xl shadow-primary/5"
          >
            {/* Decorative glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-40 opacity-[0.05] blur-[80px] rounded-full" style={{ background: "var(--messenger-gradient)" }} />

            {/* Mock app UI */}
            <div className="flex h-[420px] md:h-[520px]">
              {/* Sidebar mock */}
              <div className="w-72 border-r border-border/50 bg-muted/20 p-4 hidden md:flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--messenger-gradient)" }}
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm font-display">Chats</span>
                </div>
                {/* Search */}
                <div className="my-3 h-9 rounded-lg bg-muted/60 px-3 flex items-center text-xs text-muted-foreground gap-2">
                  <span className="opacity-50">🔍</span> Search conversations…
                </div>
                {[
                  { name: "Alex Johnson", msg: "Hey! Are you free today?", time: "2m", online: true },
                  { name: "Sarah Chen", msg: "Sent a photo 📷", time: "15m", online: true },
                  { name: "Team Project", msg: "Meeting at 3pm", time: "1h", online: false },
                  { name: "Maria G.", msg: "👋 Hello!", time: "3h", online: false },
                  { name: "Dev Channel", msg: "Deployment successful ✅", time: "5h", online: false },
                ].map((contact, i) => (
                  <div
                    key={contact.name}
                    className={`flex items-center gap-3 p-2.5 rounded-xl mb-0.5 cursor-pointer transition-all duration-200 ${i === 0 ? "bg-primary/10" : "hover:bg-muted/40"}`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {contact.name[0]}
                      </div>
                      {contact.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium truncate">{contact.name}</div>
                        <div className="text-[10px] text-muted-foreground">{contact.time}</div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{contact.msg}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat area mock */}
              <div className="flex-1 flex flex-col">
                <div className="border-b border-border/50 px-5 py-3.5 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                      A
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold font-display">Alex Johnson</div>
                    <div className="text-[11px] text-muted-foreground">Active now</div>
                  </div>
                  <div className="ml-auto flex gap-1.5">
                    <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition-colors cursor-pointer">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition-colors cursor-pointer">
                      <Video className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-5 space-y-3 overflow-hidden">
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-full">Today</span>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[75%] text-sm">
                      Hey! Are you free for a call today? 📞
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div
                      className="rounded-2xl rounded-br-md px-4 py-2.5 max-w-[75%] text-sm text-white"
                      style={{ background: "var(--messenger-gradient)" }}
                    >
                      Sure! Let me finish this and I'll hop on 🎉
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[75%] text-sm">
                      Perfect, talk soon! 🙌
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div
                      className="rounded-2xl rounded-br-md px-4 py-2.5 max-w-[75%] text-sm text-white"
                      style={{ background: "var(--messenger-gradient)" }}
                    >
                      Sounds good 👍
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground pl-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground animate-pulse" />
                      <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.2s]" />
                      <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.4s]" />
                      <span className="ml-1 text-[11px]">Alex is typing…</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/50 p-3 flex items-center gap-2">
                  <div className="flex-1 h-10 rounded-full bg-muted/40 px-4 flex items-center text-sm text-muted-foreground">
                    Type a message…
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-md"
                    style={{ background: "var(--messenger-gradient)" }}
                  >
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">
              Features
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4 text-balance">
              Everything you need to communicate
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              One platform. No compromises. Every tool you need to stay connected.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                custom={i}
                variants={fadeUp}
                className="group p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 cursor-default"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/10 group-hover:shadow-primary/20 transition-shadow duration-500"
                  style={{ background: "var(--messenger-gradient)" }}
                >
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold font-display mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security callout */}
      <section id="security" className="py-20 md:py-28 px-6 bg-muted/20 border-y border-border/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            custom={0}
            variants={fadeUp}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-primary/10 shadow-lg shadow-primary/10">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Privacy is not optional
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10 leading-relaxed text-balance">
              UMS Messages uses end-to-end encryption for every message, call,
              and file you share. We don't sell your data, we don't read your
              messages, and we never will.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {[
                "End-to-end encrypted",
                "No data selling",
                "Open protocols",
                "GDPR compliant",
              ].map((item, i) => (
                <motion.div
                  key={item}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i + 1}
                  variants={fadeUp}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/60 text-sm font-medium"
                >
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-36 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full opacity-[0.05] blur-[120px]"
            style={{ background: "var(--messenger-gradient)" }}
          />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            custom={0}
            variants={fadeUp}
          >
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-6 text-balance">
              Ready to switch to
              <br />
              <span className="gradient-text">better messaging?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto text-balance">
              Join thousands of users who already made the move. Create your free
              account in seconds.
            </p>
            <Button
              size="lg"
              className="rounded-full px-10 text-base h-13 gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow"
              onClick={() => navigate("/auth")}
            >
              Get started — it's free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 px-6 bg-muted/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--messenger-gradient)" }}
            >
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold font-display">UMS Messages</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} UMS Messages. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
