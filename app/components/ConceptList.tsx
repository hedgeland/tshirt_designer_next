"use client";

interface ConceptListProps {
  concepts: string[];
  selected: string | null;
  onSelect: (concept: string) => void;
  disabled: boolean;  // prevent re-selection while generating
}

// Renders selectable concept cards. Selected card gets an indigo highlight border.
export default function ConceptList({ concepts, selected, onSelect, disabled }: ConceptListProps) {
  return (
    <ul className="flex flex-col gap-3 w-full max-w-xl">
      {concepts.map((concept, i) => (
        <li
          key={i}
          onClick={() => !disabled && onSelect(concept)}
          className={`rounded-lg border px-4 py-3 text-sm transition-colors
            ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
            ${selected === concept
              ? "border-indigo-500 bg-indigo-950 text-indigo-100"
              : "border-slate-600 bg-slate-800 text-slate-200 hover:border-indigo-500 hover:bg-slate-700"
            }`}
        >
          {concept}
        </li>
      ))}
    </ul>
  );
}
