import express from 'express'

export const router = express.Router()

import {router as reportingRouter} from './reporting'

router.use('/reporting', reportingRouter)