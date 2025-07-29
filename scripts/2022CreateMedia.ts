// import xlsx from 'xlsx'
// import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
// import { createObjectID } from "../util/createIDs";
// import { createOrUpdateCompany } from './readExcel';
// import fetch from 'node-fetch';
// import { kebabCase } from 'lodash';

// const EXCEL_FILE = "./scripts/upload/2022-publishers.xlsx"

// const MEDIA_FORMAT = {
//   "video": "Video",
//   "interscroller": "Interscroller",
//   "standard": "Standard",
//   "super-optic": "Super Optic",
//   "scrolling-banner": "scrolling-banner",
//   "expandable-overlay": "expandable-overlay",
//   "expandable-resize": "expandable-resize",
//   "hidden-story": "hidden-story",
//   "infinity-canvas": "infinity-canvas",
//   "interstitial": "interstitial",
//   "sticky-banner": "sticky-banner",
//   "video-background-window": "video-background-window"
// }

// export const parsingFile = async () => {
//   try {
//     console.log(`Loading Excel file: ${EXCEL_FILE}`)
//     const xbook = xlsx.readFile(EXCEL_FILE);
//     const xsheets = xbook.SheetNames;
//     console.log(`Converting sheet to JSON...`)
//     const excelSheet = xlsx.utils.sheet_to_json(xbook.Sheets[xsheets[0]], {
//       defval: null,
//     })
//     return excelSheet
//   } catch (error) {
//     console.log(error)
//   }
// }

// export const dataPreparations = async () => {
//   try {
//     const data = await parsingFile()
//     const companies = data.reduce((acc: any, row: any) => {
//       if (Object.keys(row).length) {
//         let companyName = `${row['Company Name']}`?.trim()
//         let publisherSite = `${row['Publisher Site']}`?.trim()
//         if (companyName in acc) {
//           if (publisherSite in acc[companyName]) {
//             acc[companyName].publishers[publisherSite].push(row)
//           } else {
//             acc[companyName].publishers[publisherSite] = [row]
//           }
//         } else {
//           acc[companyName] = {
//             data: row,
//             publishers: {
//               [publisherSite]: [row]
//             }
//           }
//         }
//       }
//       return acc
//     }, {})

//     return companies
//   } catch (error) {
//     console.log(error)
//   }
// }

// export const dataUploading = async () => {
//   try {
//     const data: any = await dataPreparations()
//     console.log('data upload start')
//     for (const companyKey in data) {
//       console.log(`[COMPANY]: Create ${companyKey}`)
//       const company = data[companyKey].data
//       const users = await prisma.users({ where: { email: company['Employee Email'] }});
//       let user = users?.[0];
//       const createdCompany = await createOrUpdateCompany({
//         name: companyKey,
//         isChild: false,
//         currency: 'GBP',
//       })
//       await prisma.updateCompany({
//         where: {
//           id: createdCompany.id
//         },
//         data: {
//           currency: company['Currency'],
//           address: {
//             create: {
//               country: company['Company Country'],
//               town: null,
//               postcode: null,
//               address: null
//             }
//           },
//           members: {
//             create: {
//               user: {
//                 connect: {
//                   id: user.id
//                 }
//               },
//               role: "SUPER_ADMIN"
//             }
//           }
//         }
//       })
//       for (const publisherKey in data[companyKey].publishers) {
//         console.log(`[PUBLISHER]: Create ${publisherKey}`)
//         const publisher = data[companyKey].publishers[publisherKey][0];
//         const publishersFinder = await prisma.publisherSites({
//           where: {
//             _company: createdCompany._id,
//             name: publisherKey,
//           }
//         })
//         let createdPublisher = null;
//         if (publishersFinder.length) {
//           createdPublisher = publishersFinder[0]
//         } else {
//           const newIds = createObjectID();
//           createdPublisher = await prisma.createPublisherSite({
//             _id: newIds.id,
//             _id: newIds._id,
//             _company: createdCompany._id,
//             name: publisherKey,
//             countries: {
//                 set: ['All']
//             },
//             publisherCountry: publisher['Publisher Country'],
//             vertical: publisher['Vertical'],
//             zones: {
//                 set: [publisher['Zone']]
//             }
//           })
//         }
//         for (const tag of data[companyKey].publishers[publisherKey]) {
//           tag['Format'] = MEDIA_FORMAT[kebabCase(tag['Format'])]
//           const siteName = `${publisherKey} / ${tag['Zone']} / ${tag['Format']} / ${tag['Size']} / ${tag['Device']} / ${tag['Placement']}`
//           // await publisherTagCollection.insertOne({
//           //   _id : new ObjectId(),
//           //   Company : createdCompany._id,
//           //   Site : createdPublisher.id,
//           //   Name : siteName,
//           //   Zone : tag['Zone'],
//           //   Device : tag['Device'],
//           //   Formats : [tag['Format']],
//           //   Size : tag['Size'],
//           //   Countries: [],
//           //   Status : 'LIVE',
//           // })
//           console.log(`[TAG]: Create ${siteName}`)
//           const response = await fetch(`http://localhost:3000/platform/admin/company/${createdCompany._id}/rate/new`, {
//             "headers": {
//               "accept": "*/*",
//               "accept-language": "en-US,en;q=0.9",
//               "content-type": "application/json; charset=utf-8",
//               "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"98\", \"Google Chrome\";v=\"98\"",
//               "sec-ch-ua-mobile": "?0",
//               "sec-ch-ua-platform": "\"macOS\"",
//               "sec-fetch-dest": "empty",
//               "sec-fetch-mode": "cors",
//               "sec-fetch-site": "same-site",
//               "cookie": "FenixToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6InVWa2hnUWVSb0Y3OHZDeFBkekkzTmxONXBuc1RSMGxnIiwiaWF0IjoxNjQ1ODgxNjM3fQ.tk1kcdyJTJ7BqnQ1rfaxFzrFLpaVYMsJGCq_S2uMmPk",
//               "Referer": "https://marketing-dev.synkd.life/",
//               "Referrer-Policy": "strict-origin-when-cross-origin"
//             },
//             "body": JSON.stringify({
//               "PublisherSite": createdPublisher._id,
//               "AverageVolume": tag[' Volume '],
//               "Currency": tag['Currency'],
//               "Device": tag['Device'],
//               "Format": tag['Format'],
//               "Placement": tag['Placement'],
//               "PricingModel": tag['Sold as'],
//               "Zone": tag['Zone'],
//               "PublisherRate": tag['Rate'],
//               "FormatSize": tag['Size'],
//               "Publisher": createdCompany._id
//             }),
//             "method": "POST"
//           });
//           console.log(await response.json());
//           console.log(`[TAG]: End ${siteName}`)
//         }
//         console.log(`[PUBLISHER]: EBD ${publisherKey}`)
//       }

//       console.log(`[COMPANY]: END ${companyKey}`)
//     }
//   } catch (error) {
//     console.log(error)
//   }
// }
