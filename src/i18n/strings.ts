// Interface text. English is the source; a language only needs the strings
// it has, and anything missing falls back to English rather than showing a
// key or an empty space.

export const en = {
  // Navigation
  "nav.chats": "Chats",
  "nav.stories": "Stories",
  "nav.communities": "Communities",
  "nav.groups": "Groups",
  "nav.calls": "Calls",
  "nav.video": "Video",
  "nav.ai": "AI",
  "nav.aiChat": "AI Chat",
  "nav.calendar": "Calendar",
  "nav.plan": "Plan",
  "nav.settings": "Settings",
  "nav.account": "Account",
  "nav.assistant": "Assistant",

  // Chats
  "chats.title": "Chats",
  "chats.search": "Search UMS",
  "chats.yourStory": "Your story",
  "chats.friends": "FRIENDS",
  "chats.newMessage": "New message",
  "chats.newGroup": "New group",
  "chats.noMessages": "No messages yet",
  "chats.emptyTitle": "Your Messages",
  "chats.emptyBody": "Send private messages or add friends to start a conversation",
  "chats.sayHello": "No messages yet. Say hello! 👋",
  "chats.noneFound": "No messages found",
  "chats.loadEarlier": "Load earlier messages",
  "chats.loading": "Loading…",
  "chats.today": "Today",
  "chats.yesterday": "Yesterday",
  "chats.searchIn": "Search in conversation...",
  "chats.typingOne": "{names} is typing...",
  "chats.typingMany": "{names} are typing...",

  // Composer
  "composer.placeholder": "Aa",
  "composer.uploading": "Uploading…",
  "composer.recordVoice": "Record a voice message",
  "composer.searchGifs": "Search GIFs…",
  "composer.trending": "Trending",

  // Presence
  "presence.activeNow": "Active now",
  "presence.offline": "Offline",
  "presence.encrypted": "Encrypted",
  "presence.alwaysOnline": "Ask me anything · Always online",
  "presence.alwaysAvailable": "Always available",
  "presence.members": "{count} members",

  // Safety and clearing
  "safety.report": "Report {name}",
  "safety.reportHint": "Tell us what's wrong. Reports are private.",
  "safety.block": "Block {name}",
  "safety.unblock": "Unblock {name}",
  "safety.blockHint": "You won't see their messages, and their calls won't ring.",
  "safety.unblockHint": "You'll see their messages and calls again.",
  "safety.clear": "Clear chat",
  "safety.clearHint": "Empties this chat for you. {name} keeps their copy.",
  "safety.clearConfirm": "Clear every message in this chat? It will look brand new for you.",
  "safety.clearDetail":
    "This only affects your side. {name} will still have the conversation, and anything sent after this will appear as normal. You cannot undo it.",
  "safety.clearYes": "Yes, clear it",
  "safety.clearing": "Clearing…",
  "safety.sendReport": "Send report",
  "safety.sending": "Sending…",
  "safety.title": "Report or block",
  "safety.details": "Anything else we should know? (optional)",
  "safety.reasonSpam": "Spam",
  "safety.reasonHarassment": "Harassment or bullying",
  "safety.reasonContent": "Inappropriate content",
  "safety.reasonImpersonation": "Pretending to be someone else",
  "safety.reasonOther": "Something else",

  // Calls
  "call.answer": "Accept",
  "call.ignore": "Ignore",
  "call.calling": "Calling...",
  "call.connecting": "Connecting...",
  "call.mute": "Mute",
  "call.unmute": "Unmute",
  "call.speaker": "Speaker",
  "call.speakerOff": "Speaker off",
  "call.camera": "Camera",
  "call.cameraOff": "Camera off",
  "call.flip": "Flip",
  "call.share": "Share",
  "call.stopShare": "Stop share",

  // Settings
  "settings.title": "Settings",
  "settings.appearance": "App Theme",
  "settings.appearanceHint": "Choose a color theme for the entire app",
  "settings.createTheme": "Create your own",
  "settings.themeMarket": "Theme Market",
  "settings.yourThemes": "Your themes",
  "settings.builtIn": "Built-in",
  "settings.language": "App language",
  "settings.languageHint": "The language UMS Messages is shown in",
  "settings.effects": "Animation & sound",
  "settings.themeAnimations": "Theme animations",
  "settings.backgroundSound": "Background sound",
  "settings.buttonSounds": "Button sounds",
  "settings.notifications": "Notifications",
  "settings.staySignedIn": "Stay signed in",

  // Common
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.done": "Done",
  "common.close": "Close",
  "common.retry": "Try again",
  "common.search": "Search",
  "common.you": "You",
  "common.someone": "Someone",
} as const;

export type StringKey = keyof typeof en;
export type Strings = Partial<Record<StringKey, string>>;
