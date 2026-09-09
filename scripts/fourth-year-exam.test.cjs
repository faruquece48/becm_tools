/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness compiles the client TypeScript for Node tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// Run the same TypeScript model and renderer used by the client, without a browser or database writes.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { paginateExamColumns, usesWideExamTable } = require('../lib/examTablePagination.ts');
const { buildFourthYearSheet } = require('../lib/fourthYearExamData.ts');
const { fourthYearPdfColumns, renderFourthYearExamPdf } = require('../lib/fourthYearExamPdf.ts');
const { defaultSyllabuses } = require('../lib/storage/syllabuses.ts');
const { jsPDF } = require('jspdf');

const [old, obe] = defaultSyllabuses;
const course = obe.courses.find(course => course.code === 'CE 1125');
const historical = old.courses.find(course => course.code === 'CE 1125');
const student = { id: 'current', rollNo: '2012001', name: 'Current Student', registrationNo: 'REG-1', series: '2020' };
const special = { id: 'old', rollNo: '1912001', name: 'Re-admitted Student', registrationNo: 'REG-2', series: '2019', earnedCredit: 100, gradePoints: 300, outstandingCourses: [], promotions: [{ examType: 'Backlog', examYear: '2024', academicYear: '4th', semester: 'Backlog', courseIds: [historical.id] }] };
const mark = { studentId: student.id, rollNo: student.rollNo, examYear: '2024', academicYear: '4th', semester: course.semester, courseId: course.id, courseCode: course.code, courseTitle: course.title, present: true, partA: '22.5', partB: '23', classTestAttendance: '15', marks: '61', result: 'Pass' };
const data = { syllabuses: defaultSyllabuses, 'student-directory': [student], 'old-student-directory': [special], 'prepare-result-backlog': [mark, { ...mark, studentId: special.id, rollNo: special.rollNo, courseId: historical.id }] };

test('wide layout is restricted to the two fourth-year exams and never result sheets', () => {
  for (const exam of ['Backlog', 'Short Semester']) {
    for (const year of ['1st', '2nd', '3rd']) assert.equal(usesWideExamTable(year, exam, 'marks'), false);
    assert.equal(usesWideExamTable('4th', exam, 'marks'), true);
    assert.equal(usesWideExamTable('4th', exam, 'tabulation'), true);
    assert.equal(usesWideExamTable('4th', exam, 'result'), false);
  }
});

test('40 theory subjects retain readable widths, order and complete coverage', () => {
  const groups = Array.from({ length: 40 }, (_, i) => ({ id: String(i), width: 35 }));
  const pages = paginateExamColumns(groups, 273, 16);
  assert.ok(pages.length > 1);
  assert.deepEqual(pages.flat(), groups);
  pages.forEach(page => assert.ok(page.reduce((sum, group) => sum + group.width, 16) <= 273));
});

test('backlog includes earlier-year and historical non-OBE course variants independently', () => {
  const sheet = buildFourthYearSheet(data, [], '2024', 'Backlog');
  assert.deepEqual(sheet.courses.map(course => course.id), [course.id, historical.id]);
  assert.equal(sheet.rows.length, 2);
  assert.equal(sheet.rows[0].results[historical.id], undefined);
  assert.equal(sheet.rows[1].results[course.id], undefined);
  assert.equal(sheet.rows[0].results[course.id].values[0], '22.5');
});

test('short semester collects registered subjects from the whole syllabus and re-add promotions', () => {
  const promoted = { ...special, promotions: [{ ...special.promotions[0], examType: 'Regular', semester: 'Short Semester', courseIds: old.courses.map(course => course.id) }] };
  const shortData = { ...data, 'old-student-directory': [promoted] };
  const registrations = [{ studentId: student.id, rollNo: student.rollNo, examYear: '2024', courses: obe.courses.map(course => ({ courseId: course.id, courseCode: course.code, semester: course.semester })) }];
  const sheet = buildFourthYearSheet(shortData, registrations, '2024', 'Short Semester');
  assert.equal(sheet.courses.length, obe.courses.length + old.courses.length);
  assert.ok(sheet.courses.some(course => course.type === 'Thesis'));
  assert.equal(sheet.rows.length, 2);
  const columns = fourthYearPdfColumns(sheet, 'tabulation');
  assert.deepEqual(columns.identity.map(column => column.id), ['registration', 'roll', 'name']);
  assert.ok(columns.groups.filter(group => group.course).every(group => group.columns[0].vertical));
});

