"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  pageBreakAfter?: boolean;
  onPageBreakAfterChange?: (checked: boolean) => void;
  visible?: boolean;
  tableSpacing?: number;
  onTableSpacingChange?: (value: number) => void;
  showMinimizeControls?: boolean;
  onBottomMinimize?: () => void;
}

export default function SectionPanel({
  title,
  defaultOpen = false,
  children,
  pageBreakAfter = false,
  onPageBreakAfterChange,
  visible = true,
  tableSpacing,
  onTableSpacingChange,
  showMinimizeControls = false,
  onBottomMinimize,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (!visible) return null;

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {open ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
            {showMinimizeControls && "Minimize"}
            <ChevronUp className="h-4 w-4" />
          </span>
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {open && (
        <div className="border-t p-4 space-y-4">
          {children}
          {onTableSpacingChange && (
            <label className="block space-y-1 rounded-lg border bg-slate-50 p-3 text-xs text-slate-700">
              <span>Table Spacing (pt)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={tableSpacing ?? 6}
                onChange={(event) => onTableSpacingChange(Number(event.target.value) || 0)}
                className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              />
            </label>
          )}
          {onPageBreakAfterChange && (
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-slate-50 p-3 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={pageBreakAfter}
                onChange={(event) =>
                  onPageBreakAfterChange(event.target.checked)
                }
                className="mt-0.5"
              />
              <span>
                Start this table on a new PDF page
              </span>
            </label>
          )}
          {showMinimizeControls && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onBottomMinimize?.();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <ChevronUp className="h-4 w-4" />
              Minimize this card
            </button>
          )}
        </div>
      )}
    </div>
  );
}
