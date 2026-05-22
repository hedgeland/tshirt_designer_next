"use client";

import Image from "next/image";

interface VariantGridProps {
  urls: string[];  // full URLs pointing to FastAPI static file server
}

// Displays generated image variants in a responsive grid.
export default function VariantGrid({ urls }: VariantGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
      {urls.map((url, i) => (
        <div
          key={i}
          className="relative aspect-square rounded-lg overflow-hidden border border-slate-600 bg-slate-800"
        >
          <Image
            src={url}
            alt={`Variant ${i + 1}`}
            fill
            className="object-contain"
            // Unoptimized because images come from localhost:8000, not Next.js origin
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
