import { ObjectId } from "mongodb"
import { db } from "../../../helpers/mongoHelper"

interface legacyReportingData {
    _id: {
        Date: Date,
        Flight: string,
        Creative: string,
        GeoCity: string,
        GeoContinent: string,
        GeoCountry: string
    },
    Date: Date,
    DwellTime: number,
    // this is flight name
    Flight: string,
    // this is creative name
    Creative: string,

    // these are the same as the id fields
    GeoCity: string,
    GeoContinent: string,
    GeoCountry: string,

    // other fields
    [otherMetricField: string]: any,
}

interface newReportingData {
    formatType?: string
    formatSize?: string
    device?: string
    zone?: string

    publisherID?: string
    publisherName?: string
    publisherCountry?: string
}

interface reportingData extends legacyReportingData, newReportingData {

}

/**
 * adds reporting supplementary data, e.g. publisher name
 * 
 */
export const addReportingFields = async (legacyReportingData: legacyReportingData[]) => {
    const flightCacheMap = new Map<string, newReportingData>();

    for (let i = 0; i < legacyReportingData.length; i++) {

        const flightID = legacyReportingData[i]._id.Flight
        if (flightCacheMap.has(flightID)) {
            legacyReportingData[i] = { ...flightCacheMap.get(flightID), ...legacyReportingData[i] }
        } else {

            const newFields: newReportingData = {}

            const flight = await db.collection("media_flights").findOne({ id: new ObjectId(flightID)})
            const publisherSite = await db.collection("publisher_site").findOne({ id: new ObjectId(flight.PublisherSite) })

            newFields.formatSize = flight.FormatSize
            newFields.formatType = flight.Format
            newFields.device = flight.Device
            newFields.zone = flight.Zone

            newFields.publisherID = flight.PublisherSite
            newFields.publisherName = publisherSite.Name
            newFields.publisherCountry = publisherSite.PublisherCountry

            flightCacheMap.set(flightID, newFields)
            legacyReportingData[i] = { ...legacyReportingData[i], ...newFields }
        }
    }

    return legacyReportingData
}