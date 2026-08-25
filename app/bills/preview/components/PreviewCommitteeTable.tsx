"use client";
import ColumnWidthEditor from "./ColumnWidthEditor";
import type { CommitteeMember, ColumnWidths } from "../../create/components/types";

interface Props {
  committees: CommitteeMember[];
  widths: ColumnWidths;
  setWidths: (data: ColumnWidths) => void;
}

const labels = {
  sl: "Sl. No.",
  name: "Teacher Name",
  designation: "Designation",
  department: "Department",
  role: "Role",
};

export default function PreviewCommitteeTable({
  committees,
  widths,
  setWidths,
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-xl font-bold">2. Examination Committee</h2>

      <ColumnWidthEditor widths={widths} setWidths={setWidths} labels={labels} />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col style={{ width: `${widths.sl}%` }} />
            <col style={{ width: `${widths.name}%` }} />
            <col style={{ width: `${widths.designation}%` }} />
            <col style={{ width: `${widths.department}%` }} />
            <col style={{ width: `${widths.role}%` }} />
          </colgroup>
          <thead className="bg-slate-100">
            <tr>
              <th className="border px-2 py-2 text-left">Sl.</th>
              <th className="border px-2 py-2 text-left">Teacher Name</th>
              <th className="border px-2 py-2 text-left">Designation</th>
              <th className="border px-2 py-2 text-left">Department</th>
              <th className="border px-2 py-2 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {committees.map((m, i) => (
              <tr key={i}>
                <td className="border px-2 py-1">{i + 1}</td>
                <td className="border px-2 py-1">{m.name || "—"}</td>
                <td className="border px-2 py-1">{m.designation || "—"}</td>
                <td className="border px-2 py-1">{m.department || "—"}</td>
                <td className="border px-2 py-1">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}