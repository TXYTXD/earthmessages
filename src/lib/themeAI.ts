// UMS Theme AI — a small, fully local theme designer.
// It understands a plain description ("dark purple cyberpunk", "warm sunset
// by the sea", "σκούρο μπλε νύχτα") through a vocabulary of colors, moods
// and styles, then applies color-harmony rules to produce balanced themes.
// No network, no external model.

import { hexFromHsl, type ThemeDefinition } from "@/lib/customThemes";

interface HueSpec { h: number; s?: number; l?: number }
interface StyleSpec {
  hues?: number[];        // preferred hues
  sat?: number;           // saturation target (0-100)
  light?: number;         // lightness target for the accent (0-100)
  harmony?: Harmony;      // preferred gradient harmony
  tintSat?: number;       // dark background tint strength
  names?: string[];       // name fragments
}
type Harmony = "analogous" | "complementary" | "triadic" | "mono" | "split";

// ---- Vocabulary -----------------------------------------------------------
const COLORS: Record<string, HueSpec> = {
  red: { h: 0 }, crimson: { h: 350, s: 85 }, scarlet: { h: 5 }, ruby: { h: 345 }, cherry: { h: 352 },
  rose: { h: 340 }, pink: { h: 330, l: 62 }, magenta: { h: 305 }, fuchsia: { h: 300 }, hotpink: { h: 330, s: 100 },
  purple: { h: 275 }, violet: { h: 265 }, lavender: { h: 270, s: 60, l: 68 }, lilac: { h: 280, s: 55, l: 70 },
  indigo: { h: 250 }, blue: { h: 220 }, navy: { h: 225, l: 30 }, royal: { h: 230 }, sky: { h: 205, l: 60 },
  azure: { h: 210 }, cyan: { h: 190 }, teal: { h: 175, s: 70 }, turquoise: { h: 180 }, aqua: { h: 185, l: 60 },
  mint: { h: 160, s: 60, l: 60 }, green: { h: 140 }, emerald: { h: 150, s: 75 }, lime: { h: 85, s: 90 },
  olive: { h: 75, s: 45, l: 40 }, forest: { h: 140, s: 55, l: 35 }, jade: { h: 160 },
  yellow: { h: 50, s: 95 }, gold: { h: 42, s: 95 }, amber: { h: 40 }, orange: { h: 25 }, tangerine: { h: 30 },
  peach: { h: 22, s: 80, l: 70 }, coral: { h: 12, s: 85, l: 62 }, salmon: { h: 10, s: 75, l: 66 },
  brown: { h: 25, s: 45, l: 38 }, coffee: { h: 25, s: 40, l: 32 }, mocha: { h: 22, s: 45, l: 40 }, caramel: { h: 32, s: 70, l: 50 },
  chocolate: { h: 22, s: 50, l: 30 }, sand: { h: 40, s: 40, l: 70 }, beige: { h: 38, s: 30, l: 75 },
  white: { h: 210, s: 10, l: 80 }, silver: { h: 215, s: 8, l: 65 }, gray: { h: 220, s: 6, l: 50 }, grey: { h: 220, s: 6, l: 50 },
  black: { h: 240, s: 10, l: 25 }, charcoal: { h: 220, s: 8, l: 30 },
  // everyday things
  banana: { h: 52, s: 95, l: 58 }, strawberry: { h: 350, s: 85 }, blueberry: { h: 235, s: 60, l: 45 }, grass: { h: 110, s: 65, l: 42 },
  blood: { h: 355, s: 80, l: 38 }, wine: { h: 345, s: 65, l: 32 }, avocado: { h: 85, s: 55, l: 45 }, watermelon: { h: 350, s: 80, l: 55 },
  pumpkin: { h: 25, s: 90, l: 52 }, carrot: { h: 22, s: 90 }, cream: { h: 45, s: 60, l: 78 }, mustard: { h: 48, s: 85, l: 48 },
  plum: { h: 290, s: 55, l: 38 }, sapphire: { h: 225, s: 85, l: 45 }, amethyst: { h: 275, s: 60, l: 55 }, bronze: { h: 30, s: 60, l: 42 },
  copper: { h: 20, s: 70, l: 48 }, rust: { h: 15, s: 75, l: 40 }, steel: { h: 210, s: 15, l: 55 }, ivory: { h: 45, s: 40, l: 82 },
  pearl: { h: 40, s: 20, l: 80 }, cobalt: { h: 220, s: 90, l: 45 }, denim: { h: 215, s: 55, l: 42 }, orchid: { h: 300, s: 60, l: 60 },
  mauve: { h: 290, s: 30, l: 60 }, khaki: { h: 55, s: 30, l: 55 }, sunflower: { h: 48, s: 95, l: 55 }, flamingo: { h: 340, s: 85, l: 65 },
  bubblegum: { h: 330, s: 85, l: 70 }, unicorn: { h: 290, s: 70, l: 70 }, chartreuse: { h: 90, s: 95 }, tomato: { h: 8, s: 85, l: 55 },
  lemonade: { h: 55, s: 90, l: 62 }, honey: { h: 40, s: 90, l: 55 }, milk: { h: 40, s: 20, l: 85 }, ash: { h: 210, s: 5, l: 45 },
  // Greek
  "κόκκινο": { h: 0 }, "κοκκινο": { h: 0 }, "ροζ": { h: 330, l: 62 }, "μωβ": { h: 275 }, "μοβ": { h: 275 },
  "μπλε": { h: 220 }, "γαλάζιο": { h: 205, l: 60 }, "γαλαζιο": { h: 205, l: 60 }, "τιρκουάζ": { h: 180 },
  "πράσινο": { h: 140 }, "πρασινο": { h: 140 }, "κίτρινο": { h: 50, s: 95 }, "κιτρινο": { h: 50, s: 95 },
  "πορτοκαλί": { h: 25 }, "πορτοκαλι": { h: 25 }, "χρυσό": { h: 42, s: 95 }, "χρυσο": { h: 42, s: 95 },
  "καφέ": { h: 25, s: 45, l: 38 }, "καφε": { h: 25, s: 45, l: 38 }, "μαύρο": { h: 240, s: 10, l: 25 }, "μαυρο": { h: 240, s: 10, l: 25 },
  "άσπρο": { h: 210, s: 10, l: 80 }, "ασπρο": { h: 210, s: 10, l: 80 }, "γκρι": { h: 220, s: 6, l: 50 },
};

