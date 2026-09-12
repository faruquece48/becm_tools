import type { jsPDF } from "jspdf";
import type { FourthYearSheet, FourthYearRow } from "./fourthYearExamData";
import type { ExamCommitteeRecord } from "./storage/examCommittees";
import type { TabulatorRecord } from "./storage/tabulators";
import { completionStatus, usesLegacyResultFormat } from "./resultFormatPolicy";
import { paginateExamColumns } from "./examTablePagination";

type Kind = "marks" | "tabulation";
type Metadata = { committee?: ExamCommitteeRecord; tabulator?: TabulatorRecord };
type Column = { id: string; title: string; width: number; vertical?: boolean; value: (row: FourthYearRow) => string };
type Group = { id: string; width: number; title: string; columns: Column[]; course?: boolean };
const fixed = (value: number) => value.toFixed(2);
const rounded = (value: number) => (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
const date = (value = "") => { const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/); return match ? `${match[3]}/${match[2]}/${match[1]}` : value; };

export function fourthYearPdfColumns(sheet: FourthYearSheet, kind: Kind, examDate?: string) {
  const identity: Column[] = kind === "marks" ? [{ id: "roll", title: "Roll No.", width: 16, value: row => row.roll }] : [
    { id: "registration", title: "Reg. No.\n& Session", width: 16, value: row => `${row.registration}\n${row.session}` },
    { id: "roll", title: "Roll No.", width: 13, value: row => row.roll },
    { id: "name", title: "Student Name", width: 39, value: row => `${row.name}\n${row.gender === "Female" ? "D/O" : "S/O"} ${row.fatherName}` },
  ];
  const groups: Group[] = sheet.courses.map(course => {
    const labels = kind === "tabulation" ? [`${course.code} (${Number(course.credit).toFixed(2)})`] : course.type === "Theory" ? ["A", "B", "CT", "T.", "Gr."] : course.type === "Thesis" ? ["Int.", "Ext.", "Viva", "T.", "Gr."] : ["Ses.", "Viva", "T.", "Gr."];
    const width = kind === "tabulation" ? 9 : 7 * labels.length;
    return { id: course.id, width, course: true, title: `${course.code}\n${Number(course.credit).toFixed(2)}`,
      columns: labels.map((label, index) => ({ id: `${course.id}:${index}`, title: label, width: width / labels.length, vertical: kind === "tabulation", value: (row: FourthYearRow) => kind === "tabulation" ? row.results[course.id]?.grade || "" : row.results[course.id]?.values[index] || "" })) };
  });
  const numeric: [string, string, number, (row: FourthYearRow) => number][] = kind === "marks" ? [
    ["earned", "Earned\nCredit", 14, row => row.earned], ["gpa", "SGPA", 12, row => row.gpa],
  ] : [
    ["gp", "GP", 12, row => row.gp], ["earned", "Semester\nEarned\nCredit", 16, row => row.earned], ["gpa", "GPA", 12, row => row.gpa],
    ["yearly", "Yearly\nEarned\nCredit", 16, row => row.yearlyCredit], ["previousGp", "Previous\nGP", 16, row => row.previousGp],
    ["previousCredit", "Previous\nEarned\nCredit", 16, row => row.previousCredit], ["totalGp", "Total GP\nEarned", 16, row => row.totalGp],
    ["totalCredit", "Total Credits\nEarned", 16, row => row.totalCredit], ["cgpa", "CGPA", 12, row => row.cgpa],
  ];
  numeric.forEach(([id, title, width, value]) => groups.push({ id, title, width, columns: [{ id, title, width, value: row => id === "gpa" || id === "cgpa" ? rounded(value(row)) : fixed(value(row)) }] }));
  const legacy = usesLegacyResultFormat(examDate), currentFailed = (row: FourthYearRow) => sheet.courses.filter(course => ["F", "W"].includes(row.results[course.id]?.grade)).map(course => course.code), currentRegister = (row: FourthYearRow) => sheet.courses.filter(course => row.results[course.id]?.grade === "-").map(course => course.code);
  const remarks: Column[] = [
    { id: "failed", title: legacy ? "Failed Subjects" : "Status", width: 36, value: row => { const failed = kind === "marks" ? currentFailed(row) : row.failed; return kind === "tabulation" && row.totalCredit >= row.degreeCredit ? completionStatus(row.cgpa, legacy) : failed.join(", "); } },
    { id: "register", title: "Need to Register\nAgain", width: 32, value: row => kind === "marks" ? currentRegister(row).join(", ") : row.totalCredit >= row.degreeCredit ? "" : row.register.join(", ") },
  ];
  groups.push({ id: "remarks", title: "Remarks", width: 68, columns: remarks });
  return { identity, groups };
}

