"use client";
import { Input } from "@/components/ui/input";
import type { ColumnWidths } from "../../create/components/types";

interface Props {
  widths: ColumnWidths;
  setWidths: (data: ColumnWidths) => void;
  labels?: Record<string, string>;
  lockedKeys?: string[];
}

export default function ColumnWidthEditor({
  widths,
  setWidths,
  labels = {},
  lockedKeys = [],
}: Props) {
  const safeWidths = widths ?? ({} as ColumnWidths);
  const keys = Object.keys(safeWidths);

  if (keys.length === 0) {
    return (
      <div className="rounded-lg border bg-slate-50 p-4 text-xs text-gray-500">
        No column-width settings available for this section yet.
      </div>
    );
  }

  const editableKeys = keys.slice(0, -1).filter((key) => !lockedKeys.includes(key));
  const lockedWidth = keys
    .slice(0, -1)
    .filter((key) => lockedKeys.includes(key))
    .reduce((sum, key) => sum + (Number(safeWidths[key]) || 0), 0);
  const lastKey = keys[keys.length - 1];

  const sumEditable = editableKeys.reduce(
    (sum, k) => sum + (Number(safeWidths[k]) || 0),
    0
  );
  const computedLast = 100 - sumEditable - lockedWidth;

  const updateWidth = (key: string, value: string) => {
    const num = value === "" ? 0 : Number(value);
    const nextSum = editableKeys.reduce(
      (sum, k) => sum + (k === key ? num : Number(safeWidths[k]) || 0),
      0
    );
    setWidths({
      ...safeWidths,
      [key]: num,
      [lastKey]: 100 - nextSum - lockedWidth,
    });
  };

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Column Widths (%)</p>
        <span
          className={`text-xs font-semibold ${
            computedLast >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          Total: 100%
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {keys.slice(0, -1).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-xs text-gray-500">
              {labels[key] || key}
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={safeWidths[key]}
              onChange={lockedKeys.includes(key) ? undefined : (e) => updateWidth(key, e.target.value)}
              disabled={lockedKeys.includes(key)}
              className="h-8"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            {labels[lastKey] || lastKey}{" "}
            <span className="text-gray-400">(auto)</span>
          </label>
          <Input
            type="number"
            value={computedLast}
            disabled
            className={`h-8 bg-gray-100 ${
              computedLast < 0 ? "text-red-600 font-semibold" : ""
            }`}
          />
        </div>
      </div>
      {computedLast < 0 && (
        <p className="mt-2 text-xs text-red-600">
          Other columns exceed 100% — reduce one of them.
        </p>
      )}
    </div>
  );
}