const STYLES: Record<string, StyleSpec> = {
  ocean: { hues: [200, 190, 215], sat: 85, harmony: "analogous", names: ["Ocean", "Tide", "Deep Blue"] },
  sea: { hues: [195, 185], sat: 80, harmony: "analogous", names: ["Sea", "Lagoon"] },
  beach: { hues: [195, 40], sat: 75, light: 58, harmony: "complementary", names: ["Beach", "Shoreline"] },
  sunset: { hues: [20, 340, 45], sat: 90, harmony: "analogous", names: ["Sunset", "Golden Hour", "Dusk"] },
  sunrise: { hues: [35, 15, 55], sat: 90, light: 58, harmony: "analogous", names: ["Sunrise", "Dawn"] },
  forest: { hues: [140, 120, 160], sat: 55, light: 40, harmony: "analogous", tintSat: 20, names: ["Forest", "Woods", "Pine"] },
  jungle: { hues: [130, 90], sat: 70, harmony: "analogous", names: ["Jungle"] },
  night: { hues: [240, 260], sat: 60, light: 55, harmony: "analogous", tintSat: 28, names: ["Night", "Midnight"] },
  midnight: { hues: [250, 230], sat: 70, harmony: "analogous", tintSat: 30, names: ["Midnight"] },
  galaxy: { hues: [265, 300, 220], sat: 85, harmony: "triadic", tintSat: 30, names: ["Galaxy", "Nebula", "Cosmos"] },
  space: { hues: [255, 200], sat: 75, harmony: "split", tintSat: 30, names: ["Space", "Orbit"] },
  cyber: { hues: [300, 180], sat: 100, light: 55, harmony: "complementary", tintSat: 30, names: ["Cyber", "Neon City"] },
  cyberpunk: { hues: [310, 185, 55], sat: 100, light: 55, harmony: "triadic", tintSat: 30, names: ["Cyberpunk", "Night City"] },
  neon: { hues: [150, 180, 300], sat: 100, light: 52, harmony: "triadic", tintSat: 25, names: ["Neon", "Glow"] },
  retro: { hues: [15, 45, 190], sat: 70, light: 55, harmony: "triadic", tintSat: 15, names: ["Retro", "Vintage"] },
  vintage: { hues: [30, 15], sat: 45, light: 50, harmony: "analogous", tintSat: 12, names: ["Vintage", "Old Film"] },
  pastel: { sat: 55, light: 70, harmony: "analogous", tintSat: 12, names: ["Pastel", "Soft"] },
  candy: { hues: [330, 200, 50], sat: 90, light: 62, harmony: "triadic", names: ["Candy", "Sweet"] },
  fire: { hues: [10, 30, 50], sat: 95, harmony: "analogous", names: ["Fire", "Blaze", "Ember"] },
  lava: { hues: [5, 25], sat: 95, harmony: "analogous", tintSat: 25, names: ["Lava", "Magma"] },
  ice: { hues: [195, 210], sat: 60, light: 65, harmony: "analogous", tintSat: 15, names: ["Ice", "Frost", "Arctic"] },
  snow: { hues: [205, 220], sat: 40, light: 68, harmony: "mono", tintSat: 10, names: ["Snow", "Winter"] },
  winter: { hues: [210, 195], sat: 55, light: 60, harmony: "analogous", tintSat: 15, names: ["Winter"] },
  spring: { hues: [120, 330, 55], sat: 70, light: 58, harmony: "triadic", names: ["Spring", "Bloom"] },
  summer: { hues: [45, 195, 15], sat: 90, light: 55, harmony: "triadic", names: ["Summer", "Heatwave"] },
  autumn: { hues: [25, 40, 10], sat: 80, light: 48, harmony: "analogous", tintSat: 18, names: ["Autumn", "Fall", "Harvest"] },
  fall: { hues: [25, 40, 10], sat: 80, light: 48, harmony: "analogous", tintSat: 18, names: ["Autumn"] },
  christmas: { hues: [0, 140], sat: 80, harmony: "complementary", names: ["Christmas", "Holiday"] },
  halloween: { hues: [25, 275], sat: 95, harmony: "complementary", tintSat: 25, names: ["Halloween", "Spooky"] },
  valentine: { hues: [345, 330, 0], sat: 85, harmony: "analogous", names: ["Valentine", "Love"] },
  love: { hues: [345, 320], sat: 85, harmony: "analogous", names: ["Love", "Heart"] },
  rainbow: { hues: [0, 120, 240], sat: 95, harmony: "triadic", names: ["Rainbow", "Spectrum"] },
  coffee: { hues: [25, 35], sat: 45, light: 42, harmony: "analogous", tintSat: 18, names: ["Coffee", "Latte", "Espresso"] },
  chocolate: { hues: [22, 30], sat: 50, light: 35, harmony: "mono", tintSat: 18, names: ["Chocolate", "Cocoa"] },
  desert: { hues: [35, 20], sat: 65, light: 55, harmony: "analogous", tintSat: 15, names: ["Desert", "Dune"] },
  sakura: { hues: [335, 350], sat: 65, light: 68, harmony: "analogous", names: ["Sakura", "Blossom"] },
  cherryblossom: { hues: [335, 350], sat: 65, light: 68, harmony: "analogous", names: ["Cherry Blossom"] },
  matrix: { hues: [120, 135], sat: 100, light: 45, harmony: "mono", tintSat: 20, names: ["Matrix", "Code"] },
  hacker: { hues: [120, 150], sat: 100, light: 45, harmony: "mono", tintSat: 20, names: ["Hacker", "Terminal"] },
  royal: { hues: [265, 45], sat: 85, harmony: "complementary", names: ["Royal", "Majesty"] },
  luxury: { hues: [42, 265], sat: 85, light: 50, harmony: "complementary", tintSat: 20, names: ["Luxury", "Gold Card"] },
  gaming: { hues: [270, 190, 330], sat: 100, light: 55, harmony: "triadic", tintSat: 28, names: ["Gaming", "Player One"] },
  minimal: { sat: 15, light: 55, harmony: "mono", tintSat: 6, names: ["Minimal", "Clean"] },
  mono: { sat: 8, light: 55, harmony: "mono", tintSat: 5, names: ["Mono", "Grayscale"] },
  nature: { hues: [130, 90, 170], sat: 60, harmony: "analogous", names: ["Nature", "Meadow"] },
  tropical: { hues: [165, 45, 330], sat: 95, light: 55, harmony: "triadic", names: ["Tropical", "Paradise"] },
  lemon: { hues: [55, 80], sat: 95, light: 55, harmony: "analogous", names: ["Lemon", "Zest"] },
  berry: { hues: [330, 290, 350], sat: 85, harmony: "analogous", names: ["Berry", "Mixed Berries"] },
  grape: { hues: [280, 300], sat: 80, harmony: "analogous", names: ["Grape"] },
  storm: { hues: [220, 200], sat: 35, light: 50, harmony: "analogous", tintSat: 12, names: ["Storm", "Thunder"] },
  rain: { hues: [210, 200], sat: 45, light: 55, harmony: "mono", tintSat: 14, names: ["Rain", "Drizzle"] },
  sun: { hues: [45, 30], sat: 100, light: 55, harmony: "analogous", names: ["Sun", "Solar"] },
  moon: { hues: [230, 45], sat: 40, light: 65, harmony: "complementary", tintSat: 15, names: ["Moon", "Lunar"] },
  // things and places
  lake: { hues: [200, 180], sat: 60, light: 50, harmony: "analogous", names: ["Lake", "Still Water"] },
  river: { hues: [195, 170], sat: 55, harmony: "analogous", names: ["River", "Stream"] },
  mountain: { hues: [215, 150], sat: 35, light: 48, harmony: "split", tintSat: 12, names: ["Mountain", "Summit"] },
  volcano: { hues: [10, 30], sat: 95, light: 50, harmony: "analogous", tintSat: 25, names: ["Volcano", "Eruption"] },
  cloud: { hues: [210, 220], sat: 25, light: 68, harmony: "mono", tintSat: 8, names: ["Cloud", "Overcast"] },
  aurora: { hues: [150, 280, 190], sat: 85, light: 55, harmony: "triadic", tintSat: 25, names: ["Aurora", "Northern Lights"] },
  sunflower: { hues: [48, 90], sat: 95, harmony: "analogous", names: ["Sunflower"] },
  dragon: { hues: [0, 45], sat: 90, light: 48, harmony: "complementary", tintSat: 25, names: ["Dragon", "Wyrm"] },
  ninja: { hues: [240, 0], sat: 40, light: 40, harmony: "complementary", tintSat: 12, names: ["Ninja", "Shadow"] },
  vampire: { hues: [350, 270], sat: 85, light: 42, harmony: "split", tintSat: 30, names: ["Vampire", "Nocturne"] },
  pirate: { hues: [25, 210], sat: 55, light: 45, harmony: "complementary", tintSat: 15, names: ["Pirate", "High Seas"] },
  zombie: { hues: [95, 130], sat: 45, light: 40, harmony: "analogous", tintSat: 15, names: ["Zombie", "Undead"] },
  wedding: { hues: [340, 40], sat: 40, light: 70, harmony: "analogous", tintSat: 8, names: ["Wedding", "Vows"] },
  birthday: { hues: [330, 200, 50], sat: 95, light: 60, harmony: "triadic", names: ["Birthday", "Party"] },
  party: { hues: [300, 190, 50], sat: 100, light: 55, harmony: "triadic", tintSat: 22, names: ["Party", "Disco"] },
  disco: { hues: [300, 190, 50], sat: 100, light: 55, harmony: "triadic", tintSat: 22, names: ["Disco", "Mirrorball"] },
  music: { hues: [280, 330], sat: 80, harmony: "analogous", tintSat: 20, names: ["Music", "Beat"] },
  football: { hues: [130, 45], sat: 80, harmony: "complementary", names: ["Football", "Matchday"] },
  basketball: { hues: [25, 240], sat: 85, harmony: "complementary", names: ["Basketball", "Courtside"] },
  school: { hues: [220, 45], sat: 70, harmony: "complementary", names: ["School", "Notebook"] },
  study: { hues: [200, 40], sat: 45, light: 52, harmony: "complementary", tintSat: 10, names: ["Study", "Focus"] },
  work: { hues: [215, 200], sat: 45, light: 48, harmony: "mono", tintSat: 8, names: ["Work", "Office"] },
  // familiar app looks (described, not copied)
  discord: { hues: [235, 225], sat: 80, light: 62, harmony: "analogous", tintSat: 18, names: ["Blurple", "Chat Lounge"] },
  spotify: { hues: [141, 150], sat: 75, light: 45, harmony: "mono", tintSat: 8, names: ["Playlist", "Green Room"] },
  netflix: { hues: [357, 0], sat: 90, light: 45, harmony: "mono", tintSat: 10, names: ["Cinema", "Binge"] },
  instagram: { hues: [300, 20, 45], sat: 90, light: 55, harmony: "triadic", names: ["Feed", "Story Ring"] },
  whatsapp: { hues: [142, 160], sat: 70, light: 42, harmony: "analogous", names: ["Green Bubble", "Chatty"] },
  tiktok: { hues: [185, 340], sat: 100, light: 55, harmony: "complementary", tintSat: 25, names: ["Clips", "Duet"] },
  twitch: { hues: [265, 275], sat: 80, light: 58, harmony: "mono", tintSat: 20, names: ["Streamer", "Live"] },
  youtube: { hues: [0, 10], sat: 95, light: 50, harmony: "mono", tintSat: 8, names: ["Player", "Subscribe"] },
  snapchat: { hues: [55, 45], sat: 100, light: 55, harmony: "analogous", names: ["Snap", "Ghost"] },
  minecraft: { hues: [110, 25], sat: 60, light: 42, harmony: "complementary", tintSat: 15, names: ["Blocks", "Overworld"] },
  fortnite: { hues: [265, 200, 50], sat: 95, light: 58, harmony: "triadic", tintSat: 22, names: ["Battle Bus", "Victory"] },
  roblox: { hues: [0, 210], sat: 85, light: 52, harmony: "complementary", names: ["Blocky", "Obby"] },
  apple: { hues: [220, 210], sat: 70, light: 55, harmony: "mono", tintSat: 6, names: ["Cupertino", "Sleek"] },
  google: { hues: [217, 5, 45], sat: 85, light: 55, harmony: "triadic", names: ["Four Colors", "Search"] },
  // Greek
  "θάλασσα": { hues: [195, 185], sat: 80, harmony: "analogous", names: ["Θάλασσα", "Sea"] },
  "θαλασσα": { hues: [195, 185], sat: 80, harmony: "analogous", names: ["Θάλασσα"] },
  "ηλιοβασίλεμα": { hues: [20, 340, 45], sat: 90, harmony: "analogous", names: ["Ηλιοβασίλεμα"] },
  "ηλιοβασιλεμα": { hues: [20, 340, 45], sat: 90, harmony: "analogous", names: ["Ηλιοβασίλεμα"] },
  "δάσος": { hues: [140, 120], sat: 55, light: 40, harmony: "analogous", names: ["Δάσος"] },
  "δασος": { hues: [140, 120], sat: 55, light: 40, harmony: "analogous", names: ["Δάσος"] },
  "νύχτα": { hues: [240, 260], sat: 60, harmony: "analogous", tintSat: 28, names: ["Νύχτα"] },
  "νυχτα": { hues: [240, 260], sat: 60, harmony: "analogous", tintSat: 28, names: ["Νύχτα"] },
  "φωτιά": { hues: [10, 30, 50], sat: 95, harmony: "analogous", names: ["Φωτιά"] },
  "φωτια": { hues: [10, 30, 50], sat: 95, harmony: "analogous", names: ["Φωτιά"] },
  "πάγος": { hues: [195, 210], sat: 60, light: 65, harmony: "analogous", names: ["Πάγος"] },
  "παγος": { hues: [195, 210], sat: 60, light: 65, harmony: "analogous", names: ["Πάγος"] },
  "καλοκαίρι": { hues: [45, 195, 15], sat: 90, harmony: "triadic", names: ["Καλοκαίρι"] },
  "καλοκαιρι": { hues: [45, 195, 15], sat: 90, harmony: "triadic", names: ["Καλοκαίρι"] },
  "χειμώνας": { hues: [210, 195], sat: 55, light: 60, harmony: "analogous", names: ["Χειμώνας"] },
  "χειμωνας": { hues: [210, 195], sat: 55, light: 60, harmony: "analogous", names: ["Χειμώνας"] },
  "γαλαξίας": { hues: [265, 300, 220], sat: 85, harmony: "triadic", tintSat: 30, names: ["Γαλαξίας"] },
  "γαλαξιας": { hues: [265, 300, 220], sat: 85, harmony: "triadic", tintSat: 30, names: ["Γαλαξίας"] },
  "χριστούγεννα": { hues: [0, 140], sat: 80, harmony: "complementary", names: ["Χριστούγεννα"] },
  "χριστουγεννα": { hues: [0, 140], sat: 80, harmony: "complementary", names: ["Χριστούγεννα"] },
};

