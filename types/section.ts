export interface Section {
  id: number;

  pageNumber: number;

  title: string;

  content: string;

  type:
    | "committee"
    | "paperSetterExaminer"
    | "tabulation"
    | "gradePreparation"
    | "gradeVerification"
    | "boardViva"
    | "courseAdviser"
    | "unknown";
}