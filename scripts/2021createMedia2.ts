const MongoClient = require('mongodb').MongoClient;
import xlsx from 'xlsx';
import Bottleneck from 'bottleneck';
import { createOrUpdateCompany } from './readExcel';
import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
import { ObjectId } from 'mongodb';
import { createObjectID } from '../util/createIDs';

const EXCEL_FILE = './scripts/upload/publishers.xlsx';

// const mongoUrl = 'mongodb://root:sa95knwz11@mongomain-mongodb:27017/synkd-trial101?authSource=admin'
const mongoUrl =
  'mongodb://root:3auf00rybo@mongomain-mongodb:27017/synkd-trial101?authSource=admin';

export const limiter = new Bottleneck({
  maxConcurrent: 400,
  minTime: 50,
});

const init = async () => {
  const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true });
  if (!client) {
    console.log("Can't connect!");
    return;
  }
  console.log('Connected to Mongo...');

  const db = client.db('synkd-trial101');
  let pubSiteColl = db.collection('publisher_site');

  console.log(`Finding all publisher_site entries...`);
  let allPubSites = await pubSiteColl.find();
  allPubSites = await allPubSites.toArray();

  let allPubSitesLength = Object.keys(allPubSites).length;
  let currentPubSite = 0;

  console.log(`Processing ${allPubSitesLength} database entries...`);

  for (let doc of allPubSites) {
    currentPubSite += 1;

    let fieldsToUpdate = {};

    if (!doc.hasOwnProperty('id')) {
      // Add "id" if the document doesn't have to
      fieldsToUpdate['id'] = new ObjectId();
    }

    if (doc.hasOwnProperty('Devices') && !doc['Devices'].hasOwnProperty('id')) {
      // Add "id" to the Devices embedded objects
      fieldsToUpdate['Devices'] = {
        ...doc['Devices'],
        id: new ObjectId(),
      };
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      console.log(
        `(${currentPubSite}/${allPubSitesLength}) Updating publisher site ${
          doc._id
        } with ${Object.keys(fieldsToUpdate).length} field changes`
      );
      await pubSiteColl.updateOne(
        {
          _id: doc._id,
        },
        {
          $set: fieldsToUpdate,
        }
      );
    } else {
      console.log(
        `(${currentPubSite}/${allPubSitesLength}) No changes to ${doc._id} to be made`
      );
    }
  }

  console.log(`Loading Excel file: ${EXCEL_FILE}`);
  const xbook = xlsx.readFile(EXCEL_FILE);
  const xsheets = xbook.SheetNames;
  console.log(`Converting sheet to JSON...`);
  const excelSheet = xlsx.utils.sheet_to_json(xbook.Sheets[xsheets[1]], {
    defval: null,
  });

  let publisherData: object = {};
  let ratesToCreate: object[] = [];
  let excelSheetRows = Object.keys(excelSheet).length;
  let currentRow = 0;

  console.log(`Processing ${excelSheetRows} rows...`);
  for (let row of excelSheet) {
    currentRow += 1;

    let companyName = row['Company Name'].trim();
    let siteName = row['Publisher Site'].trim();
    let country = row['Publisher Country'].trim();
    let currency = row['Currency'].trim();

    let pricingModel = row['Pricing Model'].trim();
    let averageVolume = row['Average Volume'];
    let format = row['Format'].trim().toLowerCase();
    let size = row['Size'].trim();
    let device = row['Device'].trim().toLowerCase();
    let placement = row['Placement'].trim().toLowerCase();
    let zone = row['Zone'].trim();
    let vertical = row['Vertical'].trim();

    let netRate = row['Net Rate/Cost'];

    let siteId = null;
    if (
      publisherData.hasOwnProperty(companyName) &&
      publisherData[companyName].hasOwnProperty(siteName)
    ) {
      siteId = publisherData[companyName][siteName];
    } else {
      let publisher, site;
      let publishers = await prisma.companies({
        where: {
          name: companyName,
        },
      });
      if (publishers.length > 0) {
        publisher = publishers[0];

        let sites = await prisma.publisherSites({
          where: {
            name: siteName,
            _company: publisher._id,
          },
        });
        if (sites.length > 0) {
          site = sites[0];
          siteId = site._id;
        }
      }
    }

    console.log(
      `(${currentRow}/${excelSheetRows}) Processing: ${companyName}/${siteName} [siteId: ${siteId}]`
    );
    publisherData[companyName] = {
      ...publisherData[companyName],
      [siteName]: siteId,
    };

    if (publisherData[companyName][siteName] !== null) {
      console.log(
        `(${currentRow}/${excelSheetRows}) Adding new rate to create. Total rates to create: ${ratesToCreate.length}`
      );
      ratesToCreate.push({
        pricingModel: pricingModel,
        averageVolume: averageVolume,
        format: format,
        country: country,
        vertical: vertical,
        formatSize: size,
        device: device,
        placement: placement,
        currency: currency,
        publisherRate: netRate,
        zone: zone,
        publisherSite: {
          connect: { _id: publisherData[companyName][siteName] },
        },
      });
    }
  }

  let ratesToCreateLength = ratesToCreate.length;
  let currentRate = 0;
  let failedRateCreates = 0;

  console.log(
    `Rows processed. This script will create ${ratesToCreateLength} rates...`
  );

  for (let rate of ratesToCreate) {
    currentRate += 1;

    try {
      // @ts-ignore
      let r = await prisma.createMediaRates({
        ...createObjectID(),
        ...rate,
      });

      console.log(
        `(${currentRate}/${ratesToCreateLength}) Created rate: ${r._id}]`
      );
    } catch (err) {
      failedRateCreates += 1;
      console.warn(
        `(${currentRate}/${ratesToCreateLength}) Could not create new rate`
      );
    }
  }

  console.log(
    `Done creating rates. ${
      currentRate - failedRateCreates
    } successful. ${failedRateCreates} failed.`
  );
  process.exit();
};

init();
