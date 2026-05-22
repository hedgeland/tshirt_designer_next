"use client";

import { useState } from "react";
import Header from "./components/Header";
import DesignerColumn from "./components/DesignerColumn";

const MAX_COLUMNS = 4;

export default function Home() {
  // Each entry is a unique ID used as the React key — stable across add/remove
  const [columns, setColumns] = useState<number[]>([1]);
  const [nextId, setNextId] = useState(2);

  function addColumn() {
    if (columns.length >= MAX_COLUMNS) return;
    setColumns((prev) => [...prev, nextId]);
    setNextId((id) => id + 1);
  }

  function removeColumn(id: number) {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((c) => c !== id));
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        columnCount={columns.length}
        maxColumns={MAX_COLUMNS}
        onAddColumn={addColumn}
      />

      {/* Horizontal scroll container — each column scrolls independently */}
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
        {columns.map((id, i) => (
          <DesignerColumn
            key={id}
            columnNumber={i + 1}
            onRemove={() => removeColumn(id)}
            isOnly={columns.length === 1}
          />
        ))}
      </div>
    </div>
  );
}
