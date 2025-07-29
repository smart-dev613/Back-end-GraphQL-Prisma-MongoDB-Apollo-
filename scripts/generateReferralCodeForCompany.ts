import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
import { createObjectID } from '../util/createIDs';
import { stripe } from '../src/billing/stripe';

import _ from 'lodash';
import { PromoValueUnit } from '../src/inputs/billing';

const addReferralCode = async (companyId: string) => {
  try {
    console.log(`[Referral Code]: Start for company ${companyId}`);
    const company: any = await prisma.company({ id: companyId }).$fragment(`{
            id
            name
            currency
            billingReferral {
              _id
            }
          }`);
    if (!company) throw new Error('Company does not exist');

    if (!company.billingReferral) {
      const payload = {
        _id: createObjectID()._id,
        name: `${_.camelCase(company.name).substring(0, 35)}${Math.floor(
          Math.random() * 9999
        )}`.toLowerCase(),
        promoCode: `${_.camelCase(company.name).substring(0, 35)}${Math.floor(
          Math.random() * 9999
        )}`.toLowerCase(),
        value: 15,
        unit: PromoValueUnit.PERCENTAGE,
        startDate: new Date(),
        endDate: null,
        oneUsePerCompany: false,
        oneUsePerUser: false,
        isReferral: true,
      };

      const str = new stripe();
      const coupon = await str.createCoupon({
        ...payload,
        currency: company.currency || 'GBP',
      });

      console.log(`[Referral Code]: End for company ${companyId}`);

      const couponCreated = await prisma.createBillingCoupon({
        ...payload,
        stripeCouponId: coupon.id,
      });

      await prisma.updateCompany({
        where: {
          id: company.id,
        },
        data: {
          billingReferral: {
            connect: {
              _id: couponCreated._id,
            },
          },
        },
      });
    }
  } catch (error) {
    console.log(error);
  }
};

export const addReferralCodeForCompanies = async () => {
  try {
    const companies: any = await prisma.companies();
    for (let comp of companies) {
      if (comp) {
        await addReferralCode(comp.id);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

addReferralCodeForCompanies();
