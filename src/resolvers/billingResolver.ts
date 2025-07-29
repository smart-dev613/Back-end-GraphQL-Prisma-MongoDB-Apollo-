import { Resolver, Query, Mutation, Arg, Ctx, Authorized } from "type-graphql";
import { json } from "../helpers";
import { checkIfUserIsInCompany, hasPermission } from '../helpers/permissionsHelper'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { Context } from "../auth/context.interface";
import { createObjectID } from "../../util/createIDs";
import { TransactionPaginationInput, CreatePaymentCardInput, UpdateCompanyBillingInfoInput, StartTopupTransactionInput, GetMyPricingInfoForServiceInput, CreateCompanySubscriptionInput, GetInternalProductInfoForCompanyInput, RedeemCouponInput, GetBalancesInput, CreateConnectAccount, DelConnectAccount, CreateBillingCouponInput, PromoValueUnit, GetNewBalancesInput } from "../inputs/billing";
import { stripe } from "../billing/stripe";
import Stripe from "stripe";
import { PERMISSION_ACCESS_TYPES } from "../constants/perms";
import moment from "moment";
import * as xero from '../billing/xero';
import { RevolutBusiness } from "../billing/revolut";
import { update } from "lodash";
import { db } from "../helpers/mongoHelper"
// import { schedule } from 'agenda/dist/agenda/schedule';

const revolutBusiness = new RevolutBusiness();
// used in events
  //see below for reference
  // async redeemCoupon
  // async getBillingCouponInfoByPromoCode
  // async redeemStripeCoupon
export const redeemCouponById = async (couponId: any, ctx: any, companyId: string) => {
  // const company = await checkIfUserIsInCompany(ctx.user.id, companyId)
  // if (company === null) throw new Error(`User is not part of this company`)

  let coupon =  await prisma.billingCoupon.findUnique({
    where: {
      id: couponId, // Adjust if your primary key is named differently
    },
    include: {
      usedByUser: true, // Include users who have used the coupon
      createdByUser: true, // Include users who have created the coupon
    },
  })
  const usedByUser = coupon.usedByUser;
  const createdByUser = coupon.createdByUser;
  
  // Check if one-use per company is enforced
      if (coupon.companyId === companyId || createdByUser.length > 0 && createdByUser.find((us: any) => us.id === ctx.user.id )) {
      //  if (companyId !== '622b68d0a072010007372129') { //by pass for synkd
         throw new Error('you are not allowed to use your own coupon')
        // }
      }
      let companyUsage = await prisma.companyCouponUsage.findMany({
        where: {
          couponId: couponId,
          companyId: companyId,
        },
      })
      
      if (companyUsage && companyUsage.length > 0) {
        if (companyUsage[0].isReferral === true && companyUsage[0].topupRedemptionCount >= 1) {
          throw new Error("Referral Coupon can only be used once in top-ups page.")
        }
      }
      // Conditions check
  if (coupon.maximumUses !== null && coupon.maximumUses >= coupon.currentUses) throw new Error('This coupon is no longer available')
  if (coupon.endDate !== null && new Date(coupon.endDate) >= new Date(coupon.startDate)) throw new Error('This coupon is no longer available')
  if (coupon.oneUsePerUser && usedByUser && usedByUser.length > 0 && usedByUser.find((us: any) => us.id === ctx.user.id )) {
    throw new Error('This user is already redeem this coupon')
  }

  
  return await prisma.billingCoupon.update({
    where: {
      id: coupon.id, // Ensure you are using the correct primary key field
    },
    data: {
      currentUses: {
        increment: 1, // Increment the currentUses by 1
      },
      usedByUser: {
        connect: {
          id: ctx.user.id, // Connect the user by their ID
        },
      },
    },
  })
}
  // see below for reference
  // async redeemCouponById
  // async getBillingCouponInfoByPromoCode
  // async redeemCoupon
export const redeemStripeCoupon = async (couponId: any, companyId: string /*, userId: string */, usageType: string) => {
  // this is for referal coupon redemption and tracking (topups/subs)
  // // Fetch the coupon
  let coupon = await prisma.billingCoupon.findUnique({
    where: {
      id: couponId
    }
  })
  if (!coupon) {
    throw new Error("Coupon not found.");
  }
  if (coupon.isReferral === false) return // don't do anything if this isn't a referral code

  // iza --- all validation checks would have been done during checkout
  // Find the existing usage record
  let companyUsage = await prisma.companyCouponUsage.findMany({
    where: {
      couponId: couponId,
      companyId: companyId,
    },
  })
  // If it doesn't exist, create a new usage record
  if (!companyUsage || companyUsage.length === 0) {
      console.log("create new company usage")
      await prisma.companyCouponUsage.create({
      data: {
        companyId: companyId,
        couponId: couponId,
        topupRedemptionCount: usageType.toLowerCase() === "topup" ? 1 : 0,
        subscriptionRedemptionCount: 0, // only increase after user is on sub for 3months or more iza script for later
        isReferral: true
      }
    })
  } else {
    // Update counts based on usage type
    const updateData = {}
    if (usageType.toLowerCase() === "topup") {
      updateData['topupRedemptionCount'] = companyUsage[0].topupRedemptionCount + 1;
    } 
    // iza comment out we might not need because of the script, but if we decide not to do 3 months check, uncomment this
    // else { 
    //   updateData['subscriptionRedemptionCount'] = companyUsage[0].subscriptionRedemptionCount + 1;
    // }
    
    await prisma.companyCouponUsage.updateMany({
      where: { 
      couponId: companyUsage[0].couponId,
      companyId: companyUsage[0].companyId
      },
      data: updateData,
    });
  }

  return await prisma.billingCoupon.update({
    where: {
      id: coupon.id
    },
    data: {
      currentUses: coupon.currentUses + 1,
    //   usedByUser: {
    //     connect: {
    //       id: ctx.user.id
    //     }
    //   },
    //   usedByCompanyMembership: {
    //   connect: {
    //   id: companyId
    //   }
    //  }
    }
  })

}

