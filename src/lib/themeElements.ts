// Every part of UMS a theme is allowed to change, and what can be changed
// about it. The editor is built from this list, the AI edits against it,
// and the app reads the result through CSS variables.

export type ElementTrait = "color" | "background" | "icon" | "sound" | "animation";

export interface ElementSpec {
  id: string;
  label: string;
  group: string;
  hint: string;
  traits: ElementTrait[];
  /** CSS variable prefix — the app reads --el-<var>-fg / -bg */
  cssVar?: string;
}

export const ELEMENT_GROUPS = [
  "Navigation",
  "Messages",
  "Buttons",
  "Chat list",
  "Calls",
  "Surfaces",
] as const;

export const ELEMENTS: ElementSpec[] = [
  // Navigation
  { id: "nav.bar", label: "Navigation bar", group: "Navigation", hint: "The bar itself", traits: ["background"], cssVar: "nav-bar" },
  { id: "nav.active", label: "Selected tab", group: "Navigation", hint: "The tab you're on", traits: ["color", "background", "animation", "sound"], cssVar: "nav-active" },
  { id: "nav.idle", label: "Other tabs", group: "Navigation", hint: "Tabs you're not on", traits: ["color", "sound"], cssVar: "nav-idle" },
  { id: "nav.chats", label: "Chats tab", group: "Navigation", hint: "Icon and colour", traits: ["color", "icon", "sound", "animation"], cssVar: "nav-chats" },
  { id: "nav.stories", label: "Stories tab", group: "Navigation", hint: "Icon and colour", traits: ["color", "icon", "sound", "animation"], cssVar: "nav-stories" },
  { id: "nav.communities", label: "Communities tab", group: "Navigation", hint: "Icon and colour", traits: ["color", "icon", "sound", "animation"], cssVar: "nav-communities" },
  { id: "nav.calls", label: "Calls tab", group: "Navigation", hint: "Icon and colour", traits: ["color", "icon", "sound", "animation"], cssVar: "nav-calls" },
  { id: "nav.ai", label: "AI tab", group: "Navigation", hint: "Icon and colour", traits: ["color", "icon", "sound", "animation"], cssVar: "nav-ai" },
  { id: "nav.calendar", label: "Calendar tab", group: "Navigation", hint: "Icon and colour", traits: ["color", "icon", "sound", "animation"], cssVar: "nav-calendar" },
  { id: "nav.settings", label: "Settings tab", group: "Navigation", hint: "Icon and colour", traits: ["color", "icon", "sound", "animation"], cssVar: "nav-settings" },
  { id: "nav.account", label: "Account tab", group: "Navigation", hint: "Icon and colour", traits: ["color", "icon", "sound", "animation"], cssVar: "nav-account" },
  { id: "nav.logo", label: "Logo", group: "Navigation", hint: "The UMS mark", traits: ["icon", "animation"], cssVar: "nav-logo" },

  // Messages
  { id: "bubble.sent", label: "Your bubbles", group: "Messages", hint: "Messages you send", traits: ["color", "background", "animation", "sound"], cssVar: "bubble-sent" },
  { id: "bubble.received", label: "Their bubbles", group: "Messages", hint: "Messages you receive", traits: ["color", "background", "animation", "sound"], cssVar: "bubble-received" },
  { id: "message.reaction", label: "Reactions", group: "Messages", hint: "Emoji on a message", traits: ["background", "animation", "sound"], cssVar: "reaction" },
  { id: "message.typing", label: "Typing dots", group: "Messages", hint: "When someone is writing", traits: ["color", "animation"], cssVar: "typing" },
  { id: "message.time", label: "Timestamps", group: "Messages", hint: "The little time under a message", traits: ["color"], cssVar: "msg-time" },

  // Buttons
  { id: "button.send", label: "Send button", group: "Buttons", hint: "Sends your message", traits: ["color", "background", "icon", "animation", "sound"], cssVar: "btn-send" },
  { id: "button.primary", label: "Main buttons", group: "Buttons", hint: "The filled buttons", traits: ["color", "background", "animation", "sound"], cssVar: "btn-primary" },
  { id: "button.emoji", label: "Emoji button", group: "Buttons", hint: "Opens the emoji picker", traits: ["color", "icon", "sound"], cssVar: "btn-emoji" },
  { id: "button.attach", label: "Attach button", group: "Buttons", hint: "Photos and files", traits: ["color", "icon", "sound"], cssVar: "btn-attach" },
  { id: "button.mic", label: "Voice button", group: "Buttons", hint: "Records a voice message", traits: ["color", "icon", "sound"], cssVar: "btn-mic" },
  { id: "button.gif", label: "GIF button", group: "Buttons", hint: "Opens the GIF picker", traits: ["color", "icon", "sound"], cssVar: "btn-gif" },
  { id: "input.box", label: "Message box", group: "Buttons", hint: "Where you type", traits: ["background", "color"], cssVar: "input-box" },

  // Chat list
  { id: "list.row", label: "Chat rows", group: "Chat list", hint: "Each chat in the list", traits: ["background", "animation", "sound"], cssVar: "list-row" },
  { id: "list.active", label: "Open chat row", group: "Chat list", hint: "The chat you have open", traits: ["background", "color"], cssVar: "list-active" },
  { id: "list.unread", label: "Unread badge", group: "Chat list", hint: "The number bubble", traits: ["color", "background", "animation"], cssVar: "unread" },
  { id: "list.online", label: "Online dot", group: "Chat list", hint: "Shows who's online", traits: ["color", "animation"], cssVar: "online" },
  { id: "avatar.ring", label: "Avatars", group: "Chat list", hint: "Profile circles", traits: ["background", "animation"], cssVar: "avatar" },

  // Calls
  { id: "call.answer", label: "Answer button", group: "Calls", hint: "Picks up a call", traits: ["color", "background", "icon", "animation", "sound"], cssVar: "call-answer" },
  { id: "call.decline", label: "Decline button", group: "Calls", hint: "Rejects a call", traits: ["color", "background", "icon", "animation", "sound"], cssVar: "call-decline" },
  { id: "call.control", label: "Call controls", group: "Calls", hint: "Mute, camera, flip", traits: ["color", "background", "sound"], cssVar: "call-control" },

  // Surfaces
  { id: "surface.card", label: "Cards", group: "Surfaces", hint: "Panels and boxes", traits: ["background"], cssVar: "card" },
  { id: "surface.header", label: "Chat header", group: "Surfaces", hint: "The bar above a chat", traits: ["background", "color"], cssVar: "header" },
  { id: "surface.dialog", label: "Pop-ups", group: "Surfaces", hint: "Dialogs and sheets", traits: ["background", "animation", "sound"], cssVar: "dialog" },
  { id: "surface.toast", label: "Notifications", group: "Surfaces", hint: "The little pop-up messages", traits: ["background", "color", "animation", "sound"], cssVar: "toast" },
];

