/* eslint-disable @typescript-eslint/no-require-imports -- Run the shared TypeScript bill calculation in Node. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { emptyBill } = require('../app/bills/create/components/emptyBill.ts');
const { deriveTeacherRows, rowAmount } = require('../app/bills/individual/individualBill.ts');

function importedBill(examType) {
  const bill = structuredClone(emptyBill);
  bill.billInfo = { ...bill.billInfo, examType, totalStudents: '30' };
  const duties = { paperSetter: true, examiner: true, classTest: true, assignment: true, courseFile: true };
  const students = { examiner: '30', assignment: '30', classTestCount: 2, classTestStudents: '' };
  bill.courseDuties.obe = [{ courseCode: 'BECM 4101', courseTitle: 'Theory', parts: [{ part: 'A', teacher: 'Main Teacher', duties, students, additionalTeachers: [{ name: 'Additional Teacher', duties, students }] }] }];
  return bill;
}

test('imported backlog duties produce only eligible charges for main and additional teachers', () => {
  const bill = importedBill('backlog');
  for (const teacher of ['Main Teacher', 'Additional Teacher']) {
    const rows = deriveTeacherRows(bill, teacher);
    assert.deepEqual(rows.map(row => row.rate), ['5000', '120']);
    assert.equal(rows.reduce((sum, row) => sum + rowAmount(row), 0), 8600);
  }
  // Individual-summary pages use the same rows, including mixed examination files.
  const pages = [importedBill('backlog'), importedBill('semester')];
  assert.equal(pages.reduce((sum, page) => sum + deriveTeacherRows(page, 'Main Teacher').reduce((total, row) => total + rowAmount(row), 0), 0), 23950);
});

test('regular and short-semester duty rules remain intact', () => {
  assert.deepEqual(deriveTeacherRows(importedBill('semester'), 'Main Teacher').map(row => row.rate), ['5000', '120', '50', '50', '6000']);
  assert.deepEqual(deriveTeacherRows(importedBill('short'), 'Main Teacher').map(row => row.rate), ['5000', '120', '50']);
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
