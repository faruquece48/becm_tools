import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
const p=new PrismaClient({adapter:new PrismaNeon({connectionString:process.env.DATABASE_URL})});
const E={examYear:"2024",academicYear:"4th",semester:"Odd"},codes=["BECM 4101","BECM 4111","BECM 4115","BECM 4141","CE 4103","BECM 4132","BECM 4170","BECM 4130","BECM 4100"];
const rows=[
["1712020",[[18,18,23],[20,15,15],[19.5,11,14],[22,12,17],[6.5,3,13]],[33,34,38,52],17],
["2012001",[[16,22,30],[14.5,17,33],[18,13.5,27],[22,16,35],[11,15,31]],[47,56,55,60],16],
["2012002",[[18,19,25],[20,22,30],[22,11.5,24],[13,11.5,26],[6,18.5,20]],[58,54,45,59],17],
["2012003",[[26,23,29],[19.5,18,29],[21.5,20,32],[24,16,38],[11.5,20,29]],[50,54,52,49],15],
["2012005",[[15,18,23],[7,15,25],[21,7,21],[20,8.5,30],[15,13.5,25]],[31,51,42,40],10],
["2012006",[[23,24,32],[18,20,30],[24,22,31],[22,20.5,30],[19,21.5,30]],[56,46,64,66],16],
["2012007",[[21,19,27],[16,18,31],[19,17,26],[20.5,9.5,36],[14,11,26]],[45,53,53,56],20],
["2012008",[[4,15,18],[9,15,9],[13,3,10],[19,5.5,18],[0,0,10]],[29,43,40,51],11],
["2012009",[[19,14,28],[18,15,25],[14.5,8,25],[17,11.5,32],[5,14.5,24]],[55,50,53,53],16],
["2012011",[[22,23,22],[22,25,30],[21,19.5,24],[27,21.5,34],[16,15.5,24]],[29,56,54,55],13],
["2012012",[[19.5,18,29],[13,16,29],[17.5,15.5,25],[23,9,34],[6,5.5,16]],[40,54,43,32],14],
["2012013",[[16,18,23],[21,14,20],[15,18,24],[12,12.5,27],[7,11.5,22]],[40,54,55,65],13],
["2012014",[[19,20,26],[13,16,32],[18.5,7,30],[19,17.5,36],[15,21,24]],[38,54,51,52],18],
["2012015",[[20,17,25],[16,14,28],[17,9,19],[11.5,11.5,33],[7,18.5,26]],[41,54,55,41],14],
["2012016",[[10.5,21,23],[14.5,20,16],[17.5,14.5,22],[12,12,31],[14,14,29]],[29,46,40,51],12],
["2012017",[[18,18,22],[22,12,32],[16.5,21.5,27],[24,11,26],[10.5,7.5,19]],[50,51,57,32],15],
["2012019",[[8,13,23],[16,12,17],[14,8.5,20],[12,8.5,27],[6.5,7,25]],[39,41,50,51],12],
["2012021",[[18,21,23],[9,15,13],[14,12.5,19],[14,9.5,27],[4,14,26]],[61,53,51,49],12],
["2012023",[[22,20,23],[21,18,26],[18,20,21],[21,17.5,34],[14.5,15.5,31]],[54,46,59,55],12],
["2012024",[[20,16,20],[23,19,17],[17.5,14,18],[21,13,21],[9,14,17]],[45,42,49,54],16],
["2012025",[[20,11,26],[17,15,25],[19,12,20],[18,6,32],[7,12,19]],[51,54,51,40],14],
["2012026",[[17.5,22,28],[15.5,20,28],[24,21,26],[20,13,31],[9.5,12.5,24]],[55,53,55,33],13],
["2012027",[[16.5,19,26],[22,16,31],[19,17,28],[25,12.5,34],[21.5,14.5,32]],[58,52,59,54],14],
["2012028",[[17.5,14,26],[14,13,28],[17.5,5,27],[19,15.5,37],[16.5,10.5,31]],[42,54,56,55],13],
["2012029",[[18,12,22],[14.5,14,27],[13,11,19],[14,6.5,29],[4,7,26]],[45,47,54,48],11],
["2012030",[[11,19,24],[22,18,32],[17.5,17,18],[13,17,29],[6.5,10,20]],[56,49,61,66],15]
];
const N=v=>String(v||"").replace(/s/g,"").toLowerCase(),load=async s=>(await p.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1',s))[0]?.data||[],write=(s,d)=>p.$executeRawUnsafe('INSERT INTO "ResultSectionStore"("section","data","updatedAt")VALUES($1,CAST($2 AS jsonb),NOW())ON CONFLICT("section")DO UPDATE SET "data"=EXCLUDED."data","updatedAt"=NOW()',s,JSON.stringify(d));
const roundSgpa=value=>(Math.round((value+Number.EPSILON)*100)/100).toFixed(2);
const points={"A+":4,A:3.75,"A-":3.5,"B+":3.25,B:3,"B-":2.75,"C+":2.5,C:2.25,D:2,F:0},letter=(score,theory,parts)=>theory&&parts[0]+parts[1]<15?"F":score>=80?"A+":score>=75?"A":score>=70?"A-":score>=65?"B+":score>=60?"B":score>=55?"B-":score>=50?"C+":score>=45?"C":score>=40?"D":"F";
try{
 const[D,S,P,V,A,H,R,B]=await Promise.all(["student-directory","syllabuses","prepare-result","add-viva-marks","marks-sheet","student-eligibility","result-sheet","marks-sheet-backlog"].map(load));
 const segment=S.find(x=>x.active!==false&&Number(x.fromSeries)<=2020&&Number(x.toSeries)>=2020),courses=codes.map(code=>(segment?.courses||[]).find(c=>N(c.code)===N(code)&&c.year==="4th"&&c.semester==="Odd"));
 if(courses.some(c=>!c))throw Error("One or more 4th Year Odd syllabus courses are missing.");
 const identities=new Map(rows.map(([roll])=>[roll,D.find(s=>N(s.rollNo)===N(roll))]));for(const[roll,s]of identities)if(!s)throw Error("Student "+roll+" missing");
 const now=new Date().toISOString(),ids=new Set([...identities.values()].map(s=>s.id)),targetCodes=new Set(codes.map(N));
 for(const list of[P,H])for(let i=list.length-1;i>=0;i--){const x=list[i];if(x.examYear===E.examYear&&x.academicYear===E.academicYear&&x.semester===E.semester&&targetCodes.has(N(x.courseCode)))list.splice(i,1)}
 courses.forEach((course,i)=>{const incoming=rows.map(([roll,t,s])=>{const student=identities.get(roll),base={studentId:student.id,name:student.name,rollNo:student.rollNo,registrationNo:student.registrationNo,registrationType:"Regular",withheld:false,present:true,remarks:""};return i<5?{...base,partA:String(t[i][0]),partB:String(t[i][1]),classTestAttendance:String(t[i][2]),sessional:""}:{...base,partA:"",partB:"",classTestAttendance:"",sessional:String(s[i-5])}});P.push({...E,courseId:course.id,courseCode:course.code,courseTitle:course.title,courseType:course.type,students:incoming,updatedAt:now});H.push({...E,courseId:course.id,courseCode:course.code,courseTitle:course.title,students:incoming.map(x=>({studentId:x.studentId,eligible:true})),updatedAt:now})});
 let viva=V.find(x=>x.examYear===E.examYear&&x.academicYear===E.academicYear&&x.semester===E.semester);if(viva?.published)throw Error("The target viva result is published and cannot be replaced.");const vivaStudents=rows.map(([roll,,,mark])=>{const s=identities.get(roll);return{id:s.id,name:s.name,registrationNo:s.registrationNo,rollNo:s.rollNo,registrationType:"Regular",marks:String(mark),present:true}});const vivaRecord={...(viva||{}),department:"Building Engineering & Construction Management",...E,students:vivaStudents,finalized:true,published:false,updatedAt:now};const vi=V.indexOf(viva);vi<0?V.push(vivaRecord):V[vi]=vivaRecord;
 const archiveStudents=rows.map(([roll,theories,sessionals,vivaMark])=>{const s=identities.get(roll),grades=theories.map(x=>letter(Math.round(x[0]+x[1]+x[2]),true,x)).concat(sessionals.map(x=>letter(Math.round(x+vivaMark),false,[0,0]))),earned=grades.reduce((sum,g,i)=>sum+(g==="F"?0:Number(courses[i].credit)),0),quality=grades.reduce((sum,g,i)=>sum+(points[g]||0)*Number(courses[i].credit),0);return{studentId:s.id,rollNo:s.rollNo,earnedCredit:earned,gradePoints:+quality.toFixed(3),sgpa:earned?roundSgpa(quality/earned):"0.00",failedSubjects:grades.flatMap((g,i)=>g==="F"?[courses[i].code]:[]),registerAgain:[]}});
 let archive=A.find(x=>x.examYear===E.examYear&&x.academicYear===E.academicYear&&x.semester===E.semester),archiveRecord={...(archive||{}),...E,series:"2020",students:archiveStudents,updatedAt:now,formatVersion:archive?.formatVersion||"legacy"};const ai=A.indexOf(archive);ai<0?A.push(archiveRecord):A[ai]=archiveRecord;
 const prior=[...A,...B].filter(x=>Number(x.examYear)<2024||x.examYear==="2024"&&(x.academicYear!=="4th"||x.semester!=="Odd"));const resultStudents=archiveStudents.map(cur=>{const previous=prior.flatMap(x=>{const item=(x.students||[]).find(s=>s.studentId===cur.studentId||N(s.rollNo)===N(cur.rollNo));return item?[item]:[]}),totalEarnedCredit=previous.reduce((s,x)=>s+Number(x.earnedCredit||0),0)+cur.earnedCredit,totalGradePoints=previous.reduce((s,x)=>s+Number(x.gradePoints||0),0)+cur.gradePoints,previousFailed=previous.flatMap(x=>x.failedSubjects||[]),passed=new Set(courses.filter((c,i)=>!cur.failedSubjects.includes(c.code)).map(c=>N(c.code))),failedSubjects=[...new Set([...previousFailed,...cur.failedSubjects].filter(code=>!passed.has(N(code))))];return{studentId:cur.studentId,failedSubjects,registerAgain:[],totalEarnedCredit,totalGradePoints:+totalGradePoints.toFixed(3),cgpa:totalEarnedCredit?(totalGradePoints/totalEarnedCredit).toFixed(2):"0.00"}});
 const resultRecord={...E,series:"2020",students:resultStudents,updatedAt:now},ri=R.findIndex(x=>x.examYear===E.examYear&&x.academicYear===E.academicYear&&x.semester===E.semester);ri<0?R.push(resultRecord):R[ri]=resultRecord;
 if(!process.argv.includes("--apply")){console.log("Validation complete; rerun with --apply to save.");await p.$disconnect();process.exit(0)}for (const [section,data] of [["student-eligibility",H],["prepare-result",P],["add-viva-marks",V],["marks-sheet",A],["result-sheet",R]]) await write(section,data);
 console.log(JSON.stringify({examination:E,students:rows.length,courses:courses.map(c=>c.code),archive:archiveStudents.map(x=>({roll:x.rollNo,earned:x.earnedCredit,sgpa:x.sgpa,failed:x.failedSubjects}))},null,2));
}finally{await p.$disconnect()}
