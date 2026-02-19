import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const STICKER_PACKS: { name: string; stickers: string[] }[] = [
  {
    name: "Smileys",
    stickers: [
      "😀", "😃", "😄", "😁", "😆", "🥹", "😅", "🤣", "🥲", "😊",
      "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😚", "😋",
      "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩",
      "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖",
      "😫", "😩", "🥺", "😢", "😭", "😮‍💨", "😤", "😠", "😡", "🤬",
      "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🫣",
    ],
  },
  {
    name: "Animals",
    stickers: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨",
      "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒",
      "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗",
      "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪲",
      "🐢", "🐍", "🦎", "🦂", "🦀", "🦑", "🐙", "🦞", "🐠", "🐟",
      "🐡", "🐬", "🦈", "🐋", "🐳", "🐊", "🦧", "🦣", "🦬", "🦘",
    ],
  },
  {
    name: "Love",
    stickers: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟",
      "💌", "💋", "👩‍❤️‍👨", "👨‍❤️‍👨", "👩‍❤️‍👩", "💑", "👩‍❤️‍💋‍👨", "🫂", "💐", "🌹",
      "🥀", "🌺", "🌸", "💮", "🌼", "🌻", "🎀", "🫶", "🤗", "😻",
    ],
  },
  {
    name: "Hands",
    stickers: [
      "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌",
      "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉",
      "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛",
      "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "💪", "🦾",
    ],
  },
  {
    name: "Food",
    stickers: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈",
      "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🌮",
      "🍕", "🍔", "🍟", "🌭", "🥪", "🌯", "🧆", "🥗", "🍝", "🍜",
      "🍲", "🍛", "🍣", "🍱", "🥟", "🍤", "🍙", "🍚", "🍘", "🍩",
      "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯",
    ],
  },
  {
    name: "Activities",
    stickers: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱",
      "🏓", "🏸", "🏒", "🥅", "⛳", "🏹", "🎣", "🤿", "🥊", "🥋",
      "🎽", "🛹", "🛼", "⛸️", "🥌", "🎿", "🛷", "🎯", "🪀", "🎮",
      "🕹️", "🎲", "🧩", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹",
    ],
  },
];

interface StickerPickerProps {
  onSelect: (sticker: string) => void;
  onClose: () => void;
}

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const [activePack, setActivePack] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full left-0 mb-2 z-50 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">Stickers</span>
        <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Pack tabs */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-border overflow-x-auto scrollbar-hide">
        {STICKER_PACKS.map((pack, i) => (
          <button
            key={pack.name}
            onClick={() => setActivePack(i)}
            className={`px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${
              activePack === i
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground"
            }`}
          >
            {pack.name}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="grid grid-cols-6 gap-1 p-2 max-h-60 overflow-y-auto">
        {STICKER_PACKS[activePack].stickers.map((sticker, i) => (
          <motion.button
            key={`${sticker}-${i}`}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelect(sticker)}
            className="w-11 h-11 rounded-lg hover:bg-accent flex items-center justify-center text-2xl transition-colors"
          >
            {sticker}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
