# UMS Messages

**Private, secure messaging for everyone.** End-to-end encrypted conversations, HD video calls, real-time translation, stories, and a built-in AI assistant — free, no ads, no tracking.

🌐 **Live app:** [umsmessages.net](https://umsmessages.net)
🖥️ **Windows app:** [umsmessages.net/download](https://umsmessages.net/download)

## Features

- 💬 **Messaging** — direct and group chats with reactions, replies, GIFs, stickers, voice messages, and file sharing
- 📞 **Voice & video calls** — peer-to-peer WebRTC calls with encryption
- 🌍 **Real-time translation** — chat across 50+ languages
- 📸 **Stories** — share moments with friends (private) or everyone (public), with likes and comments
- 🤖 **AI assistant** — built-in chat assistant with saved conversation history
- ⏰ **Scheduled messages**, ⭐ starred messages, 🔒 PIN lock, and more
- 🖥️ **Windows desktop app** with automatic updates

## Tech stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend:** [Supabase](https://supabase.com) — Postgres with row-level security, Auth, Storage, Realtime, and Edge Functions (Deno)
- **Desktop:** Electron (thin wrapper around the live app with a built-in mandatory updater)
- **Hosting:** Vercel; Windows builds via GitHub Actions

## Project structure

```
src/                    # React app (pages, components, hooks)
supabase/functions/     # Edge functions: ai-chat, create-conversation,
                        # gif-search, translate, send-scheduled-messages
supabase/migrations/    # Database schema + row-level security policies
desktop/                # Electron desktop app
.github/workflows/      # Windows build + publish pipeline
```

## Running locally

```sh
npm install
npm run dev
```

Set your own Supabase project connection in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) and apply the migrations in `supabase/migrations/` to it. These are public client-side values; all server secrets live in Supabase function secrets and are not part of this repository.

## Security

- All database tables are protected by row-level security — users can only read what they're allowed to see (their conversations, friends' stories, etc.)
- Storage uploads are restricted to each user's own folder
- Edge functions require an authenticated user
- Found a vulnerability? Please report it privately via the contact form at [umsmessages.net](https://umsmessages.net) rather than opening a public issue.

## License

[MIT](./LICENSE)
