import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeExcelDraft, excelDraftKey, restoreExcelDraft } from '../lib/excelInputDraft.ts';

const cell = (a = '') => ({ a, b: '', ct: '', sessional: '', internal: '', external: '', viva: '' });
const row = (changes = {}) => ({ id: 'student-1', roll: '2012001', boardViva: '', cells: { 'Odd|obe': cell(), 'Even|old': cell() }, registered: { 'Odd|obe': true, 'Even|old': true }, ...changes });

test('draft survives reload and reordered columns without moving marks between syllabuses', () => {
  const draft = encodeExcelDraft([row({ dirty: true, cells: { 'Odd|obe': cell('0'), 'Even|old': cell('23.5') }, registered: { 'Odd|obe': false, 'Even|old': true } })]);
  const fresh = row({ identityIds: new Set(['student-1']), cells: { 'Even|old': cell(), 'Odd|obe': cell(), 'Odd|new': cell('12') } });
  const [restored] = restoreExcelDraft([fresh], draft);
  assert.equal(restored.cells['Odd|obe'].a, '0');
  assert.equal(restored.cells['Even|old'].a, '23.5');
  assert.equal(restored.cells['Odd|new'].a, '12');
  assert.equal(restored.registered['Odd|obe'], false);
  assert.equal(restored.identityIds, fresh.identityIds);
  assert.equal(restored.dirty, true);
});

test('drafts only contain edited rows and cannot apply to a different student', () => {
  const draft = encodeExcelDraft([row(), row({ id: 'student-2', dirty: true })]);
  assert.equal(JSON.parse(draft).rows.length, 1);
  const fresh = row({ cells: { 'Odd|obe': cell('17') } });
  assert.deepEqual(restoreExcelDraft([fresh], draft), [fresh]);
});

test('exam keys separate regular semesters, years and backlog', () => {
  const keys = [
    excelDraftKey('Regular', '2024', '4th', 'Odd'),
    excelDraftKey('Regular', '2024', '4th', 'Even'),
    excelDraftKey('Backlog', '2024', '4th', 'Odd'),
    excelDraftKey('Backlog', '2025', '4th', 'Odd'),
    excelDraftKey('Backlog', '2024', '3rd', 'Odd'),
  ];
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys[2], excelDraftKey('Backlog', '2024', '4th', 'Even'));
});

test('invalid drafts are rejected and absent drafts leave saved marks intact', () => {
  const fresh = [row()];
  assert.equal(restoreExcelDraft(fresh, null), fresh);
  assert.throws(() => restoreExcelDraft(fresh, '{broken'));
  assert.throws(() => restoreExcelDraft(fresh, '{"version":1,"rows":[{}]}'));
});
