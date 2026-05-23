const MAX_VARIANTS = 4;

interface HeaderProps {
  columnCount: number;
  maxColumns: number;
  onAddColumn: () => void;
  onToggleBrowser: () => void;
  browserOpen: boolean;
  defaultNumVariants: number;
  onDefaultNumVariantsChange: (n: number) => void;
}

export default function Header({
  columnCount, maxColumns, onAddColumn, onToggleBrowser, browserOpen,
  defaultNumVariants, onDefaultNumVariantsChange,
}: HeaderProps) {
  return (
    <header className="bg-slate-700 border-b border-slate-600 px-5 py-3 flex items-center gap-4 flex-shrink-0">
      <span className="text-xl" aria-hidden="true">👕</span>
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight">T-Shirt Design Generator</h1>
        <p className="text-xs text-slate-300">
          Brainstorm → Select → Generate · Gemini 3.1 Flash Image Preview
        </p>
      </div>

      <div className="ml-auto flex items-center gap-4">

        {/* Global default variant count */}
        <div className="flex items-center gap-2">
          <label htmlFor="global-num-variants" className="text-xs text-slate-400 whitespace-nowrap">
            Variants
          </label>
          <input
            id="global-num-variants"
            type="range"
            min={1}
            max={MAX_VARIANTS}
            step={1}
            value={defaultNumVariants}
            onChange={(e) => onDefaultNumVariantsChange(parseInt(e.target.value))}
            className="w-20 accent-indigo-400"
            title={`Default variants per column: ${defaultNumVariants}`}
          />
          <span className="text-xs font-semibold text-indigo-300 w-3 text-center">
            {defaultNumVariants}
          </span>
        </div>

        <span className="text-xs text-slate-400">
          {columnCount} / {maxColumns} columns
        </span>
        <button
          onClick={onAddColumn}
          disabled={columnCount >= maxColumns}
          title={columnCount >= maxColumns ? `Maximum ${maxColumns} columns` : "Add a column"}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Add column
        </button>
        <button
          onClick={onToggleBrowser}
          aria-pressed={browserOpen}
          title="Toggle output browser"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
            ${browserOpen
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-slate-600 text-white hover:bg-slate-500"}`}
        >
          📁 Browse
        </button>
      </div>
    </header>
  );
}
