import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Shield,
  Video,
  Globe,
  Zap,
  Users,
  ArrowRight,
  Phone,
  Image,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageCircle,
    title: "Real-Time Messaging",
    description:
      "Send texts, images, stickers, and voice notes instantly. Reactions and replies keep conversations alive.",
  },
  {
    icon: Video,
    title: "Video & Voice Calls",
    description:
      "Crystal-clear HD video and voice calls powered by WebRTC. Connect face-to-face, anywhere.",
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
      "Chat with anyone in any language. Messages are translated in real time so nothing gets lost.",
  },
  {
    icon: Image,
    title: "Stories & Media",
    description:
      "Share moments with disappearing stories, rich media, and full-resolution photo sharing.",
  },
  {
    icon: Users,
    title: "Group Conversations",
    description:
      "Create groups for teams, friends, or communities. Assign admins and manage members easily.",
  },
];

const stats = [
  { value: "256-bit", label: "Encryption" },
  { value: "< 100ms", label: "Latency" },
  { value: "50+", label: "Languages" },
  { value: "99.9%", label: "Uptime" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--messenger-gradient)" }}
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">UMS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              className="rounded-full px-5"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-[0.07] blur-[120px]"
            style={{ background: "var(--messenger-gradient)" }}
          />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Zap className="w-3.5 h-3.5" />
              Fast, secure, and open
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Messaging that
              <br />
              <span className="gradient-text">respects you.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              UMS Messages is the modern communication platform with encrypted
              messaging, HD video calls, real-time translation, and stories —
              all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="rounded-full px-8 text-base h-12 gap-2"
                onClick={() => navigate("/auth")}
              >
                Create free account
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 text-base h-12"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                See features
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border/50 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
            >
              <div className="text-2xl md:text-3xl font-bold gradient-text">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* App Preview */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xl shadow-primary/5"
          >
            {/* Mock app UI */}
            <div className="flex h-[400px] md:h-[500px]">
              {/* Sidebar mock */}
              <div className="w-72 border-r border-border bg-muted/30 p-4 hidden md:block">
                <div className="flex items-center gap-2 mb-6">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--messenger-gradient)" }}
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm">Chats</span>
                </div>
                {["Alex Johnson", "Sarah Chen", "Team Project", "Maria G."].map(
                  (name, i) => (
                    <div
                      key={name}
                      className={`flex items-center gap-3 p-3 rounded-xl mb-1 ${i === 0 ? "bg-primary/10" : "hover:bg-muted/50"} transition-colors`}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {i === 0
                            ? "Hey! Are you free today?"
                            : i === 1
                              ? "Sent a photo"
                              : i === 2
                                ? "Meeting at 3pm"
                                : "👋 Hello!"}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
              {/* Chat area mock */}
              <div className="flex-1 flex flex-col">
                <div className="border-b border-border p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                    A
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Alex Johnson</div>
                    <div className="text-xs text-success flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                      Online
                    </div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
                      <Video className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
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
                      Perfect, talk soon!
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
                </div>
                <div className="border-t border-border p-3 flex items-center gap-2">
                  <div className="flex-1 h-10 rounded-full bg-muted/60 px-4 flex items-center text-sm text-muted-foreground">
                    Type a message…
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
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need to communicate
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              One platform. No compromises. Every tool you need to stay
              connected.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 opacity-90"
                  style={{ background: "var(--messenger-gradient)" }}
                >
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold mb-2">
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
      <section className="py-20 md:py-28 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-primary/10">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Privacy is not optional
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              UMS Messages uses end-to-end encryption for every message, call,
              and file you share. We don't sell your data, we don't read your
              messages, and we never will.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              {[
                "End-to-end encrypted",
                "No data selling",
                "Open protocols",
                "GDPR compliant",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
          >
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6">
              Ready to switch to
              <br />
              <span className="gradient-text">better messaging?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
              Join thousands of users who already made the move. Create your free
              account in seconds.
            </p>
            <Button
              size="lg"
              className="rounded-full px-10 text-base h-13 gap-2"
              onClick={() => navigate("/auth")}
            >
              Get started — it's free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--messenger-gradient)" }}
            >
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">UMS Messages</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} UMS Messages. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
