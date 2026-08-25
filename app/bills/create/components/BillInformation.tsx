"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillInfo } from "./types";

interface Props {
  bill: BillInfo;
  setBill: React.Dispatch<React.SetStateAction<BillInfo>>;
  onTotalStudentsChange: (value: string) => void;
}

const examinationLabels: Record<string, string> = {
  "B.Sc. Engineering": "B.Sc. Engineering",
  "M.Sc. Engineering": "M.Sc. Engineering",
  PhD: "PhD",
};

const examTypeLabels: Record<string, string> = {
  semester: "Semester Examination",
  backlog: "Backlog Examination",
  short: "Short Semester",
};

const yearLabels: Record<string, string> = {
  "1st Year": "1st Year",
  "2nd Year": "2nd Year",
  "3rd Year": "3rd Year",
  "4th Year": "4th Year",
};

const semesterLabels: Record<string, string> = {
  Odd: "Odd Semester",
  Even: "Even Semester",
};

const evaluationSystemLabels: Record<string, string> = {
  obe: "OBE (New Syllabus)",
  mixed: "Mixed (OBE + Non OBE)",
};

const graduatingLabels: Record<string, string> = {
  yes: "Yes",
  no: "No",
};

export default function BillInformation({ bill, setBill, onTotalStudentsChange }: Props) {
  const updateField = (field: keyof BillInfo, value: string) => {
    setBill((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const heading =
    bill.examType === "semester"
      ? `${bill.examination || "B.Sc. Engineering"} ${bill.year || ""} ${
          bill.semester || ""
        } Semester Examination ${bill.examYear || "2024"} (${
          bill.series || "2023"
        } Series)`
      : bill.examType === "short"
      ? `${bill.examination || "B.Sc. Engineering"} ${bill.year || ""} Short Semester ${bill.examYear || "2024"} (${bill.series || "2023"} Series)`
      : `${bill.examination || "B.Sc. Engineering"} ${
          bill.year || ""
        } Backlog Examination ${bill.examYear || "2024"} (${
          bill.series || "2023"
        } Series)`;

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-5">
      <h2 className="text-xl font-bold">1. Examination Information</h2>

      <div className="rounded-lg bg-slate-100 p-4">
        <p className="text-sm text-gray-500 mb-1">
          Generated Examination Title
        </p>
        <p className="font-semibold text-lg">{heading}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="mb-3 block text-sm font-medium">Bill No.</label>
          <Input
            placeholder="Example: 01"
            value={bill.billNo}
            onChange={(e) => updateField("billNo", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium">
            Examination
          </label>
          <Select
            value={bill.examination}
            onValueChange={(value) => value !== null && updateField("examination", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Examination">
                {examinationLabels[bill.examination] || "Select Examination"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="B.Sc. Engineering">
                B.Sc. Engineering
              </SelectItem>
              <SelectItem value="M.Sc. Engineering">
                M.Sc. Engineering
              </SelectItem>
              <SelectItem value="PhD">PhD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium">
            Examination Type
          </label>
          <Select
            value={bill.examType}
            onValueChange={(value) =>
              updateField("examType", value as BillInfo["examType"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Type">
                {examTypeLabels[bill.examType] || "Select Type"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semester">Semester Examination</SelectItem>
              <SelectItem value="backlog">Backlog Examination</SelectItem>
              <SelectItem value="short">Short Semester</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="mb-3 block text-sm font-medium">
            Academic Year
          </label>
          <Select
            value={bill.year}
            onValueChange={(value) => value !== null && updateField("year", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Year">
                {yearLabels[bill.year] || "Select Year"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1st Year">1st Year</SelectItem>
              <SelectItem value="2nd Year">2nd Year</SelectItem>
              <SelectItem value="3rd Year">3rd Year</SelectItem>
              <SelectItem value="4th Year">4th Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium">
            {bill.examType === "semester" ? "Semester" : ""}
          </label>
          {bill.examType === "semester" && (
            <Select
              value={bill.semester}
              onValueChange={(value) => value !== null && updateField("semester", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Semester">
                  {semesterLabels[bill.semester] || "Select Semester"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Odd">Odd Semester</SelectItem>
                <SelectItem value="Even">Even Semester</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium">
            Evaluation System
          </label>
          <Select
            value={bill.evaluationSystem}
            onValueChange={(value) =>
              updateField("evaluationSystem", value as "obe" | "mixed")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Evaluation System">
                {evaluationSystemLabels[bill.evaluationSystem] ||
                  "Select Evaluation System"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="obe">OBE (New Syllabus)</SelectItem>
              <SelectItem value="mixed">Mixed (OBE + Non OBE)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.1fr_0.7fr_1fr_1.3fr]">
        <div>
          <label className="mb-3 block text-sm font-medium">
            Examination Year
          </label>
          <Input
            placeholder="2024"
            value={bill.examYear}
            onChange={(e) => updateField("examYear", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium">Series</label>
          <Input
            placeholder="2023"
            value={bill.series}
            onChange={(e) => updateField("series", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium">
            No. of Students
          </label>
          <Input
            type="number"
            min="0"
            placeholder="30"
            value={bill.totalStudents}
            onChange={(e) => onTotalStudentsChange(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium">
            Graduating Students?
          </label>
          <Select
            value={bill.hasGraduatingStudents}
            onValueChange={(value) =>
              updateField("hasGraduatingStudents", value as "yes" | "no")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Yes or No">
                {graduatingLabels[bill.hasGraduatingStudents] ||
                  "Select Yes or No"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