function capitalizeWords(str) {
    return str.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
}
export const legacyGetBalancesFn = async (data: GetBalancesInput, ctx: Context) => {
  const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId)
  if (company === null) throw new Error(`User is not part of this company`)

  // Permissions check
  let perm = await hasPermission('msl_companyBilling', PERMISSION_ACCESS_TYPES.view_only, null, ctx.user.id, company.id)
  if (!perm) return {error: 'NO_PERMISSION'}
  
  // const lastInvoice: any = await prisma.billingInvoice.findMany({
  //   where: {
  //     company: {
  //       id: company.id
  //     },
  //     LineItems_some: {
  //       service: 'PACKAGE'
  //     }
  //   },
  //   orderBy: 'issueDate_DESC'
  // })

  // const allServices = await prisma.marketingTopupServices()
  // const allProducts = await prisma.billingProducts()
  
  // for (let idx = 0; idx < lastInvoice.length; idx++) {
  //   const detailProduct = lastInvoice[idx].LineItems[0].referenceId ? allProducts.find((item: any) => item._id === lastInvoice[idx].LineItems[0].referenceId) : allProducts.find((item: any) => item.name === 'Free');
  //   // console.log(detailProduct.name)
  //   if (detailProduct) {
  //     lastInvoice[idx].product_detail = detailProduct
  //     lastInvoice[idx].service_detail = detailProduct.fulfilment.services.map((item: any) => {
  //       const service = allServices.find((ser: any) => ser._id === item.id || ser.id === item.id)
  //       return {
  //         ...item,
  //         ...service
  //       }
  //     })
  //   }
  // }

  let topupBalance = {};
  let subscriptionBalance = {};
  let allIdsFound = [];

  // if (lastInvoice.length > 0) {
  //   let prevInvoiceDate = moment().add(1, 'months');
  //   for (let idx = 0; idx < lastInvoice.length; idx++) {
  //     let currentDate = moment(new Date(lastInvoice[idx].issueDate))
  //     let nextDate = moment(new Date(lastInvoice[idx].issueDate)).add(1, 'months')
  //     if (prevInvoiceDate.diff(currentDate, 'days') < nextDate.diff(currentDate, 'days')) {
  //       nextDate = prevInvoiceDate;
  //     }
  //     prevInvoiceDate = currentDate

  //     const ledgersNew = await prisma.billingLedgers({
  //       where: {
  //         company: {
  //           id: company.id
  //         },
  //         type_in: [
  //           'USAGE',
  //         ],
  //         ...(data.service ? { service: data.service } : {}),
  //         timestamp_gte: currentDate.toDate(),
  //         timestamp_lt: nextDate.toDate(),
  //       }
  //     })

  //     const ledgersOld = await prisma.billingLedgers({
  //       where: {
  //         _company: company._id,
  //         type_in: [
  //           'USAGE',
  //         ],
  //         ...(data.service ? { service: data.service } : {}),
  //         timestamp_gte: currentDate.toDate(),
  //         timestamp_lt: nextDate.toDate(),
  //       }
  //     })

  //     const ledgers = [...ledgersNew]
  //     ledgersOld.forEach((oldLed: any) => {
  //       if (!(ledgers.find((le) => le._id === oldLed._id))) {
  //         ledgers.push(oldLed)
  //       }
  //     })

  //     allIdsFound.push(...ledgers.map(item => item._id));
      
  //     let reducerTotal = ledgers.reduce((acc: any, curr: any) => {
  //       if (!(curr.service in acc)) {
  //         acc[curr.service] = {
  //           topup: 0,
  //           subscription: 0,
  //           usage: 0,
  //         }
  //       }
  //       if (curr.type === 'USAGE') {
  //         acc[curr.service].usage += curr.amount
  //       }

  //       return acc;
  //     }, {})

  //     lastInvoice[idx]?.service_detail?.forEach((curr: any) => {
  //       if (!(curr.name in reducerTotal)) {
  //         reducerTotal[curr.name] = {
  //           topup: 0,
  //           subscription: 0,
  //           usage: 0,
  //         }
  //       }
  //       reducerTotal[curr.name].subscription += curr.quantity
  //     });

  //     if (moment().isBetween(currentDate, nextDate, undefined, '[)')) {
  //       for (const key in reducerTotal) {
  //         if (!(key in topupBalance)) {
  //           topupBalance[key] = 0
  //         }
  //         let subBal = reducerTotal[key].subscription + reducerTotal[key].usage
  //         let topBal = (subBal < 0 ? subBal : 0)
  //         subscriptionBalance[key] = subBal < 0 ? 0 : subBal
  //         topupBalance[key] += topBal
  //       }
  //     } else {
  //       for (const key in reducerTotal) {
  //         if (!(key in topupBalance)) {
  //           topupBalance[key] = 0
  //         }
  //         let subBal = reducerTotal[key].subscription + reducerTotal[key].usage
  //         let topBal = (subBal < 0 ? subBal : 0)
  //         topupBalance[key] += topBal
  //       }
  //     }
  //   }
  // }

  // allServices.forEach(({ name }) => {
  //   topupBalance[name] = topupBalance[name] || 0
  // })

  // const leftBalance = await prisma.billingLedgers({
  //   where: {
  //     company: {
  //       id: company.id
  //     },
  //     type_in: [
  //       'TOPUP',
  //       'FREE'
  //     ],
  //     _id_not_in: allIdsFound
  //   }
  // })

  // const reduceLeftTotal = leftBalance.reduce((acc: any, curr: any) => {
  //   if (!(curr.service in acc)) {
  //     acc[curr.service] = 0
  //   }
  //   acc[curr.service] += curr.amount
  //   return acc
  // }, {})

  // for (const key in reduceLeftTotal) {
  //   if (!(key in topupBalance)) {
  //     topupBalance[key] = 0
  //   }
  //   topupBalance[key] += reduceLeftTotal[key]
  // }
  
  return {
    topupBalance,
    subscriptionBalance,
  }
}

export const getBalancesFn = async (data: GetNewBalancesInput, ctx: Context) => { 

  let balances = await prisma.balance.findMany({
    where: {
      companyId: data.companyId
     }
   })
 return balances
  
}
export const isBalanceAvailableForService = async (data: GetBalancesInput, ctx: Context) => {
  const { topupBalance, subscriptionBalance } = await legacyGetBalancesFn(data, ctx);
  
  const balance = (topupBalance[data.service] || 0) + (subscriptionBalance[data.service] || 0)
  if (balance >= +data.amountRequired) {
    return true
  }
  return false
}
export const calculateTaxWithDiscount = async(price, currency, discountedAmount) => {
  // Fetch tax rates from your API or database
  let rates = await prisma.billingTaxRate.findMany({
    where: {
      currencyCode: currency.toUpperCase()
    }
  });

  if (rates.length === 0) {
    return {};
  } else {
    let rate = rates[0];
    let taxRate = rate.rate / 100;

    // Calculate net price after discount
    let netPrice = price - discountedAmount;

    // Calculate tax payable based on net price
    let taxPayable = netPrice * taxRate;

    return {
      payable: taxPayable,
      rate: rate,
      netPrice: netPrice // Optional: return the net price as well
    }
  }
}
type UseBalanceProps = {
  service: string,
  amount: number,
  company: any,
  description: string
}

