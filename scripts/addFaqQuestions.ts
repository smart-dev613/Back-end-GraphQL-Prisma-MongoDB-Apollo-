// import xlsx from "xlsx";
// import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
// import Bottleneck from "bottleneck";
// //import fs from 'fs';
// //import FormData from 'form-data';
// //import { getS3UploadURL } from "../src/ossHelper";
// //import fetch, { Blob } from "node-fetch";
// //import AWS from 'aws-sdk';
// //import File from 'file-api';
// import dotenv from 'dotenv'
// dotenv.config();

// export const limiter = new Bottleneck({
//     maxConcurrent: 400,
//     minTime: 50,
// });

// interface ExcelData {
//     Topic?: string;
//     Question?: string;
//     Answer?: string;
//     Video?: string;
//     Link?: string; // the image link
//     // FolderName?: string;
//     // FileName?: string;
//     // FilePath?: string;
// }

// const convertEndOfLines = (text) => {
//     if (text) {
//         while(text.includes('\r\n') )
//             text = text.replace("\r\n", "</p><p>");
//         return "<p>" + text + "</p>"
//     }
//     else
//         return "";
// }

// /*

// const S3 = new AWS.S3({
//   region: 'eu-central-1',
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// })

// // Handles obtaining a temporary URL to upload a file to Amazon S3
// const getS3UploadURL = async (params: any) => {
//   //console.log(params)
//   //console.log('S3=', S3);
//   console.log('AWS Key=', process.env.AWS_SECRET_ACCESS_KEY);
//   let presign = null
//   try {
//     presign = S3.createPresignedPost(params)
//   } catch (e) {
//     console.error(e)
//   }
//   return presign
// }

// function apiCallWrapper (endpoint, options, timeout) {
//     return new Promise((resolve, reject) => {
//       /*let AC = new AbortController()
//       options['signal'] = AC.signal
//       let timeoutTimer = setTimeout(() => {
//         AC.abort()
//       }, timeout)*-/
//       fetch(endpoint, options)
//         .then(result => {
//           //clearTimeout(timeoutTimer)
//           console.log('api call result', result);
//           return result
//         })
//         .then(result => resolve(result))
//         .catch(err => {
//             console.log('api call error:', err);
//             reject(err)
//         })
//     })
// }

// const getS3POSTUploadToken = async () => {
//     const normalImageConds = [
//         ['starts-with', '$Content-Type', 'image/'],
//         ["content-length-range", 0, 5000000], // File must be 0 to 5MB
//         { "acl": "public-read" }
//     ]

//     let dateStr = Date.now()
//     const options = {
//         Bucket: 'cdnbyinspired',
//         Conditions: [
//         ['starts-with', '$key', `community-images/${54321}/${dateStr}-`],
//             ...normalImageConds
//         ]
//     }
//     console.log('options=', options);

//     let generatedPresign = await getS3UploadURL(options)
//     console.log('generatedPresign=', generatedPresign);
//     if (generatedPresign == null) {
//       generatedPresign = { error: "S3_ERROR", message: "Problem generating S3 pre-sign" }
//     }
//     return {
//       ...generatedPresign,
//       conditions: options.Conditions
//     }
// }*/

// export const readAndCreateFaqQuestions = async () => {
//     try {
//         // Delete test questions from yesterday
//         const yesterday = new Date();
//         const deletePeriod = parseInt(process.env.DELETE_PERIOD) || 0;
//         yesterday.setDate( (new Date).getDate() - deletePeriod );

//         const replyCount = await prisma.deleteManySupportReplies().count();
//         console.log('number of deleted replies = ', replyCount);

//         const deletedRowsCount = deletePeriod === -1
//         ? await prisma.deleteManySupportQuestions().count()
//         : await prisma.deleteManySupportQuestions({
//             createdAt_gt: yesterday
//         }).count();
//         console.log(deletedRowsCount + " Rows deleted successfully");

//         const user = await prisma.user({email: "support@synkd.life"}) // Link questions to synkd support

//         const faqAuthorId = user.id

//         const excelFile = xlsx.readFile("./scripts/upload/seed_faq.xlsx");
//         const sheets = excelFile.SheetNames;
//         let totalRows = 0;

//         for (let sheetName of sheets) {

//             await prisma.upsertCommunityCategory({update: {}, where:{title: sheetName}, create:{title: sheetName}})

//             //const categoryResult = await prisma.createCommunityCategory({title: sheet})
//             //console.log('The "' + sheet + '" topic was added successfully');

//             const allQuestions = xlsx.utils.sheet_to_json(excelFile.Sheets[sheetName], {
//                 defval: null,
//             }) as [ExcelData];

//             for (let question of allQuestions) {

//                 if(! question.Question) {
//                     console.log("Invalid Question");
//                     return;
//                 }

//                 /*if(question.FileName) {
//                     console.log("File:", question.FileName);
//                     try {
//                         const filePath = './scripts/upload/' + question.FolderName + "/" + question.FileName;
//                         if (fs.existsSync(filePath)) {
//                             const file = fs.readFileSync(filePath, 'utf8')
//                             console.log("File Length = ", file.length)

//                             console.log('Arian');
//                             /*var fileObject = new File({
//                                 name: question.FileName,
//                                 type: "text/jpeg",
//                                 buffer: file
//                             });
//                             //var fileObject = new File(filePath);
//                             console.log('Emad');*-/

//                             const token = await getS3POSTUploadToken();
//                             console.log("Token=", token);
//                             const formData = new FormData();
//                             Object.entries(token.fields).forEach(([k, v]) => {
//                                 formData.append(k, v)
//                             })
//                             //formData.append('Content-Type', file.type);
//                             formData.append('Content-Type', 'image/jpeg');
//                             formData.append('key', "12345");
//                             formData.append('acl', 'public-read');
//                             formData.append('file', file);
//                             //formData.append('file', new Blob([file], {type:"application/octet-stream"}));

//                             //console.log(formData)

//                             const response = await apiCallWrapper(token.url, {
//                                 method: 'POST',
//                                 body: formData
//                             }, 10000);
//                             console.log('upload response', response);
//                         }
//                         else {
//                             console.log("File does not exists");
//                         }
//                     } catch (err) {
//                         console.error(err)
//                     }
//                 }*/

//                 let readyAnswer = convertEndOfLines(question.Answer);
//                 if(question.Link) {
//                     readyAnswer += ('<br />' + question.Link);
//                 }

//                 const addResult = await prisma.createSupportQuestion({
//                     title: question.Question,
//                     returningAnswer: readyAnswer,
//                     topic: sheetName,
//                     views: 0,
//                     keywords: question.Topic,
//                     order: totalRows,
//                     postedBy: {
//                         connect: {
//                             id: faqAuthorId
//                         }
//                     }
//                 })
//                 if(addResult && addResult.title) {
//                     totalRows++;
//                     console.log("Question #" + totalRows + " added successfully: ", addResult.title);
//                 }

//             }; // End of allQuestions loop
//         } // End of sheets loop

//     }
//     catch(err) {
//         console.log("Error in reading excel file: ", err);
//     }

// };

// readAndCreateFaqQuestions();
