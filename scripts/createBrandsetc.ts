// import { createAdvertiserIfNone, createBrandIfNone } from "./readExcel";
// import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
// import { limiter, CompanyUniqueValues } from "./readExcel";

// const brandSequential = async (companyUnique: CompanyUniqueValues) => {
//   try {
//     const advertiser = await createAdvertiserIfNone({
//       companyDetails: { ...companyUnique }
//     });
//     await createBrandIfNone({
//       companyDetails: { ...companyUnique },
//       brandDetails: { advertiserID: advertiser._id }
//     });
//   } catch (e) {
//     console.log(e);
//   }
// };
// const create = async () => {
//   const fetchAllCompanies = await prisma.companies();

//   fetchAllCompanies.forEach(async companyUnique => {
//     await limiter.schedule(() => brandSequential(companyUnique));
//   });
// };
