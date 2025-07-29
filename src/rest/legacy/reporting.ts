import dayjs from 'dayjs'
import express from 'express'
import { getMediaReportFromCache } from '../../app/services/reporting/cache'

export const router = express.Router()

router.post("/media/:id", async (req, res) => {
    const campaignID = req.params.id
    const reportRequestBody = req.body

    // parse start and end dates from the body
    const startDate = new Date(reportRequestBody.Date.Start)
    const endDate = new Date(reportRequestBody.Date.End)

    const cachedData = await getMediaReportFromCache(campaignID, startDate, endDate)
    res.send({ status: "success", data: cachedData ? cachedData : [] })
})