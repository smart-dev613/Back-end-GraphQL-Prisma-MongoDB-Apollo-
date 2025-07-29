// @author: Rishabh Jindal
// @description: script to add publishers
//! @notes please pass FENIX_TOKEN as an environment variable

import 'reflect-metadata'
import xlsx from "xlsx";
import { Company, prisma, PublisherDevices, PublisherSite } from "../src/generated/prisma-client";
import {createLegacyCompany, LegacyCompanyInput} from '../src/resolvers/resolver'
import { createObjectID } from "../util/createIDs";
import fetch from 'node-fetch';

interface PublisherData {
    company_name: string,
    company_country: string,
    publisher_site: string,
    publisher_country: string,
    targeting: string,
    zone: string,
    vertical: string,
    sold_as: string,
    volume: number,
    avg_daily_reach: number,
    format: string,
    size: string,
    device: string,
    placement: string,
    currency: string,
    rate: number
}


interface FenixTagInput {
    // _id of the publisher
    Publisher: number
    // _id of the publisherSite
    PublisherSite: string,

    AverageVolume: number,
    Currency: string,
    Device: string,
    Format: string,
    Placement: string,
    PricingModel: string,
    Zone: string,
    PublisherRate: number,
    FormatSize: string,
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

const createTag = async (tagInput: FenixTagInput) => {

    console.log(`Creating tag for ${tagInput.PublisherSite}`)

    // ! PLEASE CHANGE THIS (login from master account and fetch from the session cookie)
    const fenixToken = process.env.FENIX_TOKEN

    const scheme = "http://"
    const address = "api"
    const path = `/platform/admin/company/${tagInput.Publisher}/rate/new`
    const url = scheme + address + path

    const response = await fetch(url, {
            headers: {
              "accept": "*/*",
              "content-type": "application/json; charset=utf-8",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-site",
              "cookie": fenixToken,
              "Referer": "https://graphql.synkd.life/",
            },
            body: JSON.stringify(tagInput),
            method: "POST"
          });

          console.log(`Success: ${response.ok}`)
          console.log(await response.json());

}


const readLocalFile = (fileLoc: string = "scripts/upload/2022-publishers.csv") => {
    const xbook = xlsx.readFile(fileLoc);
    const xsheets = xbook.SheetNames;
    const publishers = xlsx.utils.sheet_to_json(xbook.Sheets[xsheets[0]], {
      defval: null,
    }) as PublisherData[];
    return publishers
}

export const runScript = async (createUptoLimit: number = null, skip: number = 0) => {

    if (!process.env.FENIX_TOKEN){
        throw new Error("Please specify FENIX_TOKEN")
    }
    const publishers = readLocalFile();


    const defaultUser = await prisma.user({email: "support@synkd.life"});

    let publisherNo = 1

    for (let idx = skip; idx < publishers.length; idx++) {
        let publisher = publishers[idx];

        // Stop on reaching limit
        if (createUptoLimit && (publisherNo > createUptoLimit)) {
            console.log("Reached create limit of ", createUptoLimit)
            return
        }
        publisher.company_name = String(publisher.company_name)
        publisher.publisher_site = String(publisher.publisher_site)

        console.log(`Processing publisher no ${publisherNo}, publisherSite: ${publisher.publisher_site}`)
        
        const companyInput: LegacyCompanyInput = {
            // user: {id: defaultUser.id, _id: defaultUser._id},
            company: {name: String(publisher.company_name)},
            companyAddress: {country: publisher.company_country}
        }

        let publisherCompany: Company;

        // Does the company exist?
        publisherCompany = await prisma.company({name: String(publisher.company_name)})

        // Create the company
        if (!publisherCompany) {
            const company = await createLegacyCompany(companyInput);
            publisherCompany = company
        }


        let publisherSite: PublisherSite;
        // Create the publisher site if it doesn't exist
        publisherSite = await prisma.publisherSite({name: publisher.publisher_site})
        const devices: PublisherDevices = {}
        if (publisher.device === 'desktop') {
            devices.desktop = true
        } else if (publisher.device === 'smartphone') {
            devices.mobile = true
        } else if (publisher.device === 'tablet') {
            devices.tablet = true
        }

        if (!publisherSite){
            publisherSite = await prisma.createPublisherSite({
                ...createObjectID(),
                _company: publisherCompany._id,
                name: publisher.publisher_site,
                countries: {set: "All"},
                publisherCountry: publisher.publisher_country,
                vertical: publisher.vertical,
                zones: {
                    set: publisher.zone,
                },
                Devices: {
                    create: devices
                }
            })

        } else {
            await prisma.updatePublisherSite({
                where: {
                    id: publisherSite.id
                },
                data: {
                    Devices: {
                        update: devices
                    }
                }
            })
        }

        // Create tag
        await createTag({
            Publisher: publisherCompany._id,
            PublisherSite: publisherSite._id,
            AverageVolume: publisher.volume,
            Currency: publisher.currency,
            Device: publisher.device,
            Format: publisher.format,
            FormatSize: publisher.size,
            Placement: publisher.placement,
            PricingModel: publisher.sold_as,
            PublisherRate: publisher.rate,
            Zone: publisher.zone
        })

        publisherNo += 1;
        await delay(60);
    }

}


runScript(null, 9).then(_=>console.log("done"))