import {runScript as master} from './createMasterSynkd'
import {runScript as marketingTopUps} from './createBillingServices'
import {runScript as packages} from './createPackages'
import {runScript as indexes} from './createDefaultCollectionIndex'
import {runScript as mediaFormats} from './createMediaFormats'
import {crawlCurrencyData as currencies} from './parseCurrencyRate'


import {config} from 'dotenv'
config();


const runScript = async () => {

    // Step 0. Have collection indexes (legacy for some collections in fenix api)
    await indexes();

    // Step 1. Add synkd master
    await master("SynkdLifeM100!");

    // Step 2. Create marketing top-ups
    await marketingTopUps();

    // Step 3. Create packages
    await packages();

    // Step 4. Create media formats
    await mediaFormats();


    // Step 5. Currencies
    await currencies();


    // await publishers();
}

runScript().then(_=>console.log("done"))
