"use client";

interface ConceptListProps {
  concepts: string[];
  selected: string | null;
  onSelect: (concept: string) => void;
  disabled: boolean;
}

// Light-on-dark concept cards with radio buttons — matches existing app Step 2 style
export default function ConceptList({ concepts, selected, onSelect, disabled }: ConceptListProps) {
  return (
    <div className="space-y-2">
      {concepts.map((concept, i) => (
        <label
          key={i}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
            ${disabled ? "cursor-not-allowed opacity-60" : ""}
            ${selected === concept
              ? "border-indigo-400 bg-indigo-50"
              : "bg-slate-100 border-slate-300 hover:bg-white hover:border-slate-400"
            }`}
        >
          <input
            type="radio"
            name="concept"
            value={concept}
            checked={selected === concept}
            onChange={() => !disabled && onSelect(concept)}
            disabled={disabled}
            className="mt-0.5 accent-indigo-600 flex-shrink-0"
          />
          <span className="text-sm text-slate-700 leading-snug">{concept}</span>
        </label>
      ))}
    </div>
  );
}