// Modifiers nudge saturation / lightness / tint
const MODIFIERS: Record<string, { sat?: number; light?: number; tint?: number }> = {
  dark: { light: -12, tint: 8 }, deep: { light: -10, sat: 5 }, light: { light: 14, sat: -8 }, bright: { light: 6, sat: 15 },
  vibrant: { sat: 20 }, vivid: { sat: 20 }, bold: { sat: 15 }, soft: { sat: -20, light: 8 }, muted: { sat: -30 },
  calm: { sat: -18, light: 4 }, gentle: { sat: -18, light: 8 }, pastel: { sat: -25, light: 16 }, neon: { sat: 30, light: 4 },
  warm: { }, cool: { }, elegant: { sat: -10, light: -4 }, premium: { sat: -5, light: -6 }, cozy: { sat: -12, light: -2 },
  dreamy: { sat: -12, light: 10 }, moody: { sat: -8, light: -12, tint: 8 }, happy: { sat: 15, light: 6 }, fresh: { sat: 8, light: 6 },
  "σκούρο": { light: -12, tint: 8 }, "σκουρο": { light: -12, tint: 8 }, "ανοιχτό": { light: 14, sat: -8 }, "ανοιχτο": { light: 14, sat: -8 },
  "έντονο": { sat: 20 }, "εντονο": { sat: 20 }, "απαλό": { sat: -20, light: 8 }, "απαλο": { sat: -20, light: 8 }, "παστέλ": { sat: -25, light: 16 },
};
const WARM = new Set(["warm", "ζεστό", "ζεστο"]);
const COOL = new Set(["cool", "cold", "κρύο", "κρυο", "δροσερό"]);

