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
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Designation, VerificationTeacher } from "./types";

const designationList: Designation[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

interface Props {
  sectionNumber: number;
  studentCount: string;
  setStudentCount: (value: string) => void;
  verificationTeachers: VerificationTeacher[];
  setVerificationTeachers: (data: VerificationTeacher[]) => void;
}

export default function VerificationManager({
  sectionNumber,
  studentCount,
  setStudentCount,
  verificationTeachers,
  setVerificationTeachers,
}: Props) {
  const [isMinimized, setIsMinimized] = useState(true);
  const teachers = verificationTeachers;
  const setTeachers = (data: VerificationTeacher[]) => {
    setVerificationTeachers(data);
  };

  const addTeacher = () => {
    setTeachers([
      ...teachers,
      {
        name: "",
        designation: "Assistant Professor",
        department: "Dept. of BECM, RUET",
      },
    ]);
  };

  const removeTeacher = (index: number) => {
    setTeachers(teachers.filter((_, i) => i !== index));
  };

  const updateTeacher = (index: number, value: string) => {
    const updated = [...teachers];
    updated[index] = { ...updated[index], name: value };
    setTeachers(updated);
  };

  const updateDesignation = (index: number, value: Designation) => {
    const updated = [...teachers];
    updated[index] = { ...updated[index], designation: value };
    setTeachers(updated);
  };

  const updateDepartment = (index: number, value: string) => {
    const updated = [...teachers];
    updated[index] = { ...updated[index], department: value };
    setTeachers(updated);
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">
          {sectionNumber}. List of Teachers Associated with Verification of
          Final Result
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized((current) => !current)}
          aria-expanded={!isMinimized}
          aria-label={isMinimized ? "Expand teacher list" : "Minimize teacher list"}
        >
          {isMinimized ? (
            <ChevronDown className="mr-2 h-4 w-4" />
          ) : (
            <ChevronUp className="mr-2 h-4 w-4" />
          )}
          {isMinimized ? "Expand" : "Minimize"}
        </Button>
      </div>
      {!isMinimized && (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <label className="space-y-1 text-sm font-medium">
              <span>Total Number of Students</span>
              <Input
                type="number"
                min="0"
                className="w-48"
                placeholder="e.g. 30"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
              />
            </label>
            <Button type="button" onClick={addTeacher}>
              <Plus className="mr-2 h-4 w-4" />
              Add Teacher
            </Button>
          </div>
          <div className="space-y-3">
            {teachers.map((teacher, index) => (
              <div
                key={index}
                className="grid grid-cols-1 items-center gap-3 rounded-lg border bg-slate-50 p-4 md:grid-cols-[auto_1fr_200px_1fr_auto]"
              >
                <span className="text-sm font-semibold">{index + 1}.</span>
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
                  onClick={() => removeTeacher(index)}
                  aria-label={`Delete teacher ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
