import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderBacklogCourses } from '../lib/backlogCourseOrder.ts';
import { defaultSyllabuses } from '../lib/storage/syllabuses.ts';

test('4th-year backlog follows OBE syllabus serials before non-OBE, regardless of registration order', () => {
  const [old, obe] = defaultSyllabuses;
  const obeCourses = obe.courses.filter(course => course.year === '4th' && course.type === 'Theory');
  const oldCourses = old.courses.filter(course => course.year === '4th' && course.type === 'Theory');
  const expected = [...obeCourses, ...oldCourses];
  const registrations = [...expected].reverse();
  const before = [...registrations];
  assert.deepEqual(orderBacklogCourses(registrations, defaultSyllabuses), expected);
  assert.deepEqual(registrations, before);
});

test('a registered subset retains syllabus order and unlisted subjects remain available at the end', () => {
  const [old, obe] = defaultSyllabuses;
  const first = obe.courses.find(course => course.code === 'CE 4201');
  const second = obe.courses.find(course => course.code === 'BECM 4211');
  const historical = old.courses.find(course => course.code === 'BECM 4211');
  const unknown = { ...first, id: 'unlisted', code: 'CUSTOM 4001' };
  assert.deepEqual(
    orderBacklogCourses([historical, unknown, second, first], defaultSyllabuses),
    [first, second, historical, unknown],
  );
});
