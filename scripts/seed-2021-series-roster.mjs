import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
const prisma=new PrismaClient({adapter:new PrismaNeon({connectionString:process.env.DATABASE_URL})});
const roster=[
["1146","2112001","Md Mohiuddin Khan Mim","Md Siddiqur Rahman","Male"],
["1147","2112002","Md. Mizanur Rahman Maruf","Md. Masud Rana","Male"],
["1148","2112003","Bokhtiar Hossain Hamim","Md. Mokbul Hossain","Male"],
["1149","2112004","Virati Pria Shaj","Shaikh Abdul Mamun","Female"],
["1150","2112005","Mahinoor Zaman Sayeda","Md Anisuruzzaman","Female"],
["1151","2112006","Md Ashraful Islam Zawad","Md Awlad Hossain","Male"],
["1152","2112007","Zarin Tasnim","Md. Fakhruddin","Female"],
["1153","2112008","Anindo Kumar Saha","Poritosh Kumar Saha","Male"],
["1154","2112009","Md. Shahid Bappy Hamim","Md. Hafizur Rahman","Male"],
["1155","2112010","Mst. Farhana Islam Efty","Md. Sabjul Islam","Female"],
["1156","2112011","Md. Mahmoudul Hasan Mahdi","Md. Billal Uddin","Male"],
["1157","2112012","Md. Tawfique Molla","Md. Tazammul Haque Molla","Male"],
["1158","2112013","Md Nafis Faisal","Md Saidur Rahman","Male"],
["1159","2112014","Sheikh Abdullah Galib","Md. Samad Mia","Male"],
["1160","2112015","Mehedi Hasan","Helal Mia","Male"],
["1161","2112016","Muhiminul Islam","Md. Saidul Islam","Male"],
["1162","2112017","Md. Hasibul Hossain Shanto","Md. Abdul Mazed","Male"],
["1163","2112018","Imran Mahmood Aunik","A B M Ataur Rahman","Male"],
["1164","2112019","Md. Fardin Hossain Rafat","Md. Mahbub Uddin","Male"],
["1165","2112020","Himel Md. Mursalin","Md. Lutfar Rahman","Male"],
["1167","2112022","S. M. Rajibul Latif","S. M. Nazmul Huda (Nannu)","Male"],
["1168","2112023","Md. Raihan Miah","Nur Mohammed","Male"],
["1169","2112024","Rashid Shahriar Sarker","Md. Shahjahan Sarker","Male"],
["1170","2112025","Md Asifur Rahman","Md Milon Hossain","Male"],
["1171","2112026","Istiak Ahmed Litu","Md Harun Ur Rashid","Male"],
["1172","2112027","Nawshin Islam Mithi","Md. Nazrul Islam","Female"],
["1173","2112028","Mahfuz Anam Utsho","Md. Fokor Uddin","Male"],
["1174","2112029","Md. Tanjim Hossain","Md. Zakir Hossain","Male"],
["1175","2112030","Sudipto Saha Priom","Provas Kumar Saha","Male"]
];
const rows=await prisma.$queryRawUnsafe('SELECT "data" FROM "ResultSectionStore" WHERE "section"=$1 LIMIT 1',"student-directory");
const directory=Array.isArray(rows[0]?.data)?rows[0].data:[],now=new Date().toISOString();
const make=([registrationNo,rollNo,name,fatherName,gender],series)=>({id:"student-"+rollNo,department:"Building Engineering & Construction Management",series,year:"1st",semester:"Odd",section:"A",name,rollNo,registrationNo,fatherName,motherName:"",localGuardian:"",gender,birthDate:"2000-01-01"});
for(const item of roster){const record=make(item,"2021"),index=directory.findIndex(x=>x.rollNo===record.rollNo);if(index<0)directory.push(record);else directory[index]={...directory[index],...record,id:directory[index].id};}
const readd=make(["1149","2012004","Sudipto Saha Priom","Provas Kumar Saha","Male"],"2020"),readdIndex=directory.findIndex(x=>x.rollNo==="2012004");
if(readdIndex<0)directory.push(readd);else directory[readdIndex]={...directory[readdIndex],...readd,id:directory[readdIndex].id,obeBatchPlacements:directory[readdIndex].obeBatchPlacements||[]};
await prisma.$executeRawUnsafe('INSERT INTO "ResultSectionStore"("section","data","updatedAt")VALUES($1,CAST($2 AS jsonb),NOW())ON CONFLICT("section")DO UPDATE SET "data"=EXCLUDED."data","updatedAt"=NOW()',"student-directory",JSON.stringify(directory));
console.log(JSON.stringify({series2021:roster.length,readded:"2012004",missingRoll:"2112021",directoryTotal:directory.length,placeholderBirthDate:"2000-01-01"},null,2));
await prisma.$disconnect();
