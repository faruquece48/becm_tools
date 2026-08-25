"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ImportedSummaryBill, SummaryTeacher } from "./summaryData";
import { BillPdfPages } from "../create/components/pdf/BillPdfDocument";
import {
  aggregateTeachers,
  examinationIndexName,
  examinationSummaryTitle,
  teachersForBill,
} from "./summaryData";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontFamily: "Times-Roman",
    fontSize: 9,
    color: "#000",
  },
  motto: { textAlign: "center", fontSize: 8 },
  department: { textAlign: "center", fontSize: 9, marginTop: 2 },
  university: {
    textAlign: "center",
    fontFamily: "Times-Bold",
    fontSize: 15,
    marginTop: 2,
  },
  title: { textAlign: "center", fontSize: 10, marginTop: 2, marginBottom: 8 },
  row: { flexDirection: "row" },
  cell: {
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: "#000",
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: "center",
    minHeight: 16,
  },
  left: { borderLeftWidth: 0.6 },
  top: { borderTopWidth: 0.6 },
  header: { fontFamily: "Times-Bold", textAlign: "center" },
  serial: { width: "9%", textAlign: "center" },
  name: { width: "31%" },
  designation: { width: "48%" },
  count: { width: "12%", textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    textAlign: "center",
    fontSize: 7,
    color: "#555",
  },
  indexPage: {
    paddingTop: 48,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: "#000",
  },
  indexDepartment: {
    textAlign: "center",
    fontFamily: "Times-Bold",
    fontSize: 20,
  },
  indexTitle: {
    textAlign: "center",
    fontFamily: "Times-Bold",
    fontSize: 19,
    marginTop: 10,
    marginBottom: 14,
  },
  indexSerial: { width: "12%", textAlign: "center" },
  indexExamination: { width: "58%", textAlign: "center" },
  indexSeries: { width: "30%", textAlign: "center" },
  indexTable: { alignSelf: "center" },
});

function Header({ title, tableGap }: { title: string; tableGap: number }) {
  return <>
    <Text style={styles.motto}>“Heaven&apos;s Light is Our Guide”</Text>
    <Text style={styles.department}>Department of Building Engineering and Construction Management</Text>
    <Text style={styles.university}>Rajshahi University of Engineering and Technology</Text>
    <Text style={[styles.title, { marginBottom: tableGap }]}>{title}</Text>
  </>;
}

function TeacherTable({ teachers }: { teachers: SummaryTeacher[] }) {
  return <View>
    <View style={styles.row} fixed>
      <View style={[styles.cell, styles.left, styles.top, styles.serial]}><Text style={styles.header}>SL No.</Text></View>
      <View style={[styles.cell, styles.top, styles.name]}><Text style={styles.header}>Name</Text></View>
      <View style={[styles.cell, styles.top, styles.designation]}><Text style={styles.header}>Designation</Text></View>
      <View style={[styles.cell, styles.top, styles.count]}><Text style={styles.header}>Number of Bill</Text></View>
    </View>
    {teachers.map((teacher, index) => {
      const designation = [teacher.designation, teacher.department]
        .filter(Boolean)
        .join(", ");
      return <View key={teacher.key} style={styles.row} wrap={false}>
        <View style={[styles.cell, styles.left, styles.serial]}><Text>{index + 1}</Text></View>
        <View style={[styles.cell, styles.name]}><Text>{teacher.name}</Text></View>
        <View style={[styles.cell, styles.designation]}><Text>{designation}</Text></View>
        <View style={[styles.cell, styles.count]}><Text>{teacher.billCount}</Text></View>
      </View>;
    })}
  </View>;
}

function Footer() {
  return <Text
    fixed
    style={styles.footer}
    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
  />;
}

export default function SummaryPdfDocument({
  bills,
  tableGap = 10,
  remunerationListYear = "2025-II",
  indexTableWidth = 75,
}: {
  bills: ImportedSummaryBill[];
  tableGap?: number;
  remunerationListYear?: string;
  indexTableWidth?: number;
}) {
  return <Document title="Examination Bill Summary">
    <Page size="LEGAL" style={styles.indexPage}>
      <Text style={styles.indexDepartment}>Department of BECM</Text>
      <Text style={styles.indexTitle}>Remuneration List – {remunerationListYear}</Text>
      <View style={[styles.indexTable, { width: `${indexTableWidth}%` }]}>
        <View style={styles.row}>
          <View style={[styles.cell, styles.left, styles.top, styles.indexSerial]}><Text style={styles.header}>Sl. No.</Text></View>
          <View style={[styles.cell, styles.top, styles.indexExamination]}><Text style={styles.header}>Name of Examination</Text></View>
          <View style={[styles.cell, styles.top, styles.indexSeries]}><Text style={styles.header}>Series</Text></View>
        </View>
        {bills.map(({ id, bill }, index) => <View key={id} style={styles.row} wrap={false}>
          <View style={[styles.cell, styles.left, styles.indexSerial]}><Text>{index + 1}.</Text></View>
          <View style={[styles.cell, styles.indexExamination]}><Text>{examinationIndexName(bill)}</Text></View>
          <View style={[styles.cell, styles.indexSeries]}><Text>{bill.billInfo.series}</Text></View>
        </View>)}
      </View>
      <Footer />
    </Page>
    {bills.map(({ id, bill }) => <BillPdfPages key={`preview-${id}`} bill={bill} />)}
    {bills.map(({ id, bill }) => <Page key={id} size="LEGAL" style={styles.page}>
      <Header title={examinationSummaryTitle(bill)} tableGap={tableGap} />
      <TeacherTable teachers={teachersForBill(bill)} />
      <Footer />
    </Page>)}
    <Page size="LEGAL" style={styles.page}>
      <Header title="Consolidated Remuneration List of Dept. of BECM for All Imported Examination Bills" tableGap={tableGap} />
      <TeacherTable teachers={aggregateTeachers(bills)} />
      <Footer />
    </Page>
  </Document>;
}
