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
import { Trash2, Plus } from "lucide-react";
import type { Designation, QuestionWork as QuestionTeacher } from "./types";

const designationList: Designation[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

interface Props {
  questionWorks: QuestionTeacher[];
  setQuestionWorks: (data: QuestionTeacher[]) => void;
  totalQuestions: string;
  setTotalQuestions: (value: string) => void;
}

export default function QuestionWorkManager({
  questionWorks,
  setQuestionWorks,
  totalQuestions,
  setTotalQuestions,
}: Props) {
  const works = questionWorks;
  const setWorks = (data: QuestionTeacher[]) => {
    setQuestionWorks(data);
  };

  const addTeacher = () => {
    setWorks([
      ...works,
      {
        name: "",
        designation: "Assistant Professor",
        department: "Dept. of BECM, RUET",
      },
    ]);
  };

  const removeTeacher = (index: number) => {
    setWorks(works.filter((_, i) => i !== index));
  };

  const updateTeacherName = (index: number, value: string) => {
    const updated = [...works];
    updated[index] = { ...updated[index], name: value };
    setWorks(updated);
  };

  const updateDesignation = (index: number, value: Designation) => {
    const updated = [...works];
    updated[index] = { ...updated[index], designation: value };
    setWorks(updated);
  };

  const updateDepartment = (index: number, value: string) => {
    const updated = [...works];
    updated[index] = { ...updated[index], department: value };
    setWorks(updated);
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-bold">
        5. List of Teachers Associated with Question Typing, Sketching,
        Comparing & Printing
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1 text-sm font-medium">
          <span>Total Number of Questions</span>
          <Input
            type="number"
            min="0"
            value={totalQuestions}
            onChange={(e) => setTotalQuestions(e.target.value)}
            className="w-48"
          />
        </label>
      </div>
      <div className="space-y-4">
        {works.map((teacher, index) => (
          <div key={index} className="rounded-lg border bg-slate-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 items-center">
              <div className="flex h-10 w-12 items-center justify-center rounded-md border bg-white text-sm font-semibold text-slate-700">
                {String(index + 1).padStart(2, "0")}.
              </div>
              <Input
                placeholder="Teacher Name"
                value={teacher.name}
                onChange={(e) => updateTeacherName(index, e.target.value)}
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
      <Button type="button" onClick={addTeacher}>
        <Plus className="mr-2 h-4 w-4" />
        Add Teacher
      </Button>
    </div>
  );
}
