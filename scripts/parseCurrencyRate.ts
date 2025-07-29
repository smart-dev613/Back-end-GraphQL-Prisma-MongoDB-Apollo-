import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { createObjectID } from '../util/createIDs';
import axios from 'axios';
import moment from 'moment';

export const crawlCurrencyData = async () => {
  try {
    const { data } = await axios.get(`https://fcsapi.com/api-v3/forex/latest`, {
      params: {
        symbol: 'all_forex',
        access_key: process.env.FOREX_API_KEY,
      },
    });

    console.log(`[CURRENCIES] Start Crawling Currencies`);

    if (data.status) {
      for (let element of data.response) {
        let { id } = createObjectID();
        const [baseCurrency, targetCurrency] = element.s.split('/');

        // Retrieve currencies based on conditions
        let allAvailableCurrencies = await prisma.currencyTable.findMany({
          where: {
            baseCurrency,
            targetCurrency,
            updateTime: {
              equals: moment(element.tm).format('YYYY-MM-DD'),
            },
          },
        });

        // Delete old currency data
        if (allAvailableCurrencies.length > 0) {
          await prisma.currencyTable.deleteMany({
            where: {
              id: {
                in: allAvailableCurrencies.map((item) => item.id),
              },
            },
          });
        }

        // Create new currency entry
        await prisma.currencyTable.create({
          data: {
            id,
            baseCurrency,
            targetCurrency,
            currentRate: element.c,
            time: element.t,
            updateTime: new Date(element.tm),
          },
        });
      }

      console.log(`[CURRENCIES] End Crawling Currencies`);
    } else {
      console.log('[CURRENCIES] Something wrong with currency');
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const removeUnusedCurrencies = async () => {
  try {
    // Delete old data based on the `updateTime` field
    await prisma.currencyTable.deleteMany({
      where: {
        updateTime: {
          lt: moment().subtract(7, 'days').toDate(),
        },
      },
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

// Uncomment to run the function
// crawlCurrencyData();
