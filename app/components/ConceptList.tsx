"use client";

interface ConceptListProps {
  concepts: string[];
  selected: string | null;
  onSelect: (concept: string) => void;   // just marks selection — does NOT trigger generation
  onGenerate: () => void;                // fires when user explicitly clicks Generate
  disabled: boolean;
  numVariants: number;                   // how many variants will be generated — shown in button label
}

// Concept radio list — user picks a concept then clicks Generate to proceed
export default function ConceptList({ concepts, selected, onSelect, onGenerate, disabled, numVariants }: ConceptListProps) {
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

      {/* Generate button — only enabled once a concept is selected */}
      <button
        onClick={onGenerate}
        disabled={disabled || !selected}
        className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {disabled && (
          <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        🎨 Generate {numVariants} Variant{numVariants !== 1 ? "s" : ""}
      </button>
    </div>
  );
}
