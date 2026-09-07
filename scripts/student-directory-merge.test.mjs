import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeStudentDirectory, DuplicateStudentError } from '../lib/studentDirectoryMerge.ts';

const original = { id: 'original', rollNo: '2012001', name: 'Original student', year: '4th' };
test('duplicate upload cannot replace original identity or details', () => {
  const current = [structuredClone(original)];
  assert.throws(() => mergeStudentDirectory(current, [{ ...original, id: 'duplicate', name: 'Sample Student' }]), DuplicateStudentError);
  assert.deepEqual(current, [original]);
});
test('rejects repeated rolls and IDs within a batch without partial additions', () => {
  assert.throws(() => mergeStudentDirectory([], [{ id: 'a', rollNo: 'ABC' }, { id: 'b', rollNo: ' abc ' }]), DuplicateStudentError);
  assert.throws(() => mergeStudentDirectory([], [{ id: 'a', rollNo: '1' }, { id: 'a', rollNo: '2' }]), DuplicateStudentError);
  const current = [original];
  assert.throws(() => mergeStudentDirectory(current, [{ id: 'new', rollNo: '2012002' }, { id: 'other', rollNo: ' 2012001 ' }]), DuplicateStudentError);
  assert.deepEqual(current, [original]);
});
test('allows new students and editing or promoting the original ID', () => {
  const updated = { ...original, semester: 'Even' };
  const added = { id: 'new', rollNo: '2012002', name: 'New student', year: '1st' };
  assert.deepEqual(mergeStudentDirectory([original], [updated, added]), [updated, added]);
});
test('editing a student cannot take another student’s roll', () => {
  assert.throws(() => mergeStudentDirectory([original, { id: 'other', rollNo: '2012002' }], [{ ...original, rollNo: '2012002' }]), DuplicateStudentError);
});
