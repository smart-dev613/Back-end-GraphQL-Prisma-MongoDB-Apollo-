const MongoClient = require('mongodb').MongoClient
import xlsx from 'xlsx'
import Bottleneck from "bottleneck"
import { createOrUpdateCompany } from './readExcel';

const EXCEL_FILE = "./scripts/upload/publishers.xlsx"

// const mongoUrl = 'mongodb://root:sa95knwz11@mongomain-mongodb:27017/synkd-trial101?authSource=admin'
const mongoUrl = 'mongodb://root:3auf00rybo@mongomain-mongodb:27017/synkd-trial101?authSource=admin'

export const limiter = new Bottleneck({
    maxConcurrent: 400,
    minTime: 50,
  });

const init = async () => {
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true })
    if (!client) {
        console.log("Can't connect!")
        return
    }
    console.log('Connected to Mongo...')

    const db = client.db('synkd-trial101')
    const pubSiteColl = db.collection('publisher_site')

    console.log(`Loading Excel file: ${EXCEL_FILE}`)
    const xbook = xlsx.readFile(EXCEL_FILE);
    const xsheets = xbook.SheetNames;
    console.log(`Converting sheet to JSON...`)
    const excelSheet = xlsx.utils.sheet_to_json(xbook.Sheets[xsheets[1]], {
      defval: null,
    })

    let publisherData: object = {}

    console.log(`Processing rows...`)
    for (let row of excelSheet) {
        let companyName = row['Company Name'].trim()
        let siteName = row['Publisher Site'].trim()
        let currency = row['Currency'].trim()
        // console.log(row)
        let sitesArray = publisherData.hasOwnProperty(companyName) ? publisherData[companyName]['sites'] : []
        publisherData[companyName] = {
            currency: currency,
            sites: [...new Set([...sitesArray, siteName])]
        }

        // For testing, don't do the whole sheet
        // if (Object.keys(publisherData).length > 5) {
        //     break
        // }
    }

    // console.log('publisher data', publisherData)

    console.log(`Rows processed. This script will create ${Object.keys(publisherData).length} companies...`)

    for (let companyName in publisherData) {
        console.log(`Creating company: ${companyName}...`)
        let companyData = publisherData[companyName]
        await limiter.schedule(() => 
            createOrUpdateCompany({
                name: companyName,
                isChild: false,
                currency: companyData['currency']
            })
        ).then(async (res) => {
            for (let siteName of companyData['sites']) {
                console.log(`Creating site ${siteName} attached to company ${companyName}`)
                await pubSiteColl.insertOne({
                    Company: res._id,
                    Name: siteName,
                    Zones: ['ROS'],
                    Countries: ['All'],
                    Devices: {
                        desktop: true,
                        mobile: true,
                        tablet: true
                    }
                })
            }
        })
    }

    console.log('Done')
    process.exit()
}

init();