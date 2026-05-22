"use client";

import Image from "next/image";

interface VariantGridProps {
  urls: string[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  disabled: boolean;
}

// Displays generated image variants in a responsive grid with click-to-select.
// Selected variant gets an indigo ring matching the existing app's selection style.
export default function VariantGrid({ urls, selectedIdx, onSelect, disabled }: VariantGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {urls.map((url, i) => (
        <button
          key={i}
          onClick={() => !disabled && onSelect(i)}
          disabled={disabled}
          className={`relative aspect-square rounded-lg overflow-hidden border bg-slate-900 transition-all
            ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-indigo-400"}
            ${selectedIdx === i ? "border-indigo-400 ring-2 ring-indigo-400" : "border-slate-600"}`}
          aria-label={`Select variant ${i + 1}`}
          aria-pressed={selectedIdx === i}
        >
          <Image
            src={url}
            alt={`Variant ${i + 1}`}
            fill
            className="object-contain"
            unoptimized
          />
          {/* Variant number badge */}
          <span className="absolute top-1.5 left-1.5 text-[10px] font-mono bg-slate-900/80 text-slate-400 px-1.5 py-0.5 rounded">
            {i + 1}
          </span>
        </button>
      ))}
    </div>
  );
}
