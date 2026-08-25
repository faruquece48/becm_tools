"use client";

import { Document } from "@react-pdf/renderer";
import { IndividualBillPdfPage } from "../individual/IndividualBillPdfDocument";
import type { IndividualSummaryPage } from "./types";

export default function IndividualSummaryPdfDocument({ pages }: { pages: IndividualSummaryPage[] }) {
  return (
    <Document title="Individual Summary Bills">
      {pages.map((page) => (
        <IndividualBillPdfPage
          key={page.id}
          bill={page.bill}
          teacher={page.teacher}
          nameBangla={page.nameBangla}
          designationBangla={page.designationBangla}
          addressBangla={page.addressBangla}
          accountNumber={page.accountNumber}
          metaWidths={page.metaWidths}
          tableWidths={page.tableWidths}
          layoutSettings={page.layoutSettings}
        />
      ))}
    </Document>
  );
}
