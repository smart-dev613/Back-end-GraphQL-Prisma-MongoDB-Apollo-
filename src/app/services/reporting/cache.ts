import axios from 'axios'
import dayjs from 'dayjs'
import { db, mediaDB, mediaReportCacheDB } from "../../../helpers/mongoHelper"
import { addReportingFields } from './mutate'

/* 
gets reporting data from api-fenix
*/
export const fetchMediaReportLegacy = async (campaignID: string, startDate: Date, endDate: Date, reportingParams?: object) => {
    // get all possible fields
    const defaultFields = [
        'dwell',
        'impression',
        'click_to_site_single',
        'click_to_site_multiple',
        'v_untrackable',
        'v_on_page_not_in_view',
        'v_on_page_half_in_view',
        'v_on_page_in_view',
        'v_on_page_in_view_one_second',
        'click_to_site',
        'clicked_next',
        'close',
        'closed',
        'mute',
        'unmute',
        'vid_played',
        'vidcomplete',
        'video_play',
        'vp10p',
        'vp25p',
        'vp50p',
        'vp75p'
    ]
    
    const allEvents = await db.collection('media_events').find({ Campaign: parseInt(campaignID) }).toArray()
    const allFields = allEvents.map(event => event.Event)
    const uniqueFields = Array.from(new Set([...allFields, ...defaultFields]))

    const publisher = await db.collection('campaign').findOne({ _id: parseInt(campaignID) }, { projection: {"Advertiser": 1, "Client": 1} })
    const publisherID = publisher.Advertiser
    const dataColumns = uniqueFields.map(field => { return { field } })
    const defaultParams = { "pivotColumns": [{ "field": "Flight" }], "dataColumns": dataColumns, overridePublisherID: publisherID}
    const usedParams = reportingParams ? reportingParams : defaultParams

    usedParams["Date"] = { "Start": startDate.getTime(), "End": endDate.getTime() }

    // make the call to api-fenix

    const resp = await axios.post("http://api.default" + "/platform/reporting/report/media/" + campaignID, usedParams, {
        headers:
            { "cookie": "FenixToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6IldwdmNSdm1wUTU5aUpwNHlhaVFmT0pETDlmbDlLekV2IiwiaWF0IjoxNjc5NDAzNTkyfQ.3Gb4uKbXq6alK6GQm2bHv7s1J-NqrT7sUE4FOaq0zNo" }
    })
    const modifiedReport = addReportingFields(resp?.data?.data)
    return modifiedReport
}

/**
 * caches the media report and returns that report
 * @param campaignID
 * @param startDate 
 * @param endDate 
 * @returns legacy media report data between the two dates
 */
export const cacheMediaReport = async (campaignID: string, startDate: Date = new Date('2022/12/01'), endDate: Date = new Date()) => {

    const report = await fetchMediaReportLegacy(campaignID, startDate, endDate)

    if (report.length > 0) {

        // convert into a mongo date to use mongo date indexing
        for (let i = 0; i < report.length; i++) {
            report[i].Date = new Date(report[i].Date);
        }

        // @ts-ignore
        await mediaReportCacheDB.collection(campaignID).insertMany(report)
    }

    await db.collection('campaign').updateOne({ _id: parseInt(campaignID) }, { $set: { "reportingCacheTill": endDate } })
    return report

    // if doesn't exist, create one from

    // if exists, get report since the last cache

    // store in db
}

const getEffectiveStartDate = async (campaignID: string): Promise<dayjs.Dayjs> => {

    // set default start date to be the first obs from media data
    const query = await mediaDB.collection(campaignID).findOne({}, { sort: { Created: 1 }, projection: { Created: 1 } })

    const defaultStartDate = (query && query.Created) ? dayjs(query.Created) : dayjs().startOf('day').subtract(2, 'day')
    // find the last cache
    const lastCacheDoc = await db.collection('campaign').findOne({ _id: parseInt(campaignID) }, { projection: { "reportingCacheTill": 1, "_id": 0 } })
    const lastCacheDate = (lastCacheDoc && lastCacheDoc.reportingCacheTill) ? dayjs(lastCacheDoc.reportingCacheTill) : null

    // if there's no cache, start one by one from 

    return lastCacheDate ? lastCacheDate.add(1, 'millisecond') : defaultStartDate
}

export const cacheMediaReportSequentially = async (daysAtATime: number = 1) => {
    // get all campaign IDs
    const campaignsCursor = db.collection('campaign').find({}, { projection: { _id: 1 } })
    const campaignIDs = await campaignsCursor.toArray()

    for (let campaignIDDoc of campaignIDs) {
        const campaignID = campaignIDDoc._id.toString()
        var effectiveStartDate = await getEffectiveStartDate(campaignID)
        const yesterday = dayjs().subtract(1, 'day').endOf('day')

        while (effectiveStartDate.isBefore(yesterday)) {
            await cacheMediaReport(campaignID, effectiveStartDate.toDate(), effectiveStartDate.endOf('day').toDate())
            effectiveStartDate = await getEffectiveStartDate(campaignID)
        }
    }
}

/**
 * get media report either from the cache (if available) or from the legacy api
 * and add it to cache. this function is meant for an easy substitute for the
 * existing api call
 */
export const getMediaReportFromCache = async (campaignID: string, startDate: Date, endDate: Date) => {
    // check if the endDate is covered by cache
    // TODO: replace with prisma 2?
    const campaign = await db.collection('campaign').findOne({ _id: parseInt(campaignID) }, { projection: { reportingCacheTill: 1 } })

    let allReportingData = []
    // endDate = dayjs(endDate).endOf('day').subtract(1, 'day').toDate()
    if (campaign && campaign.reportingCacheTill) {
        const reportingCacheTillDate = campaign.reportingCacheTill
        // if the end date is covered by the cache, get from the cache
        if (dayjs(reportingCacheTillDate).isAfter(dayjs(endDate)) || dayjs(reportingCacheTillDate).isSame(dayjs(endDate))) {
            const reportCursor = mediaReportCacheDB.collection(campaignID).find({ Date: { $gte: startDate, $lt: endDate } })
            allReportingData = await reportCursor.toArray()
        }
        else if (dayjs(startDate).isBefore(reportingCacheTillDate) && dayjs(endDate).isAfter(reportingCacheTillDate)) {
            // get what's available in cache first
            const reportCursor = mediaReportCacheDB.collection(campaignID).find({ Date: { $gte: startDate, $lt: reportingCacheTillDate } })
            const cachedReportData = await reportCursor.toArray()

            const uncachedData = await fetchMediaReportLegacy(campaignID, dayjs(reportingCacheTillDate).add(1, 'ms').toDate(), endDate)

            allReportingData = [...cachedReportData, ...uncachedData]

        } else {
            allReportingData = await fetchMediaReportLegacy(campaignID, startDate, endDate)
        }
    } else {
        allReportingData = await fetchMediaReportLegacy(campaignID, startDate, endDate)
    }
    // add supplementary data to reporting
    //! TODO: take into account the case where startDate is in cache but endDate is not.
    // below is assuming neither the startDate nor the endDate is within the cache
    return allReportingData
}