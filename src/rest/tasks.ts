import express from 'express'
import { cacheMediaReportSequentially } from '../app/services/reporting/cache'
export const router = express.Router()

router.get("/cacheReporting", async (req, res) => {
    try {
        cacheMediaReportSequentially()
        res.send("OK")
    } catch (e) {
        console.log(e)
        res.statusCode = 500
        res.send()
    }
})