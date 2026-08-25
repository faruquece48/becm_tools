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
import type { Designation, CourseAdviser } from "./types";

const designationList: Designation[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

interface Props {
  courseAdvisers: CourseAdviser[];
  setCourseAdvisers: (data: CourseAdviser[]) => void;
  totalStudents: string;
  setTotalStudents: (value: string) => void;
}

export default function CourseAdviserManager({
  courseAdvisers,
  setCourseAdvisers,
  totalStudents,
  setTotalStudents,
}: Props) {
  const advisers = courseAdvisers;
  const setAdvisers = (data: CourseAdviser[]) => {
    setCourseAdvisers(data);
  };

  const addAdviser = () => {
    setAdvisers([
      ...advisers,
      {
        name: "",
        designation: "Assistant Professor",
        department: "Dept. of BECM, RUET",
        students: "",
      },
    ]);
  };

  const removeAdviser = (index: number) => {
    setAdvisers(advisers.filter((_, i) => i !== index));
  };

  const updateTeacher = (index: number, value: string) => {
    const updated = [...advisers];
    updated[index] = { ...updated[index], name: value };
    setAdvisers(updated);
  };

  const updateDesignation = (index: number, value: Designation) => {
    const updated = [...advisers];
    updated[index] = { ...updated[index], designation: value };
    setAdvisers(updated);
  };

  const updateDepartment = (index: number, value: string) => {
    const updated = [...advisers];
    updated[index] = { ...updated[index], department: value };
    setAdvisers(updated);
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-bold">8. List of Course Advisers</h2>
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
        {advisers.map((adviser, index) => (
          <div key={index} className="rounded-lg border bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex w-14 shrink-0 items-center justify-center rounded-md border bg-white px-3 py-2 text-sm font-semibold text-gray-700">
                {String(index + 1).padStart(2, "0")}.
              </span>
              <Input
                placeholder="Teacher Name"
                value={adviser.name}
                onChange={(e) => updateTeacher(index, e.target.value)}
                className="flex-1 min-w-[160px]"
              />
              <Select
                value={adviser.designation}
                onValueChange={(value) =>
                  updateDesignation(index, value as Designation)
                }
              >
                <SelectTrigger className="w-[200px]">
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
                value={adviser.department}
                onChange={(e) => updateDepartment(index, e.target.value)}
                className="flex-1 min-w-[160px]"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeAdviser(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" onClick={addAdviser}>
        <Plus className="mr-2 h-4 w-4" />
        Add Teacher
      </Button>
    </div>
  );
}
