// import mongo from "mongodb";
// import { writeFileSync } from "fs";
// import xlsx from "xlsx";


// interface LookupData {
//   campaignID: string;
// }
// const executeWithDate = async (data: LookupData) => {
//   const { campaignID } = data;

//   const obj: any = {};

//   const connection = await mongo.connect(
//     "mongodb://db_prod:MBS5UcM9vA3ZAzmL@zeus.db.imagineinspired.com:27017/lwi?authSource=synkd-trial101&readPreference=primary&appname=MongoDB%20Compass&ssl=false"
//   );
//   const db = connection.db("media");
//   // const allDocs = db.collection(campaignID).find({})

//   const docsWithClicks = db
//     .collection(campaignID)
//     .find({ Events: { $elemMatch: { Name: "click_to_site" } } });

//   console.log(docsWithClicks);
//   docsWithClicks
//     .forEach(doc => {
//       const docIP = doc.IP.toString().replace(/\./g, "_");
//       console.log(docIP);

//       const created = new Date(doc.Created).getDate().toString();

//       // If object already exists
//       if (created in obj) {
//         obj[created] = obj[created] + 1;
//       } else {
//         obj[created] = 1;
//       }
//     })
//     .then(() => {
//       writeFileSync(`${campaignID}_clicks_bydate.json`, JSON.stringify(obj));
//       console.log(obj);
//     });
//   /*
//     allDocs.forEach(doc => {
//         const docIP = doc.IP.toString().replace(/\./g, "_")
//         console.log(docIP)
//         // If object already exists
//         if(docIP in obj){
//             obj[docIP] = obj[docIP] + 1
//         }else {
//             obj[docIP] = 1
//         }
//     }).then(()=>{
//         writeFileSync(`${campaignID}.json`, JSON.stringify(obj))
//         console.log(obj)})

//     // for (let doc of allDocs){

//     // }
//         */
// };

// const executeNonUnique = async (data: LookupData) => {
//   const { campaignID } = data;

//   const obj: any = {};

//   const connection = await mongo.connect(
//     "mongodb://db_prod:MBS5UcM9vA3ZAzmL@zeus.db.imagineinspired.com:27017/lwi?authSource=synkd-trial101&readPreference=primary&appname=MongoDB%20Compass&ssl=false"
//   );
//   const db = connection.db("media");
//   // const allDocs = db.collection(campaignID).find({})

//   const docsWithClicks = db
//     .collection(campaignID)
//     .find({ Events: { $elemMatch: { Name: "click_to_site" } } });

//   console.log(docsWithClicks);
//   docsWithClicks
//     .forEach(doc => {
//       const docIP = doc.IP.toString().replace(/\./g, "_");
//       console.log(docIP);

//       const clicksCount = doc.Events.filter(event => event.Name === "click_to_site")

//       console.log(clicksCount)

//       // If object already exists
//       if (docIP in obj) {
        
//         obj[docIP] = obj[docIP] + clicksCount.length
//       } else {
//         obj[docIP] = clicksCount.length;
//       }
//     })
//     .then(() => {
//       writeFileSync(`${campaignID}_clicks_nonunique.json`, JSON.stringify(obj));
//       console.log(obj);
//     });
// };

// const execute = async (data: LookupData) => {
//     const { campaignID } = data;
  
//     const obj: any = {};
  
//     const connection = await mongo.connect(
//       "mongodb://db_prod:MBS5UcM9vA3ZAzmL@zeus.db.imagineinspired.com:27017/lwi?authSource=synkd-trial101&readPreference=primary&appname=MongoDB%20Compass&ssl=false"
//     );
//     const db = connection.db("media");
//     // const allDocs = db.collection(campaignID).find({})
  
//     const allDocs = db
//       .collection(campaignID).find({})

//     //   console.log(docsWithClicks)
//     allDocs.forEach(doc => {
//         const docIP = doc.IP.toString().replace(/\./g, "_");
//         const dwelltime = doc.DwellTime
//         if (docIP in obj) {
        
//             obj[docIP] = obj[docIP] + dwelltime
//           } else {
//             obj[docIP] = dwelltime
//           }
        
//     }).then(() => {
//         const book = xlsx.utils.book_new()
//         book.SheetNames.push("dwell")
//         const sheet = xlsx.utils.json_to_sheet(obj)
//         book.Sheets["dwell"] = sheet

//         xlsx.writeFile(book, `${campaignID}_dwelltime.xlsx`)
//         // writeFileSync(`${campaignID}_dwelltime.json`, JSON.stringify(obj));
//         // console.log(obj);
//       });

  
//     // console.log(docsWithClicks);
//     // docsWithClicks
//     //   .forEach(doc => {
//     //     const docIP = doc.IP.toString().replace(/\./g, "_");
//     //     console.log(docIP);
  
//     //     const clicksCount = doc.Events.filter(event => event.Name === "click_to_site")
  
//     //     console.log(clicksCount)
  
//     //     // If object already exists
//     //     if (docIP in obj) {
          
//     //       obj[docIP] = obj[docIP] + clicksCount.length
//     //     } else {
//     //       obj[docIP] = clicksCount.length;
//     //     }
//     //   })
//     //   .then(() => {
//     //     writeFileSync(`${campaignID}_clicks_nonunique.json`, JSON.stringify(obj));
//     //     console.log(obj);
//     //   });
//   };

// execute({ campaignID: "7727" });
// execute({ campaignID: "7724" });
