"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const EMOJI_DATA: { category: string; emojis: string[] }[] = [
  {
    category: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
      "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
      "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒",
      "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒",
      "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳",
      "🥸", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "😮", "😯",
      "😲", "😳", "🥺", "🥹", "😦", "😧", "😨", "😰", "😥", "😢",
      "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤",
      "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹",
    ],
  },
  {
    category: "Gestures",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌",
      "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉",
      "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛",
      "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️", "💪",
    ],
  },
  {
    category: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟",
      "♥️", "🫶", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💬",
    ],
  },
  {
    category: "Objects",
    emojis: [
      "🔥", "⭐", "🌟", "✨", "⚡", "💡", "🎉", "🎊", "🎈", "🎁",
      "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🎮", "🎯", "🎵", "🎶",
      "📱", "💻", "⌨️", "🖥️", "📸", "📷", "🔔", "📌", "📎", "✏️",
      "📝", "📚", "📖", "🔗", "📬", "📧", "🗂️", "📁", "🗑️", "🔒",
    ],
  },
  {
    category: "Food",
    emojis: [
      "🍕", "🍔", "🍟", "🌮", "🌯", "🥗", "🍣", "🍱", "🍛", "🍜",
      "☕", "🍵", "🧃", "🥤", "🍺", "🍷", "🥂", "🍰", "🎂", "🍩",
      "🍪", "🍫", "🍬", "🍭", "🍿", "🧁", "🥐", "🍳", "🥑", "🍎",
    ],
  },
  {
    category: "Animals",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦅", "🦆",
      "🦉", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐢", "🐍",
    ],
  },
  {
    category: "Travel",
    emojis: [
      "🚗", "🚕", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "✈️", "🚀",
      "🛸", "🚁", "⛵", "🚢", "🏠", "🏢", "🏥", "🏫", "⛪", "🗽",
      "🗼", "🏰", "🌍", "🌎", "🌏", "🗺️", "🧭", "⛰️", "🌋", "🏝️",
    ],
  },
  {
    category: "Flags",
    emojis: [
      "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🇺🇸", "🇬🇧", "🇮🇳",
      "🇨🇦", "🇦🇺", "🇫🇷", "🇩🇪", "🇯🇵", "🇰🇷", "🇧🇷", "🇲🇽", "🇮🇹", "🇪🇸",
    ],
  },
];

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏"];

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
};

export function EmojiPicker({ onSelect, onClose, className }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return EMOJI_DATA;
    const q = search.trim().toLowerCase();
    return EMOJI_DATA.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter(() => {
        // Simple search - we match on category name as fallback
        return cat.category.toLowerCase().includes(q);
      }),
    })).filter((cat) => cat.emojis.length > 0);
  }, [search]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-80 rounded-xl border border-border bg-popover google-shadow-2 overflow-hidden",
        className
      )}
    >
      {/* Search */}
      <div className="border-b border-border p-2">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search emoji..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Quick reactions */}
      {!search && (
        <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="flex size-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Category tabs */}
      {!search && (
        <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border px-2 py-1">
          {EMOJI_DATA.map((cat, i) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => setActiveCategory(i)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                activeCategory === i
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {cat.category}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="max-h-56 overflow-y-auto p-2">
        {(search ? filteredData : [EMOJI_DATA[activeCategory]]).map((cat) => (
          <div key={cat.category}>
            {search && (
              <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">
                {cat.category}
              </p>
            )}
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="flex size-9 items-center justify-center rounded-lg text-xl transition-all hover:bg-muted hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        {search && filteredData.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No emoji found
          </p>
        )}
      </div>
    </div>
  );
}

export function ReactionPicker({
  onSelect,
  className,
}: {
  onSelect: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5 rounded-full bg-popover border border-border px-1 py-0.5 google-shadow-1", className)}>
      {QUICK_REACTIONS.slice(0, 6).map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="flex size-8 items-center justify-center rounded-full text-lg transition-all hover:bg-muted hover:scale-110"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
