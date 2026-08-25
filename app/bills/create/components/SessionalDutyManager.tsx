"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Designation,
  SessionalCourse,
  SessionalDutyOption,
  StudentCount,
} from "./types";

const designationList: Designation[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

const defaultDuty: SessionalDutyOption = {
  courseFile: true,
  sessional: true,
  boardViva: true,
};

const label = (s: string) => s.replace(/([A-Z])/g, " $1");
const summaryValue = (value: string) =>
  value.trim() === "" || Number(value) === 0 ? "-" : value;

interface Props {
  examType: "semester" | "backlog" | "short";
  evaluationSystem: "obe" | "mixed";
  setEvaluationSystem: (value: "obe" | "mixed") => void;
  defaultStudentCount: string;
  sessionalDuties: SessionalCourse[];
  setSessionalDuties: (data: SessionalCourse[]) => void;
}

export default function SessionalDutyManager({
  examType,
  evaluationSystem,
  setEvaluationSystem,
  defaultStudentCount,
  sessionalDuties,
  setSessionalDuties,
}: Props) {
  const isShortSemester = examType === "short";
  const [minimizedCourses, setMinimizedCourses] = useState<Set<number>>(
    () => new Set(sessionalDuties.map((_, index) => index))
  );
  const initializedMinimized = useRef(sessionalDuties.length > 0);

  useEffect(() => {
    if (initializedMinimized.current || sessionalDuties.length === 0) return;
    initializedMinimized.current = true;
    setMinimizedCourses(new Set(sessionalDuties.map((_, index) => index)));
  }, [sessionalDuties]);

  const toggleCourseMinimized = (index: number) => {
    setMinimizedCourses((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const courses = sessionalDuties;
  const setCourses = (data: SessionalCourse[]) => {
    setSessionalDuties(data);
  };

  const addCourse = (syllabus: "obe" | "nonObe" = "obe") => {
    const newIndex = courses.length;
    const studentCount = Number(defaultStudentCount) || 0;
    setCourses([
      ...courses,
      {
        syllabus,
        courseCode: "",
        courseTitle: "",
        credit: "1.5",
        teacher: "",
        designation: "Assistant Professor",
        department: "Dept. of BECM, RUET",
        duties: { ...defaultDuty, courseFile: syllabus === "obe" && !isShortSemester },
        students: {
          courseFile: studentCount,
          sessional: studentCount,
          boardViva: studentCount,
        },
        additionalTeachers: [],
        teacherCount: 1,
      },
    ]);
    setMinimizedCourses((current) => new Set(current).add(newIndex));
  };

  const deleteCourse = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
    setMinimizedCourses(new Set());
  };

  const updateCourse = (
    index: number,
    field: keyof SessionalCourse,
    value: any
  ) => {
    const updated = [...courses];
    (updated[index] as any)[field] = value;
    setCourses(updated);
  };

  const updateStudent = (
    courseIndex: number,
    duty: keyof StudentCount,
    value: string
  ) => {
    const updated = [...courses];
    updated[courseIndex].students[duty] = value === "" ? "" : Number(value);
    if (updated[courseIndex].teacherCount === 2 && updated[courseIndex].additionalTeachers[0]) {
      updated[courseIndex].additionalTeachers[0].students[duty] =
        value === "" ? "" : Number(value);
    }
    setCourses(updated);
  };

  const toggleDuty = (
    courseIndex: number,
    field: keyof SessionalDutyOption
  ) => {
    const updated = [...courses];
    const current = updated[courseIndex];
    if (current.teacherCount === 2 && field === "boardViva" && current.additionalTeachers[0]) {
      const boardVivaEnabled =
        current.duties.boardViva || current.additionalTeachers[0].duties.boardViva;
      current.duties.boardViva = !boardVivaEnabled;
      current.additionalTeachers[0].duties.boardViva = false;
      current.additionalTeachers[0].students.boardViva = "";
      setCourses(updated);
      return;
    }
    current.duties[field] = !current.duties[field];
    if (current.teacherCount === 2 && current.additionalTeachers[0]) {
      current.additionalTeachers[0].duties[field] = current.duties[field];
      current.additionalTeachers[0].students[field] = current.duties[field]
        ? current.students[field]
        : "";
      setCourses(updated);
      return;
    }
    const remainingDuty: SessionalDutyOption = {
      courseFile: false,
      sessional: false,
      boardViva: false,
    };
    const remainingStudent: StudentCount = {
      courseFile: "",
      sessional: "",
      boardViva: "",
    };
    (Object.keys(current.duties) as (keyof SessionalDutyOption)[]).forEach(
      (key) => {
        if ((current.syllabus ?? "obe") === "nonObe" && key === "courseFile") return;
        if (!current.duties[key]) {
          remainingDuty[key] = true;
          remainingStudent[key] = current.students[key];
        }
      }
    );
    if (Object.values(remainingDuty).some(Boolean)) {
      current.additionalTeachers = [
        {
          name: "",
          designation: "Assistant Professor",
          department: "Dept. of BECM, RUET",
          duties: remainingDuty,
          students: remainingStudent,
        },
      ];
    } else {
      current.additionalTeachers = [];
    }
    setCourses(updated);
  };

  const updateAdditionalTeacher = (
    courseIndex: number,
    field: "name" | "designation" | "department",
    value: string
  ) => {
    const updated = [...courses];
    if (!updated[courseIndex].additionalTeachers.length) return;
    if (field === "name") {
      updated[courseIndex].additionalTeachers[0].name = value;
    } else if (field === "designation") {
      updated[courseIndex].additionalTeachers[0].designation =
        value as Designation;
    } else {
      updated[courseIndex].additionalTeachers[0].department = value;
    }
    setCourses(updated);
  };

  const updateAdditionalStudent = (
    courseIndex: number,
    duty: keyof StudentCount,
    value: string
  ) => {
    const updated = [...courses];
    if (!updated[courseIndex].additionalTeachers.length) return;
    updated[courseIndex].additionalTeachers[0].students[duty] =
      value === "" ? "" : Number(value);
    setCourses(updated);
  };

  const setTeacherCount = (courseIndex: number, count: 1 | 2) => {
    const updated = [...courses];
    const course = updated[courseIndex];
    course.teacherCount = count;
    if (count === 1) {
      course.additionalTeachers = [];
    } else {
      const boardVivaEnabled =
        course.duties.boardViva || course.additionalTeachers[0]?.duties.boardViva;
      course.additionalTeachers = [
        {
          name: course.additionalTeachers[0]?.name ?? "",
          designation: course.additionalTeachers[0]?.designation || "Assistant Professor",
          department: course.additionalTeachers[0]?.department || "Dept. of BECM, RUET",
          duties: { ...course.duties, boardViva: false },
          students: { ...course.students, boardViva: "" },
        },
      ];
      course.duties.boardViva = Boolean(boardVivaEnabled);
    }
    setCourses(updated);
  };

  const setBoardVivaTeacher = (courseIndex: number, teacherNumber: 1 | 2) => {
    const updated = [...courses];
    const course = updated[courseIndex];
    const secondTeacher = course.additionalTeachers[0];
    if (!secondTeacher) return;
    const studentCount = course.students.boardViva || Number(defaultStudentCount) || "";
    course.duties.boardViva = teacherNumber === 1;
    secondTeacher.duties.boardViva = teacherNumber === 2;
    course.students.boardViva = studentCount;
    secondTeacher.students.boardViva = teacherNumber === 2 ? studentCount : "";
    setCourses(updated);
  };

  const addIndustrialAttachmentTeacher = (courseIndex: number) => {
    const updated = [...courses];
    const studentCount = Number(defaultStudentCount) || 0;
    updated[courseIndex].additionalTeachers.push({
      name: "",
      designation: "Assistant Professor",
      department: "Dept. of BECM, RUET",
      duties: { courseFile: false, sessional: true, boardViva: false },
      students: {
        courseFile: studentCount,
        sessional: studentCount,
        boardViva: studentCount,
      },
    });
    setCourses(updated);
  };

  const updateIndustrialAttachmentTeacher = (
    courseIndex: number,
    teacherIndex: number,
    field: "name" | "designation" | "department",
    value: string
  ) => {
    const updated = [...courses];
    const teacher = updated[courseIndex].additionalTeachers[teacherIndex];
    if (!teacher) return;
    if (field === "designation") teacher.designation = value as Designation;
    else teacher[field] = value;
    setCourses(updated);
  };

  const removeIndustrialAttachmentTeacher = (
    courseIndex: number,
    teacherIndex: number
  ) => {
    const updated = [...courses];
    updated[courseIndex].additionalTeachers.splice(teacherIndex, 1);
    setCourses(updated);
  };

  const renderCourses = (syllabus: "obe" | "nonObe") => {
    const courseIndexes = courses
      .map((course, index) => ({ course, index }))
      .filter(({ course }) => (course.syllabus ?? "obe") === syllabus);

    return (
      <div className="space-y-5">
      {courseIndexes.map(({ course, index: cIndex }, displayIndex) => {
        const minimized = minimizedCourses.has(cIndex);
        const isIndustrialAttachment =
          course.courseCode.replace(/\s+/g, "").toUpperCase() === "BECM4100";
        return (
        <div
          key={cIndex}
          className="rounded-xl border bg-slate-50 p-5 space-y-5"
        >
          {/* Serial Number */}
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center rounded-md border bg-white px-3 py-1 text-sm font-semibold text-gray-700">
              {String(displayIndex + 1).padStart(2, "0")}.
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold text-gray-700">
              <span className="mr-3 inline-block">
                {summaryValue(course.courseCode)}
              </span>
              <span className="font-medium text-gray-500">
                {summaryValue(course.courseTitle)}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => toggleCourseMinimized(cIndex)}
              aria-label={minimized ? "Expand course details" : "Minimize course details"}
              title={minimized ? "Expand course details" : "Minimize course details"}
            >
              {minimized ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => deleteCourse(cIndex)}
              className="rounded-md bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700"
              aria-label="Delete sessional course"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {!minimized && (
            <>
          {/* Course Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Course Code"
              value={course.courseCode}
              onChange={(e) =>
                updateCourse(cIndex, "courseCode", e.target.value)
              }
            />
            <Input
              placeholder="Course Title"
              value={course.courseTitle}
              onChange={(e) =>
                updateCourse(cIndex, "courseTitle", e.target.value)
              }
            />
            <label className="space-y-1 text-sm font-medium">
              <span>Credit</span>
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 1.5"
                aria-label="Sessional course credit"
                value={course.credit}
                onChange={(e) =>
                  updateCourse(cIndex, "credit", e.target.value)
                }
              />
            </label>
          </div>
          {/* Teacher Information */}
          {!isIndustrialAttachment && (
          <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-700">Teacher 1</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Teacher Name"
              value={course.teacher}
              onChange={(e) =>
                updateCourse(cIndex, "teacher", e.target.value)
              }
            />
            <Select
              value={course.designation}
              onValueChange={(value) =>
                updateCourse(cIndex, "designation", value)
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
              value={course.department}
              onChange={(e) =>
                updateCourse(cIndex, "department", e.target.value)
              }
            />
          </div>
          <label className="block max-w-xs space-y-1 text-sm font-medium">
            <span>Number of teachers engaged</span>
            <Select
              value={String(course.teacherCount ?? (course.additionalTeachers.length > 0 ? 2 : 1))}
              onValueChange={(value) => value && setTeacherCount(cIndex, value === "2" ? 2 : 1)}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 teacher</SelectItem>
                <SelectItem value="2">2 teachers</SelectItem>
              </SelectContent>
            </Select>
          </label>
          </div>
          )}
          {/* Duty Selection with inline student count */}
          <div>
            <h4 className="text-sm font-medium mb-2">Duty Selection</h4>
            <div className="grid md:grid-cols-3 gap-3">
              {(Object.keys(course.duties) as (keyof SessionalDutyOption)[])
                .filter((duty) => !isShortSemester || duty !== "courseFile")
                .filter((duty) => syllabus === "obe" || duty !== "courseFile")
                .map(
                (duty) => {
                  const checked =
                    course.duties[duty] ||
                    (duty === "boardViva" &&
                      course.teacherCount === 2 &&
                      Boolean(course.additionalTeachers[0]?.duties.boardViva));
                  return (
                    <div key={duty} className="flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleDuty(cIndex, duty)}
                      />
                      <span className="w-24 shrink-0 text-sm">
                        {label(duty)}
                      </span>
                      {checked && (
                        <Input
                          type="number"
                          placeholder="e.g. 30"
                          value={course.students[duty]}
                          onChange={(e) =>
                            updateStudent(cIndex, duty, e.target.value)
                          }
                          className="h-8"
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
          {!isIndustrialAttachment &&
            course.teacherCount === 2 &&
            course.additionalTeachers[0] &&
            (course.duties.boardViva || course.additionalTeachers[0].duties.boardViva) && (
              <label className="block max-w-xs space-y-1 text-sm font-medium">
                <span>Board Viva taken by</span>
                <Select
                  value={course.additionalTeachers[0].duties.boardViva ? "2" : "1"}
                  onValueChange={(value) => value && setBoardVivaTeacher(cIndex, value === "2" ? 2 : 1)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Teacher 1</SelectItem>
                    <SelectItem value="2">Teacher 2</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            )}
          {isIndustrialAttachment && (
            <div className="rounded-lg border bg-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-lg">BECM 4100 Engaged Teachers</h4>
                  <p className="text-xs text-slate-500">The sessional student total is divided equally among all named teachers.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => addIndustrialAttachmentTeacher(cIndex)}>
                  Add Teacher
                </Button>
              </div>
              {course.additionalTeachers.map((teacher, teacherIndex) => (
                <div key={teacherIndex} className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <Input
                    placeholder="Teacher Name"
                    value={teacher.name}
                    onChange={(event) => updateIndustrialAttachmentTeacher(cIndex, teacherIndex, "name", event.target.value)}
                  />
                  <Select
                    value={teacher.designation}
                    onValueChange={(value) => value !== null && updateIndustrialAttachmentTeacher(cIndex, teacherIndex, "designation", value)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {designationList.map((designation) => (
                        <SelectItem key={designation} value={designation}>{designation}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Department"
                    value={teacher.department}
                    onChange={(event) => updateIndustrialAttachmentTeacher(cIndex, teacherIndex, "department", event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIndustrialAttachmentTeacher(cIndex, teacherIndex)}
                    aria-label={`Remove engaged teacher ${teacherIndex + 2}`}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {/* Additional Teacher */}
          {!isIndustrialAttachment && course.additionalTeachers.length > 0 && (
            <div className="rounded-lg border bg-white p-5 space-y-5">
              <h4 className="font-bold text-lg">Teacher 2</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Teacher Name"
                  value={course.additionalTeachers[0].name}
                  onChange={(e) =>
                    updateAdditionalTeacher(cIndex, "name", e.target.value)
                  }
                />
                <Select
                  value={course.additionalTeachers[0].designation}
                  onValueChange={(value) =>
                    value !== null && updateAdditionalTeacher(cIndex, "designation", value)
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
                  value={course.additionalTeachers[0].department}
                  onChange={(e) =>
                    updateAdditionalTeacher(cIndex, "department", e.target.value)
                  }
                />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {(
                  Object.keys(
                    course.additionalTeachers[0].duties
                  ) as (keyof SessionalDutyOption)[]
                )
                  .filter((duty) => !isShortSemester || duty !== "courseFile")
                  .filter((duty) => syllabus === "obe" || duty !== "courseFile")
                  .map((duty) => {
                  if (!course.additionalTeachers[0].duties[duty]) return null;
                  return (
                    <div key={duty} className="flex items-center gap-2">
                      <span className="rounded bg-green-100 px-2 py-1 text-xs shrink-0">
                        ✓ {label(duty)}
                      </span>
                      <Input
                        type="number"
                        placeholder="e.g. 30"
                        value={course.additionalTeachers[0].students[duty]}
                        onChange={(e) =>
                          updateAdditionalStudent(cIndex, duty, e.target.value)
                        }
                        className="h-8"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
            </>
          )}
        </div>
        );
      })}
      <Button type="button" onClick={() => addCourse(syllabus)}>
        + Add Sessional Course
      </Button>
      </div>
    );
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-bold">
        4. List of Teachers Associated with Sessional Courses
      </h2>
      <label className="block max-w-sm space-y-1 text-sm font-medium">
        <span>Sessional course syllabus</span>
        <Select value={evaluationSystem} onValueChange={(value) => setEvaluationSystem(value as "obe" | "mixed")}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="obe">OBE</SelectItem>
            <SelectItem value="mixed">OBE + Non OBE</SelectItem>
          </SelectContent>
        </Select>
      </label>
      {evaluationSystem === "obe" ? (
        renderCourses("obe")
      ) : (
        <div className="space-y-8">
          <div className="rounded-lg border p-5 space-y-6">
            <h3 className="text-lg font-bold">4.1 OBE (New Syllabus)</h3>
            {renderCourses("obe")}
          </div>
          <div className="rounded-lg border p-5 space-y-6">
            <h3 className="text-lg font-bold">4.2 Non OBE (Old Syllabus)</h3>
            {renderCourses("nonObe")}
          </div>
        </div>
      )}
    </div>
  );
}
