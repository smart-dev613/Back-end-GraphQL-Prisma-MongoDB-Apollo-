import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { stripe } from '../src/billing/stripe';
import { createInvoice, XeroAccountCode, getInvoicePDF } from '../src/billing/xero';
import { convertBufferToMailgunAttachment, createPayoutEmail } from '../src/emailHelper';
import { RevolutBusiness } from '../src/billing/revolut';
import { v4 as uuidv4 } from 'uuid';

const str = new stripe();
const environment = process.env.NODE_ENV
const titlePrefix = environment === "development" ? "Staging: " : "";
const revolutBusiness = new RevolutBusiness()

// Function to track processed subscriptions
async function trackProcessedSubscriptions(activeSubscriptions, couponId) {
    // Fetch already processed subscription IDs
    const processedSubscriptions = await prisma.processedSubscription.findMany({
        select: { subscriptionId: true },
    });
    const processedIds = new Set(processedSubscriptions.map(entry => entry.subscriptionId.toString()));

    // Filter unique IDs from Stripe to avoid duplicates
    const uniqueActiveSubscriptions = activeSubscriptions.filter(sub => {
        return !processedIds.has(sub.id); // Keep only those not yet counted
    });

    // Save new processed subscriptions to the database
    if (uniqueActiveSubscriptions.length > 0) {
        const newProcessedSubscriptions = uniqueActiveSubscriptions.map(sub => ({
            subscriptionId: sub.id,
            couponId: couponId
        }));

        await prisma.processedSubscription.createMany({
            data: newProcessedSubscriptions,
        });
    }

    return uniqueActiveSubscriptions.length; // Return count of new subscriptions
}

