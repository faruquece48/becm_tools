"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Designation, VerificationTeacher } from "./types";

const designations: Exclude<Designation, "">[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

interface Props {
  sectionNumber: number;
  teachers: VerificationTeacher[];
  setTeachers: (teachers: VerificationTeacher[]) => void;
  totalStudents: string;
  setTotalStudents: (value: string) => void;
}

export default function PracticalSurveyingManager({
  sectionNumber,
  teachers,
  setTeachers,
  totalStudents,
  setTotalStudents,
}: Props) {
  const [isMinimized, setIsMinimized] = useState(true);

  const update = (
    index: number,
    field: keyof VerificationTeacher,
    value: string
  ) => {
    const next = [...teachers];
    next[index] = { ...next[index], [field]: value };
    setTeachers(next);
  };

  return (
    <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">
          {sectionNumber}. List of Teachers Associated with Practical Surveying
          (CE 1226)
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
                value={totalStudents}
                onChange={(event) => setTotalStudents(event.target.value)}
                className="w-48"
              />
            </label>
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
                  onChange={(event) => update(index, "name", event.target.value)}
                />
                <Select
                  value={teacher.designation}
                  onValueChange={(value) =>
                    value !== null && update(index, "designation", value)
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Designation" /></SelectTrigger>
                  <SelectContent>
                    {designations.map((designation) => (
                      <SelectItem key={designation} value={designation}>
                        {designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Department"
                  value={teacher.department}
                  onChange={(event) => update(index, "department", event.target.value)}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => setTeachers(teachers.filter((_, i) => i !== index))}
                  aria-label={`Delete teacher ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={() =>
              setTeachers([
                ...teachers,
                {
                  name: "",
                  designation: "",
                  department: "Dept. of BECM, RUET",
                },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Add Teacher
          </Button>
        </>
      )}
    </div>
  );
}