/** Draw at fixed readable widths. Finish all horizontal parts for a row block before advancing down. */
export function renderFourthYearExamPdf(doc: jsPDF, sheet: FourthYearSheet, kind: Kind, metadata: Metadata = {}) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), L = kind === "marks" ? 12 : 14, R = W - L;
  const committee = metadata.committee, tabulator = metadata.tabulator;
  if (kind === "tabulation" && (!committee || !tabulator)) throw new Error("Matching backlog tabulator and examination committee records are required.");
  const { identity, groups } = fourthYearPdfColumns(sheet, kind, committee?.examDate);
  const fontSize = 7.3, lineHeight = 2.8;
  const textLines = (value: string, width: number, size = fontSize): string[] => { doc.setFont("FreeSerif", "normal"); doc.setFontSize(size); return doc.splitTextToSize(value || "", width - 1.6); };
  function cell(x: number, y: number, width: number, height: number, value: string, bold = false, size = fontSize, align: "left" | "center" | "right" = "center") {
    doc.setLineWidth(.15); doc.setDrawColor(0); doc.rect(x, y, width, height);
    doc.setFont("FreeSerif", bold ? "bold" : "normal"); doc.setFontSize(size);
    let lines: string[] = doc.splitTextToSize(value || "", width - 1.6);
    // Footer/header labels fit inside their fixed cells; data row height is measured separately.
    while (lines.length * size * .36 + .8 > height && size > 6.5) { size -= .2; doc.setFontSize(size); lines = doc.splitTextToSize(value || "", width - 1.6); }
    const lh = size * .36, sy = y + (height - lines.length * lh) / 2 + lh * .78;
    doc.setTextColor(value === "F" ? 200 : 0, 0, 0);
    lines.forEach((line, index) => doc.text(line, align === "left" ? x + .8 : align === "right" ? x + width - .8 : x + width / 2, sy + index * lh, { align }));
    doc.setTextColor(0);
  }
  function header() {
    doc.setFont("FreeSerif", "bold"); doc.setFontSize(8);
    if (kind === "marks") {
      ["Heavens Light is Our Guide", "Rajshahi University of Engineering & Technology", "Department of Building Engineering & Construction Management", `4th Year ${sheet.examType} Examination, ${sheet.examYear}`].forEach((text, index) => doc.text(text, W / 2, 9 + index * 4, { align: "center" }));
      doc.line(L, 25, R, 25);
    } else {
      doc.rect(L, 8, 44, 8); doc.text(`Examination Date: ${date(committee?.examDate)}`, L + 1, 13);
      ["Heavens Light is Our Guide", "Rajshahi University of Engineering & Technology", `Tabulation Sheet of B.Sc Engineering 4th Year ${sheet.examType} Examination, ${sheet.examYear}`, "Department of Building Engineering & Construction Management"].forEach((text, index) => doc.text(text, W / 2, 10 + index * 4, { align: "center" }));
      doc.rect(R - 44, 8, 44, 20); ["BECM", "4th Year", sheet.examType, `Exam ${sheet.examYear}`].forEach((text, index) => doc.text(text, R - 22, 13 + index * 4, { align: "center" }));
      doc.line(L, 29, R, 29);
    }
  }
  function signatures() {
    if (!committee || !tabulator) return;
    const y = 132, rowHeight = 8, signedDate = date(committee.resultPublishDate || tabulator.reportingDate);
    const sig = (x: number, yy: number, width: number, height: number, text: string, bold = false, align: "left" | "center" = "center") => cell(x, yy, width, height, text, bold, 12, align);
    doc.line(L, y, R, y);
    sig(L, y + 2, 16, 8, "Sl. No", true); sig(L + 16, y + 2, 52, 8, "TABULATORS", true); sig(L + 68, y + 2, 30, 8, "SIGNATURE", true);
    [tabulator.chairman, tabulator.member1, tabulator.member2].forEach((name, index) => { sig(L, y + 10 + index * rowHeight, 16, rowHeight, `${index + 1}.`); sig(L + 16, y + 10 + index * rowHeight, 52, rowHeight, name, false, "left"); sig(L + 68, y + 10 + index * rowHeight, 30, rowHeight, ""); });
    sig(L, y + 34, 16, 8, "Date"); sig(L + 16, y + 34, 52, 8, signedDate, false, "left"); sig(L + 68, y + 34, 30, 8, "");
    const x = L + 99;
    sig(x, y + 2, 27, 12, ""); sig(x + 27, y + 2, 68, 12, "EXAMINATION\nCOMMITTEE", true); sig(x + 95, y + 2, 28, 12, "SIGNATURE", true);
    let yy = y + 14;
    [["Chairman", "Head, BECM"], ["Member", committee.member1], ["Member", committee.member2], ["Member", committee.member3], ...(committee.member5 ? [["Member", committee.member4], ["Member\n(External)", committee.member5]] : [["Member\n(External)", committee.member4]]), ["Date", signedDate]].forEach(([role, name]) => { const height = role.includes("External") ? 9 : 7; sig(x, yy, 27, height, role); sig(x + 27, yy, 68, height, name, false, "left"); sig(x + 95, yy, 28, height, ""); yy += height; });
    doc.setFont("FreeSerif", "bolditalic"); doc.setFontSize(9.36); doc.text("Controller of Examinations", x + 127, y + 59);
  }
  let pages = 0;
  function begin() { if (pages++) doc.addPage("a4", "landscape"); header(); }
  if (kind === "tabulation") {
    const nonObeCourseIds = new Set(sheet.rows.filter(row => row.nonObe).flatMap(row => Object.keys(row.results)));
    begin(); doc.rect(33, 78, W - 66, 25); doc.setFont("FreeSerif", "bold"); doc.setFontSize(16); doc.text(`4TH YEAR ${sheet.examType.toUpperCase()} EXAMINATION, ${sheet.examYear}`, W / 2, 93, { align: "center" }); signatures();
    const legendRows = sheet.courses.flatMap(course => {
      const courseCode = `${course.code}${nonObeCourseIds.has(course.id) ? " (Non-OBE)" : ""}`;
      const lines = textLines(course.title, 94, 10), codeLines = textLines(courseCode, 25, 10), fragments = [];
      for (let start = 0; start < lines.length; start += 15) {
        const title = lines.slice(start, start + 15);
        fragments.push({ course: { ...course, code: courseCode, title: title.join("\n") }, height: Math.max(6, title.length * 3.6 + 1, codeLines.length * 3.6 + 1) });
      }
      return fragments;
    });
    const grades = [["80% and above", "A+", "4.00"], ["75% to less than 80%", "A", "3.75"], ["70% to less than 75%", "A-", "3.50"], ["65% to less than 70%", "B+", "3.25"], ["60% to less than 65%", "B", "3.00"], ["55% to less than 60%", "B-", "2.75"], ["50% to less than 55%", "C+", "2.50"], ["45% to less than 50%", "C", "2.25"], ["40% to less than 45%", "D", "2.00"], ["Less than 40%", "F", "0.00"], ["Incomplete", "I", "-"], ["Need to Register Again", "-", "-"]];
    let offset = 0;
    while (offset < legendRows.length) {
      begin(); cell(L, 36, 134, 10, "OFFERED COURSES AND CREDIT", true, 15); cell(L + 135, 36, 134, 10, "MARKS AND GRADE", true, 15);
      cell(L, 46, 25, 8, "Course No.", true, 10); cell(L + 25, 46, 94, 8, "Course Title", true, 10); cell(L + 119, 46, 15, 8, "Credit", true, 10);
      cell(L + 135, 46, 78, 8, "Marks", true, 10); cell(L + 213, 46, 24, 8, "Grade", true, 10); cell(L + 237, 46, 32, 8, "Grade Point", true, 10);
      grades.forEach((row, i) => { cell(L + 135, 54 + i * 6, 78, 6, row[0], false, 10, "left"); cell(L + 213, 54 + i * 6, 24, 6, row[1], false, 10); cell(L + 237, 54 + i * 6, 32, 6, row[2], false, 10); });
      let y = 54;
      while (offset < legendRows.length && y + legendRows[offset].height <= 123) {
        const { course, height } = legendRows[offset++]; cell(L, y, 25, height, course.code, false, 10, "left"); cell(L + 25, y, 94, height, course.title, false, 10, "left"); cell(L + 119, y, 15, height, fixed(Number(course.credit)), false, 10); y += height;
      }
      if (offset === legendRows.length) { cell(L, y, 119, 6, "Total Credit", true, 10, "right"); cell(L + 119, y, 15, 6, fixed(sheet.courses.reduce((sum, course) => sum + Number(course.credit), 0)), false, 10); }
      signatures();
    }
  }
  const headerY = kind === "marks" ? 34 : 38, headerHeight = kind === "marks" ? 18 : 30;
  const dataY = headerY + headerHeight, bottom = kind === "marks" ? H - 14 : 130, budget = bottom - dataY;
  let maximumParts = 0;
  type Fragment = { row: FourthYearRow; text: Record<string, string>; height: number };
  for (const nonObe of [false, true]) {
    const rows = sheet.rows.filter(row => row.nonObe === nonObe);
    if (!rows.length) continue;
    const sectionGroups = groups.filter(group => !group.course || rows.some(row => Object.hasOwn(row.results, group.id)));
    const sectionSlices = paginateExamColumns(sectionGroups, R - L, identity.reduce((sum, column) => sum + column.width, 0));
    maximumParts = Math.max(maximumParts, sectionSlices.length);
    const allColumns = [...identity, ...sectionGroups.flatMap(group => group.columns)];
    const fragments: Fragment[] = [];
    for (const row of rows) {
      const lines = Object.fromEntries(allColumns.map(column => [column.id, textLines(column.value(row), column.width)]));
      const count = Math.max(1, ...Object.values(lines).map(value => value.length)), maxLines = Math.floor((budget - 2) / lineHeight);
      for (let start = 0; start < count; start += maxLines) {
        const text = Object.fromEntries(allColumns.map(column => [column.id, (identity.includes(column) ? lines[column.id] : lines[column.id].slice(start, start + maxLines)).join("\n")]));
        fragments.push({ row, text, height: Math.max(kind === "marks" ? 6 : 9, Math.min(maxLines, count - start) * lineHeight + 2) });
      }
    }
    const blocks: Fragment[][] = []; let block: Fragment[] = [], used = 0;
    for (const fragment of fragments) { const available = budget; if (block.length && used + fragment.height > available) { blocks.push(block); block = []; used = 0; } block.push(fragment); used += fragment.height; }
    if (block.length) blocks.push(block);
    for (const items of blocks) for (const slice of sectionSlices) {
      const tableHeaderY = headerY;
      begin();
      doc.setFont("FreeSerif", "bold"); doc.setFontSize(8); doc.text(nonObe ? "Non-OBE:" : "OBE:", L, tableHeaderY - 2);
      let x = L;
      identity.forEach(column => { cell(x, tableHeaderY, column.width, headerHeight, column.title, true); x += column.width; });
      for (const group of slice) {
        if (kind === "tabulation" && group.course) {
          cell(x, tableHeaderY, group.width, headerHeight, ""); doc.setFont("FreeSerif", "bold"); doc.setFontSize(8);
          const code = group.columns[0].title;
          if (nonObe) {
            const match = code.match(/^(.*) \(([^)]+)\)$/), courseLabel = `${match?.[1] || code} (Non-OBE)`, creditLabel = match ? `(${match[2]})` : "";
            const verticalText = (text: string, lineX: number, centered: boolean) => {
              doc.setFontSize(8);
              const availableHeight = headerHeight - 2, originalWidth = doc.getTextWidth(text);
              if (originalWidth > availableHeight) doc.setFontSize(8 * availableHeight / originalWidth);
              const renderedWidth = doc.getTextWidth(text), textY = centered ? tableHeaderY + (headerHeight + renderedWidth) / 2 : tableHeaderY + headerHeight - 1;
              doc.text(text, lineX, textY, { angle: 90 });
            };
            verticalText(courseLabel, x + group.width * .32, false);
            verticalText(creditLabel, x + group.width * .72, true);
          } else {
            const textWidth = doc.getTextWidth(code);
            if (textWidth > headerHeight - 7) doc.setFontSize(8 * (headerHeight - 7) / textWidth);
            doc.text(code, x + group.width / 2 + 1, tableHeaderY + headerHeight - 5, { angle: 90 });
          }
          x += group.width;
        } else if (group.columns.length > 1) {
          const groupTitle = nonObe && group.course ? group.title.replace("\n", " (Non-OBE)\n") : group.title;
          cell(x, tableHeaderY, group.width, 10, groupTitle, true);
          group.columns.forEach(column => { cell(x, tableHeaderY + 10, column.width, headerHeight - 10, column.title, true); x += column.width; });
        } else { cell(x, tableHeaderY, group.width, headerHeight, group.title, true); x += group.width; }
      }
      let y = tableHeaderY + headerHeight;
      const columns = [...identity, ...slice.flatMap(group => group.columns)];
      for (const item of items) {
        x = L;
        const graduated = kind === "tabulation" && item.row.totalCredit >= item.row.degreeCredit;
        for (const column of columns) {
          if (graduated && column.id === "register") continue;
          if (graduated && column.id === "failed") {
            const width = column.width + (columns.find(candidate => candidate.id === "register")?.width || 0);
            cell(x, y, width, item.height, column.value(item.row), false, fontSize, "center");
            x += width;
          } else {
            cell(x, y, column.width, item.height, item.text[column.id], false, fontSize, ["name", "failed", "register"].includes(column.id) ? "left" : "center");
            x += column.width;
          }
        }
        y += item.height;
      }
      if (kind === "tabulation") signatures();
    }
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); if (kind === "marks") doc.line(L, H - 12, R, H - 12);
    doc.setFont("FreeSerif", "bolditalic"); doc.setFontSize(8); doc.text(`Page ${page} of ${doc.getNumberOfPages()}`, R, H - 8, { align: "right" });
  }
  return { pages: doc.getNumberOfPages(), horizontalParts: maximumParts };
}
