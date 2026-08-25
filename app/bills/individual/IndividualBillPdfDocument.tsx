"use client";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ExaminationBillData } from "../create/components/types";
import type { ColumnWidths } from "../create/components/types";
import type { IndividualBillLayoutSettings } from "./IndividualLayoutEditor";
import {
  amountInBanglaWords,
  buildRemunerationChart,
  deriveTeacherRows,
  isMinimumAmountApplied,
  rowAmount,
} from "./individualBill";

Font.register({
  family: "Kalpurush",
  fonts: [
    { src: "/fonts/kalpurush.ttf", fontWeight: 400 },
    { src: "/fonts/kalpurush.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { paddingVertical: 28, paddingHorizontal: 34, fontFamily: "Kalpurush", fontSize: 10, color: "#000000" },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
  motto: { fontSize: 9, textAlign: "center", color: "#000000" },
  university: { fontSize: 15, fontWeight: 700, textAlign: "center", marginTop: 2, color: "#000000" },
  title: { fontSize: 14, fontWeight: 700, textAlign: "center", marginTop: 4, marginBottom: 10, color: "#000000" },
  info: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, fontSize: 9 },
  infoColumn: { width: "48%" },
  infoColumnRight: { width: "48%", textAlign: "right" },
  infoLine: { flexDirection: "row", alignItems: "center" },
  infoLineRight: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  fauxBold: { position: "relative" },
  fauxBoldOverlay: { position: "absolute", top: 0, left: 0.22 },
  row: { flexDirection: "row", width: "100%" },
  fillHeight: { flexGrow: 1 },
  remunerationTableStart: { marginTop: 8.504 },
  // Draw each grid boundary once. Full borders on nested cells caused
  // doubled/thick lines and visible breaks in the preview/PDF.
  cell: { borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: "#000000", padding: 2.5, justifyContent: "center", minHeight: 16 },
  left: { borderLeftWidth: 0.6, borderColor: "#000000" },
  top: { borderTopWidth: 0.6, borderColor: "#000000" },
  header: { fontSize: 9, fontWeight: 700, textAlign: "center", color: "#000000" },
  body: { fontSize: 9, color: "#000000" },
  struck: { textDecoration: "line-through" },
  footerLabel: { marginTop: 8, width: "50%", paddingLeft: 35, textAlign: "left", fontSize: 8 },
  signatures: { flexDirection: "row", justifyContent: "space-between", marginTop: 82, paddingHorizontal: 35, fontSize: 8 },
  signatureLeft: { width: "50%" },
  signatureRight: { width: "42%", textAlign: "center" },
  signatureLine: { borderTopWidth: 0.6, borderStyle: "dashed", borderColor: "#000", marginBottom: 4 },
  finance: { borderWidth: 0.6, borderColor: "#000", marginTop: 28, textAlign: "center", fontSize: 8 },
  financeTitle: { borderBottomWidth: 0.6, borderColor: "#000", padding: 3, fontWeight: 700 },
  financeText: { padding: 10 },
  officers: { flexDirection: "row", justifyContent: "space-between", marginTop: 58, fontSize: 7 },
  officer: { width: "24%", textAlign: "center" },
  note: { borderTopWidth: 0.6, borderColor: "#000", marginTop: 20, paddingTop: 8, fontSize: 6.5, textAlign: "center" },
});

const bn = (value: string) => value.replace(/[0-9]/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
const value = (input: string | number | undefined) => input === undefined || input === "" ? "" : bn(String(input));
const CONTENT_WIDTH_PT = 612 - 34 * 2;
const TABLE_KEYS = ["serial", "descriptionGroup", "description", "course", "quantity", "courseCount", "classTestCount", "rate", "amount"] as const;
const DEGREE_OPTIONS = [
  { key: "B.Sc. Engineering", label: "বি.এস.সি. ইঞ্জিনিয়ারিং" },
  { key: "B.U.R.P", label: "বি.ইউ.আর.পি" },
  { key: "B.Arch.", label: "বি.আর্ক." },
  { key: "M.Sc. Engineering", label: "এম.এস.সি. ইঞ্জিনিয়ারিং" },
  { key: "M.Phil.", label: "এম.ফিল." },
  { key: "PhD", label: "পিএইচ.ডি." },
] as const;

function FauxBoldText({ children }: { children: string }) {
  return (
    <View style={s.fauxBold}>
      <Text>{children}</Text>
      <Text style={s.fauxBoldOverlay}>{children}</Text>
    </View>
  );
}

function pointWidths(weights: number[], total: number): number[] {
  const weightTotal = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0) || 1;
  const widths = weights.map((weight) => Math.round((Math.max(0, weight) / weightTotal) * total * 100) / 100);
  const usedWidth = widths.slice(0, -1).reduce((sum, width) => sum + width, 0);
  widths[widths.length - 1] = Math.round((total - usedWidth) * 100) / 100;
  return widths;
}

export interface IndividualBillPdfPageProps {
  bill: ExaminationBillData;
  teacher: string;
  nameBangla: string;
  designationBangla: string;
  addressBangla: string;
  accountNumber: string;
  metaWidths: ColumnWidths;
  tableWidths: ColumnWidths;
  layoutSettings: IndividualBillLayoutSettings;
}

export function IndividualBillPdfPage(props: IndividualBillPdfPageProps) {
  const { bill, teacher, nameBangla, designationBangla, addressBangla, accountNumber, metaWidths, tableWidths, layoutSettings } = props;
  const { fontSizes, sectionGaps } = layoutSettings;
  const duties = deriveTeacherRows(bill, teacher);
  const sections = buildRemunerationChart(duties);
  const total = duties.reduce((sum, duty) => sum + rowAmount(duty), 0);
  const widths = pointWidths(TABLE_KEYS.map((key) => tableWidths[key] || 0), CONTENT_WIDTH_PT);
  const [serialPt, titlePt, descriptionPt, coursePt, quantityPt, courseCountPt, classTestCountPt, ratePt, amountPt] = widths;
  const leftPt = serialPt + titlePt;
  const rightPt = CONTENT_WIDTH_PT - leftPt;
  const dutyPt = coursePt + quantityPt + courseCountPt + classTestCountPt + ratePt + amountPt;
  const dutyWidths = [coursePt, quantityPt, courseCountPt, classTestCountPt, ratePt, amountPt];
  const wordsPt = titlePt + descriptionPt + coursePt + quantityPt + courseCountPt + classTestCountPt;
  const meta = pointWidths([metaWidths.qualifications || 0, metaWidths.examination || 0, metaWidths.billNumber || 0], CONTENT_WIDTH_PT);
  const year: Record<string, string> = { "1st Year": "১ম বর্ষ", "2nd Year": "২য় বর্ষ", "3rd Year": "৩য় বর্ষ", "4th Year": "৪র্থ বর্ষ" };
  const semester: Record<string, string> = { Odd: "বিজোড়", Even: "জোড়", "Odd Semester": "বিজোড়", "Even Semester": "জোড়" };
  const exam = bill.billInfo.examType === "backlog"
    ? `${year[bill.billInfo.year] || bill.billInfo.year} ব্যাকলগ পরীক্ষা ${bn(bill.billInfo.examYear || "২০২৪")}`
    : bill.billInfo.examType === "short"
      ? `${year[bill.billInfo.year] || bill.billInfo.year} শর্ট সেমিস্টার ${bn(bill.billInfo.examYear || "২০২৪")}`
      : `${year[bill.billInfo.year] || bill.billInfo.year} ${semester[bill.billInfo.semester] || bill.billInfo.semester} সেমিস্টার পরীক্ষা ${bn(bill.billInfo.examYear || "২০২৪")}`;
  const selectedDegree = bill.billInfo.examination === "Ph.D." ? "PhD" : bill.billInfo.examination;
  const headers = ["ক্রমিক নং", "কাজের বিবরণ", "বিবরণ", "বিষয় / কোর্স", "খাতা / ছাত্র সংখ্যা", "কোর্স সংখ্যা", "ক্লাস টেস্ট সংখ্যা", "পারিশ্রমিকের হার", "টাকার পরিমাণ"];

  return <Page size="LEGAL" style={s.page} wrap={false}>
      <Text style={[s.motto, { fontSize: fontSizes.motto }]}>ঐশী জ্যোতিই আমাদের পথ প্রদর্শক</Text>
      <Text style={[s.university, { fontSize: fontSizes.university }]}>রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়</Text>
      <Text style={[s.title, { fontSize: fontSizes.title, marginBottom: sectionGaps.headingToTeacherInfo }]}>পরীক্ষা সংক্রান্ত পারিশ্রমিকের বিল ফরম</Text>
      <View style={[s.info, { fontSize: fontSizes.teacherInfo, marginBottom: sectionGaps.teacherInfoToFigure }]}>
        <View style={s.infoColumn}>
          <View style={s.infoLine}><Text>নামঃ </Text><FauxBoldText>{nameBangla || "........................"}</FauxBoldText></View>
          <View style={s.infoLine}><Text>ঠিকানাঃ </Text><FauxBoldText>{addressBangla}</FauxBoldText></View>
        </View>
        <View style={s.infoColumnRight}>
          <View style={s.infoLineRight}><Text>পদবীঃ{"\u00A0"}</Text><FauxBoldText>{designationBangla || "........................"}</FauxBoldText></View>
          <View style={s.infoLineRight}><Text>হিসাব নংঃ{"\u00A0"}</Text><FauxBoldText>{accountNumber || "........................"}</FauxBoldText></View>
        </View>
      </View>
      <View style={[s.row, s.top, { fontSize: fontSizes.figureTable }]}>
        <View style={[s.cell, s.left, { width: meta[0] }]}><Text>{DEGREE_OPTIONS.map((degree, index) => <Text key={degree.key} style={selectedDegree && selectedDegree !== degree.key ? s.struck : undefined}>{index > 0 ? " / " : ""}{degree.label}</Text>)}{"\n"}বিভাগঃ বিইসিএম বিভাগ</Text></View>
        <View style={[s.cell, { width: meta[1] }]}><Text style={s.center}>{exam}</Text></View>
        <View style={[s.cell, { width: meta[2] }]}><Text style={s.center}>বিল নং- {bn(bill.billInfo.billNo || "০১")}</Text></View>
      </View>
      <View style={[s.row, s.top, s.remunerationTableStart, { marginTop: sectionGaps.figureToRemuneration }]}>{headers.map((header, index) => <View key={header} style={[s.cell, index === 0 ? s.left : {}, { width: widths[index] }]}><Text style={[s.header, { fontSize: fontSizes.remunerationHeader }]}>{header}</Text></View>)}</View>
      {sections.map((section) => {
        const groups = section.rows.reduce<{ description: string; rows: typeof section.rows }[]>((result, row) => {
          const last = result[result.length - 1];
          if (last?.description === row.description) last.rows.push(row);
          else result.push({ description: row.description, rows: [row] });
          return result;
        }, []);
        return <View key={section.serial} style={s.row} wrap={false}>
          <View style={[s.cell, s.left, { width: serialPt }]}><Text style={[s.body, s.center, { fontSize: fontSizes.remunerationBody }]}>{bn(String(section.serial))}।</Text></View>
          <View style={[s.cell, { width: titlePt }]}><Text style={[s.body, s.center, { fontSize: fontSizes.remunerationBody }]}>{section.title}</Text></View>
          <View style={[s.fillHeight, { width: rightPt }]}>
            {groups.map((group) => <View key={group.description} style={[s.row, s.fillHeight]}>
              <View style={[s.cell, { width: descriptionPt }]}><Text style={[s.body, { fontSize: fontSizes.remunerationBody }]}>{group.description}</Text></View>
              <View style={[s.fillHeight, { width: dutyPt }]}>
                {group.rows.map((row) => {
                  const duty = row.duty;
                  const cells = [duty?.course || "", value(duty?.quantity), value(duty?.courseCount), value(duty?.classTestCount), duty ? (isMinimumAmountApplied(duty) ? `${value(duty.minimumAmount)} (ন্যূনতম)` : value(duty.rate)) : "", duty ? rowAmount(duty).toLocaleString("bn-BD") : ""];
                  return <View key={row.id} style={[s.row, s.fillHeight]}>{cells.map((cell, index) => <View key={index} style={[s.cell, { width: dutyWidths[index] }]}><Text style={[s.body, s.center, { fontSize: fontSizes.remunerationBody }]}>{cell}</Text></View>)}</View>;
                })}
              </View>
            </View>)}
          </View>
        </View>;
      })}
      <View style={[s.row, { fontSize: fontSizes.remunerationBody }]}><View style={[s.cell, s.left, { width: serialPt }]}><Text>কথায়ঃ</Text></View><View style={[s.cell, { width: wordsPt }]}><Text>{amountInBanglaWords(total)} মাত্র</Text></View><View style={[s.cell, { width: ratePt }]}><Text style={s.right}>মোটঃ</Text></View><View style={[s.cell, { width: amountPt }]}><Text style={s.center}>{total.toLocaleString("bn-BD")}</Text></View></View>
      <Text style={[s.footerLabel, { fontSize: fontSizes.signatures, marginTop: sectionGaps.remunerationToApproval }]}>প্রতি স্বাক্ষরিত</Text>
      <View style={[s.signatures, { fontSize: fontSizes.signatures, marginTop: sectionGaps.approvalToSignatures }]}><Text style={s.signatureLeft}>সভাপতি, পরীক্ষা কমিটি।</Text><View style={s.signatureRight}><View style={s.signatureLine} /><Text>পরীক্ষকের স্বাক্ষর</Text><Text>তারিখঃ</Text></View></View>
      <View style={[s.finance, { fontSize: fontSizes.accounts, marginTop: sectionGaps.signaturesToAccounts }]}><Text style={s.financeTitle}>হিসাব শাখা পূরণ করিবেন</Text><Text style={s.financeText}>{nameBangla || "........................"} কে {amountInBanglaWords(total)} মাত্র পরিশোধ করা হইল।</Text></View>
      <View style={[s.officers, { fontSize: fontSizes.accounts, marginTop: sectionGaps.accountsToOfficers }]}><Text style={s.officer}>হিসাব সহকারী</Text><Text style={s.officer}>হিসাব রক্ষক</Text><Text style={s.officer}>সহকারী কম্পট্রোলার</Text><Text style={s.officer}>কম্পট্রোলার{"\n"}রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়</Text></View>
      <Text style={[s.note, { fontSize: fontSizes.note, marginTop: sectionGaps.officersToNote }]}>বিঃদ্রঃ বিলের মোট পরিমাণ ২০০/- টাকার উপরে হইলে ১০/- টাকা মূল্যের রাজস্ব স্ট্যাম্প দিতে হইবে।{"\n"}সরকারী শিক্ষক/অফিসারদের ক্ষেত্রে যথাযথ কর্তৃপক্ষের অনুমোদন প্রয়োজন। উল্লেখ্য যে, প্রত্যেক সেমিস্টার পরীক্ষার জন্য পৃথকভাবে বিল জমা দিতে হইবে।</Text>
    </Page>;
}

export default function IndividualBillPdfDocument(props: IndividualBillPdfPageProps) {
  return <Document title={`${props.teacher || "Individual Teacher"} Bill`}>
    <IndividualBillPdfPage {...props} />
  </Document>;
}
