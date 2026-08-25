"use client";

import { Document } from "@react-pdf/renderer";
import type { ExaminationBillData } from "../create/components/types";
import type { SavedIndividualTeacherInformation } from "@/lib/storage/individualTeacher";
import { IndividualBillPdfPage } from "../individual/IndividualBillPdfDocument";
import { defaultIndividualBillLayout } from "../individual/IndividualLayoutEditor";

const metaWidths = { qualifications: 36, examination: 38, billNumber: 26 };
const tableWidths = { serial: 7, descriptionGroup: 11, description: 18, course: 13, quantity: 10, courseCount: 6, classTestCount: 9, rate: 12, amount: 14 };

export interface CombinedTeacherRecord {
  teacher: string;
  information?: SavedIndividualTeacherInformation;
}

export default function CombinedBillPdfDocument({ bill, teachers }: { bill: ExaminationBillData; teachers: CombinedTeacherRecord[] }) {
  return (
    <Document title="Combined Teacher Bills">
      {teachers.map(({ teacher, information }) => (
        <IndividualBillPdfPage
          key={teacher}
          bill={bill}
          teacher={teacher}
          nameBangla={information?.nameBangla || teacher.replace(/^(mr|mrs|ms|mst)\.?\s+/i, "")}
          designationBangla={information?.designationBangla || ""}
          addressBangla={information ? (information.addressBangla ?? "") : "বিইসিএম বিভাগ, রুয়েট।"}
          accountNumber={information?.accountNumber || ""}
          metaWidths={metaWidths}
          tableWidths={tableWidths}
          layoutSettings={defaultIndividualBillLayout}
        />
      ))}
    </Document>
  );
}
