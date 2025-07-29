// import { prisma, Company } from "../../src/generated/prisma-client";
// import Bottleneck from "bottleneck";
// import { writeFileSync, readFileSync } from "fs";
// import sleep from "sleep-promise";

// export const limiter = new Bottleneck({
//   maxConcurrent: 400,
//   minTime: 50
// });

// /**
//  * Find duplicate company names
//  */

// const duplicatePairs = [];

// const findDuplicateForCompany = async (company: Company) => {
//   const count = await prisma.companies({ where: { name: company.name } });
//   //   console.log(`Running for company ${company.name}`);
//   if (count.length > 1) {
//     // console.log(`Duplicates found:`, ...count);
//     duplicatePairs.push(count);
//   }
// };
// const findAllDuplicates = async () => {
//   const allCompanies = await prisma.companies();

//   allCompanies.forEach(async company => {
//     await limiter.schedule(() => findDuplicateForCompany(company));
//   });
// };

// const execute = async () => {
//   await findAllDuplicates();
//   limiter.once("idle", () => {
//     console.log("IDLE", ...duplicatePairs);
//     writeFileSync("duplicates.json", JSON.stringify(duplicatePairs));
//   });
//   await sleep(2000);
// };

// const readJson = async () => {
//   const allDuplicates = readFileSync("realDup.json", "utf8");
//   const duplicatesJson = JSON.parse(allDuplicates);
//   for (let companySet of duplicatesJson) {
//     for (let i = 1; i < companySet.length; i++) {
//         console.log(companySet[i].name, companySet[i].id, companySet[i]._id)

//       if (companySet[i].id) {
        
//       await prisma.deleteManyMediaRateses({_publisher:companySet[i]._id})

//       // Delete billing
//       await prisma.deleteManyBillingInvoices({ _company: companySet[i]._id });

//       // Delete ledger
//       await prisma.deleteManyBillingLedgers({ _company: companySet[i]._id });

//       // Delete brands
//       await prisma.deleteManyBrands({ _advertiser: companySet[i]._id });

//       // Delete users and user groups
//       await prisma.deleteManyUserGroups({ _company: companySet[i]._id });

//       await prisma.deleteManyUsers({ _company: companySet[i]._id });

//       // Remove duplicates of the company
//       await prisma.deleteCompany({ id: companySet[i].id });
//     }
//     }
//   }

//   // writeFileSync('realDup.json', JSON.stringify(realDupSet))
// };

// const addMissingIDs = async() => {
//     const users = await prisma.users()

//     users.forEach(user => {
//         if(!user.id){
//             console.log(user)
//         }
//     })
// }

// execute()
// // addMissingIDs();
