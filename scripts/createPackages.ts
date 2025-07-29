// @author: Rishabh Jindal
// @description: script to create billing packages
// @requires: stripe API key

import Stripe from 'stripe';
import dotenv from 'dotenv';

import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();

import { createObjectID } from '../util/createIDs';

dotenv.config()

enum PackageSizes {
    FREE = "Free",
    SMALL = "Small",
    MEDIUM = "Medium",
    LARGE = "Large"
}

enum PRODUCT_NAME {
    USER = "Users",
    EMAIL = "Emails",
    SMS = "SMS",
    RESEARCH = "Research Studies",
    CODE = "Codes",
    NEWSLETTER = "Newsletters",
    EVENT = "Booking templates",
    STRATEGY = "Strategy Clusters"
}

interface PackageContent {
    product: PRODUCT_NAME,
    qty: number,
}

interface Package {
    size: PackageSizes,
    contents: PackageContent[]
}

const createPackage = (size: PackageSizes = PackageSizes.SMALL, users: number = 1, email: number = 1, sms: number = 1, research: number = 1, code: number = 1, newsletter: number = 1, event: number = 1, strategy: number = 1): Package => {
  return {
      size,
      contents: [
          {
              product: PRODUCT_NAME.USER,
              qty: users
          },
          {
            product: PRODUCT_NAME.EMAIL,
            qty: email
        },
        {
            product: PRODUCT_NAME.SMS,
            qty: sms
        },
        {
            product: PRODUCT_NAME.RESEARCH,
            qty: research
        },
        {
            product: PRODUCT_NAME.CODE,
            qty: code
        },
        {
            product: PRODUCT_NAME.NEWSLETTER,
            qty: newsletter
        },
        {
            product: PRODUCT_NAME.EVENT,
            qty: event
        },
        {
            product: PRODUCT_NAME.STRATEGY,
            qty: strategy
        }
      ]
  }
}

interface FulfilmentService {
    id: string,
    quantity: number
}
interface Fulfilment {
    services: FulfilmentService[]
}

export function enumKey(myEnum: any, enumValue: number | string): string {
    let keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
    return keys.length > 0 ? keys[0] : '';
  }

  const packageToBillingProduct = async (pack: Package) => {
    const description = pack.contents.map(m => `${m.qty} ${m.product}`).join(", ");

    const fulfilment: Fulfilment = { services: [] };

    for (let content of pack.contents) {
        const prismaResult = await prisma.MarketingTopupService.findMany({
            where: { name: enumKey(PRODUCT_NAME, content.product) },
            select : {id: true}
        });

        const id = prismaResult[0]?.id;
        const fService: FulfilmentService = {
            id,
            quantity: content.qty
        };
        fulfilment.services.push(fService);
    }

    const billingProducts: any = {
        name: pack.size,
        description,
        fulfilment,
    };

    // if (pack.size !== PackageSizes.FREE) {
    //     const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    //         apiVersion: '2020-08-27'
    //     });

    //     let prods = await stripe.products.list();
    //     const prod_id = prods.data.filter(p => p.name === enumKey(PackageSizes, pack.size))[0].id;
    //     billingProducts.stripeProductId = prod_id;
        
    //     let stripe_prices = await stripe.prices.list({ product: prod_id });

    //     // Filter out archived prices
    //     const prices = stripe_prices.data
    //         .filter(price => price.active === true) // Only include active prices
    //         .map(price => <any>{
    //             currency: price.currency.toUpperCase(),
    //             stripePriceId: price.id,
    //             description: `${price.currency.toUpperCase()}${price.unit_amount / 100}`,
    //             price: price.unit_amount / 100
    //         });

    //     billingProducts.prices = prices;
    // }
        const stripe = new Stripe(process.env.STRIPE_API_KEY, {
          //  @ts-ignore
            apiVersion: '2020-08-27'
        });
    
        let prods = await stripe.products.list();
        const prod_id = prods.data.filter(p => p.name === enumKey(PackageSizes, pack.size))[0].id;
        billingProducts.stripeProductId = prod_id;
    
        let allPrices = [];
        let hasMore = true;
        let startingAfter: string | null = null; // Initialize as null

        // Fetch all prices, handling pagination
        while (hasMore) {
    const stripe_prices = await stripe.prices.list({
        product: prod_id,
        ...(startingAfter ? { starting_after: startingAfter } : {}) // Only include if startingAfter is defined
    });

    allPrices = allPrices.concat(stripe_prices.data);
    hasMore = stripe_prices.has_more;

    // Set startingAfter for the next page if there are more prices
    if (hasMore) {
        startingAfter = stripe_prices.data[stripe_prices.data.length - 1].id;
    }
}
    
        // Filter out archived prices
        const prices = allPrices
            .filter(price => price.active) // Only include active prices
            .map(price => <any>{
                currency: price.currency.toUpperCase(),
                stripePriceId: price.id,
                description: `${price.currency.toUpperCase()}${price.unit_amount / 100}`,
                price: price.unit_amount / 100
            });
    
        billingProducts.prices = prices;
    
    await prisma.BillingProduct.create({
        data: { 
            ...billingProducts
        }
    });
};


export const runScript = async () => {
    await packageToBillingProduct(createPackage(PackageSizes.FREE, 1, 500, 0, 1, 100, 1, 1, 1))
    await packageToBillingProduct(createPackage(PackageSizes.SMALL, 2, 2500, 100, 2, 1500, 2, 2, 2))
    await packageToBillingProduct(createPackage(PackageSizes.MEDIUM, 5, 10000, 500, 3, 5000, 3, 3, 3))
    await packageToBillingProduct(createPackage(PackageSizes.LARGE, 15, 25000, 2500, 5, 100000, 5, 5, 5 ))
}

runScript().then(() => console.log("Done creating packages"))