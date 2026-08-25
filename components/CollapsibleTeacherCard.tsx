"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Trash2 } from "lucide-react";

type Props = {
  name: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete?: () => void;
  children: ReactNode;
};

export default function CollapsibleTeacherCard({ name, index, isFirst, isLast, onMoveUp, onMoveDown, onDelete, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const label = name.trim() || `Teacher ${index + 1}`;

  return <div className="rounded-lg border bg-slate-50 p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-xs font-semibold text-slate-700">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onMoveUp} disabled={isFirst} className="rounded p-1 text-slate-500 hover:bg-indigo-50 disabled:opacity-30" aria-label={`Move ${label} up`}><ArrowUp className="h-4 w-4" /></button>
        <button type="button" onClick={onMoveDown} disabled={isLast} className="rounded p-1 text-slate-500 hover:bg-indigo-50 disabled:opacity-30" aria-label={`Move ${label} down`}><ArrowDown className="h-4 w-4" /></button>
        <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded p-1 text-indigo-600 hover:bg-indigo-50" aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
      </div>
    </div>
    {expanded && <div className="mt-2 border-t pt-2">
      {children}
      {onDelete && <div className="mt-3 flex justify-end"><button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Remove</button></div>}
    </div>}
  </div>;
}
