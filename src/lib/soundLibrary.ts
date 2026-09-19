// Sounds from the internet, searched on Wikimedia Commons — free, openly
// licensed and no account needed, the same source the GIF picker uses.
//
// A theme may only reference audio on Wikimedia's own file host. That rule is
// enforced here and again on the server, so a published theme can never point
// someone else's browser at an arbitrary URL.

export const LIBRARY_PREFIX = "url:";
const AUDIO_HOST = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//;

export interface LibrarySound {
  id: string;
  title: string;
  url: string;
  seconds: number;
  bytes: number;
  page: string;
}

export function isLibrarySoundRef(v: unknown): v is string {
  return typeof v === "string" && v.startsWith(LIBRARY_PREFIX) && AUDIO_HOST.test(v.slice(LIBRARY_PREFIX.length)) && v.length <= 500;
}

export const toSoundRef = (url: string) => `${LIBRARY_PREFIX}${url}`;
export const soundRefUrl = (ref: string) => (isLibrarySoundRef(ref) ? ref.slice(LIBRARY_PREFIX.length) : null);

const cache = new Map<string, LibrarySound[]>();
const inflight = new Map<string, Promise<LibrarySound[]>>();

// Short clips only: a theme sound that plays on a button tap has to be brief,
// and nobody should download a ten-minute recording to press a button.
const MAX_SECONDS = 6;
const MAX_BYTES = 800_000;

export async function searchSounds(query: string, limit = 24): Promise<LibrarySound[]> {
  const q = query.trim().toLowerCase();
  const cached = cache.get(q);
  if (cached) return cached;
  const pending = inflight.get(q);
  if (pending) return pending;

  const run = (async () => {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: q ? `filetype:audio ${q}` : "filetype:audio short sound effect",
      gsrnamespace: "6",
      gsrlimit: String(Math.min(limit * 2, 50)),
      prop: "imageinfo",
      iiprop: "url|size|mime|mediatype|metadata",
      format: "json",
      origin: "*",
    });
    const resp = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!resp.ok) throw new Error(`commons ${resp.status}`);
    const data = await resp.json();
    const pages = Object.values((data?.query?.pages ?? {}) as Record<string, {
      pageid: number;
      title: string;
      imageinfo?: {
        url: string; descriptionurl: string; size: number; mime: string;
        metadata?: { name: string; value: unknown }[];
      }[];
    }>);

    const out: LibrarySound[] = [];
    for (const page of pages) {
      const ii = page.imageinfo?.[0];
      if (!ii || !AUDIO_HOST.test(ii.url)) continue;
      // Browsers can't play every format Commons hosts
      if (!/^audio\/(ogg|mpeg|mp3|wav|x-wav|flac|webm)$/i.test(ii.mime)) continue;
      if (ii.size > MAX_BYTES) continue;
      const lengthMeta = ii.metadata?.find((m) => m.name === "playtime_seconds" || m.name === "length");
      const seconds = Number(lengthMeta?.value ?? 0);
      if (seconds && seconds > MAX_SECONDS) continue;
      out.push({
        id: String(page.pageid),
        title: page.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, ""),
        url: ii.url,
        seconds: Math.round(seconds * 10) / 10,
        bytes: ii.size,
        page: ii.descriptionurl,
      });
      if (out.length >= limit) break;
    }
    cache.set(q, out);
    return out;
  })();

  inflight.set(q, run);
  try {
    return await run;
  } finally {
    inflight.delete(q);
  }
}

// ---- Playing them ---------------------------------------------------------
// Each clip is fetched once and kept decoded, so repeat taps are instant.
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

async function load(url: string): Promise<AudioBuffer | null> {
  const have = buffers.get(url);
  if (have) return have;
  const pending = loading.get(url);
  if (pending) return pending;

  const run = (async () => {
    const c = audio();
    if (!c) return null;
    try {
      const resp = await fetch(url, { mode: "cors" });
      if (!resp.ok) return null;
      const bytes = await resp.arrayBuffer();
      if (bytes.byteLength > MAX_BYTES * 2) return null;
      const buf = await c.decodeAudioData(bytes);
      if (buf.duration > MAX_SECONDS + 2) return null;
      buffers.set(url, buf);
      return buf;
    } catch (e) {
      console.warn("[Sound] could not load", url, e);
      return null;
    }
  })();

  loading.set(url, run);
  try {
    return await run;
  } finally {
    loading.delete(url);
  }
}

export function preloadSound(ref: string) {
  const url = soundRefUrl(ref);
  if (url) void load(url);
}

export async function playLibrarySound(ref: string, volume = 0.5) {
  const url = soundRefUrl(ref);
  if (!url) return;
  const c = audio();
  if (!c) return;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      return;
    }
  }
  const buf = await load(url);
  if (!buf) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = Math.min(1, Math.max(0, volume));
  src.connect(g).connect(c.destination);
  src.start();
}
