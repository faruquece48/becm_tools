"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment } from "react";
import type { ColumnWidths } from "../../create/components/types";
import { formatPaddedTableValue, type CourseGroup } from "../../create/components/pdf/pdfHelpers";

export interface GroupedColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
}

export interface GroupMergeColumn<T> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  value: (group: CourseGroup<T>) => React.ReactNode;
}

interface Props<T> {
  entryColumns: GroupedColumn[];
  groups: CourseGroup<T>[];
  widths: ColumnWidths; // keys: "course" + entryColumns[].key + groupMergeColumn?.key
  groupMergeColumn?: GroupMergeColumn<T>;
  groupedEntryKeys?: string[];
}

export default function GroupedCourseTable<T extends Record<string, any>>({
  entryColumns,
  groups,
  widths,
  groupMergeColumn,
  groupedEntryKeys = [],
}: Props<T>) {
  const alignClass = (a?: string) =>
    a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col style={{ width: `${widths.course ?? 0}%` }} />
          {entryColumns.map((c) => (
            <col key={c.key} style={{ width: `${widths[c.key] ?? 0}%` }} />
          ))}
          {groupMergeColumn && (
            <col style={{ width: `${widths[groupMergeColumn.key] ?? 0}%` }} />
          )}
        </colgroup>
        <thead>
          <tr>
            <th className="border border-gray-400 px-2 py-1.5 text-left font-normal">
              Course No. &amp; Title
            </th>
            {entryColumns.map((c) => (
              <th
                key={c.key}
                className={`border border-gray-400 px-2 py-1.5 font-normal ${alignClass(c.align)}`}
              >
                {c.label}
              </th>
            ))}
            {groupMergeColumn && (
              <th
                className={`border border-gray-400 px-2 py-1.5 font-normal ${alignClass(
                  groupMergeColumn.align
                )}`}
              >
                {groupMergeColumn.label}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => (
            <Fragment key={gi}>
              {group.entries.map((entry, ei) => (
                <tr key={ei}>
                  {ei === 0 && (
                    <td
                      rowSpan={group.entries.length}
                      className="border border-gray-400 px-2 py-1 align-middle"
                    >
                      <div>{formatCell(group.courseCode)}</div>
                      <div>{formatCell(group.courseTitle)}</div>
                    </td>
                  )}
                  {entryColumns.map((c) =>
                    groupedEntryKeys.includes(c.key) ? (
                      ei === 0 && (
                        <td key={c.key} rowSpan={group.entries.length} className={`border border-gray-400 px-2 py-1 align-middle ${alignClass(c.align)}`}>
                          {formatCell((entry as any)[c.key])}
                        </td>
                      )
                    ) : (
                      <td key={c.key} className={`border border-gray-400 px-2 py-1 align-top ${alignClass(c.align)}`}>
                        {formatCell((entry as any)[c.key])}
                      </td>
                    )
                  )}
                  {ei === 0 && groupMergeColumn && (
                    <td
                      rowSpan={group.entries.length}
                      className={`border border-gray-400 px-2 py-1 align-middle ${alignClass(
                        groupMergeColumn.align
                      )}`}
                    >
                      {formatCell(groupMergeColumn.value(group))}
                    </td>
                  )}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: any): React.ReactNode {
  if (value === true) return "Yes";
  if (
    value === false ||
    value === 0 ||
    value === "0" ||
    (typeof value === "string" && value.trim() === "") ||
    value === undefined ||
    value === null
  )
    return "-";
  return formatPaddedTableValue(value);
}