export const useBalance = async ({ service, amount, company, description }: UseBalanceProps, ctx: Context) => {
  const { id: ledgerID } = createObjectID();
  
  try {
      
    const balancesCollection = db.collection('Balance')
    const balances = await balancesCollection.find({
      companyId: company.id.toString()
    }).toArray()
  
    if (!balances.length) {
      throw new Error('Balances for company not found')
    }
     
    let balanceToUpdate = null
    let balanceType = ''

    // Check Subscription balances first
    for (const balanceItem of balances) {
      if (balanceItem.balanceType === 'SUBSCRIPTION') {
        const serviceItem = balanceItem.services.find(item => item.type === service)
        if (serviceItem && serviceItem.balance >= amount) {
          balanceToUpdate = serviceItem
          balanceType = balanceItem.balanceType
        }
      }
    }

    // If no SUBSCRIPTION balance is available, check other topup balances
    if (!balanceToUpdate) {
      for (const balanceItem of balances) {
        if (balanceItem.balanceType === 'TOPUP') {
          const serviceItem = balanceItem.services.find(item => item.type === service)
          if (serviceItem && serviceItem.balance >= amount) {
            balanceToUpdate = serviceItem
            balanceType = balanceItem.balanceType
          }
        }
      }
    }

    // If no balance at all
    if (!balanceToUpdate) {
      throw new Error('Insufficient credits')
    }

    // If no balance type
    if (!balanceType) {
      throw new Error('Nonexistent credits')
    }
    
    console.log("current balance...", balanceToUpdate.balance)
    console.log(amount,"Credits Deducting...")
    let newBalance = balanceToUpdate.balance -= amount
    console.log("New balance...", newBalance)
    
    await balancesCollection.updateOne(
      {
        companyId: company.id,
        balanceType: balanceType,
        'services.type': service
      },
      {
        $set: {
          'services.$.balance': newBalance
        }
      }
    )
    console.log('Balance updated successfully')
  } catch (error) {
    console.error('Error updating balance:', error)
    throw new Error('ERROR_UPDATING_BALANCE')

  }
  
  return await prisma.billingLedger.create({
    data: {
      id: ledgerID,
      company: { connect: { id: company.id } },
      service: service,
      description: description,
      amount: -amount,
      timestamp: new Date().toISOString(),
      campaign: null,
      invoiceID: null,
      type: "USAGE",
      user: { connect: { id: ctx.user.id } },
    },
  });
}

@Resolver()
export class billingResolver {

  @Authorized()
  @Mutation(returns => json)
  async createSetupIntent(@Arg("companyID") companyID: string, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyID)

    // if (company === null) throw new Error(`User is not part of this company`) 

    // Permissions check
    // let perm = await hasPermission('msl_companyBillingCards', PERMISSION_ACCESS_TYPES.view_and_edit, null, ctx.user.id, company.id)
    // if (!perm) return {error: 'NO_PERMISSION'}


    const str = new stripe()
    const customer = await str.createCustomerIfNotExists(companyID)

