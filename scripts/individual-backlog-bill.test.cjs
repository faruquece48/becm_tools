/* eslint-disable @typescript-eslint/no-require-imports -- Run the shared TypeScript bill calculation in Node. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { emptyBill } = require('../app/bills/create/components/emptyBill.ts');
const { buildRemunerationChart, deriveTeacherRows, rowAmount } = require('../app/bills/individual/individualBill.ts');

function importedBill(examType) {
  const bill = structuredClone(emptyBill);
  bill.billInfo = { ...bill.billInfo, examType, totalStudents: '30' };
  const duties = { paperSetter: true, examiner: true, classTest: true, assignment: true, courseFile: true };
  const students = { examiner: '30', assignment: '30', classTestCount: 2, classTestStudents: '' };
  bill.courseDuties.obe = [{ courseCode: 'BECM 4101', courseTitle: 'Theory', parts: [{ part: 'A', teacher: 'Main Teacher', duties, students, additionalTeachers: [{ name: 'Additional Teacher', duties, students }] }] }];
  return bill;
}

test('imported backlog duties omit legacy additional-teacher charges', () => {
  const bill = importedBill('backlog');
  const mainRows = deriveTeacherRows(bill, 'Main Teacher');
  assert.deepEqual(mainRows.map(row => row.rate), ['5000', '120']);
  assert.equal(mainRows.reduce((sum, row) => sum + rowAmount(row), 0), 8600);
  assert.deepEqual(deriveTeacherRows(bill, 'Additional Teacher'), []);
  bill.courseDuties.nonObe = [structuredClone(bill.courseDuties.obe[0])];
  bill.courseDuties.nonObe[0].parts[0].teacher = 'Stale Non-OBE Teacher';
  assert.deepEqual(deriveTeacherRows(bill, 'Stale Non-OBE Teacher'), []);
  // Individual-summary pages use the same rows, including mixed examination files.
  const pages = [importedBill('backlog'), importedBill('semester')];
  assert.equal(pages.reduce((sum, page) => sum + deriveTeacherRows(page, 'Main Teacher').reduce((total, row) => total + rowAmount(row), 0), 0), 23950);
});

test('regular and short-semester duty rules remain intact', () => {
  assert.deepEqual(deriveTeacherRows(importedBill('semester'), 'Main Teacher').map(row => row.rate), ['5000', '120', '50', '50', '6000']);
  assert.deepEqual(deriveTeacherRows(importedBill('short'), 'Main Teacher').map(row => row.rate), ['5000', '120', '50']);
});

test('mixed examination committee rows split by system and cap member remuneration', () => {
  const bill = importedBill('semester');
  bill.billInfo.evaluationSystem = 'mixed';
  bill.committees = [
    { name: 'Chair Teacher', designation: '', department: '', role: 'Chairman' },
    { name: 'Member Teacher', designation: '', department: '', role: 'Member' },
  ];
  bill.courseDuties.obe.push(structuredClone(bill.courseDuties.obe[0]));
  bill.courseDuties.obe[1].courseCode = 'BECM 4103';
  bill.courseDuties.nonObe = Array.from({ length: 4 }, (_, index) => {
    const course = structuredClone(bill.courseDuties.obe[0]);
    course.courseCode = `BECM 31${index + 1}`;
    return course;
  });
  

  const chairRows = deriveTeacherRows(bill, 'Chair Teacher');
  assert.deepEqual(chairRows.map(row => row.description), [
    'পরীক্ষা কমিটির সভাপতি (OBE)',
    'পরীক্ষা কমিটির সদস্য (OBE)',
    'পরীক্ষা কমিটির সভাপতি (Non-OBE)',
    'পরীক্ষা কমিটির সদস্য (Non-OBE)',
  ]);
  assert.deepEqual(chairRows.map(row => rowAmount(row)), [5000, 3000, 5000, 5000]);
  const committeeChart = buildRemunerationChart(chairRows)[1];
  assert.deepEqual(committeeChart.rows.filter(row => row.duty).map(row => row.description), [
    'পরীক্ষা কমিটির সভাপতি (OBE)',
    'পরীক্ষা কমিটির সভাপতি (Non-OBE)',
    'পরীক্ষা কমিটির সদস্য (OBE)',
    'পরীক্ষা কমিটির সদস্য (Non-OBE)',
  ]);

  const memberRows = deriveTeacherRows(bill, 'Member Teacher');
  assert.deepEqual(memberRows.map(row => row.courseCount), ['2', '4']);
  assert.deepEqual(memberRows.map(row => rowAmount(row)), [3000, 5000]);
});

test('OBE-only committee remuneration remains unchanged', () => {
  const bill = importedBill('semester');
  bill.committees = [{ name: 'Member Teacher', designation: '', department: '', role: 'Member' }];
  const rows = deriveTeacherRows(bill, 'Member Teacher');
  assert.deepEqual(rows.map(row => row.description), ['পরীক্ষা কমিটির সদস্য']);
  assert.deepEqual(rows.map(row => rowAmount(row)), [5000]);
});
test('explicit OBE bills ignore stale Non-OBE course and scrutiny data', () => {
  const bill = importedBill('semester');
  bill.courseDuties.nonObe = [structuredClone(bill.courseDuties.obe[0])];
  bill.courseDuties.nonObe[0].parts[0].teacher = 'Stale Non-OBE Teacher';
  bill.scrutinies.nonObe = [{ name: 'Stale Non-OBE Scrutiny', designation: '', department: '', scriptCount: 12 }];
  assert.deepEqual(deriveTeacherRows(bill, 'Stale Non-OBE Teacher'), []);
  assert.deepEqual(deriveTeacherRows(bill, 'Stale Non-OBE Scrutiny'), []);
});

test('backlog course-file charges are excluded from saved sessional and industrial duties', () => {
  const bill = importedBill('backlog');
  bill.courseDuties.obe = [];
  const entry = { name: 'Main Teacher', duties: { courseFile: true, sessional: false, boardViva: false }, students: { sessional: '30', boardViva: '' } };
  bill.sessionalDuties = ['BECM 4102', 'BECM 4100'].map(courseCode => ({ courseCode, teacher: '', teacherCount: 1, credit: '1.5', duties: entry.duties, students: entry.students, additionalTeachers: [entry] }));
  const rows = deriveTeacherRows(bill, 'Main Teacher');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rate, '400');
});
