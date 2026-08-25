"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Designation, VivaBoardTeacher } from "./types";

const designations: Exclude<Designation, "">[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Assistant Professor & Head",
  "Professor",
];

interface Props {
  teachers: VivaBoardTeacher[];
  setTeachers: (teachers: VivaBoardTeacher[]) => void;
}

export default function VivaBoardTeacherManager({ teachers, setTeachers }: Props) {
  const addTeacher = () => {
    setTeachers([
      ...teachers,
      { name: "", designation: "Assistant Professor", department: "Dept. of BECM, RUET" },
    ]);
  };

  const updateTeacher = (index: number, field: keyof VivaBoardTeacher, value: string) => {
    setTeachers(
      teachers.map((teacher, teacherIndex) =>
        teacherIndex === index ? { ...teacher, [field]: value } : teacher,
      ),
    );
  };

  return (
    <section className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold">Additional Teachers for Board Viva</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add invited teachers needed to complete the Viva Board. They appear only in the Board Viva list.
        </p>
      </div>

      {teachers.map((teacher, index) => (
        <div key={index} className="grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-[1.4fr_1fr_1.4fr_auto] md:items-end">
          <label className="space-y-2 text-sm font-medium">
            <span>Teacher Name</span>
            <Input value={teacher.name} onChange={(event) => updateTeacher(index, "name", event.target.value)} placeholder="Teacher name" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Designation</span>
            <Select value={teacher.designation} onValueChange={(value) => value && updateTeacher(index, "designation", value)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select designation" /></SelectTrigger>
              <SelectContent>
                {designations.map((designation) => <SelectItem key={designation} value={designation}>{designation}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Address</span>
            <Input value={teacher.department} onChange={(event) => updateTeacher(index, "department", event.target.value)} placeholder="Dept. of BECM, RUET" />
          </label>
          <Button type="button" variant="ghost" size="icon" onClick={() => setTeachers(teachers.filter((_, teacherIndex) => teacherIndex !== index))} className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700" aria-label={`Remove additional Viva Board teacher ${index + 1}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button type="button" onClick={addTeacher} className="gap-2">
        <Plus className="h-4 w-4" /> Add Viva Board Teacher
      </Button>
    </section>
  );
}