// ---- Color math -------------------------------------------------------------
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const norm = (h: number) => ((h % 360) + 360) % 360;

export function hslToHex(h: number, s: number, l: number): string {
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Deterministic pseudo-random from a string, so the same words give the
// same first suggestion while "Generate again" can vary the seed.
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function harmonyHues(base: number, harmony: Harmony, rand: () => number): [number, number, number] {
  const j = () => (rand() - 0.5) * 12; // small jitter keeps results lively
  switch (harmony) {
    case "complementary": return [norm(base - 20 + j()), base, norm(base + 180 + j())];
    case "triadic": return [norm(base - 120 + j()), base, norm(base + 120 + j())];
    case "split": return [norm(base + 150 + j()), base, norm(base + 210 + j())];
    case "mono": return [norm(base - 8), base, norm(base + 8)];
    default: return [norm(base - 30 + j()), base, norm(base + 30 + j())];
  }
}

// ---- The designer -----------------------------------------------------------
export interface ThemeSuggestion {
  name: string;
  definition: ThemeDefinition;
  reason: string;
}

function tokenize(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/s$/, "")); // crude plural strip: "berries" stays, "colors" -> "color"
}

function titleCase(s: string) {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export function designThemes(prompt: string, variant = 0, count = 3): ThemeSuggestion[] {
  const words = tokenize(prompt);
  const colors: HueSpec[] = [];
  const styles: StyleSpec[] = [];
  const styleWords: string[] = [];
  let sat = 85;
  let light = 55;
  let tintSat = 22;
  let warm = 0;

  for (const w of words) {
    if (COLORS[w]) colors.push(COLORS[w]);
    const styleKey = STYLES[w] ? w : STYLES[w.replace(/-/g, "")] ? w.replace(/-/g, "") : null;
    if (styleKey) { styles.push(STYLES[styleKey]); styleWords.push(styleKey); }
    if (MODIFIERS[w]) {
      const m = MODIFIERS[w];
      sat += m.sat ?? 0;
      light += m.light ?? 0;
      tintSat += m.tint ?? 0;
    }
    if (WARM.has(w)) warm += 1;
    if (COOL.has(w)) warm -= 1;
  }
  // "cherry blossom" as two words
  if (words.includes("cherry") && words.includes("blossom")) { styles.push(STYLES.sakura); styleWords.push("sakura"); }

  const seed = hashSeed(words.join(" ") || "ums") + variant * 7919;
  const rand = rng(seed);

  // Candidate base hues: explicit colors first, then style hues, else seeded
  let baseHues: number[] = colors.map((c) => c.h);
  if (!baseHues.length) baseHues = styles.flatMap((s) => s.hues ?? []);
  if (!baseHues.length) baseHues = [Math.floor(rand() * 360)];

  // Style targets
  for (const s of styles) {
    if (s.sat !== undefined) sat = (sat + s.sat) / 2;
    if (s.light !== undefined) light = (light + s.light) / 2;
    if (s.tintSat !== undefined) tintSat = s.tintSat;
  }
  for (const c of colors) {
    if (c.s !== undefined) sat = (sat + c.s) / 2;
    if (c.l !== undefined) light = (light + c.l) / 2;
  }
  sat = clamp(sat, 6, 100);
  light = clamp(light, 30, 72);

  const harmonies: Harmony[] = [];
  styles.forEach((s) => s.harmony && harmonies.push(s.harmony));
  if (colors.length >= 2) harmonies.unshift("complementary");
  const fallback: Harmony[] = ["analogous", "triadic", "split", "complementary", "mono"];

  const out: ThemeSuggestion[] = [];
  for (let i = 0; i < count; i++) {
    const base = norm(baseHues[i % baseHues.length] + (i >= baseHues.length ? (rand() - 0.5) * 30 : 0));
    let harmony = harmonies[i] ?? fallback[(i + variant) % fallback.length];
    let hues: [number, number, number];
    let stops: HueSpec[] | null = null;
    if (colors.length >= 2) {
      // Use the colors the person named, in order; the accent is the first one.
      // Variants swap the order so each suggestion feels different.
      const a = colors[(0 + i) % colors.length];
      const b = colors[(1 + i) % colors.length];
      const c = colors.length >= 3 ? colors[(2 + i) % colors.length] : null;
      const mid = c ?? { h: norm((a.h + b.h) / 2 + (Math.abs(a.h - b.h) > 180 ? 180 : 0)) };
      stops = [a, mid, b];
      hues = [a.h, mid.h, b.h];
      harmony = "complementary";
    } else {
      hues = harmonyHues(base, harmony, rand);
    }
    // Warm/cool preference gently pulls the gradient
    if (warm > 0) hues = hues.map((h) => norm(h + (h > 180 && h < 300 ? 15 : -8))) as [number, number, number];
    if (warm < 0) hues = hues.map((h) => norm(h + (h < 60 || h > 300 ? -15 : 10))) as [number, number, number];

    const accentL = clamp(light + (i === 2 ? -4 : 0), 32, 70);
    // A named color keeps its own character (e.g. black stays dark, pastel stays soft)
    const stopHex = (k: number, dSat: number, dLight: number) => {
      const spec = stops?.[k];
      const sS = spec?.s !== undefined ? spec.s : clamp(sat + dSat, 10, 100);
      const sL = spec?.l !== undefined ? clamp(spec.l, 22, 80) : clamp(light + dLight, 35, 72);
      return hslToHex(hues[k], sS, sL);
    };
    const accentSpec = stops?.[0];
    const accentHue = stops ? hues[0] : hues[1];
    const primary = hslToHex(
      accentHue,
      accentSpec?.s !== undefined ? Math.max(accentSpec.s, 20) : sat,
      accentSpec?.l !== undefined ? clamp(accentSpec.l, 32, 68) : accentL
    );

    // Give each part of the app its own colour rather than tinting
    // everything with the accent. The nav sits coolest and darkest, cards
    // one step lighter, the other person's bubble lighter still, and your
    // own bubbles carry the theme's brightest pair.
    // Your own bubbles start in the accent's family and travel to the
    // theme's second colour, so they feel related but not identical.
    const partner = stops ? hues[2] : hues[(hues.indexOf(accentHue) + 2) % 3];
    const bubbleA = norm(accentHue + (harmony === "mono" ? -6 : -12));
    const bubbleB = norm(partner + (harmony === "mono" ? 10 : 0));
    // Surfaces stay in the theme's own family — they shift around the accent
    // by a little, so the nav, cards and bubbles read as different colours
    // without any of them looking like a mistake.
    const surfaceHue = norm(accentHue + 8);
    const sidebarHue = norm(accentHue - 14);
    const receivedHue = norm(accentHue + 18);
    const bodySat = clamp(tintSat + 6, 6, 40);

    const definition: ThemeDefinition = {
      primary,
      gradient: [stopHex(0, -5, 4), stops ? stopHex(1, 0, 0) : primary, stopHex(2, 5, 2)],
      tint: hslToHex(accentHue, clamp(tintSat + 25, 10, 70), 28),
      bubble: [
        hslToHex(bubbleA, clamp(sat + 4, 20, 100), clamp(light + 3, 38, 66)),
        hslToHex(bubbleB, clamp(sat - 2, 18, 100), clamp(light - 4, 32, 62)),
      ],
      received: hexFromHsl(receivedHue, clamp(bodySat + 2, 6, 32), 17),
      sidebar: hexFromHsl(sidebarHue, clamp(bodySat + 6, 6, 36), 8),
      surface: hexFromHsl(surfaceHue, clamp(bodySat, 6, 30), 12),
    };

    // A name: style fragments + color words, or the person's own words
    const styleName = styles[i % Math.max(styles.length, 1)]?.names?.[variant % (styles[i % Math.max(styles.length, 1)]?.names?.length || 1)];
    const colorWord = words.find((w) => COLORS[w]);
    const suffix = ["", " Glow", " Dream", " Wave", " Mist", " Pulse", " Bloom"][(i + variant) % 7];
    const name = styleName
      ? `${styleName}${colorWord && !styleName.toLowerCase().includes(colorWord) ? " " + titleCase(colorWord) : ""}${i ? suffix : ""}`
      : colorWord
        ? `${titleCase(colorWord)}${suffix || " Theme"}`
        : `${titleCase(words.slice(0, 2).join(" ") || "Custom")}${suffix}`;

    const reason =
      harmony === "complementary" ? "Contrasting colors for punch" :
      harmony === "triadic" ? "Three balanced colors" :
      harmony === "split" ? "One main color with two accents" :
      harmony === "mono" ? "One color, many shades" : "Neighbouring colors that flow together";

    out.push({ name: name.trim().slice(0, 40), definition, reason });
  }
  return out;
}

export const THEME_AI_EXAMPLES = [
  "dark purple cyberpunk", "warm sunset by the sea", "calm pastel mint", "neon green hacker",
  "cozy coffee autumn", "galaxy at midnight", "cherry blossom spring", "gold and black luxury",
  "σκούρο μπλε νύχτα", "καλοκαίρι στη θάλασσα",
];
