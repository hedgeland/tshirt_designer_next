"use client";

import { useState, useCallback, useEffect } from "react";
import Header from "./components/Header";
import DesignerColumn from "./components/DesignerColumn";
import type { LoadRequest, ReferenceRequest } from "./components/DesignerColumn";
import ObjectBrowser from "./components/ObjectBrowser";
import { useLocalStorage } from "./hooks/useLocalStorage";

const MAX_COLUMNS = 4;

export default function Home() {
  // Start with one column (safe for SSR), then restore from localStorage after mount
  const [columns, setColumns] = useState<number[]>([1]);
  const [nextId, setNextId] = useState(2);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("columnCount");
      if (stored !== null) {
        const count = Math.max(1, Math.min(JSON.parse(stored) as number, MAX_COLUMNS));
        if (count > 1) {
          setColumns(Array.from({ length: count }, (_, i) => i + 1));
          setNextId(count + 1);
        }
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [browserOpen, setBrowserOpen] = useState(false);
  const [defaultNumVariants, setDefaultNumVariants] = useLocalStorage("defaultNumVariants", 2);


  // Active column index (0-based); drives the highlight and the browser's default target
  const [activeColIdx, setActiveColIdx] = useState(0);

  // loadRequests is keyed by column ID; null means "nothing pending for that column"
  const [loadRequests, setLoadRequests] = useState<Record<number, LoadRequest | null>>({});
  // referenceRequests: pending "use as reference" from the object browser
  const [referenceRequests, setReferenceRequests] = useState<Record<number, ReferenceRequest | null>>({});

  function addColumn() {
    if (columns.length >= MAX_COLUMNS) return;
    setColumns((prev) => {
      const next = [...prev, nextId];
      localStorage.setItem("columnCount", JSON.stringify(next.length));
      setActiveColIdx(next.length - 1);
      return next;
    });
    setNextId((id) => id + 1);
  }

  function removeColumn(id: number) {
    if (columns.length <= 1) return;
    setColumns((prev) => {
      const next = prev.filter((c) => c !== id);
      localStorage.setItem("columnCount", JSON.stringify(next.length));
      setActiveColIdx((idx) => Math.min(idx, next.length - 1));
      return next;
    });
    setLoadRequests((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  const handleLoadImage = useCallback((colIdx: number, req: LoadRequest) => {
    const targetId = columns[colIdx];
    if (targetId === undefined) return;
    setLoadRequests((prev) => ({ ...prev, [targetId]: req }));
  }, [columns]);

  function clearLoadRequest(id: number) {
    setLoadRequests((prev) => ({ ...prev, [id]: null }));
  }

  const handleUseAsReference = useCallback((colIdx: number, url: string) => {
    const targetId = columns[colIdx];
    if (targetId === undefined) return;
    setReferenceRequests((prev) => ({ ...prev, [targetId]: { url } }));
  }, [columns]);

  function clearReferenceRequest(id: number) {
    setReferenceRequests((prev) => ({ ...prev, [id]: null }));
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        columnCount={columns.length}
        maxColumns={MAX_COLUMNS}
        onAddColumn={addColumn}
        onToggleBrowser={() => setBrowserOpen((v) => !v)}
        browserOpen={browserOpen}
        defaultNumVariants={defaultNumVariants}
        onDefaultNumVariantsChange={setDefaultNumVariants}
      />

      {/* Horizontal scroll container — each column scrolls independently */}
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
        {columns.map((id, i) => (
          <DesignerColumn
            key={id}
            columnNumber={i + 1}
            isActive={i === activeColIdx}
            onActivate={() => setActiveColIdx(i)}
            onRemove={() => removeColumn(id)}
            isOnly={columns.length === 1}
            loadRequest={loadRequests[id] ?? null}
            onLoadHandled={() => clearLoadRequest(id)}
            referenceRequest={referenceRequests[id] ?? null}
            onReferenceHandled={() => clearReferenceRequest(id)}
            defaultNumVariants={defaultNumVariants}
            onPickRequest={() => {
              // Activate this column so the browser sends the picked image to it
              setActiveColIdx(i);
              setBrowserOpen(true);
            }}
          />
        ))}
      </div>

      <ObjectBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        columnCount={columns.length}
        activeColIdx={activeColIdx}
        onLoadImage={handleLoadImage}
        onUseAsReference={handleUseAsReference}
      />
    </div>
  );
}
