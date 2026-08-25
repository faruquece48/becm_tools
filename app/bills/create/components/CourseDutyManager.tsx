"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CourseDuty, DutyOption, Designation, DutyStudentCount } from "./types";

const defaultDuty: DutyOption = {
  paperSetter: true,
  examiner: true,
  classTest: true,
  assignment: true,
  courseFile: true,
};

const defaultStudent: DutyStudentCount = {
  examiner: "",
  assignment: "",
  classTestCount: 2,
  classTestStudents: "",
};

const designationList: Designation[] = [
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
];

const label = (s: string) => s.replace(/([A-Z])/g, " $1");
const summaryValue = (value: string) =>
  value.trim() === "" || Number(value) === 0 ? "-" : value;

// Duty keys that use a free-text fraction value (e.g. "1", "1/2")
type FractionDuty = "examiner" | "assignment";

interface Props {
  examType: "semester" | "backlog" | "short";
  evaluationSystem: "obe" | "mixed";
  defaultStudentCount: string;
  courseDuties: { obe: CourseDuty[]; nonObe: CourseDuty[] };
  setCourseDuties: (data: { obe: CourseDuty[]; nonObe: CourseDuty[] }) => void;
}

export default function CourseDutyManager({
  examType,
  evaluationSystem,
  defaultStudentCount,
  courseDuties,
  setCourseDuties,
}: Props) {
  const isShortSemester = examType === "short";
  const [minimizedCourses, setMinimizedCourses] = useState<Set<string>>(
    () => new Set()
  );
  const initializedMinimized = useRef(false);

  useEffect(() => {
    if (
      initializedMinimized.current ||
      (courseDuties.obe.length === 0 && courseDuties.nonObe.length === 0)
    )
      return;
    initializedMinimized.current = true;
    setMinimizedCourses(
      new Set([
        ...courseDuties.obe.map((_, index) => `obe-${index}`),
        ...courseDuties.nonObe.map((_, index) => `nonObe-${index}`),
      ])
    );
  }, [courseDuties.obe, courseDuties.nonObe]);

  const toggleCourseMinimized = (type: "obe" | "nonObe", index: number) => {
    const key = `${type}-${index}`;
    setMinimizedCourses((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getList = (type: "obe" | "nonObe") => {
    return courseDuties[type];
  };
  const setList = (type: "obe" | "nonObe", value: CourseDuty[]) => {
    setCourseDuties({
      ...courseDuties,
      [type]: value,
    });
  };

  const addCourse = (type: "obe" | "nonObe") => {
    const newIndex = getList(type).length;
    const studentCount = Number(defaultStudentCount) || 0;
    const initialStudents: DutyStudentCount = type === "obe"
      ? {
          examiner: String(studentCount),
          assignment: String(studentCount),
          classTestCount: isShortSemester ? 4 : 2,
          classTestStudents: studentCount,
        }
      : { examiner: "", assignment: "", classTestCount: isShortSemester ? 4 : 2, classTestStudents: "" };
    setList(type, [
      ...getList(type),
      {
        courseCode: "",
        courseTitle: "",
        parts: ["A", "B"].map((part) => ({
          part,
          teacher: "",
          designation: "Assistant Professor",
          department: "Dept. of BECM, RUET",
          duties: {
            ...defaultDuty,
            classTest: !isShortSemester,
            assignment: isShortSemester || type === "nonObe" ? false : defaultDuty.assignment,
            courseFile: isShortSemester || type === "nonObe" ? false : defaultDuty.courseFile,
          },
          students: { ...initialStudents },
          additionalTeachers: [],
        })) as CourseDuty["parts"],
      },
    ]);
    setMinimizedCourses((current) => new Set(current).add(`${type}-${newIndex}`));
  };

  const deleteCourse = (type: "obe" | "nonObe", ci: number) => {
    setList(
      type,
      getList(type).filter((_, i) => i !== ci)
    );
    setMinimizedCourses(new Set());
  };

  const updateCourse = (
    type: "obe" | "nonObe",
    ci: number,
    field: string,
    value: string
  ) => {
    const updated = [...getList(type)];
    (updated[ci] as any)[field] = value;
    setList(type, updated);
  };

  const updatePart = (
    type: "obe" | "nonObe",
    ci: number,
    pi: number,
    field: string,
    value: any
  ) => {
    const updated = [...getList(type)];
    (updated[ci].parts[pi] as any)[field] = value;
    setList(type, updated);
  };

  // ---- Main teacher: fraction-style fields (examiner/assignment)
  const updateFractionStudent = (
    type: "obe" | "nonObe",
    ci: number,
    pi: number,
    duty: FractionDuty,
    value: string
  ) => {
    const updated = [...getList(type)];
    updated[ci].parts[pi].students[duty] = value;
    setList(type, updated);
  };

  // ---- Main teacher: class test count / total students
  const updateClassTestCount = (
    type: "obe" | "nonObe",
    ci: number,
    pi: number,
    value: string
  ) => {
    const updated = [...getList(type)];
    updated[ci].parts[pi].students.classTestCount =
      value === "" ? "" : Number(value);
    setList(type, updated);
  };

  const updateClassTestStudents = (
    type: "obe" | "nonObe",
    ci: number,
    pi: number,
    value: string
  ) => {
    const updated = [...getList(type)];
    updated[ci].parts[pi].students.classTestStudents =
      value === "" ? "" : Number(value);
    setList(type, updated);
  };

  // ---- Additional teacher: fraction-style fields
  const updateAdditionalFractionStudent = (
    type: "obe" | "nonObe",
    ci: number,
    pi: number,
    duty: FractionDuty,
    value: string
  ) => {
    const updated = [...getList(type)];
    updated[ci].parts[pi].additionalTeachers[0].students[duty] = value;
    setList(type, updated);
  };

  // ---- Additional teacher: class test count / total students
  const updateAdditionalClassTestCount = (
    type: "obe" | "nonObe",
    ci: number,
    pi: number,
    value: string
  ) => {
    const updated = [...getList(type)];
    updated[ci].parts[pi].additionalTeachers[0].students.classTestCount =
      value === "" ? "" : Number(value);
    setList(type, updated);
  };

  const updateAdditionalClassTestStudents = (
    type: "obe" | "nonObe",
    ci: number,
    pi: number,
    value: string
  ) => {
    const updated = [...getList(type)];
    updated[ci].parts[pi].additionalTeachers[0].students.classTestStudents =
      value === "" ? "" : Number(value);
    setList(type, updated);
  };

  const toggleDuty = (
    type: "obe" | "nonObe",
    ci: number,
    pi: number,
    field: keyof DutyOption
  ) => {
    const updated = [...getList(type)];
    const part = updated[ci].parts[pi];
    part.duties[field] = !part.duties[field];

    if (isShortSemester && field === "classTest" && part.duties.classTest) {
      updated[ci].parts.forEach((otherPart, otherPartIndex) => {
        if (otherPartIndex === pi) return;
        otherPart.duties.classTest = false;
        otherPart.additionalTeachers.forEach((teacher) => {
          teacher.duties.classTest = false;
        });
      });
      part.students.classTestCount = 4;
    }

    const remainingDuty: DutyOption = {
      paperSetter: false,
      examiner: false,
      classTest: false,
      assignment: false,
      courseFile: false,
    };
    const remainingStudent: DutyStudentCount = { ...defaultStudent };

    (Object.keys(part.duties) as (keyof DutyOption)[]).forEach((key) => {
      if (!part.duties[key]) {
        if (isShortSemester && key === "classTest") return;
        remainingDuty[key] = true;
        if (key === "classTest") {
          remainingStudent.classTestCount = part.students.classTestCount;
          remainingStudent.classTestStudents = part.students.classTestStudents;
        } else if (key === "examiner" || key === "assignment") {
          remainingStudent[key] = part.students[key];
        }
        // paperSetter / courseFile: no value to carry over, checkbox-only
      }
    });

    part.additionalTeachers = !isShortSemester && Object.values(remainingDuty).some(Boolean)
      ? [
          {
            name: "",
            designation: "Assistant Professor",
            department: "Dept. of BECM, RUET",
            duties: remainingDuty,
            students: remainingStudent,
          },
        ]
      : [];
    setList(type, updated);
  };

  const updateAdditional = (
    type: "obe" | "nonObe",
    ci: number,
    pi: number,
    field: string,
    value: any
  ) => {
    const updated = [...getList(type)];
    (updated[ci].parts[pi].additionalTeachers[0] as any)[field] = value;
    setList(type, updated);
  };

  const renderCourses = (type: "obe" | "nonObe") => {
    const courses = getList(type);
    return (
      <>
        {courses.map((course, cIndex) => {
          const minimized = minimizedCourses.has(`${type}-${cIndex}`);
          return (
          <div key={cIndex} className="rounded-xl border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center rounded-md border bg-white px-3 py-1 text-sm font-semibold text-gray-700">
                {String(cIndex + 1).padStart(2, "0")}.
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
                onClick={() => toggleCourseMinimized(type, cIndex)}
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
                onClick={() => deleteCourse(type, cIndex)}
                className="rounded-md bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700"
                aria-label="Delete course"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {!minimized && (
              <>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Course Code"
                value={course.courseCode}
                onChange={(e) =>
                  updateCourse(type, cIndex, "courseCode", e.target.value)
                }
              />
              <Input
                placeholder="Course Title"
                value={course.courseTitle}
                onChange={(e) =>
                  updateCourse(type, cIndex, "courseTitle", e.target.value)
                }
              />
            </div>
            {course.parts.map((part, pIndex) => (
              <div key={pIndex} className="rounded-lg bg-slate-50 p-4 space-y-3">
                <h4 className="font-bold">Part {part.part}</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    placeholder="Teacher Name"
                    value={part.teacher}
                    onChange={(e) =>
                      updatePart(type, cIndex, pIndex, "teacher", e.target.value)
                    }
                  />
                  <Select
                    value={part.designation}
                    onValueChange={(v) =>
                      updatePart(type, cIndex, pIndex, "designation", v)
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
                    value={part.department}
                    onChange={(e) =>
                      updatePart(type, cIndex, pIndex, "department", e.target.value)
                    }
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Duty Selection</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    {(Object.keys(part.duties) as (keyof DutyOption)[])
                      .filter((key) => !isShortSemester || (key !== "assignment" && key !== "courseFile"))
                      .filter(
                        (key) =>
                          type !== "nonObe" ||
                          (key !== "assignment" && key !== "courseFile")
                      )
                      .map((key) => {
                      const checked = part.duties[key];

                      // Checkbox-only duties: Paper Setter, Course File (fixed shared value of 1)
                      if (key === "paperSetter" || key === "courseFile") {
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                toggleDuty(type, cIndex, pIndex, key)
                              }
                            />
                            <span className="text-sm">{label(key)}</span>
                          </div>
                        );
                      }

                      if (key === "classTest") {
                        return (
                          <div
                            key={key}
                            className="col-span-full flex flex-col gap-2 rounded-md border bg-white p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  toggleDuty(type, cIndex, pIndex, key)
                                }
                              />
                              <span className="text-sm font-medium">Class Test</span>
                            </div>
                            {checked && (
                              <div className="grid grid-cols-2 gap-3 pl-6">
                                <div>
                                  <label className="mb-1 block text-xs text-gray-500">
                                    No. of Class Tests
                                  </label>
                                  <Input
                                    type="number"
                                    placeholder="e.g. 2"
                                    value={part.students.classTestCount}
                                    onChange={(e) =>
                                      updateClassTestCount(
                                        type,
                                        cIndex,
                                        pIndex,
                                        e.target.value
                                      )
                                    }
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-gray-500">
                                    Total Students
                                  </label>
                                  <Input
                                    type="number"
                                    placeholder="e.g. 30"
                                    value={part.students.classTestStudents}
                                    onChange={(e) =>
                                      updateClassTestStudents(
                                        type,
                                        cIndex,
                                        pIndex,
                                        e.target.value
                                      )
                                    }
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Remaining: examiner, assignment (fraction-style value)
                      const fractionKey = key as FractionDuty;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              toggleDuty(type, cIndex, pIndex, key)
                            }
                          />
                          <span className="w-24 shrink-0 text-sm">
                            {label(key)}
                          </span>
                          {checked && (
                            <Input
                              type="text"
                              placeholder="e.g. 30"
                              value={part.students[fractionKey]}
                              onChange={(e) =>
                                updateFractionStudent(
                                  type,
                                  cIndex,
                                  pIndex,
                                  fractionKey,
                                  e.target.value
                                )
                              }
                              className="h-8"
                            />
                          )}
                        </div>
                      );
                      })}
                  </div>
                  {!isShortSemester && part.additionalTeachers.length > 0 && (
                    <div className="mt-4 rounded-lg border bg-white p-4 space-y-3">
                      <h4 className="font-bold">Additional Teacher Required</h4>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input
                          placeholder="Teacher Name"
                          value={part.additionalTeachers[0].name}
                          onChange={(e) =>
                            updateAdditional(
                              type,
                              cIndex,
                              pIndex,
                              "name",
                              e.target.value
                            )
                          }
                        />
                        <Select
                          value={part.additionalTeachers[0].designation}
                          onValueChange={(v) =>
                            updateAdditional(
                              type,
                              cIndex,
                              pIndex,
                              "designation",
                              v as Designation
                            )
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
                          value={part.additionalTeachers[0].department}
                          onChange={(e) =>
                            updateAdditional(
                              type,
                              cIndex,
                              pIndex,
                              "department",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        {(
                          Object.keys(
                            part.additionalTeachers[0].duties
                          ) as (keyof DutyOption)[]
                        )
                          .filter((d) => !isShortSemester || (d !== "assignment" && d !== "courseFile" && d !== "classTest"))
                          .filter(
                            (d) =>
                              type !== "nonObe" ||
                              (d !== "assignment" && d !== "courseFile")
                          )
                          .map((d) => {
                          if (!part.additionalTeachers[0].duties[d]) return null;

                          // Checkbox-only duties carried to additional teacher: no value shown
                          if (d === "paperSetter" || d === "courseFile") {
                            return (
                              <div key={d} className="flex items-center gap-2">
                                <span className="rounded bg-green-100 px-2 py-1 text-xs shrink-0">
                                  ✓ {label(d)}
                                </span>
                              </div>
                            );
                          }

                          if (d === "classTest") {
                            return (
                              <div
                                key={d}
                                className="col-span-full flex flex-col gap-2 rounded-md border p-3"
                              >
                                <span className="rounded bg-green-100 px-2 py-1 text-xs w-fit">
                                  ✓ Class Test
                                </span>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="mb-1 block text-xs text-gray-500">
                                      No. of Class Tests
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="e.g. 2"
                                      value={
                                        part.additionalTeachers[0].students
                                          .classTestCount
                                      }
                                      onChange={(e) =>
                                        updateAdditionalClassTestCount(
                                          type,
                                          cIndex,
                                          pIndex,
                                          e.target.value
                                        )
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs text-gray-500">
                                      Total Students
                                    </label>
                                    <Input
                                      type="number"
                                      placeholder="e.g. 30"
                                      value={
                                        part.additionalTeachers[0].students
                                          .classTestStudents
                                      }
                                      onChange={(e) =>
                                        updateAdditionalClassTestStudents(
                                          type,
                                          cIndex,
                                          pIndex,
                                          e.target.value
                                        )
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          const fractionKey = d as FractionDuty;
                          return (
                            <div key={d} className="flex items-center gap-2">
                              <span className="rounded bg-green-100 px-2 py-1 text-xs shrink-0">
                                ✓ {label(d)}
                              </span>
                              <Input
                                type="text"
                                placeholder="e.g. 30"
                                value={
                                  part.additionalTeachers[0].students[fractionKey]
                                }
                                onChange={(e) =>
                                  updateAdditionalFractionStudent(
                                    type,
                                    cIndex,
                                    pIndex,
                                    fractionKey,
                                    e.target.value
                                  )
                                }
                                className="h-8"
                              />
                            </div>
                          );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
              </>
            )}
          </div>
          );
        })}
        <Button type="button" onClick={() => addCourse(type)}>
          + Add Course
        </Button>
      </>
    );
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-xl font-bold">
        3. List of Teachers Associated with Paper Setter & Examiner
      </h2>
      {evaluationSystem === "obe" ? (
        renderCourses("obe")
      ) : (
        <div className="space-y-8">
          <div className="rounded-lg border p-5 space-y-6">
            <h3 className="text-lg font-bold">3.1 OBE (New Syllabus)</h3>
            {renderCourses("obe")}
          </div>
          <div className="rounded-lg border p-5 space-y-6">
            <h3 className="text-lg font-bold">3.2 Non OBE (Old Syllabus)</h3>
            {renderCourses("nonObe")}
          </div>
        </div>
      )}
    </div>
  );
}
