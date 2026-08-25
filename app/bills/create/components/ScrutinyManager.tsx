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
import type { Designation, ScrutinyTeacher } from "./types";

const designationList: Designation[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

interface Props {
  evaluationSystem: "obe" | "mixed";
  defaultStudentCount: string;
  scrutinies: { obe: ScrutinyTeacher[]; nonObe: ScrutinyTeacher[] };
  setScrutinies: (data: {
    obe: ScrutinyTeacher[];
    nonObe: ScrutinyTeacher[];
  }) => void;
}

export default function ScrutinyManager({
  evaluationSystem,
  defaultStudentCount,
  scrutinies,
  setScrutinies,
}: Props) {
  const getList = (type: "obe" | "nonObe") => {
    return scrutinies[type];
  };
  const setList = (type: "obe" | "nonObe", value: ScrutinyTeacher[]) => {
    setScrutinies({
      ...scrutinies,
      [type]: value,
    });
  };

  const addRecord = (type: "obe" | "nonObe") => {
    setList(type, [
      ...getList(type),
      {
        name: "",
        designation: "Assistant Professor",
        department: "Dept. of BECM, RUET",
        scriptCount: type === "obe" ? (Number(defaultStudentCount) || 0) * 5 : "",
      },
    ]);
  };

  const removeRecord = (type: "obe" | "nonObe", index: number) => {
    setList(
      type,
      getList(type).filter((_, i) => i !== index)
    );
  };

  const updateTeacherName = (
    type: "obe" | "nonObe",
    index: number,
    value: string
  ) => {
    const updated = [...getList(type)];
    updated[index] = { ...updated[index], name: value };
    setList(type, updated);
  };

  const updateDesignation = (
    type: "obe" | "nonObe",
    index: number,
    value: Designation
  ) => {
    const updated = [...getList(type)];
    updated[index] = { ...updated[index], designation: value };
    setList(type, updated);
  };

  const updateDepartment = (
    type: "obe" | "nonObe",
    index: number,
    value: string
  ) => {
    const updated = [...getList(type)];
    updated[index] = { ...updated[index], department: value };
    setList(type, updated);
  };

  const updateScriptCount = (
    type: "obe" | "nonObe",
    index: number,
    value: string
  ) => {
    const updated = [...getList(type)];
    updated[index] = {
      ...updated[index],
      scriptCount: value === "" ? "" : Number(value),
    };
    setList(type, updated);
  };

  const renderTeachers = (type: "obe" | "nonObe") => {
    const records = getList(type);
    return (
      <>
        <div className="space-y-4">
          {records.map((teacher, index) => (
            <div key={index} className="rounded-lg border bg-slate-50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <Input
                  placeholder="Teacher Name"
                  value={teacher.name}
                  onChange={(e) =>
                    updateTeacherName(type, index, e.target.value)
                  }
                />
                <Select
                  value={teacher.designation}
                  onValueChange={(value) =>
                    updateDesignation(type, index, value as Designation)
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
                  onChange={(e) =>
                    updateDepartment(type, index, e.target.value)
                  }
                />
                <Input
                  type="number"
                  placeholder={type === "obe" ? "e.g. 150" : "No. of Scripts"}
                  value={teacher.scriptCount}
                  onChange={(e) =>
                    updateScriptCount(type, index, e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeRecord(type, index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" onClick={() => addRecord(type)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </>
    );
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-bold">
        6. List of Teachers Associated with Scrutiny
      </h2>
      {evaluationSystem === "obe" ? (
        renderTeachers("obe")
      ) : (
        <div className="space-y-8">
          <div className="rounded-lg border p-5 space-y-6">
            <h3 className="text-lg font-bold">6.1 OBE (New Syllabus)</h3>
            {renderTeachers("obe")}
          </div>
          <div className="rounded-lg border p-5 space-y-6">
            <h3 className="text-lg font-bold">6.2 Non OBE (Old Syllabus)</h3>
            {renderTeachers("nonObe")}
          </div>
        </div>
      )}
    </div>
  );
}
