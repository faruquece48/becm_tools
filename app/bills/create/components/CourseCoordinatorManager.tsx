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
import type { Designation, CourseCoordinatorTeacher } from "./types";

const designationList: Designation[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

interface Props {
  sectionNumber: number;
  courseCoordinatorTeachers: CourseCoordinatorTeacher[];
  setCourseCoordinatorTeachers: (data: CourseCoordinatorTeacher[]) => void;
}

export default function CourseCoordinatorManager({
  sectionNumber,
  courseCoordinatorTeachers,
  setCourseCoordinatorTeachers,
}: Props) {
  const teachers = courseCoordinatorTeachers ?? [];
  const setTeachers = (data: CourseCoordinatorTeacher[]) => {
    setCourseCoordinatorTeachers(data);
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
      <h2 className="text-xl font-bold">
        {sectionNumber}. List of Teachers Associated with Course Coordinator
      </h2>

      <Button type="button" onClick={addTeacher}>
        <Plus className="mr-2 h-4 w-4" />
        Add Teacher
      </Button>

      <div className="space-y-4">
        {teachers.map((teacher, index) => (
          <div key={index} className="rounded-lg border bg-slate-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 items-end">
              <div className="flex items-center justify-center rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-700 md:mb-0">
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
                onClick={() => removeTeacher(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