    try {
      const intent = await str.createSetupIntent(customer.id)
      return intent.client_secret
    } catch(err) {
      console.error(err)
      throw new Error("Invalid SetupIntent")
    }
  }

  @Authorized()
  @Mutation(returns => json)
  async createPaymentCard(@Arg("data") data: CreatePaymentCardInput, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyID)
    if (company === null) throw new Error(`User is not part of this company`) 

    // Permissions check
    let perm = await hasPermission('msl_companyBillingCards', PERMISSION_ACCESS_TYPES.view_and_edit, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    const str = new stripe()
    const customer = await str.createCustomerIfNotExists(data.companyID)
    // const setupIntent = await str.createSetupIntent(customer.id, data.paymentMethodId)
    
    // if (!setupIntent) throw new Error('Invalid SetupIntent for this PaymentMethod')

    const ourCard = await prisma.paymentCard.create({
      // Use .create for creating a record
      data: {
        company: {
          connect: { id: data.companyID }, // Assuming companyID is the correct field name
        },
        holder: data.holder, // Adjust field names as necessary
        currency: data.currency,
        status: "ADDED",
        stripe: {
          cardID: data.paymentMethodId,
          // setupIntentID: setupIntent.id // Uncomment and use if needed
        },
      },
    })
    return ourCard
  }

  @Authorized()
  @Query(returns => json)
  async getPaymentCards(@Arg("companyId") companyId: string, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId)
    if (company === null) throw new Error(`User is not part of this company`)

    // Permissions check
    let perm = await hasPermission('msl_companyBillingCards', PERMISSION_ACCESS_TYPES.view_only, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    const str = new stripe()
    const customer = await str.createCustomerIfNotExists(companyId)

    const allPaymentCards = await str.getPaymentCardsForCustomer(customer.id)

    return allPaymentCards.data.map((card) => {
      return {
        stripeId: card.id,
        created: card.created,
        brand: card.card.brand,
        country: card.card.country,
        exp_month: card.card.exp_month,
        exp_year: card.card.exp_year,
        last4: card.card.last4,
        name: card.billing_details.name,
        countryCode: card.billing_details.address.country
      }
    })
  }
  
  @Authorized()
  @Query(returns => json)
  async getCompanyCoupon(@Ctx() ctx: Context) {

    // Permissions check
    let perm = await hasPermission('msl_companyBillingCards', PERMISSION_ACCESS_TYPES.view_only, null, ctx.user.id, ctx.company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    let coupon = await prisma.billingCoupon.findMany({ 
      where : {
        companyId: ctx.company.id
      }
    })
    
      return coupon
  }

  @Authorized()
  @Query(returns => json)
  async getPaymentCardsPersonal(@Ctx() ctx: Context) {
    let { companies }: any = await prisma.user.findFirst({
      where: {
        id: ctx.user.id,
      },
      select: {
        companies: {
          select: {
            id: true,
            company: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
    companies = companies.map((comp: any) => comp.company.id)
    return this.getPaymentCards(companies[0], ctx)
  }

  @Authorized()
  @Query(returns => json)
  async calculateTax(@Arg("price") price: number, @Arg("countryCode") countryCode: string, @Ctx() ctx: Context) {
    const rates = await prisma.billingTaxRate.findMany({
      where: {
        countryCode: countryCode,
      },
    });
    if (rates.length === 0) {
      return {}
    } else {
      let rate = rates[0]
      let taxRate = rate.rate / 100
      let taxPayable = price * taxRate

      return {payable: taxPayable, rate: rate}
    }
  }
  
  @Authorized()
  @Query(returns => json)
  async calculateTaxByCurrency(@Arg("price") price: number, @Arg("currency") currency: string, @Ctx() ctx: Context) {
    const rates = await prisma.billingTaxRate.findMany({
      where: {
        currencyCode: currency.toUpperCase(),
      },
    })
    if (rates.length === 0) {
      return {}
    } else {
      let rate = rates[0]
      let taxRate = rate.rate / 100
      let taxPayable = price * taxRate

      return {payable: taxPayable, rate: rate}
    }
  }

  @Authorized()
  @Query(returns => json)
  async GetAllTaxRate(@Arg("countryCode") countryCode: string) {
    let rates = await prisma.billingTaxRate.findMany({
      where: {
        countryCode: countryCode
      }
    })
    
    return rates
  }

  @Authorized()
  @Query(returns => json)
  async GetAllTaxRateByCurrency(@Arg("currency") currency: string) {
    let rates = await prisma.billingTaxRate.findMany({
      where: {
        currencyCode: currency.toUpperCase()
      }
    })
    
    return rates
  }

  @Authorized()
  @Mutation(returns => json)
  async deleteCardByStripeId(@Arg("companyId") companyId: string, @Arg("stripeCardId") stripeCardId: string, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId)
    if (company === null) throw new Error(`User is not part of this company`)

    // Permissions check
    let perm = await hasPermission('msl_companyBillingCards', PERMISSION_ACCESS_TYPES.edit_and_archive, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    const str = new stripe()
    const customer = await str.createCustomerIfNotExists(companyId)

    const deleteCard = await str.deleteCardByPaymentMethod(stripeCardId)

    const deleteCardUs = await prisma.paymentCard.deleteMany({
      where: {
        stripe: {
          cardID: stripeCardId
        },
      },
    })
    return deleteCardUs
  }

  @Authorized()
  @Query(returns => json)
  async getTransactionsForCompany(@Arg("companyId") companyId: string, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId)
    if (company === null) throw new Error(`User is not part of this company`)

    // Permissions check
    let perm = await hasPermission('msl_companyBillingTransactions', PERMISSION_ACCESS_TYPES.view_only, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    // The following code is adapted from the legacy API
    const ledgerEntries = await prisma.billingLedger.findMany({
      where: {
        company: {
          id: companyId, // Ensure this ID is correctly defined and accessible
        },
      },
      orderBy: {
        timestamp: "desc", // Using an object format for ordering
      },
    });
    const fieldsToRemove = ['_company', '_user', 'company', 'user']

    let transactions = []

    if (ledgerEntries.length > 0) {
      for (let t of ledgerEntries) {
        if (!t.service || (t.service === 'CUSTOMERS')) continue

        t.service = t.service.toLowerCase().replace(/^\w/, c => c.toUpperCase())
        
        if (t?.userId){
          // Use _user as we need to still work for legacy for the time being
          const user = await prisma.user.findMany({
            where: {
              id: t?.userId, // Ensure that the user ID matches your database's field
            },
          });
          if (user.length === 0) {
            t['userName'] = ''
          } else {
            t['userName'] = `${user[0].firstName} ${user[0].lastName}`
          }
        }
        fieldsToRemove.forEach(i => delete t[i])
        transactions.push(t)
      }
    }

    return transactions
  }

  @Authorized()
  @Query(returns => json)
  async refundTransaction(@Arg("txnId") txnId: string, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, ctx.company.id)
    if (company === null) throw new Error(`User is not part of this company`)

    // Permissions check
    let perm = await hasPermission('events_admin', PERMISSION_ACCESS_TYPES.view_and_edit, null, ctx.user.id, ctx.company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    const str = new stripe()
    const refund = await str.createRefund(txnId)
    
    return refund
  }

  // @Authorized()
  // @Query(returns => json)
  // async getTransactionsForCompanyPagination(@Arg("data") data: TransactionPaginationInput, @Ctx() ctx: Context) {
  //   const { companyId, offset = 0, limit = 10 } = data
  //   const company = await checkIfUserIsInCompany(ctx.user.id, companyId)
  //   if (company === null) throw new Error(`User is not part of this company`)

  //   // Permissions check
  //   let perm = await hasPermission('msl_companyBillingTransactions', PERMISSION_ACCESS_TYPES.view_only, null, ctx.user.id, company.id)
  //   if (!perm) return {error: 'NO_PERMISSION'}

  //   // The following code is adapted from the legacy API

  //   let ledgerEntries = await prisma.billingLedger.findMany({
  //     where: {
  //       companyId: company.id, // legacy ID
  //       AND: [
  //         { service: { not: "CUSTOMERS" } },
  //         { service: { not: null } },
  //         { service: { not: "" } },
  //       ],
  //     },
  //     orderBy: {
  //       timestamp: "desc", // Change to 'desc' for descending order
  //     },
  //     take: limit, // Use 'take' for limiting the number of results
  //     skip: offset, // Use 'skip' for pagination
  //   })

  //   const fieldsToRemove = ['_company', '_user', 'company', 'user']

  //   let transactions = []

  //   if (ledgerEntries.length > 0) {
  //     for (let t of ledgerEntries) {
  //       fieldsToRemove.forEach(i => delete t[i])

  //       if (!t.service || (t.service === 'CUSTOMERS')) return

  //       t.service = t.service.toLowerCase().replace(/^\w/, c => c.toUpperCase())

  //       // Use _user as we need to still work for legacy for the time being
  //       let user = await prisma.user.findMany({where: {_id: t._user}})
  //       if (user.length === 0) return

  //       t['userName'] = `${user[0].firstName} ${user[0].lastName}`
  //       transactions.push(t)
  //     }
  //   }

  //   return transactions
  // }

  @Authorized()
  @Query(returns => json)
  async getCompanyBillingInfo(@Arg("companyId") companyId: string, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId)
    if (company === null) throw new Error(`User is not part of this company`)

    // Permissions check
    let perm = await hasPermission('msl_companyBilling', PERMISSION_ACCESS_TYPES.view_only, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}
    const result =
    (await prisma.company.findFirst({
      where: {
        id: company.id, // Use the correct field name for the company ID
      },
    })) || {};
    
    const companyData = await prisma.company.findFirst({
      where: {
        id: company.id, // Ensure this is the correct field for your company ID
      },
      include: {
        masterContact: true,
        billingContact: true,
        billingReferral: true,
      },
    });

    // Access the contacts from companyData
    const masterContact = companyData?.masterContact || null;
    const billingContact = companyData?.billingContact || null;
    const billingReferral = companyData?.billingReferral || null;

    
    return {
      address: company.address,
      email: company.billingEmail,
      phone: company.billingPhone,
      currency: company.currency,
      masterContact: masterContact,
      billingContact: billingContact,
      billingReferal: billingReferral,
      ...result,
      subscriptions: company.subscriptions
    }
  }

  @Authorized()
  @Query((returns) => json)
  async getCompanyBillingInfoByEvent(
    @Arg("eventId") eventId: string,
    @Ctx() ctx: Context
  ) {
    // Fetch invitation to check if user is part of the event
    const invitation = await prisma.eventInvitation.findMany({
      where: {
        invitee: {
          user: {
            id: ctx.user.id,
          },
        },
      },
    });

    // Handle case where the user isn't part of the event
    if (!invitation || invitation.length === 0) {
      throw new Error(`User is not part of this event`);
    }

    // Fetch event details including organiser's company and user information
    const event = await prisma.platformEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organiser: {
          select: {
            id: true,
            user: {
              select: { id: true },
            },
            company: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Handle case where event is not found
    if (!event) {
      throw new Error(`Event not found`);
    }

    // Check if the user is part of the company
    const company = await checkIfUserIsInCompany(
      event.organiser.user.id,
      event.organiser.company.id
    );
    if (company === null) {
      throw new Error(`User is not part of this company`);
    }

    // Fetch company contacts (masterContact, billingContact, and billingReferral)
    const masterContact = await prisma.company.findUnique({
      where: { id: company.id },
      select: { masterContact: true },
    });

    const billingContact = await prisma.company.findUnique({
      where: { id: company.id },
      select: { billingContact: true },
    });

    const billingReferral = await prisma.company.findUnique({
      where: { id: company.id },
      select: { billingReferral: true },
    });

    // Fetch general company details
    const result: any = await prisma.company.findUnique({
      where: { id: company.id },
    });

    // Return the billing information along with the contacts
    return {
      address: company.address,
      email: company.billingEmail,
      phone: company.billingPhone,
      currency: company.currency,
      masterContact: masterContact?.masterContact,
      billingContact: billingContact?.billingContact,
      billingReferral: billingReferral?.billingReferral,
      ...result,
      subscriptions: company.subscriptions,
    };
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateCompanyBillingInfo(
    @Arg("data") data: UpdateCompanyBillingInfoInput,
    @Ctx() ctx: Context
  ) {
    const companyUser = await checkIfUserIsInCompany(
      ctx.user.id,
      data.companyId
    );
    if (companyUser === null)
      throw new Error(`User is not part of this company`);

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
    });
    if (!company) throw new Error(`Company not found`);

    // Permissions check
    const perm = await hasPermission(
      "msl_companyBilling",
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      company.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    let bank: any = {};
    let revolutAccount;

    if (data.bankAccount) {
      const { iban, routing_number, sort_bsb_number, account_number } =
        data.bankAccount;

      if (
        account_number &&
        !sort_bsb_number &&
        data.bankAccount.country === "GB"
      ) {
        throw new Error("Sort Code is required");
      }

      if (
        account_number &&
        !routing_number &&
        data.bankAccount.country === "US"
      ) {
        throw new Error("Routing number is required");
      }

      if (iban && !routing_number) {
        throw new Error("IBAN/BIC is required");
      }

      const bankAccountDetails = {
        currency: data.bankAccount.currency,
        country: data.bankAccount.country,
        account_holder_name: data.bankAccount.account_holder_name,
        account_holder_type: data.bankAccount.account_holder_type,
        routing_number: data.bankAccount.routing_number,
        account_number: data.bankAccount.account_number,
        sort_bsb_number: data.bankAccount.sort_bsb_number,
        iban: data.bankAccount.iban,
      };

      const revolutAccountDetails = {
        profile_type: data.business_type.toLowerCase().includes("individual") ? 'personal' : 'business',
        company_name: company.name,
        name: company.name,
        // we need this for freelance type companies
        individual_name: { 
        first_name: company.name ,
        last_name: '(freelance)' // company.name is the full name, adjust when necessary
        },
        bank_country: data.bankAccount.country,
        account_no: data.bankAccount.account_number,
        currency: data.bankAccount.currency,
        sort_code: data.bankAccount.sort_bsb_number,
        bic: data.bankAccount.routing_number,
        bsb_code: data.bankAccount.sort_bsb_number,
        routing_number: data.bankAccount.routing_number,
        address: {
          street_line1: capitalizeWords(company.address?.address),
          country: company.address?.country,
          postcode: company.address?.postcode,
          city: capitalizeWords(company.address?.town),
        },
      };

      if (data.bankAccount.id) {
        const existingBankAccount = await prisma.bankAccount.findUnique({
          where: { id: data.bankAccount.id },
        });
        // if acccount number or iban is changed create a new counterparty for it
        if (
          existingBankAccount?.account_number !==
            data.bankAccount.account_number ||
          existingBankAccount?.iban !== data.bankAccount.iban
        ) {
        revolutAccount = await revolutBusiness.createCounterparty(revolutAccountDetails); 
          bankAccountDetails["counterparty_account_id"] =
            revolutAccount?.accounts[0]?.id;
          bankAccountDetails["counterparty_id"] = revolutAccount?.id;
        }
        bank = await prisma.bankAccount.update({
          where: { id: data.bankAccount.id },
          data: bankAccountDetails,
        });
      } else {
      // Create a new bank account and counterparty
        revolutAccount = await revolutBusiness.createCounterparty(revolutAccountDetails);
        bank = await prisma.bankAccount.create({
          data: {
            ...bankAccountDetails,
            counterparty_account_id: revolutAccount?.id,
            counterparty_id: revolutAccount?.accounts[0]?.id,
          },
        });
      }
    }

    const updateData: any = {
      billingEmail: data.email,
      billingPhone: data.phone,
      currency: data.currency,
      business_type: data.business_type,
      ...(data.representativeContact
        ? {
            representativeContact: {
              connect: { id: data.representativeContact },
            },
          }
        : {}),
      ...(bank && bank.id ? { bankAccount: { connect: { id: bank.id } } } : {}),
      billingDefaultType: data.billingDefaultType,
    };

    // const str = new stripe();

    // if (company.stripeAccountId) {
    //   const stripeAccount = await str.customerAccountExist(
    //     company.stripeAccountId
    //   );
    //   if (stripeAccount) {
    //     str.updateConnectAccount(company.id, {
    //       ipAddress: ctx.req.ip || "",
    //       date: +moment().format("X"),
    //     });
    //   } else {
    //     console.log("Creating Connect Account");
    //     await str.createConnectAccount(company.id, {
    //       ipAddress: ctx.req.ip || "",
    //       date: +moment().format("X"),
    //       companyID: company.id,
    //     });
    //   }
    // } else {
    //   await str.createConnectAccount(company.id, {
    //     ipAddress: ctx.req.ip || "",
    //     date: +moment().format("X"),
    //     companyID: company.id,
    //   });
    // }

    if (data.billingContactId) {
      updateData["billingContact"] = {
        connect: { id: data.billingContactId },
      };
    }

    return await prisma.company.update({
      where: { id: company.id },
      data: updateData,
    });
  }

  /**
   * Retrieves an array of all available services without pricing
   * @param ctx - Context
   */
  @Authorized()
  @Query((returns) => json)
  async getAvailableServices(
    @Arg("companyId") companyId: string,
    @Ctx() ctx: Context
  ) {
    // Check 1: Ensure they're actually in the company
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId);
    if (company === null) throw new Error(`User is not part of this company`);
    let services = await prisma.marketingTopupService.findMany();
     // Use map to filter pricing for each service
     services = services.map(service => ({
       ...service,
       pricing: service.pricing.filter(pricingItem => pricingItem.currency.toString().includes(company.currency) 
       // default to usd pricing if no currency found
       || pricingItem.currency.toString() === 'USD'
       )
     }));
    return services;
  }

  @Authorized()
  @Query(returns => json)
  async getMyPricingInfoForService(
    @Arg("data") data: GetMyPricingInfoForServiceInput,
    @Ctx() ctx: Context
  ) {
    // Check 1: Ensure they're actually in the company
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission(
      "msl_companyBilling",
      PERMISSION_ACCESS_TYPES.view_only,
      null,
      ctx.user.id,
      company.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    // Check 2: Ensure the service actually exists
    let services = await prisma.marketingTopupService.findMany({
      where: { id: data.serviceId },
    });

    if (services.length === 0) throw new Error("No service found with this ID");

    const targetCurrency = company.currency;
    const service = services[0];

    let TaxName = "Sales Tax";
    let TaxAmount = 0.0;

    if (company.currency) {
      var lstTax = await this.GetAllTaxRateByCurrency(company.currency);
      if (lstTax.length > 0) {
        // Tax rate found for company address
        let tax = lstTax[0];
        TaxAmount = tax.rate / 100;
        TaxName = tax.type;
      } else {
        // No tax rate found
        throw new Error(
          "Could not calculate tax. Company may not have an address associated with them, or is not in a supported country."
        );
      }
    }

    let pricing = null;
    // Check 3: Ensure pricing exists for the company's currency and chosen amount
    // let matchingPricing = service.pricing.map((pr) => {
    //   console.log(pr['currency'],pr['amount'])
    //   return (pr['currency'] === targetCurrency) && (pr['amount'] === data.quantity)
    // })

    for (var i = 0; i < service.pricing.length; i++) {
      if (
        service.pricing[i]["currency"] === targetCurrency &&
        service.pricing[i]["amount"] === data.quantity
      ) {
        pricing = service.pricing[i];
      }
    }

    if (pricing == null)
      throw new Error(
        `No matching pricing found for service with currency ${targetCurrency} and quantity ${data.quantity}`
      );

    // const pricing = matchingPricing[0]

    return {
      ...pricing,
      name: service.userFriendlyName,
      company: {
        id: company.id,
        name: company.name,
        taxName: TaxName,
        taxAmount: TaxAmount,
      },
    };
  }

  @Authorized()
  @Mutation(returns => json)
  async startTopupTransaction(
    @Arg("data") data: StartTopupTransactionInput,
    @Ctx() ctx: Context
  ) {
    // Check 1: Ensure they're actually in the company
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission(
      "msl_companyBillingTransactions",
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      company.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    // Check 2: Ensure the service actually exists
    let services = await prisma.marketingTopupService.findMany({
      where: { id: data.serviceId },
    });

    if (services.length === 0) throw new Error("No service found with this ID");

    const targetCurrency = company.currency;
    const service = services[0];
    // Check 3: Ensure pricing exists for the company's currency and chosen amount
    let matchingPricing = (service.pricing || ([] as any)).filter((pr) => {
      return (
        pr["currency"] === targetCurrency && pr["amount"] === data.quantity
      );
    });
    if (matchingPricing.length === 0)
      throw new Error(
        `No matching pricing found for service with currency ${targetCurrency} and quantity ${data.quantity}`
      );

    const pricing = matchingPricing[0];

    let taxAmount = null;

    if (company.currency) {
      var lstTax = await this.GetAllTaxRateByCurrency(company.currency);
      if (lstTax.length > 0) {
        // Tax rate found for company address
        let tax = lstTax[0];
        taxAmount = tax.rate / 100;
      } else {
        // No tax rate found
        throw new Error(
          "Could not calculate tax. Company may not have an address associated with them, or is not in a supported country."
        );
      }
    }
    let price = pricing["price"];
    let originalPrice = pricing["price"];

    if (data.couponId) {
      await redeemCouponById(data.couponId, ctx, data.companyId);
      const coupon = await prisma.billingCoupon.findUnique({
        where: {
          id: data.couponId, // Assuming `id` is the correct field name in your schema
        },
      });

      price = Math.round(
        price -
          (coupon.unit === PromoValueUnit.PERCENTAGE
            ? (price * coupon.value) / 100
            : coupon.value)
      );
    }

    let taxExclusive = Math.round(price * taxAmount);
    let totalPrice = Math.round(price + taxExclusive);

    // Create Stripe payment intent
    const str = new stripe();
    const paymentIntent = await str.createPaymentIntent(
      totalPrice,
      company.stripeCustomerId,
      pricing["currency"],
      data.cardStripeId,
      `Top-up payment for ${pricing["amount"]} of service ${service["name"]}`,
      {
        metadata: {
          type: "topup",
          serviceId: service.id,
          quantity: pricing["amount"],
          price: originalPrice,
          discount: originalPrice - price,
          discountId: data.couponId,
          taxExclusive: taxExclusive,
          totalPrice: totalPrice,
        },
      }
    );

    return paymentIntent.client_secret;
  }


  /*******
   * INTERNAL (INSPIRED DB) BILLING
   *******/

  @Authorized()
  @Query(returns => json)
  async getInternalProductInfoForCompany(
    @Arg("data") data: GetInternalProductInfoForCompanyInput,
    @Ctx() ctx: Context
  ) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission(
      "msl_companyBilling",
      PERMISSION_ACCESS_TYPES.view_only,
      null,
      ctx.user.id,
      company.id
    );
    if (!perm) return { error: "NO_PERMISSION" };
console.log("data..", data)
    let matchingProduct = await prisma.billingProduct.findUnique({
      where: {
        id: data.databaseId, // Assuming 'id' is the correct field name in your schema
      },
    });

    let TaxName = "Sales Tax";
    let TaxAmount = 0.0;

    if (company.address && company.address.country) {
      var lstTax = await this.GetAllTaxRate(company.address.country);
      if (lstTax.length > 0) {
        // Tax rate found for company address
        let tax = lstTax[0];
        TaxAmount = tax.rate / 100;
        TaxName = tax.type;
      } else {
        // No tax rate found
        throw new Error(
          "Could not calculate tax. Company may not have an address associated with them, or is not in a supported country."
        );
      }
    }

    // Remove currencies that aren't the company's currency
    for (var i = 0; i < matchingProduct.prices.length; i++) {
      if (matchingProduct.prices[i].currency !== company.currency) {
        delete matchingProduct.prices[i];
      }
    }

    return { ...matchingProduct, taxName: TaxName, taxAmount: TaxAmount };
  }


  /*******
   * PRODUCTS
   *******/

  @Authorized()
  @Query(returns => json)
  async getProductInfo(@Arg("productId") productId: string, @Ctx() ctx: Context) {
    const str = new stripe()

    let product = await str.getProductInfoById(productId)
    return product
  }

  @Authorized()
  @Query(returns => json)
  async getPricingInfo(@Arg("priceId") priceId: string, @Ctx() ctx: Context) {
    const str = new stripe()

    let price = await str.getPricingInfoById(priceId)
    return price
  }

  /*******
   * SUBSCRIPTIONS
   *******/

  /**
  * Retrieves all of the company's subscriptions (from the Stripe API)
  * @param companyId - The ID of the company
  * @param ctx - Context
  */
  @Authorized()
  @Query(returns => json)
  async getCompanySubscriptions(@Arg("companyId") companyId: string, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId)
    if (company === null) throw new Error(`User is not part of this company`)

    // Permissions check
    let perm = await hasPermission('msl_companyBilling', PERMISSION_ACCESS_TYPES.view_only, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    const str = new stripe()

    let subs = await Promise.all(company.subscriptions.map(async (subscId) => {
      let subsc = await str.getSubscriptionById(subscId)
      return subsc
    }))

    return subs
  }

  /**
   * Retrieves info about a subscription by its ID on Stripe
   * @param subscriptionId - Stripe ID of the Subscription object
   * @param ctx - Context 
   */
  @Authorized()
  @Query(returns => json)
  async getSubscriptionById(@Arg("subscriptionId") subscriptionId: string, @Ctx() ctx: Context) {
    const str = new stripe()

    return await str.getSubscriptionById(subscriptionId)
  }

  @Authorized()
  @Mutation(returns => json)
  async cancelCompanySubscription(@Arg("subscriptionId") subscriptionId: string, @Ctx() ctx: Context) {

    const str = new stripe();

    const subs = await str.getSubscriptionById(subscriptionId);
    if (!subs) throw new Error("No such subscription");

    const matchingCompanies = await prisma.company.findMany({
      where: {
        stripeCustomerId: subs.customer.toString(), // Ensure stripeCustomerId matches your schema
      },
    });

    if (matchingCompanies.length === 0)
      throw new Error("Cannot find company with this subscription");

    let company = matchingCompanies[0];
    company = await checkIfUserIsInCompany(ctx.user.id, company.id);
    if (company === null) throw new Error(`User is not part of this company`);

    
    const result = await str.cancelSubscription(subs.id)
    
    if(result.status === "canceled"){
      //schedule.cancel(subs.)
    }
    
    // TODO: any additional checks we need to do here before we cancel
    // maybe send an email too as confirmation?
    return result
  }

  @Authorized()
  @Mutation(returns => json)
  async createCompanySubscription(@Arg("data") data: CreateCompanySubscriptionInput, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId)
    if (company === null) throw new Error(`User is not part of this company`)

    // Permissions check
    let perm = await hasPermission('msl_companyBillingTransactions', PERMISSION_ACCESS_TYPES.view_and_edit, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}
    
    const str = new stripe()
    let extraStripeParams = {
      default_payment_method: data.stripePaymentMethodId,
      metadata: { 
        "type": "subscription",
        "userId": ctx.user.id,
        "companyId": data.companyId
      },
      automatic_tax: {
        enabled: true
      },
      payment_behavior: "allow_incomplete",
      discounts: [], // coupon is deprecated, use new field instead
    } // https://stripe.com/docs/api/subscriptions/create

  
        if (data.coupon) {
        // coupon is deprecated, use new field instead
          extraStripeParams.discounts.push({ coupon: data.coupon }); // Add the coupon to the discounts array
      }
    //NOTE: this is now processed at router /stripe webhook on invoice.paid
    // for (let idx = 0; idx < company.subscriptions.length; idx++) {
    //   try { 
    //     const subs = await str.getSubscriptionById(company.subscriptions[idx])
    //     await str.cancelSubscription(company.subscriptions[idx])
    //   } 
    //   catch (error){
    //   console.log("Stripe get sub error:::,",error)
    //   }
      
    // }



    let subs = await str.createSubscription(company.stripeCustomerId, data.items, extraStripeParams)
    
     //NOTE: this is now processed at router /stripe webhook on invoice.paid
    // Add subscription to the company
    // await prisma.company.update({
    //   where: {
    //     id: company.id,
    //   },
    //   data: {
    //     subscriptions: {
    //       set: [...company.subscriptions, subs.id], // Combine existing subscriptions with the new one
    //     },
    //   },
    // });

    return subs
  }

  @Authorized()
  @Mutation(returns => json)
  async createBillingCoupon(@Arg("data") data: CreateBillingCouponInput, @Ctx() ctx: Context) {
    const payload = {
      id: createObjectID().id,
      name: data.name,
      promoCode: data.promoCode.toLowerCase(),
      value: data.value,
      unit: data.unit,
      startDate: new Date(data.startDate * 1000),
      endDate: data.endDate ? new Date(data.endDate * 1000) : null,
      oneUsePerCompany: data.oneUsePerCompany,
      oneUsePerUser: data.oneUsePerUser,
      maximumUses: data.maximumUses,
      companyId: ctx.company.id,
      isReferral: false, // todo: make this an option to edit in insomnia?
      isSignupCoupon: false,// todo: make this an option to edit in insomnia?
      duration: data.oneUsePerUser || data.oneUsePerCompany ? 'once' : 'forever',
      // createdByUser: { connect : ctx.user.id }
      // iza - add another field for manually generated coupon via insomnia/ui?
    }    



    const str = new stripe();
    const coupon = await str.createCoupon({ ...payload, currency: ctx.company.currency || 'GBP' });
    return await prisma.billingCoupon.create({
      data: {
        ...payload,
        stripeCouponId: coupon.id,
        ...(data.companyID && {
          onlyTheseCompanies: {
            connect: data.companyID.map((comId: string) => ({ id: comId })),
          },
        }),
      },
    });
  }

  @Authorized()
  @Query(returns => json)
  async getBillingCouponInfoByPromoCode(@Arg("promoCode") promoCode: string, @Arg("channel") channel: string, @Ctx() ctx: Context) {
    const coupons = await prisma.billingCoupon.findMany({
      where: {
        promoCode: promoCode.toLowerCase(),
        // Uncomment and adjust this line if you want to filter by company
        // onlyTheseCompanies: {
        //   some: {
        //     id: ctx.company.id,
        //   },
        // },
      },
    });
    if (!coupons.length) return {}
    let coupon = coupons[0]
    // todo: update channel params for redeemCouponById? iza
    // iza update logics
    
    // Fetch related entities using the include option
    const couponDetails = await prisma.billingCoupon.findUnique({
      where: { id: coupon.id }, // Ensure you use the correct ID field
      include: {
        onlyTheseCompanies: true, // Fetch related companies
        onlyTheseUsers: true, // Fetch related users
        usedByUser: true, // Fetch used users
        createdByUser: true
      },
    });

    // Destructure to get the needed details
    const { onlyTheseCompanies, onlyTheseUsers, usedByUser } = couponDetails;

    
    let companyUsage = await prisma.companyCouponUsage.findMany({
      where: {
        couponId: coupon.id,
        companyId: ctx.company.id,
      },
    })
    
    if (channel.toLowerCase().includes('topup') && companyUsage && companyUsage.length > 0) {
      if (companyUsage[0].isReferral === true && companyUsage[0].topupRedemptionCount >= 1) {
        throw new Error("Referral Coupon can only be used once in top-ups page.")
      } 
    }
    if (coupon.companyId === ctx.company.id /**|| createdByUser.length > 0 && createdByUser.find((us: any) => us.id === ctx.user.id ) */) {
      // if (ctx.company.id !== '622b68d0a072010007372129') {//by pass for synkd
      throw new Error('you are not allowed to use your own coupon')
      // }
    }
    // Conditions check
    if (coupon.maximumUses !== null && coupon.maximumUses >= coupon.currentUses) throw new Error('This coupon is no longer available')
    if (coupon.endDate !== null && new Date(coupon.endDate) >= new Date(coupon.startDate)) throw new Error('This coupon is no longer available')

    // if (onlyTheseCompanies.length > 0 && onlyTheseCompanies.filter(c => { return c.id === ctx.company.id }).length === 0) {
    //   throw new Error('This company is not permitted to redeem this coupon')
    // }
    // if (onlyTheseUsers.length > 0 && onlyTheseUsers.filter(u => { return u.id === ctx.user.id }).length === 0) {
    //   throw new Error('This user is not permitted to redeem this coupon')
    // }
    if (coupon.oneUsePerUser && usedByUser && usedByUser.length > 0 && usedByUser.find((us: any) => us.id === ctx.user.id )) {
      throw new Error('This user is already redeem this coupon')
    }

    return coupons.length ? coupons[0] : {}
  }

  @Authorized()
  @Query(returns => json)
  async getAllBillingProducts(@Arg("companyId") companyId: string, @Ctx() ctx: Context) {
    // Check 1: Ensure they're actually in the company
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId)
    if (company === null) throw new Error(`User is not part of this company`)

    // Permissions check
    let perm = await hasPermission('msl_companyBilling', PERMISSION_ACCESS_TYPES.view_only, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}
    
    let products: any = await prisma.billingProduct.findMany(); // Fetch all billing products
    let allServices: any = await prisma.marketingTopupService.findMany(); // Fetch all marketing top-up services

    for (var i=0; i < products.length; i++) {
      // Remove currencies that aren't the company's currency
      for (var i2=0; i2 < products[i].prices.length; i2++) {
        if (products[i].prices[i2].currency.toLowerCase() !== company.currency.toLowerCase()) {
          delete products[i].prices[i2]
        }
      }

      // @ts-ignore
      products[i].prices = products[i].prices.filter(function (el) {
        return el != null;
      })

      products[i].fulfilment.services = products[i].fulfilment.services.map((item) => {
        const service = allServices.find((ser) => ser.id === item.id)
        return {
          ...item,
          service
        }
      })
    }

    return products
  }

  @Authorized()
  @Mutation(returns => json)
  // used in insomnia but will use in the UI moving forward (see redeemCouponById for events,topups/subs redemption)
  //see below for reference
  // async redeemCouponById
  // async getBillingCouponInfoByPromoCode
  // async redeemStripeCoupon
  async redeemCoupon(@Arg("data") data: RedeemCouponInput, @Ctx() ctx: Context) {
    // const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId)
    // if (company === null) throw new Error(`User is not part of this company`)

  
    // All coupons in the database should be lowercase
    let coupons = await prisma.billingCoupon.findMany({
      where: {
        promoCode: data.promoCode.toLowerCase(),
      },
      select: {
       usedByUser: true,
       companyId: true,
       createdByUser: true,
       id: true,
       maximumUses: true,
       endDate:true,
       oneUsePerUser:true,
       currentUses: true,
       startDate: true,
       onlyTheseCompanies: true,
       onlyTheseUsers: true
      }
    });
    
    if (coupons.length === 0) throw new Error('Invalid coupon')

    const coupon = coupons[0]
    let  usedByUser = coupon.usedByUser
    let onlyTheseCompanies = coupon.onlyTheseCompanies
    let onlyTheseUsers= coupon.onlyTheseUsers
    
      const createdByUser = coupon.createdByUser
      // if (coupon.companyId === ctx.company.id || createdByUser.length > 0 && createdByUser.find((us: any) => us.id === ctx.user.id )) {
      //   // if (ctx.company.id !== '622b68d0a072010007372129') { //by pass for synkd
      //   throw new Error('you are not allowed to use your own coupon')
      //   // }
      // }
      let companyUsage = await prisma.companyCouponUsage.findMany({
        where: {
          couponId: coupon.id,
          companyId: ctx.company.id,
        },
      })
     // iza come back to 
      if (companyUsage && companyUsage.length > 0) {
        if (companyUsage[0].isReferral === true && companyUsage[0].topupRedemptionCount >= 1) {
          throw new Error("Referral Coupon can only be used once in top-ups page.")
        }
      }
    // Conditions check
    if (coupon.maximumUses !== null && coupon.maximumUses >= coupon.currentUses) throw new Error('This coupon is no longer available')
    if (coupon.endDate !== null && new Date(coupon.endDate) >= new Date(coupon.startDate)) throw new Error('This coupon is no longer available')

    if (onlyTheseCompanies.length > 0 && onlyTheseCompanies.filter(c => { return c.id === ctx.company.id }).length === 0) {
      throw new Error('This company is not permitted to redeem this coupon')
    }
    if (onlyTheseUsers.length > 0 && onlyTheseUsers.filter(u => { return u.id === ctx.user.id }).length === 0) {
      throw new Error('This user is not permitted to redeem this coupon')
    }
    if (coupon.oneUsePerUser && usedByUser && usedByUser.length > 0 && usedByUser.find((us: any) => us.id === ctx.user.id )) {
      throw new Error('This user is already redeem this coupon')
    }

    // Update coupon usage
    return await prisma.billingCoupon.update({
      where: {
        id: coupon.id, // Ensure to use the correct field for the identifier
      },
      data: {
        currentUses: coupon.currentUses + 1,
        usedByUser: {
          connect: {
            id: ctx.user.id, // Connect the user who used the coupon
          },
        },
      },
    })
  }

  /*******
   * READ-ONLY
   *******/
  @Authorized()
  @Query(returns => json)
  async legacyGetBalances(@Arg("data") data: GetBalancesInput, @Ctx() ctx: Context) {
    return await legacyGetBalancesFn(data, ctx);
  }
  
  @Authorized()
  @Query(returns => json)
  async getBalances(@Arg("data") data: GetNewBalancesInput, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission('msl_companyBilling', PERMISSION_ACCESS_TYPES.view_and_edit, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}
     
     return await getBalancesFn(data, ctx)
    
  }

  @Authorized()
  @Query(returns => json)
  async getSubscriptionBalances(@Arg("data") data: GetNewBalancesInput, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission('msl_companyBilling', PERMISSION_ACCESS_TYPES.view_and_edit, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    const balancesCollection = db.collection("Balance")

    const balance = await balancesCollection.findOne( {
     companyId: company.id,
     balanceType: "SUBSCRIPTION",
   })

     
     return balance
    
  }

  /*******
   * READ-ONLY
   *******/
  @Authorized()
  @Query((returns) => json)
  async getBalanceForService(@Arg("data") data: GetNewBalancesInput,  @Ctx() ctx: Context) {
      data.companyId = ctx.company.id
      const bl =  await getBalancesFn(data, ctx);  
      let totalServiceBalance = 0;
      // Iterate through the balances
      bl.forEach(balance => {
          const serviceList = balance.services
          // Check each service in the current balance
          serviceList.forEach(service => {
            const serviceName = service.type
            const serviceAmount = service.balance || 0
            // Check if this service matches the data.service
            if (serviceName === data.service) {
                  totalServiceBalance += serviceAmount; // Sum both TOPUP and SUBSCRIPTION amounts
              }
            });
          });
          if (data.amountRequired){
            // Check if the totalServiceBalance is greater than the amount required
            if (totalServiceBalance >= Number(data.amountRequired)) {
              return true
            } else {
              return false    
            }
          }
      
      return totalServiceBalance
  }
  
  @Authorized()
  @Mutation(returns => json)
  async createConnectAccount(@Arg("data") data: CreateConnectAccount, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyID);
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission('msl_companyBilling', PERMISSION_ACCESS_TYPES.view_and_edit, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    const str = new stripe();
    const account = await str.createConnectAccount(data.companyID, data);
    
    return account;
  }

  @Authorized()
  @Mutation(returns => json)
  async deleteConnectAccount(@Arg("data") data: DelConnectAccount, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyID);
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission('msl_companyBilling', PERMISSION_ACCESS_TYPES.edit_and_archive, null, ctx.user.id, company.id)
    if (!perm) return {error: 'NO_PERMISSION'}

    const str = new stripe();
    const account = await str.deleteConnectAccount(data.companyID, data.stripeAccountId);
    
    return account;
  }

  @Authorized()
  @Mutation(returns => json)
  async createSessionForCheckout(@Arg("data") data: CreateConnectAccount, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyID)
    if (company === null) throw new Error(`User is not part of this company`) 

    const dummyItems = [{
      name: 'Kavholm rental',
      amount: 1000,
      currency: 'usd',
      quantity: 1,
    }]

    const str = new stripe()
    const account = await str.createConnectAccount(data.companyID, data)
    const session = await str.getCheckoutSession(account.id, 1000, 0, dummyItems, []);
    
    return session
  }

  @Query(returns => json)
  async customBillingQuery(@Ctx() ctx: Context) {
    // const data = await xero.getOrCreateContact('60dc6f87440cfd0007211514')
    // const data = await xero.getBrandingTheme(ctx.company.address.country)
    const data = await xero.getInvoicePDF(ctx.company.id, 'de29401e-061a-415c-a9eb-bb9c18279306')
    return data
  }
}