import { test } from 'node:test';
import assert from 'node:assert/strict';
import { savePromotion, editPromotion, promotionCoursesChanged } from '../lib/oldStudentPromotions.ts';
const original={id:'original',examYear:'2025',academicYear:'4th',semester:'Even',examType:'Regular',courseIds:['A','B']};
test('publication check ignores metadata and course order but detects moving or removing registration',()=>{
 assert.equal(promotionCoursesChanged([original],[{...original,id:'replacement',promotedAt:'new timestamp',courseIds:['B','A']}],original),false);
 assert.equal(promotionCoursesChanged([original],[{...original,examYear:'2024'}],original),true);
 assert.equal(promotionCoursesChanged([original],[{...original,courseIds:['A']}],original),true);
});
test('editing moves a registration to the corrected year without leaving the old entry',()=>{
 const corrected={...original,examYear:'2024'};
 assert.deepEqual(editPromotion([original],corrected),[corrected]);
});
test('editing other exam inputs preserves unrelated promotions',()=>{
 const other={...original,id:'other',examYear:'2023'};
 const corrected={...original,academicYear:'3rd',semester:'Backlog',examType:'Backlog',courseIds:['B']};
 assert.deepEqual(editPromotion([original,other],corrected),[corrected,other]);
});
test('editing cannot overwrite an existing destination examination',()=>{
 const other={...original,id:'other',examYear:'2024'};
 assert.throws(()=>editPromotion([original,other],{...original,examYear:'2024'}),/already exists/);
 assert.throws(()=>editPromotion([] ,original),/no longer exists/);
});
test('repeat registration preserves existing subjects and identity',()=>{
 assert.deepEqual(savePromotion([original],{...original,id:'new',courseIds:['A','C']},false),[{...original,courseIds:['A','B','C']}]);
 assert.deepEqual(original.courseIds,['A','B']);
});
test('explicit change removes subjects or cancels the selected examination',()=>{
 assert.deepEqual(savePromotion([original],{...original,courseIds:['A']},true),[{...original,courseIds:['A']}]);
 assert.deepEqual(savePromotion([original],{...original,courseIds:[]},true),[]);
});
test('repeat attempts in different exams remain separate',()=>{
 const later={...original,id:'later',examYear:'2026'};
 assert.deepEqual(savePromotion([original],later,false),[original,later]);
});
test('backlog matching ignores semester and prevents duplicated subjects',()=>{
 const backlog={...original,examType:'Backlog',semester:'Backlog'};
 assert.deepEqual(savePromotion([backlog],{...backlog,semester:'Even',courseIds:['A']},false)[0].courseIds,['A','B']);
});
