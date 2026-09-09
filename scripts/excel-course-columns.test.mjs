import { test } from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { excelCoursePrefix, excelCourseValue } from '../lib/excelCourseColumns.ts';

const obe = { id: 'course-1', code: 'CE 1125', semester: 'Odd' };
const old = { ...obe, id: 'old-course-1' };
const courses = [obe, old];

test('OBE and non-OBE marks with the same code survive Excel serialization independently', () => {
  const headers = courses.map(course => `${excelCoursePrefix(course)} A`);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ['12.5', '22']]);
  const [record] = XLSX.utils.sheet_to_json(sheet);
  assert.equal(excelCourseValue(record, obe, [...courses].reverse(), 'A'), '12.5');
  assert.equal(excelCourseValue(record, old, [...courses].reverse(), 'A'), '22');
});

test('legacy duplicate columns remain associated with their syllabus occurrence', () => {
  const sheet = XLSX.utils.aoa_to_sheet([['CE 1125 Odd A', 'CE 1125 Odd A'], ['12.5', '22']]);
  const [record] = XLSX.utils.sheet_to_json(sheet);
  assert.equal(excelCourseValue(record, obe, courses, 'A'), '12.5');
  assert.equal(excelCourseValue(record, old, courses, 'A'), '22');
});