export const ELEMENT_BY_ID = new Map(ELEMENTS.map((e) => [e.id, e]));

// ---- Icons people can choose from -----------------------------------------
// Kept to a curated list so every choice renders and nothing can be injected.
export const ICON_CHOICES = [
  "MessageCircle", "MessageSquare", "Mail", "Send", "Inbox", "AtSign",
  "CircleDot", "Camera", "Image", "Film", "Aperture", "Sparkles",
  "Globe2", "Users", "UsersRound", "Compass", "Map", "Network",
  "Phone", "PhoneCall", "Video", "Mic", "Headphones", "Radio",
  "Bot", "Cpu", "Brain", "Wand2", "Zap", "Star",
  "CalendarDays", "Calendar", "Clock", "Timer", "Bell", "Flag",
  "Settings", "Sliders", "Wrench", "Cog", "SlidersHorizontal", "Filter",
  "User", "UserRound", "Smile", "Heart", "Crown", "Shield",
  "Home", "Rocket", "Flame", "Moon", "Sun", "Cloud",
  "Music", "Gamepad2", "Coffee", "Pizza", "Leaf", "Gift",
  "Paperclip", "Plus", "Check", "ArrowUp", "ArrowRight", "Play",
] as const;
export type IconName = (typeof ICON_CHOICES)[number];
const ICON_SET = new Set<string>(ICON_CHOICES);
export const isIconName = (v: unknown): v is IconName => typeof v === "string" && ICON_SET.has(v);

// ---- Animations an element can use ----------------------------------------
export const ELEMENT_ANIMATIONS = [
  { id: "none", label: "None" },
  { id: "pop", label: "Pop" },
  { id: "bounce", label: "Bounce" },
  { id: "pulse", label: "Pulse" },
  { id: "shake", label: "Shake" },
  { id: "glow", label: "Glow" },
  { id: "spin", label: "Spin" },
  { id: "float", label: "Float" },
  { id: "flip", label: "Flip" },
  { id: "jelly", label: "Jelly" },
] as const;
export type ElementAnimation = (typeof ELEMENT_ANIMATIONS)[number]["id"];
const ANIM_SET = new Set<string>(ELEMENT_ANIMATIONS.map((a) => a.id));
export const isElementAnimation = (v: unknown): v is ElementAnimation =>
  typeof v === "string" && ANIM_SET.has(v);
