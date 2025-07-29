
import dotenv from 'dotenv';
import { stripe } from '../src/billing/stripe';
import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();

import { createObjectID } from '../util/createIDs';
import { PromoValueUnit } from '../src/inputs/billing';
import { camelCase } from 'lodash';

dotenv.config()


export const runScript = async () => {
    
    const excludedNames = ['ibrahim', 'zauroh', 'abdullahi'];

    // Fetch companies that do not contain any of the excluded names
    const companies = await prisma.company.findMany({
      where: {
        NOT: {
          name: {
            contains: excludedNames.join(' OR '), // This will require adjustment for proper filtering
          },
        },
      },
    });
    
    // Loop through each company and create a coupon
    for (const company of companies) {
      const couponName = `${camelCase(company.name).substring(0, 35)}${Math.floor(
        Math.random() * 9999
      )}`.toLowerCase();
      
      const referralCouponName = `${camelCase(company.name).substring(0, 35)}${Math.floor((Math.random() * 9999))}`.toLowerCase();
      
      const referralCouponPayload = {
        id: createObjectID().id,
        name: referralCouponName,
        promoCode: referralCouponName,
        value: 50, // 50% off for now
        unit: PromoValueUnit.PERCENTAGE,
        startDate: new Date(),
        endDate: null,
        oneUsePerCompany: false,
        oneUsePerUser: false,
        isReferral: true,
        isSignupCoupon: false,
        duration: 'forever',
      };
    
      // Create the coupon using Stripe
      const str = new stripe();
      const referralCoupon = await str.createCoupon({ ...referralCouponPayload, currency: company.currency || 'GBP' });
    
      // Update the existing company with the referral coupon
      await prisma.company.update({
        where: {
          id: company.id, // Use the existing company ID
        },
        data: {
          billingReferral: {
            create: {
              ...referralCouponPayload,
              stripeCouponId: referralCoupon.id,
              companyId: company.id, // Ensure this matches the ID of the updated company
            },
          },
        },
      });
    }
}

runScript().then(() => console.log("Done assigning TAR "))