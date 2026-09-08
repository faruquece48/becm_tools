import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promotionRegistrationReason } from '../lib/studentPromotionAudit.ts';
const student={id:'one',rollNo:'2012001',year:'3rd',semester:'Even',placementExamYear:'2023'};
const exam={examYear:'2023',academicYear:'3rd',semester:'Even',students:[{studentId:'one'}]};
test('unused destination semester allows cancellation',()=>assert.equal(promotionRegistrationReason(student,[]),''));
test('target semester eligibility or result records block cancellation',()=>{
 for(const section of ['student-eligibility','prepare-result','marks-sheet','result-sheet','add-viva-marks'])assert.ok(promotionRegistrationReason(student,[{section,data:[exam]}]));
});
test('other exams and students do not prevent cancellation',()=>{
 assert.equal(promotionRegistrationReason(student,[{section:'prepare-result',data:[{...exam,semester:'Odd'},{...exam,students:[{studentId:'two'}]}]}]),'');
});
test('historical identity still blocks through matching roll',()=>assert.ok(promotionRegistrationReason(student,[{section:'marks-sheet',data:[{...exam,students:[{studentId:'old',rollNo:'2012001'}]}]}])));
