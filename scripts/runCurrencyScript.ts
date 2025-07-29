import {config} from 'dotenv'
import {crawlCurrencyData} from './parseCurrencyRate'

config();

crawlCurrencyData().then(_=>console.log("done"))

