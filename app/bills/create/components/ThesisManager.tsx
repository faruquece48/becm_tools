"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { BillInfo, Designation, ThesisTeacher } from "./types";

const designationList: Designation[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

interface Props {
  bill: BillInfo;
  sectionNumber: number;
  thesisTeachers: ThesisTeacher[];
  setThesisTeachers: (data: ThesisTeacher[]) => void;
}

export default function ThesisManager({
  bill,
  sectionNumber,
  thesisTeachers,
  setThesisTeachers,
}: Props) {
  const [isMinimized, setIsMinimized] = useState(true);
  const records = thesisTeachers;
  const setRecords = (data: ThesisTeacher[]) => {
    setThesisTeachers(data);
  };

  const addRecord = () => {
    setRecords([
      ...records,
      {
        name: "",
        designation: "Assistant Professor",
        department: "Dept. of BECM, RUET",
        supervisorCount: "",
        examinerCount: "",
        attendsViva: true,
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

  const updateSupervisorCount = (index: number, value: string) => {
    const updated = [...records];
    updated[index] = {
      ...updated[index],
      supervisorCount: value === "" ? "" : Number(value),
    };
    setRecords(updated);
  };

  const updateExaminerCount = (index: number, value: string) => {
    const updated = [...records];
    updated[index] = {
      ...updated[index],
      examinerCount: value === "" ? "" : Number(value),
    };
    setRecords(updated);
  };

  const toggleViva = (index: number) => {
    const updated = [...records];
    updated[index] = {
      ...updated[index],
      attendsViva: !updated[index].attendsViva,
    };
    setRecords(updated);
  };

  const isApplicable = bill.year === "4th Year" && bill.semester === "Even";
  if (!isApplicable) return null;

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">
          {sectionNumber}. List of Teachers Associated with Thesis/Project
          Examination
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized((current) => !current)}
          aria-expanded={!isMinimized}
          aria-label={isMinimized ? "Expand thesis teacher list" : "Minimize thesis teacher list"}
        >
          {isMinimized ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronUp className="mr-2 h-4 w-4" />}
          {isMinimized ? "Expand" : "Minimize"}
        </Button>
      </div>
      {!isMinimized && <>
        <div className="space-y-4">
        {records.map((teacher, index) => (
          <div key={index} className="rounded-lg border bg-slate-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr] gap-4 items-end">
              <div className="flex items-center justify-center rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-700">
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
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  No. of Supervisor Students
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 4"
                  value={teacher.supervisorCount}
                  onChange={(e) =>
                    updateSupervisorCount(index, e.target.value)
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  No. of Thesis Examiner Students
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 9"
                  value={teacher.examinerCount}
                  onChange={(e) =>
                    updateExaminerCount(index, e.target.value)
                  }
                />
              </div>
              <label className="flex items-center gap-2 pb-2">
                <Checkbox
                  checked={teacher.attendsViva}
                  onCheckedChange={() => toggleViva(index)}
                />
                Attends Thesis Viva
              </label>
            </div>
            <div className="mt-3 flex justify-end">
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
      </>}
    </div>
  );
}
