// /**
//  * This is a one-time use script for multiplying all topup pricing in the database
//  * by 100 so that they are using their correct price.
//  * 
//  * Stripe reads 1000 as £10 and 10 as £0.10.
//  */
// import "reflect-metadata";
// import { prisma } from "../src/generated/prisma-client"

// const init = async() => {
//     const topupServices: any = await prisma.marketingTopupServices().$fragment(
//         `
//             {
//                 _id
//                 name
//                 pricing {
//                     currency
//                     amount
//                     price
//                 }
//             }
//         `
//     )

//     for (let s of topupServices) {
//         for (let p of s.pricing) {
//             p.price = p.price * 100
//         }
//         // console.log(s)

//         await prisma.updateMarketingTopupService({
//             data: {
//                 pricing: {
//                     create: s.pricing
//                 }
//             },
//             where: {
//                 _id: s._id
//             }
//         })
//         console.log(`Updated service ${s.name}`)
//     }
// }

// init().then(()=> console.log("done"))