// Supported currencies by Revolut
const REVOLUT_SUPPORTED_CURRENCIES = [
    "AED", "AUD", "BGN", "CAD", "CHF", "CLP", "CNY", "COP", 
    "CZK", "DKK", "EGP", "EUR", "GBP", "HKD", "HUF", "IDR", 
    "ILS", "INR", "ISK", "JPY", "KRW", "KZT", "MAD", "MXN", 
    "NOK", "NZD", "PHP", "PLN", "QAR", "RON", "RSD", "SAR", 
    "SEK", "SGD", "THB", "TRY", "USD", "VND", "ZAR"
];
// Define pricing tiers based on currency and TAR values
const pricingTiers = {
    GBP: {
        1: 75,
        5: 500,
        10: 1000,
        25: 2500,
        50: 5000,
        150: 20000,
        250: 30000,
    },
    USD: {
        1: 125,
        5: 550,
        10: 1500,
        25: 3750,
        50: 7500,
        150: 30000,
        250: 45000,
    },
    SGD: {
        1: 150,
        5: 1000,
        10: 2000,
        25: 5000,
        50: 10000,
        150: 40000,
        250: 60000,
    },
    AUD: {
        1: 150,
        5: 1000,
        10: 2000,
        25: 5000,
        50: 10000,
        150: 40000,
        250: 60000,
    },
    MYR: {
        1: 225,
        5: 1500,
        10: 3000,
        25: 7500,
        50: 15000,
        150: 45000,
        250: 75000,
    },
    EUR: {
        1: 110,
        5: 470,
        10: 1300,
        25: 3200,
        50: 6500,
        150: 26000,
        250: 39000,
    },
    AED: {
        1: 450,
        5: 2000,
        10: 5500,
        25: 13800,
        50: 27500,
        150: 110000,
        250: 165000,
    },
    BGN: {
        1: 200,
        5: 900,
        10: 2500,
        25: 6300,
        50: 12500,
        150: 50500,
        250: 76000,
    },
    CAD: {
        1: 170,
        5: 750,
        10: 2050,
        25: 5000,
        50: 10000,
        150: 41000,
        250: 61000,
    },
    CHF: {
        1: 100,
        5: 450,
        10: 1200,
        25: 3000,
        50: 6000,
        150: 24000,
        250: 37000,
    },
    CLP: {
        1: 120000,
        5: 500000,
        10: 1400000,
        25: 3500000,
        50: 7000000,
        150: 28000000,
        250: 42000000,
    },
    CNY: {
        1: 900,
        5: 4000,
        10: 11000,
        25: 27000,
        50: 54000,
        150: 215000,
        250: 320000,
    },
    CZK: {
        1: 2700,
        5: 12000,
        10: 32000,
        25: 80000,
        50: 160000,
        150: 640000,
        250: 960000,
    },
    DKK: {
        1: 800,
        5: 3500,
        10: 9600,
        25: 24000,
        50: 48000,
        150: 190000,
        250: 290000,
    },
    EGP: {
        1: 6200,
        5: 27000,
        10: 75000,
        25: 190000,
        50: 370000,
        150: 1500000,
        250: 2250000,
    },
    HKD: {
        1: 1000,
        5: 4300,
        10: 12000,
        25: 30000,
        50: 60000,
        150: 240000,
        250: 350000,
    },
    HUF: {
        1: 40000,
        5: 190000,
        10: 520000,
        25: 1300000,
        50: 2600000,
        150: 10400000,
        250: 15600000,
    },
    IDR: {
        1: 2030000,
        5: 8900000,
        10: 24000000,
        25: 61000000,
        50: 122000000,
        150: 487000000,
        250: 730000000,
    },
    ILS: {
        1: 450,
        5: 2000,
        10: 5300,
        25: 13000,
        50: 27000,
        150: 110000,
        250: 160000,
    },
    INR: {
        1: 11000,
        5: 47000,
        10: 130000,
        25: 320000,
        50: 640000,
        150: 2600000,
        250: 3800000,
    },
    ISK: {
        1: 15500,
        5: 68000,
        10: 190000,
        25: 470000,
        50: 930000,
        150: 3700000,
        250: 5600000,
    },
    JPY: {
        1: 18000,
        5: 79000,
        10: 220000,
        25: 540000,
        50: 1100000,
        150: 4300000,
        250: 6500000,
    },
    KRW: {
        1: 170000,
        5: 740000,
        10: 2000000,
        25: 5100000,
        50: 10000000,
        150: 41000000,
        250: 61000000,
    },
    KZT: {
        1: 64000,
        5: 280000,
        10: 770000,
        25: 1900000,
        50: 3800000,
        150: 15000000,
        250: 23000000,
    },
    MAD: {
        1: 1100,
        5: 5000,
        10: 14000,
        25: 34000,
        50: 68000,
        150: 270000,
        250: 410000,
    },
    MXN: {
        1: 2400,
        5: 10000,
        10: 28000,
        25: 71000,
        50: 140000,
        150: 570000,
        250: 850000,
    },
    NOK: {
        1: 1250,
        5: 5500,
        10: 15000,
        25: 37000,
        50: 75000,
        150: 300000,
        250: 450000,
    },
    NZD: {
        1: 200,
        5: 900,
        10: 2500,
        25: 6200,
        50: 12000,
        150: 50000,
        250: 74000,
    },
    PHP: {
        1: 7000,
        5: 31000,
        10: 84000,
        25: 210000,
        50: 420000,
        150: 1700000,
        250: 2500000,
    },
    PLN: {
        1: 450,
        5: 2000,
        10: 5500,
        25: 14000,
        50: 28000,
        150: 110000,
        250: 170000,
    },
    QAR: {
        1: 460,
        5: 2000,
        10: 5500,
        25: 14000,
        50: 27000,
        150: 110000,
        250: 160000,
    },
    RON: {
        1: 550,
        5: 2400,
        10: 6500,
        25: 16000,
        50: 33000,
        150: 130000,
        250: 195000,
    },
    RSD: {
        1: 13000,
        5: 56000,
        10: 150000,
        25: 380000,
        50: 760000,
        150: 3000000,
        250: 4500000,
    },
    SAR: {
        1: 470,
        5: 2100,
        10: 5600,
        25: 14000,
        50: 28000,
        150: 110000,
        250: 170000,
    },
    SEK: {
        1: 1200,
        5: 5200,
        10: 14000,
        25: 35000,
        50: 71000,
        150: 280000,
        250: 420000,
    },
    THB: {
        1: 4050,
        5: 18000,
        10: 49000,
        25: 120000,
        50: 240000,
        150: 970000,
        250: 1500000,
    },
    TRY: {
        1: 4900,
        5: 22000,
        10: 59000,
        25: 150000,
        50: 300000,
        150: 1200000,
        250: 1800000,
    },
    VND: {
        1: 3300000,
        5: 14000000,
        10: 39000000,
        25: 98000000,
        50: 200000000,
        150: 780000000,
        250: 1200000000,
    },
    ZAR: {
        1: 2200,
        5: 9800,
        10: 27000,
        25: 67000,
        50: 135000,
        150: 530000,
        250: 800000,
    },
}
const getTier = (tar) => {
    let checkTier
    if (tar === 50) {
        checkTier = 'Bronze'
    } else if (tar === 150) {
        checkTier = 'Silver'
    } else if (tar === 250) { 
        checkTier = 'Gold'
    } else {
        checkTier = tar.toString(); // No valid tier found, return number as a string
    }
    return checkTier;
}

