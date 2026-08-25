"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { Designation, StudentDuty } from "./types";

const designationList: Designation[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

interface Props {
  title?: string;
  studentDuties: StudentDuty[];
  setStudentDuties: (data: StudentDuty[]) => void;
  totalStudents: string;
  setTotalStudents: (value: string) => void;
}

export default function StudentDutyManager({
  title = "7. List of Teachers Associated with Tabulation",
  studentDuties,
  setStudentDuties,
  totalStudents,
  setTotalStudents,
}: Props) {
  const records = studentDuties;
  const setRecords = (data: StudentDuty[]) => {
    setStudentDuties(data);
  };

  const addRecord = () => {
    setRecords([
      ...records,
      {
        name: "",
        designation: "Assistant Professor",
        department: "Dept. of BECM, RUET",
        students: "",
      },
    ]);
  };

  const removeRecord = (index: number) => {
    setRecords(records.filter((_, i) => i !== index));
  };

  const updateTeacher = (index: number, value: string) => {
    const updated = [...records];
    updated[index] = { ...updated[index], name: value };
    setRecords(updated);
  };

  const updateDesignation = (index: number, value: Designation) => {
    const updated = [...records];
    updated[index] = { ...updated[index], designation: value };
    setRecords(updated);
  };

  const updateDepartment = (index: number, value: string) => {
    const updated = [...records];
    updated[index] = { ...updated[index], department: value };
    setRecords(updated);
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1 text-sm font-medium">
          <span>Total Number of Students</span>
          <Input
            type="number"
            min="0"
            value={totalStudents}
            onChange={(e) => setTotalStudents(e.target.value)}
            className="w-48"
          />
        </label>
      </div>
      <div className="space-y-4">
        {records.map((teacher, index) => (
          <div key={index} className="rounded-lg border bg-slate-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 items-center">
              <div className="flex h-10 w-12 items-center justify-center rounded-md border bg-white text-sm font-semibold text-slate-700">
                {String(index + 1).padStart(2, "0")}.
              </div>
              <Input
                placeholder="Teacher Name"
                value={teacher.name}
                onChange={(e) => updateTeacher(index, e.target.value)}
              />
              <Select
                value={teacher.designation}
                onValueChange={(value) =>
                  updateDesignation(index, value as Designation)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {designationList.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Department"
                value={teacher.department}
                onChange={(e) => updateDepartment(index, e.target.value)}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeRecord(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" onClick={addRecord}>
        <Plus className="mr-2 h-4 w-4" />
        Add Teacher
      </Button>
    </div>
  );
}