test('render backlog and full-syllabus short semester with repeated identity on every table part', () => {
  fs.mkdirSync('.next/fourth-year-pdf-qa', { recursive: true });
  const source = buildFourthYearSheet(data, [], '2024', 'Backlog');
  const tabulator = { chairman: 'Dr. Example Chairman', member1: 'Mr. First Tabulator', member2: 'Mr. Second Tabulator', reportingDate: '2026-09-09' };
  const committee = { examDate: '2026-08-01', resultPublishDate: '2026-09-09', member1: 'Dr. First Member', member2: 'Dr. Second Member', member3: 'Dr. Third Member', member4: 'Dr. External Member' };
  for (const examType of ['Backlog', 'Short Semester']) for (const kind of ['marks', 'tabulation']) {
    const courses = examType === 'Backlog' ? obe.courses.filter(course => course.type === 'Theory').slice(0, 40) : [...obe.courses, ...old.courses];
    assert.ok(examType !== 'Backlog' || courses.length === 40);
    const rows = Array.from({ length: 18 }, (_, index) => ({ ...source.rows[index % 2], id: `s${index}`, roll: String(2012001 + index), name: `Student ${index + 1} With A Longer Name`, registration: `REG-${index + 1}`, nonObe: index >= 14, results: Object.fromEntries(courses.map(course => [course.id, { values: course.type === 'Sessional' ? ['55', '20', '75', 'B+'] : ['22.5', '23', '15', '61', 'B'], grade: 'B' }])), failed: courses.slice(0, 12).map(course => course.code) }));
    const sheet = { ...source, examType, courses, rows };
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    for (const [filename, style] of [['FreeSerif.ttf', 'normal'], ['FreeSerifBold.ttf', 'bold'], ['FreeSerifBoldItalic.ttf', 'bolditalic']]) { doc.addFileToVFS(filename, fs.readFileSync('public/fonts/' + filename).toString('base64')); doc.addFont(filename, 'FreeSerif', style); }
    const result = renderFourthYearExamPdf(doc, sheet, kind, { committee, tabulator });
    assert.ok(result.horizontalParts > 1);
    assert.ok(result.pages >= result.horizontalParts * 2);
    const filename = `.next/fourth-year-pdf-qa/${examType.replace(' ', '-').toLowerCase()}-${kind}.pdf`;
    fs.writeFileSync(filename, Buffer.from(doc.output('arraybuffer')));
    console.log(JSON.stringify({ filename, ...result }));
  }
});


test('marksheet starts non-OBE on a new page even when OBE leaves space', () => {
  const sheet = buildFourthYearSheet(data, [], '2024', 'Backlog');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  for (const [filename, style] of [['FreeSerif.ttf', 'normal'], ['FreeSerifBold.ttf', 'bold'], ['FreeSerifBoldItalic.ttf', 'bolditalic']]) {
    doc.addFileToVFS(filename, fs.readFileSync('public/fonts/' + filename).toString('base64')); doc.addFont(filename, 'FreeSerif', style);
  }
  const drawn = [], original = doc.text.bind(doc);
  doc.text = (text, x, y, options) => { drawn.push({ text, x, y, page: doc.getNumberOfPages() }); return original(text, x, y, options); };
  renderFourthYearExamPdf(doc, sheet, 'marks');
  const obe = drawn.find(item => item.text === 'OBE:');
  const nonObe = drawn.find(item => item.text === 'Non-OBE:');
  assert.ok(nonObe.page > obe.page);
  assert.equal(nonObe.y, obe.y);
  assert.equal(drawn.filter(item => item.text === 'CE 1125').length, 2);
  assert.equal(drawn.filter(item => item.text === 'Roll No.').length, 2);
  assert.equal(doc.getNumberOfPages(), 2);
});


test('completion remarks follow degree credits and publication format', () => {
  const sheet = buildFourthYearSheet(data, [], '2024', 'Backlog');
  assert.equal(sheet.rows[0].degreeCredit, 163.5);
  assert.equal(sheet.rows[1].degreeCredit, 161);
  const graduate = { ...sheet.rows[1], totalCredit: 161, cgpa: 3.1, register: ['STALE 1001'] };
  const current = fourthYearPdfColumns(sheet, 'tabulation', '2026-09-09').groups.find(group => group.id === 'remarks').columns;
  assert.equal(current[0].title, 'Status');
  assert.equal(current[0].value(graduate), 'Passed');
  assert.equal(current[1].value(graduate), '');
  const legacy = fourthYearPdfColumns(sheet, 'tabulation', '2026-07-01').groups.find(group => group.id === 'remarks').columns;
  assert.equal(legacy[0].title, 'Failed Subjects');
  assert.equal(legacy[0].value(graduate), 'First Class');
  assert.equal(current[0].value({ ...graduate, totalCredit: 160, failed: ['CE 1125'] }), 'CE 1125');
  assert.equal(current[0].value({ ...sheet.rows[0], totalCredit: 161, failed: ['CE 1125'] }), 'CE 1125');
});