// Function to get the price based on currency and TAR
const getPricing = (currency, tar) => {
    if (currency in pricingTiers) {
        return pricingTiers[currency][tar]; // Return the price for the exact Currency & TAR value
    }
    
    // Default to USD pricing
    return pricingTiers.USD[tar]; // Return USD price if currency is not supported
}
// Main function to synchronize Total Active Referred (TAR)
export const syncTAR = async () => {
console.log(`begin syncing TAR`)
    // Fetch coupons with used referral code (if new company, we'll rely on atleast the code being used in topups page)
    let companyUsage = await prisma.companyCouponUsage.findMany({
        where: { isReferral: true },
    });
    if (companyUsage.length) { // Proceed only if there are coupon usages
        for (const usage of companyUsage) {
            let couponId = usage.couponId;
            let subscriptionRedemptionCount = usage.subscriptionRedemptionCount;
            let ownerId = await prisma.billingCoupon.findMany({
                   where: { id: couponId },
                   select: {
                       companyId: true
                   }            
               }) 
           if (ownerId.length === 0) {
               throw new Error(`No couponOwnerId found`);
           }
            const couponOwnerId = ownerId[0]
            // Get active subscriptions using this coupon for the last 3 months
            console.log(`Get active subscriptions for coupon ${couponId}`);
            let activeSubscriptionsLast3Months = await str.getActive3monthsSubscriptionsByCoupon(couponId);

            // Track and count unique subscriptions
            const countOfUniqueActiveSubscriptions = await trackProcessedSubscriptions(activeSubscriptionsLast3Months, couponId);
            
            // Calculate Total Active Referred (TAR)
            const TAR = subscriptionRedemptionCount + countOfUniqueActiveSubscriptions;
            
            if (countOfUniqueActiveSubscriptions  > 0) {
                console.log(`${subscriptionRedemptionCount} + ${countOfUniqueActiveSubscriptions} = ${TAR}`);
                
                
            
            // Fetch coupon owner's company information
            let couponCompanyInfo = await prisma.company.findMany({
                where: { id: couponOwnerId.companyId },
                include: {
                    bankAccount: true, // Include bank account information for payment
                }
            });

            if (couponCompanyInfo.length === 0) {
                throw new Error(`No company found`);
            }
            const couponCompany = couponCompanyInfo[0];

            // Ensure company has a tax ID
            let taxId = couponCompany?.vatNum;
            if (taxId) {
                console.log(`couponCompany taxId:`, taxId);
            } else {
                console.log(`No taxId for`, couponCompany.name);
                // throw new Error(`This company ${couponCompany.name} does not have a taxId`);
            }
            // if this company currency isn't supported by revolut, then default invoice currency to USD
            const invoiceCurrency = (couponCompany.currency && REVOLUT_SUPPORTED_CURRENCIES.includes(couponCompany.currency))
            ? couponCompany.currency 
            : 'USD';          
            const unitAmount = getPricing(invoiceCurrency, TAR); // Get the unit amount based on currency and TAR
            const calculatedTax = invoiceCurrency.toUpperCase() === "GBP" ? (unitAmount * ( 20/ 100)) : 0

              // Check if the unitAmount is valid before creating the payment and invoice
            if (unitAmount !== undefined) {
                   // make sure we have a revolut bank account to make payment
                   if(couponCompany.bankAccount?.counterparty_id) {
                   
                    const payoutInfo =  {
                        account_id: process.env.REVOLUT_DEFAULT_ACCOUNT, //our account to use for the payment
                        receiver: {
                        counterparty_id: couponCompany.bankAccount.counterparty_id,
                        account_id: couponCompany.bankAccount.counterparty_account_id
                        },
                        currency: invoiceCurrency.toUpperCase(),
                        amount: unitAmount + calculatedTax, // Use the calculated unit amount with tax 
                        request_id: uuidv4()
                       }
                       await revolutBusiness.makePayment(payoutInfo)
                       console.log(`payment made to ${couponCompany.bankAccount.counterparty_id} for amount of ${payoutInfo.amount} ${payoutInfo.currency}`)
                   
                const invoice = await createInvoice(couponCompany.id, titlePrefix + 'Payout For Referrals', [
                    {
                        description: `Payout For Referrals`,
                        quantity: 1,
                        unitAmount: unitAmount, // Use the calculated unit amount
                        taxType: 'NONE',
                        accountCode: XeroAccountCode.PAYOUT_REFERRALS,
                        taxAmount: calculatedTax,
                        lineAmount: unitAmount,
                        discountAmount: 0
                    }
                ], { isReferral: true, currencyCode: invoiceCurrency });        
                // Send invoice via email
                  if (invoice) {
                      console.log(`Xero invoice ready`);
                      const invoicePdf = await getInvoicePDF(couponCompany.id, invoice.invoiceID);
                      let attachment = await convertBufferToMailgunAttachment(invoicePdf, `payoutReferral-${couponCompany.name}.pdf`);
                      console.log(`Sending payout email`);
                      await createPayoutEmail(couponCompany, attachment, { tar: TAR , companyLogo: couponCompany.logoURL, titlePrefix: titlePrefix });
                      console.log(`Done sending email`);
                  } else {
                      throw new Error(`Sending Xero invoice`);
                  }
                } else {
                 //  todo: send email to user to create a rev account then make payment?
                                  
                    console.log(`No valid Revolut account found for payment for ${couponCompany.name} : id ${couponCompany.id}`);
                    }
                
            } else {
                console.log(`This coupon hasn't reach a Tier Milestone yet`);
            }  
            console.log({countOfUniqueActiveSubscriptions})
             // Update TAR and referral stufff in the database if there are new unique subscriptions
                //check billingcoupon instead
                await prisma.companyCouponUsage.updateMany({
                    where: { couponId: couponId },
                    data: { subscriptionRedemptionCount: TAR },
                });
                 const currentTier = getTier(TAR)
                  // company.refferedEarned (how much they've earned? we need to do this logic seperate)
                await prisma.company.updateMany({
                        where: {
                            id: couponCompany.id,
                        },
                        data: {
                          refferedTotal: TAR, // (how many people they've referred, validated TAR)
                          refferedTier: currentTier // (bronze,silver, etc)
                        },
                    })
                console.log(`Increased TAR for coupon ${couponId} and tier count for ${currentTier}`);
         }
        }
    }
}

// Start the synchronization process
syncTAR().then(() => console.log("Done syncing TAR"));
