import express from 'express'

import {router as baseRouter} from './router'
import {router as taskRouter} from './tasks'
import {router as legacyRouter} from './legacy'

const rootRouter = express.Router()

rootRouter.use("/", baseRouter)
rootRouter.use("/task", taskRouter);
rootRouter.use("/legacy", legacyRouter)


export default rootRouter