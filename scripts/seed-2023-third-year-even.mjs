import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
const p=new PrismaClient({adapter:new PrismaNeon({connectionString:process.env.DATABASE_URL})});
const E={examYear:"2023",academicYear:"3rd",semester:"Even"},codes=["BECM 3211","BECM 3271","BECM 3273","BECM 3231","BECM 3241","BECM 3270","BECM 3202","BECM 3210","BECM 3242"];
const rows=[
["1712020",[[13.5,19,21],[8,10,7],[21.5,7,9],[19,19,11],[16.5,13.5,0]],[2,25,20,19],14],
["2012001",[[16,12,34],[13,15,23],[10.5,10,31],[21,19.5,34],[14,21.5,29]],[54,55,57,45],17],
["2012002",[[17,17,30],[7,8,22],[10.5,9,20],[20,18,29],[15,9,23]],[59,53,48,44],20],
["2012003",[[16,21.5,33],[13,15,27],[11.5,13.5,31],[23.5,20.5,34],[19.5,16,31]],[50,53,57,47],19],
["2012005",[[20.5,11,31],[11,1,20],[21.5,4,27],[15,13,28],[14,19,18]],[47,44,51,40],16],
["2012006",[[22,20,34],[11,2,26],[8.5,13,26],[25.5,23.5,33],[21,7.5,27]],[53,59,58,46],17],
["2012007",[[19,21,32],[13,11,26],[18.5,11,28],[22,19.5,35],[18,23.5,25]],[58,54,51,46],18],
["2012008",[[10.5,8.5,16],[3,1,14],[6.5,6,13],[12,11,11],[0,0,13]],[23,34,37,35],12],
["2012009",[[21,17,35],[10,11,22],[15,3,28],[18,19,34],[10,20.5,26]],[60,49,51,47],17],
["2012011",[[24,23,35],[19,18,28],[27.5,13,34],[24,24.5,35],[14,27,31]],[53,58,60,48],16],
["2012012",[[17.5,18,35],[10,15,28],[16,8,26],[19,17.5,37],[16.5,19,29]],[53,56,52,56],19],
["2012013",[[12.5,17,32],[11,9,20],[18.5,3,26],[21,23.5,34],[5.5,21.5,23]],[50,57,57,54],17],
["2012014",[[15.5,22.5,35],[17,19,25],[24.5,19,32],[19,22,34],[20.5,26,26]],[58,49,52,58],17],
["2012015",[[16.5,20,34],[6,18,30],[18,5,30],[19.5,14,32],[18,19,25]],[63,54,62,46],18],
["2012016",[[18,17.5,32],[8,9,23],[16.5,8,26],[18,18.5,28],[9,20,20]],[47,53,48,58],17],
["2012017",[[19,21.5,32],[7,11,22],[13.5,6,17],[18,19.5,33],[12,15,21]],[54,54,48,49],18],
["2012019",[[13,11.5,23],[5,10,21],[7.5,5,20],[14,15,23],[10,16.5,14]],[34,47,44,36],15],
["2012021",[[15.5,11.5,24],[6,6,21],[14.5,3,22],[19.5,18,30],[5,10.5,21]],[46,50,53,41],16],
["2012023",[[21,20,32],[12,13,21],[15.5,14,26],[22,19,30],[9.5,21.5,22]],[63,49,56,43],17],
["2012024",[[19,22.5,20],[11,11,19],[15.5,2,20],[24,21,22],[7.5,11.5,17]],[54,50,39,27],17],
["2012025",[[13.5,22,35],[11,8,23],[11.5,15,19],[22,16.5,29],[14.5,14.5,28]],[57,50,51,44],16],
["2012026",[[16,11,35],[10,5,25],[21,8,27],[15.5,22.5,32],[14.5,24,26]],[60,54,55,48],18],
["2012027",[[21,21,32],[14,13,25],[19,7,26],[20,23.5,34],[13.5,20.5,30]],[62,47,54,46],18],
["2012028",[[13,13,32],[10,13,35],[23,14,29],[16,19,32],[16,27,25]],[54,42,53,47],18],
["2012029",[[11,17,33],[6,17,24],[9,7,25],[17,14,31],[7.5,17,17]],[45,49,55,48],20],
["2012030",[[12.5,22,32],[6,9,21],[9.5,8,24],[18,22,27],[15.5,17.5,30]],[49,58,50,47],19],
];
const N=v=>String(v||"").replace(/s/g,"").toLowerCase(),load=async s=>(await p.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1',s))[0]?.data||[],write=(s,d)=>p.$executeRawUnsafe('INSERT INTO "ResultSectionStore"("section","data","updatedAt")VALUES($1,CAST($2 AS jsonb),NOW())ON CONFLICT("section")DO UPDATE SET "data"=EXCLUDED."data","updatedAt"=NOW()',s,JSON.stringify(d));
const points={"A+":4,A:3.75,"A-":3.5,"B+":3.25,B:3,"B-":2.75,"C+":2.5,C:2.25,D:2,F:0},letter=(score,theory,parts)=>theory&&parts[0]+parts[1]<15?"F":score>=80?"A+":score>=75?"A":score>=70?"A-":score>=65?"B+":score>=60?"B":score>=55?"B-":score>=50?"C+":score>=45?"C":score>=40?"D":"F";
try{
 const[D,S,P,V,A,H,R]=await Promise.all(["student-directory","syllabuses","prepare-result","add-viva-marks","marks-sheet","student-eligibility","result-sheet"].map(load));
 const segment=S.find(x=>x.active!==false&&Number(x.fromSeries)<=2020&&Number(x.toSeries)>=2020),courses=codes.map(code=>(segment?.courses||[]).find(c=>N(c.code)===N(code)&&c.year==="3rd"&&c.semester==="Even"));
 if(courses.some(c=>!c))throw Error("One or more 3rd Year Even syllabus courses are missing.");
 const identities=new Map(rows.map(([roll])=>[roll,D.find(s=>N(s.rollNo)===N(roll))]));for(const[roll,s]of identities)if(!s)throw Error("Student "+roll+" missing");
 const now=new Date().toISOString(),ids=new Set([...identities.values()].map(s=>s.id)),targetCodes=new Set(codes.map(N));
 for(const list of[P,H])for(let i=list.length-1;i>=0;i--){const x=list[i];if(x.examYear===E.examYear&&x.academicYear===E.academicYear&&x.semester===E.semester&&targetCodes.has(N(x.courseCode)))list.splice(i,1)}
 courses.forEach((course,i)=>{const incoming=rows.map(([roll,t,s])=>{const student=identities.get(roll),base={studentId:student.id,name:student.name,rollNo:student.rollNo,registrationNo:student.registrationNo,registrationType:"Regular",withheld:false,present:true,remarks:""};return i<5?{...base,partA:String(t[i][0]),partB:String(t[i][1]),classTestAttendance:String(t[i][2]),sessional:""}:{...base,partA:"",partB:"",classTestAttendance:"",sessional:String(s[i-5])}});P.push({...E,courseId:course.id,courseCode:course.code,courseTitle:course.title,courseType:course.type,students:incoming,updatedAt:now});H.push({...E,courseId:course.id,courseCode:course.code,courseTitle:course.title,students:incoming.map(x=>({studentId:x.studentId,eligible:true})),updatedAt:now})});
 let viva=V.find(x=>x.examYear===E.examYear&&x.academicYear===E.academicYear&&x.semester===E.semester);if(viva?.published)throw Error("The target viva result is published and cannot be replaced.");const vivaStudents=rows.map(([roll,,,mark])=>{const s=identities.get(roll);return{id:s.id,name:s.name,registrationNo:s.registrationNo,rollNo:s.rollNo,registrationType:"Regular",marks:String(mark),present:true}});const vivaRecord={...(viva||{}),department:"Building Engineering & Construction Management",...E,students:vivaStudents,finalized:true,published:false,updatedAt:now};const vi=V.indexOf(viva);vi<0?V.push(vivaRecord):V[vi]=vivaRecord;
 const archiveStudents=rows.map(([roll,theories,sessionals,vivaMark])=>{const s=identities.get(roll),grades=theories.map(x=>letter(Math.round(x[0]+x[1]+x[2]),true,x)).concat(sessionals.map(x=>letter(Math.round(x+vivaMark),false,[0,0]))),earned=grades.reduce((sum,g,i)=>sum+(g==="F"?0:Number(courses[i].credit)),0),quality=grades.reduce((sum,g,i)=>sum+(points[g]||0)*Number(courses[i].credit),0);return{studentId:s.id,rollNo:s.rollNo,earnedCredit:earned,gradePoints:+quality.toFixed(3),sgpa:earned?(quality/earned).toFixed(2):"0.00",failedSubjects:grades.flatMap((g,i)=>g==="F"?[courses[i].code]:[]),registerAgain:[]}});
 let archive=A.find(x=>x.examYear===E.examYear&&x.academicYear===E.academicYear&&x.semester===E.semester),archiveRecord={...(archive||{}),...E,series:"2020",students:archiveStudents,updatedAt:now,formatVersion:archive?.formatVersion||"legacy"};const ai=A.indexOf(archive);ai<0?A.push(archiveRecord):A[ai]=archiveRecord;
 const prior=A.filter(x=>Number(x.examYear)<2023||x.examYear==="2023"&&(x.academicYear!=="3rd"||x.semester==="Odd"));const resultStudents=archiveStudents.map(cur=>{const previous=prior.flatMap(x=>x.students||[]).filter(x=>x.studentId===cur.studentId||N(x.rollNo)===N(cur.rollNo)),totalEarnedCredit=previous.reduce((s,x)=>s+Number(x.earnedCredit||0),0)+cur.earnedCredit,totalGradePoints=previous.reduce((s,x)=>s+Number(x.gradePoints||0),0)+cur.gradePoints,previousFailed=previous.flatMap(x=>x.failedSubjects||[]),passed=new Set(courses.filter((c,i)=>!cur.failedSubjects.includes(c.code)).map(c=>N(c.code))),failedSubjects=[...new Set([...previousFailed,...cur.failedSubjects].filter(code=>!passed.has(N(code))))];return{studentId:cur.studentId,failedSubjects,registerAgain:[],totalEarnedCredit,totalGradePoints:+totalGradePoints.toFixed(3),cgpa:totalEarnedCredit?(totalGradePoints/totalEarnedCredit).toFixed(2):"0.00"}});
 const resultRecord={...E,series:"2020",students:resultStudents,updatedAt:now},ri=R.findIndex(x=>x.examYear===E.examYear&&x.academicYear===E.academicYear&&x.semester===E.semester);ri<0?R.push(resultRecord):R[ri]=resultRecord;
 for (const [section,data] of [["student-eligibility",H],["prepare-result",P],["add-viva-marks",V],["marks-sheet",A],["result-sheet",R]]) await write(section,data);
 console.log(JSON.stringify({examination:E,students:rows.length,courses:courses.map(c=>c.code),archive:archiveStudents.map(x=>({roll:x.rollNo,earned:x.earnedCredit,sgpa:x.sgpa,failed:x.failedSubjects}))},null,2));
}finally{await p.$disconnect()}
