import express from 'express'
import { stripe } from '../billing/stripe'
import { RevolutBusiness } from '../billing/revolut'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { addServiceCredits, addSubscriptionCredits } from '../billing/internal'
import { createBillingEmail, convertBufferToMailgunAttachment, createEventEmail, createEventCustomerEmail, cancelSubEmail } from '../emailHelper'
import { createInvoicePDF as createInvoicePDFV2 , createCustomerInvoicePDF} from '../emails/email-v2'
import { createObjectID } from "../../util/createIDs";
import { EventType, InvitationStatus } from '../inputs/event'
import { Generator } from "../../util/generator";
import cron from 'node-cron';
import { xeroInstance, createInvoice, getInvoicePDF, XeroAccountCode, getAllInvoice, refreshXeroToken } from '../billing/xero';
import { createOrGetCrmUser } from "../resolvers/clusterResolver";
import { redisClient } from '../helpers/redisHelper'
import { schedule } from '../jobs/scheduler'

import moment from 'moment'
import { v4 as uuidv4 } from 'uuid';
import { calculateTaxWithDiscount, redeemStripeCoupon } from '../resolvers/billingResolver'
import { runScript } from '../../scripts/createTarForCompanies';
// import { syncTAR } from '../../scripts/testReferral'

export const router = express.Router()

const revolutBusiness = new RevolutBusiness();

/**
 * Webhook route for Stripe to send events
 */
//  generate TAR coupon for existing couons
// runScript().then(() => console.log("Done assigning TAR "))

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const eventBody = req.body //buffer
    const eventSig = req.headers['stripe-signature']

    const webhookSigningSecret = process.env.STRIPE_WEBHOOK_SECRET
    const environment = process.env.NODE_ENV
    const titlePrefix = environment === "development" ? "Staging: " : "" 
    //const webhookSigningSecret = "whsec_68e9401e5dcd23d7aa3dd29356dba7468ff75f25ee4dc4774c227d5c64c72989";

    if (!webhookSigningSecret) {
        res.status(500).send('No Stripe webhook signing secret has been set!')
        return
    }

    let event;
    const str = new stripe()

    try {
      event = str._stripe.webhooks.constructEvent(eventBody, eventSig, webhookSigningSecret)
    } catch (err) {
        res.status(500).send(`Can't construct event. Stripe webhook error: ${err.message}`)
        console.error(`Can't construct event. Stripe webhook error: ${err.message}`)
        return
    }


    try {

        let subscription;
        let product;
        let internalProducts: any;
        let matchingCompanies;
        let plan;
        let company;
        
        switch (event.type) {
            //handle cart checkout payment processing
            case 'payment_intent.succeeded':
                // Payment succeeded
                const paymentIntent = event.data.object
                if (paymentIntent.metadata) {
                    // All of our payment intents created programmatically should have metadata
                    
                    const metadata = paymentIntent.metadata
                    let productType = metadata.hasOwnProperty('type') ? metadata.type : null

                    try {
                        if (productType === 'event-cart') {

                            const cartIds: any = Object.values(
                            event.data.object.metadata
                            ).filter((item: any) => item !== 'event-cart');
                            const paymentStatus = event.data.object.status === 'succeeded' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED';
                            const carts = await prisma.platformEventCart.findMany({
                                where: {
                                  id: { in: cartIds },
                                },
                                select: {
                                  id: true,
                                  item: true,
              
                                  event: {
                                    select: {
                                      id: true,
                                      name: true,
              
                                      organiser: {
                                        select: {
                                          company: {
                                            select: {
                                              id: true,
                                              name: true,
                                              logoURL: true,
                                              vatNum: true,
                                              address: {
                                                select: {
                                                  address: true,
                                                  town: true,
                                                  postcode: true,
                                                  country: true,
                                                },
                                              },
                                              bankAccount: { 
                                              select: {
                                              id: true,
                                              counterparty_id: true,
                                              counterparty_account_id: true
                                               }
                                              },
                                              billingEmail: true,
                                            },
                                          },
                                        },
                                      },
                                      contents: {
                                        select: {
                                          id: true,
                                          name: true,
                                        },
                                      },
                                      cluster: {
                                        select: {
                                          id: true,
                                          subClusters: {
                                            select: {
                                              id: true,
                                              name: true,
                                              users: {
                                                select: {
                                                  id: true,
                                                  user: {
                                                    select: {
                                                      id: true,
                                                    },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                      customCluster: {
                                        select: {
                                          id: true,
                                          subClusters: {
                                            select: {
                                              id: true,
                                              name: true,
                                              users: {
                                                select: {
                                                  id: true,
                                                  user: {
                                                    select: {
                                                      id: true,
                                                    },
                                                  },
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                    },
                                  },
                                  pricing: {
                                    select: {
                                      id: true,
                                      booked_slots: true,
                                      employee: {
                                        select: {
                                          id: true,
                                          email: true,
                                          user: {
                                            select: {
                                              id: true,
                                              email: true,
                                              firstName: true,
                                              lastName: true,
                                            },
                                          },
                                        },
                                      },
                                      currency: true,
                                      price: true,
                                      tax: true,
                                      duration: true,
                                    },
                                  },
                                  user: {
                                    select: {
                                      id: true,
                                      email: true,
                                      firstName: true,
                                      lastName: true,
                                    },
                                  },
                                  userCompanyMembership: {
                                    select: {
                                      id: true,
                                      company: {
                                        select: {
                                          name: true,
                                          currency: true,
                                          logoURL: true,
                                          address: {
                                            select: {
                                              town: true,
                                              country: true,
                                              address: true,
                                              postcode: true,
                                            },
                                          },
                                        },
                                      },
                                    },
                                  },
                                  type: true,
                                  quantity: true,
                                  qrcodeKey: true,
                                  qrcodeImage: true,
                                  createdAt: true,
                                  updatedAt: true,
                                  status: true,
                                  invitation: {
                                    select: {
                                      id: true,
                                    },
                                  },
                                },
                              });
              

                            if (paymentStatus === 'PAYMENT_SUCCESS') {
                                
                                try {
                                    const { amount, currency } = event.data.object
                                    const { event: { organiser, cluster, customCluster, contents }, user, pricing: {price, tax} }: any = carts[0];
                                    const { company: { bankAccount }} = organiser
                                   // make sure we have a revolut bank account to make payment
                                   if(bankAccount?.counterparty_id) {
                                   
                                    const payoutInfo =  {
                                        account_id: process.env.REVOLUT_DEFAULT_ACCOUNT, //our account to use for the payment
                                        receiver: {
                                        counterparty_id: bankAccount.counterparty_id,
                                        account_id: bankAccount.counterparty_account_id
                                        },
                                        currency: currency.toUpperCase(),
                                        amount: (amount - (amount * 0.05))/100,
                                        request_id: uuidv4()
                                    }
                                       await revolutBusiness.makePayment(payoutInfo)
                                       console.log(`payment made to ${bankAccount.counterparty_id} for amount of ${payoutInfo.amount} ${payoutInfo.currency}`)
                                   } else { 
                                  //  todo: send email to user to create a rev account then make payment?
                                   }
                                   
                                   // update paid cluster movement when payment is successful
                                    carts.forEach(async (cartItem: any) => {


                                        const product = contents.find((item: any) => item.id === cartItem.item)

                                        const productCluster = customCluster?.find((cluster: any) => cluster.name.includes(product.name))


                                        if (productCluster && productCluster?.id) {

    
                                            let purchasedCluster = productCluster?.subClusters?.find((item: any) => item.name.includes('Bought'))
                                            let notPurchasedCluster = productCluster?.subClusters?.find((item: any) => item.name.includes('Not Bought'))

                                            let crmUser = await createOrGetCrmUser(organiser.company, {id: user.id}, true)

                                            await prisma.crmCluster.update({
                                                where: { id: productCluster.id },
                                                data: {
                                                    users: {connect: {id: crmUser.id}}
                                                }
                                            })
    
                                            if (purchasedCluster && !purchasedCluster.users.find((csUser: any) => csUser.id === crmUser.id)) {
                                                await prisma.crmSubCluster.update({
                                                    where: { id: purchasedCluster.id },
                                                    data: {
                                                        users: {connect: {id: crmUser.id}}
                                                    }
                                                })
                                                await prisma.crmSubCluster.update({
                                                    where: { id: notPurchasedCluster.id },
                                                    data: {
                                                        users: {disconnect: {id: crmUser.id}}
                                                    }
                                                })
                                            }
                                        }


                                    });

                                    
                             
                                    
                                    
                                } catch (error) {
                                    console.log(`payment_intent.succeeded:: ERROR Change Paid Subcluster`, error.message)
                                }
                                
                            }



                            carts.forEach(async (cart: any) => {

                                const { id, event: eventContent, pricing: { id: pricingId, price, currency, employee, booked_slots }, invitation, userCompanyMembership }: any = cart;

                                if (invitation && invitation.length > 0) {
                                    await prisma.eventInvitation.update({
                                      where: { id: invitation[0].id },
                                      data: { invitationStatus: 'ACCEPTED' },
                                    });
                                  } else {
                                    await prisma.eventInvitation.create({
                                      data: {
                                        id: createObjectID().id,
                                        invitee: { connect: { id: userCompanyMembership.id } },
                                        lastInviteSent: new Date(),
                                        eventType: 'PLATFORM_EVENT_PRICING_SLOT',
                                        platformEvent: { connect: { id: eventContent.id } },
                                        platformEventPricingSlot: { connect: { id } },
                                        invitationStatus: 'ACCEPTED',
                                      },
                                    });
                                  }
                                  await prisma.platformEventContentPricing.update({
                                    where: { id: pricingId },
                                    data: {
                                      booked_slots: booked_slots + 1,
                                    },
                                  });
                
                                  for (const emp of employee) {
                                    await prisma.eventInvitation.create({
                                      data: {
                                        id: createObjectID().id,
                                        invitee: { connect: { id: emp.id } },
                                        lastInviteSent: new Date(),
                                        eventType: 'PLATFORM_EVENT_PRICING_SLOT',
                                        platformEvent: { connect: { id: eventContent.id } },
                                        platformEventPricingSlot: { connect: { id } },
                                        invitationStatus: 'AWAITING',
                                      },
                                    });
                                  }
                
                                  // Change status to PAYMENT_VERIFICATION
                                  await prisma.platformEventCart.updateMany({
                                    where: {
                                      id: cart.id,
                                    },
                                    data: {
                                      status: paymentStatus,
                                      paymentIntentId: event.data.object.payment_intent,
                                      currentPrice: price,
                                      currentCurrency: currency,
                                    },
                                  });
                            });
  
                            if (carts.length) {    
                                const { event: { id: eventId, organiser, name }, 
                                        user: { id: userId, email, firstName, lastName }, 
                                        userCompanyMembership: { company } }: any = carts[0];

                                //TODO: add tax
                                // console.log({carts})
                                await prisma.platformEventTransaction.create({
                                    data: {
                                        id: createObjectID()._id,
                                        txnId: event.data.object.id,
                                        event: {
                                            connect: {
                                                id: eventId
                                            }
                                        },
                                        status: "INCOME",
                                        amount: event.data.object.amount,
                                        currency: event.data.object.currency,
                                        refunded: false,
                                        carts: {
                                            connect: cartIds.map((item: string) => ({ id: item }))
                                        },
                                        user: {
                                            connect: {
                                                id: userId
                                            }
                                        },
                                        stripeRaw: JSON.stringify(event)
                                    }
                                })

                                let currDate = new Date()

                               
                                //Synkd 5% Service Charge Invoice
                                // const eventServiceChargeInvoice = await createInvoice(
                                //   organiser.company.id, 
                                //   titlePrefix + 'EventContent', carts.map((cart: any) => {
                                   
                                //     const { event: eventContent, pricing: { price, tax }, quantity, item: itemId }: any = cart;
                                //     const content = eventContent.contents.find((content: any) => content.id === itemId);

                                //     return {
                                //         description: "Synkd transaction fee (5%) for " + content?.name || "Synkd transaction fee (5%)",
                                //         quantity: quantity,
                                //         unitAmount: (price * 5 / 100),
                                //         taxType: 'NONE',
                                //         accountCode: XeroAccountCode.EVENT_PAYOUT,
                                //         discountAmount: 0,
                                //         taxAmount: 0, // (+price * 5 / 100) / 10,
                                //         lineAmount: quantity * ((price * 5 / 100))
                                //     }
                                // }))

                                  //getting transction service fee
                                  const balanceTransaction = await str.getBalanceTransaction(paymentIntent.id)


                                 // stripe transaction service fee 
                                //  const stripeServiceFeeInvoice = await createStripeInvoice(
                                //     titlePrefix + 'Stripe transaction service fee', 
                                //     carts.map((cart: any) => {
                                //     const { event: eventContent, quantity, item: itemId }: any = cart;
                                //     const content = eventContent.contents.find((content: any) => content.id === itemId);

                                //     return {
                                //         description: "Stripe transaction service fee for " + content?.name || 'Stripe transaction service' ,
                                //         quantity: quantity,
                                //         unitAmount: (balanceTransaction.fee/100),
                                //         taxType: 'NONE',
                                //         accountCode: XeroAccountCode.STRIPE_FEES,
                                //         discountAmount: 0,
                                //         taxAmount: 0,
                                //         lineAmount: balanceTransaction.fee/100 || 0
                                //     }
                                // }))

                                // stripe transaction service fee 
                                // const stripeTransactionInvoice = await createStripeInvoice(
                                //   titlePrefix + 'Stripe event payment settlement', 
                                //   carts.map((cart: any) => {
                                //     const { event: eventContent, quantity, item: itemId }: any = cart;
                                //     const content = eventContent.contents.find((content: any) => content.id === itemId);

                                //     return {
                                //         description: "Stripe event payment settlement for " + content?.name || 'Stripe transaction payment' ,
                                //         quantity: quantity,
                                //         unitAmount: (balanceTransaction?.net/100),
                                //         taxType: 'NONE',
                                  //         accountCode: XeroAccountCode.STRIPE_FEES,
                                //         discountAmount: 0,
                                //         taxAmount: 0,
                                //         lineAmount: balanceTransaction?.net/100 || 0
                                //     }
                                // }))

                                let etaxAmount 
                                let ediscountForGbp = false
                                let ediscountedTaxAmount
                                let synkdFee // define synkdfee variable for  this transaction
                                let synkdPayout // define service fee variable for this transaction
                                let synkdFeeWithVAT
                                let synkdPayoutWithVAT
                                let total // define total variable for this transaction
                                let taxValue // define tax variable for this transaction (value is %)
                                // Event Attendee Payment Received Invoice
                                const eventInvoice = await createInvoice(
                                  organiser.company.id, 
                                  titlePrefix + 'Event Content', carts.map((cart: any) => {
                                    const { event: eventContent, pricing: { price, tax }, quantity, item: itemId }: any = cart;
                                 
                                    const content = eventContent.contents.find((content: any) => content.id === itemId);
                                    return {
                                      description: content?.name || 'bought content item' ,
                                      quantity: quantity,
                                      unitAmount: (price),
                                      taxType: 'NONE',
                                      accountCode: XeroAccountCode.EVENT_PURCHASE,
                                      discountAmount: 0,
                                      taxAmount: (price * tax / 100) || 0,
                                      lineAmount: quantity * price || 0
                                    }
                                  }))
                           
                                  //Synkd 5% Service Charge Invoice
                                  const synkdFeeInvoice = await createInvoice(
                                  organiser.company.id, 
                                  titlePrefix + 'Synkd Fee', carts.map((cart: any) => {
                                   
                                    const { event: eventContent, pricing: { price, tax, currency }, quantity, item: itemId }: any = cart;
                                    const content = eventContent.contents.find((content: any) => content.id === itemId);
                                      // calculate synkd fee (5% of item price)
                                      synkdFee = price * 0.05
                                      const calcSynkdFeeVAT = currency.toUpperCase() === "GBP" ? (synkdFee * ( 20/ 100)) : 0
                                      synkdFeeWithVAT = synkdFee + calcSynkdFeeVAT
                                      synkdFeeWithVAT = synkdFeeWithVAT.toFixed(2)
                                      console.log(`synkdFee: ${synkdFeeWithVAT}`)
                                     
                                    return {
                                        description: "Synkd transaction fee (5%) for " + content?.name || "Synkd transaction fee (5%)",
                                        quantity: quantity,
                                        unitAmount: synkdFee ,
                                        taxType: 'NONE',
                                        accountCode: XeroAccountCode.EVENT_SYNKDFEE,
                                        discountAmount: 0,
                                        taxAmount: calcSynkdFeeVAT,
                                        lineAmount: quantity * (synkdFee)
                                    }
                                }))
                                  //Synkd Settlement Fee Invoice
                                  const synkdSettlementFeeInvoice = await createInvoice(
                                  organiser.company.id, 
                                  titlePrefix + 'Event Settlement', carts.map((cart: any) => {
                                   
                                    const { event: eventContent, pricing: { price, tax, currency }, quantity, item: itemId }: any = cart;
                                    const content = eventContent.contents.find((content: any) => content.id === itemId);
                                     // calculate payout fee (synkd fee of 5%)
                                      synkdPayout = price - synkdFee
                                      const calcPayoutVAT = currency.toUpperCase() === "GBP" ? (synkdPayout * ( 20/ 100)) : 0
                                      synkdPayoutWithVAT = synkdPayout + calcPayoutVAT
                                      synkdPayoutWithVAT = synkdPayoutWithVAT.toFixed(2)
                                      
                                      console.log(`synkdPayout: ${synkdPayoutWithVAT}`)
                                    return {
                                        description: "Synkd event payment settlement for " + content?.name || 'Synkd transaction payment' ,
                                        quantity: quantity,
                                        unitAmount: synkdPayout,
                                        taxType: 'NONE',
                                        accountCode: XeroAccountCode.EVENT_PAYOUT,
                                        discountAmount: 0,
                                        taxAmount: calcPayoutVAT,
                                        lineAmount: synkdPayout
                                    }
                                }))
                               // Event Owner Payment Received Invoice PDF
                               // invoice between customer and owner
                                // const eventInvoicePdf = await getInvoicePDF(organiser.company.id, eventInvoice.invoiceID);
                                // const eventServiceChargeInvoicePdf = await getInvoicePDF(organiser.company.id, eventServiceChargeInvoice.invoiceID);

                                // let eventInvoicePdfAttachment = await convertBufferToMailgunAttachment(eventInvoicePdf, `invoice-sales-${currDate.getTime()}.pdf`)
                                // let eventServiceChargeInvoicePdfAttachment = await convertBufferToMailgunAttachment(eventServiceChargeInvoicePdf, `invoice-scharges-${currDate.getTime()}.pdf`)
                                
                                // Sending Event owner Email for Payment Received  and Synkd %5 Service Charge  
                                // await createEventEmail(organiser.company.billingEmail, eventInvoicePdfAttachment, {companyLogo: company.logoURL, titlePrefix: titlePrefix})

                                // await createEventEmail(organiser.company.billingEmail, eventServiceChargeInvoicePdfAttachment, {companyLogo: company.logoURL, titlePrefix: titlePrefix})


                                // Event Customer Receipt - we can't control attendee params to xero invoices so we create manually
                                let subTotal=0;
                                let totalTax=0;

                                carts.map((cart: any) => {
                                    const { pricing: { price, tax }, quantity }: any = cart;

                                    const itemPrice = (+price * +quantity)
                                    subTotal += (+itemPrice)
                                    totalTax +=  (itemPrice * tax / 100)

                                })

                                const currency = carts.length > 0 ? carts[0].pricing.currency : 'GBP'
                                const eventName = carts.length > 0 ? carts[0].event.name : 'Event'
                                const eventOrganiserCompany = carts.length > 0 ? carts[0].event.organiser.company.name : 'Company'
                                const contentName = carts.length > 0 ? carts[0].event.contents[0].name : 'Content'
                                // Event Customer Invoice PDF - this is the invoice we send to customer and organiser
                                let invoicePdfCustomer = await createCustomerInvoicePDF({
                                    logo: organiser.company.logoURL,
                                    vatNum: organiser.company.vatNum,
                                    discount: '0',
                                    eventname: name,
                                    issueDate: currDate,
                                    dueDate: currDate,
                                    username: [firstName, lastName].filter(Boolean).join(" "),
                                    useremail: email,
                                    companyName: organiser.company.name,
                                    companyAddress: organiser.company.address.address,
                                    companyCity: organiser.company.address.town,
                                    companyPostcode: organiser.company.address.postcode,
                                    companyCountry: organiser.company.address.country,
                                    userName: company.name,
                                    userAddress: company.address.address,
                                    userCity: company.address.town,
                                    userPostcode: company.address.postcode,
                                    userCountry: company.address.country,
                                    invoicenumber: eventInvoice.invoiceNumber,
                                    reference: eventInvoice.reference,
                                    invoiceItems: carts.map((cart: any) => {
                                        const { event: eventContent, pricing: { price }, quantity, item: itemId }: any = cart;
                                        const content = eventContent.contents.find((content: any) => content.id === itemId);
                    
                                        return {
                                            description: content?.name || 'missing name',
                                            quantity: +quantity,
                                            service: 'Item',
                                            unitAmount: +price,
                                            netAmount: +price * +quantity,
                                        }
                                    }),
                                    subtotal: subTotal || 0,
                                    tax: totalTax || 0,
                                    total: (subTotal + totalTax) || 0,
                                    currency: currency
                                })
                                //generate pdf for synkd fee invoice
                                const synkdFeeInvoicePDF = await getInvoicePDF(organiser.company.id, synkdFeeInvoice.invoiceID);
                                //generate pdf for service fee invoice
                                const settlementFeeInvoicePDF = await getInvoicePDF(organiser.company.id, synkdSettlementFeeInvoice.invoiceID);

                                // convert mailgun attachment for customers
                                let attachmentCustomer = await convertBufferToMailgunAttachment(invoicePdfCustomer, `Customer_invoice_${eventInvoice.invoiceNumber}.pdf`)
                                // convert mailgun attachment for customers to owner
                                let attachmentCustomerToOwner = await convertBufferToMailgunAttachment(invoicePdfCustomer, `Reference_invoice_${eventInvoice.invoiceNumber}.pdf`)
                                // convert synkd fee invoice pdf to mailgun attachment
                                let eventSynkdFeeInvoicePdfAttachment = await convertBufferToMailgunAttachment(synkdFeeInvoicePDF, `Synkd_fees_Invoice_${synkdFeeInvoice.invoiceNumber}.pdf`)
                                // convert synkd fee invoice pdf to mailgun attachment
                                let synkdSettlementFeeInvoicePDFAttachment = await convertBufferToMailgunAttachment(settlementFeeInvoicePDF, `Settlement_fee_Invoice_${synkdSettlementFeeInvoice.invoiceNumber}.pdf`)

                                // Send Invoice PDF to Customer
                                await createEventCustomerEmail(carts[0].user.email, attachmentCustomer, {recieving:'itembought', invoiceID: eventInvoice.invoiceNumber, contentName: contentName, eventName: eventName, organiser: eventOrganiserCompany, companyLogo: company.logoURL, titlePrefix: titlePrefix})
                                // Send Customer Event Invoice to Organiser company
                                await createEventEmail(organiser.company.billingEmail, attachmentCustomerToOwner, {recieving: 'customerinvoice', invoiceID: eventInvoice.invoiceNumber,  eventName: eventName, organiser: eventOrganiserCompany, contentName: contentName, buyer: company.name,companyLogo: company.logoURL, titlePrefix: titlePrefix})
                                // Send Synkd Fee Invoice to Organiser company
                                await createEventEmail(organiser.company.billingEmail, eventSynkdFeeInvoicePdfAttachment, {recieving: 'synkdfees', invoiceID: synkdFeeInvoice.invoiceNumber, eventName: eventName, organiser: eventOrganiserCompany,  contentName: contentName, buyer: company.name, companyLogo: company.logoURL, titlePrefix: titlePrefix})
                                // Send Synkd Settlement Fee Invoice to Organiser company
                                await createEventEmail(organiser.company.billingEmail, synkdSettlementFeeInvoicePDFAttachment, {recieving: 'synkdpayout',invoiceID: synkdSettlementFeeInvoice.invoiceNumber, eventName: eventName, organiser: eventOrganiserCompany, contentName: contentName, buyer: company.name,  companyLogo: company.logoURL, titlePrefix: titlePrefix})

                                await prisma.platformEventCart.updateMany({
                                    where: {
                                      id: { in: carts.map((item) => item.id) },
                                    },
                                    data: {
                                      xeroId: eventInvoice.invoiceID,
                                      paymentIntentId: event.data.object.payment_intent,
                                    },
                                  });
                            
                            }

                        } else {

                            let companies = await prisma.company.findMany({
                                where: {
                                  stripeCustomerId: paymentIntent.customer,
                                },
                              });

                            if (companies.length === 0) {
                                console.log(`Tried to interpret event ${event.type} from Stripe but customer ${paymentIntent.customer} could not be matched to a company`)
                                break
                            }
        
                            const company = companies[0]
        
                            switch (productType) {
                                case 'topup':
                                    let serviceId = metadata.hasOwnProperty('serviceId') ? metadata.serviceId : null,
                                        quantity = metadata.hasOwnProperty('quantity') ? metadata.quantity : null,
                                        price = metadata.hasOwnProperty('price') ? metadata.price : null,
                                        discount = metadata.hasOwnProperty('discount') ? metadata.discount : null,
                                        taxExclusive = metadata.hasOwnProperty('taxExclusive') ? metadata.taxExclusive : null,
                                        totalPrice = metadata.hasOwnProperty('totalPrice') ? metadata.totalPrice : null,
                                        currency = paymentIntent.currency
                                        
                                    if (serviceId && quantity) {
                                        // Add credits for the service to the customer's account
                                        await addServiceCredits(company, serviceId, parseInt(quantity))
        
                                        // Send an email invoice
                                        let currDate = new Date()
                                        try {
                                            // let invoicePdf = await createInvoicePDF({
                                            //     issueDate: currDate,
                                            //     dueDate: currDate,
                                            //     companyName: company.name,
                                            //     companyAddress: company.address.address,
                                            //     companyCity: company.address.town,
                                            //     companyPostcode: company.address.postcode,
                                            //     companyCountry: company.address.country,
                                            //     invoiceItems: [
                                            //         {
                                            //             description: paymentIntent.description,
                                            //             quantity: parseInt(quantity),
                                            //             service: 'TOPUP',
                                            //             netAmount: parseInt(price) / 100
                                            //         }
                                            //     ],
                                            //     subtotal: parseInt(price) / 100,
                                            //     tax: parseInt(taxExclusive) / 100,
                                            //     total: parseInt(totalPrice) / 100,
                                            //     currency: currency
                                            // })
                                            // console.log({
                                            //     companyId: company.id,
                                            //     value: 'TOPUP',
                                            //     data: [
                                            //         {
                                            //             description: paymentIntent.description,
                                            //             // quantity: +quantity,
                                            //             // unitAmount: +price / 100,
                                            //             quantity: 1,
                                            //             unitAmount: +price / 100,
                                            //             taxType: 'NONE',
                                            //             accountCode: XeroAccountCode.TOPUP,
                                            //             // taxAmount: +price / 100 / 10,
                                            //             taxAmount: +taxExclusive / 100,
                                            //             lineAmount: +price / 100,
                                            //         }
                                            //     ],
                                            //     options: {
                                            //         totalDiscount: +discount,
                                            //         total: +totalPrice / 100,
                                            //         totalTax: +taxExclusive / 100
                                            //     },
                                            //     serviceId,
                                            //     quantity,
                                            //     price,
                                            //     discount,
                                            //     taxExclusive,
                                            //     totalPrice,
                                            //     currency,
                                            // })    
                                            // izat
                                            const invoice = await createInvoice(company.id, titlePrefix + 'TOPUP', [
                                                {
                                                    description: paymentIntent.description,
                                                    // quantity: +quantity,
                                                    // unitAmount: +price / 100,
                                                    quantity: 1,
                                                    unitAmount: +price / 100,
                                                    // taxType: 'NONE',
                                                    accountCode: XeroAccountCode.TOPUP,
                                                    // taxAmount: +price / 100 / 10,
                                                    taxAmount: +taxExclusive / 100,
                                                    discountAmount: +discount / 100, 
                                                    lineAmount: (+price - +discount) / 100,
                                                }
                                            ], {
                                                totalDiscount: +discount,
                                                total: +totalPrice / 100,
                                                totalTax: +taxExclusive / 100
                                            })      
                                            const couponForTransaction = paymentIntent.metadata.discountId
                                            if (couponForTransaction) {
                                            console.log("redeem coupon")
                                             await redeemStripeCoupon(couponForTransaction, company.id, 'TOPUP')
                                            }
                                            console.log(`Invoice Created ${invoice.invoiceID} , ${company.id}`)
                                            const invoicePdf = await getInvoicePDF(company.id, invoice.invoiceID);
                                            console.log(`Get Invoice PDF`)
                                            let attachment = await convertBufferToMailgunAttachment(invoicePdf, `invoice-${currDate.getTime()}.pdf`)
                                            await createBillingEmail(company, attachment, {companyLogo: company.logoURL, titlePrefix: titlePrefix})

                                        } catch (err) {
                                            console.log(`Problem sending email invoice to ${company.email}: ${err.message}`)
                                        }
                                    }
                                    break
                                case 'event_attendee':
                                    let eventId = metadata.hasOwnProperty('eventId') ? metadata.eventId : null
                                    serviceId = metadata.hasOwnProperty('serviceId') ? metadata.serviceId : null
                                    quantity = metadata.hasOwnProperty('quantity') ? metadata.quantity : null
                                    price = metadata.hasOwnProperty('price') ? metadata.price : null
                                    discount = metadata.hasOwnProperty('discount') ? metadata.discount : null
                                    taxExclusive = metadata.hasOwnProperty('taxExclusive') ? metadata.taxExclusive : null
                                    totalPrice = metadata.hasOwnProperty('totalPrice') ? metadata.totalPrice : null
                                    currency = paymentIntent.currency
        
                                    if (serviceId && quantity) {
                                        // Add credits for the service to the customer's account
                                        // await addServiceCredits(company, serviceId, parseInt(quantity))
        
                                        // Send an email invoice
                                        await prisma.platformEvent.update({
                                            where: {
                                              id: eventId,
                                            },
                                            data: {
                                              maximumAttendees: +quantity || 20,
                                            },
                                          });
                                        let currDate = new Date()
                                        try {
                                            // let invoicePdf = await createInvoicePDF({
                                            //     issueDate: currDate,
                                            //     dueDate: currDate,
                                            //     companyName: company.name,
                                            //     companyAddress: company.address.address,
                                            //     companyCity: company.address.town,
                                            //     companyPostcode: company.address.postcode,
                                            //     companyCountry: company.address.country,
                                            //     invoiceItems: [
                                            //         {
                                            //             description: paymentIntent.description,
                                            //             quantity: parseInt(quantity),
                                            //             service: 'TOPUP',
                                            //             netAmount: parseInt(price) / 100
                                            //         }
                                            //     ],
                                            //     subtotal: parseInt(price) / 100,
                                            //     tax: parseInt(taxExclusive) / 100,
                                            //     total: parseInt(totalPrice) / 100,
                                            //     currency: currency
                                            // })
                                            // const invoice = await createInvoice(company.id, titlePrefix + 'EVENT', [
                                            //     {
                                            //         description: paymentIntent.description,
                                            //         quantity: +quantity,
                                            //         unitAmount: +price,
                                            //         taxType: 'NONE',
                                            //         accountCode: XeroAccountCode.EVENT_PURCHASE,
                                            //         taxAmount: +price / 10,
                                            //         discountAmount: +discount,
                                            //         lineAmount: +quantity * (+price)
                                            //     }
                                            // ], {
                                            //     totalDiscount: discount,
                                            //     total: +quantity * (+price),
                                            //     totalTax: +quantity * (+price) / 10,
                                            // })
                                            // const invoicePdf = await getInvoicePDF(company.id, invoice.invoiceID);
                                            // let attachment = await convertBufferToMailgunAttachment(invoicePdf, `invoice-${currDate.getTime()}.pdf`)
                                            // await createBillingEmail(company, attachment, {companyLogo: company.logoURL, titlePrefix: titlePrefix})

                                        } catch (err) {
                                            console.log(`Problem sending email invoice to ${company.email}: ${err.message}`)
                                        }
                                    }
                                    break
                                default:
                                    console.log(`Unsupported product type ${productType}`)
                                    break
                            }
                        } 
                    } catch (error) {
                        console.log(error.message)
                    }

                } else {
                    console.log(`Received ${event.type} event from Stripe has no metadata`)
                }
                break
            //handle subscriptions activation
            case 'invoice.paid':
                // Invoice was paid (subscriptions)
                const invoice = event.data.object
                const paymentIntentSub = event.data.object 
                // let couponUsedInSub = invoice.discount.coupon
                // including discounted amount
                let amountPaid = invoice?.amount_paid / 100
                // console.log('invoice paid event', invoice)
                let discountAmount = invoice.total_discount_amounts[0].amount / 100
                console.log('invoice paid event', invoice.total_discount_amounts[0].amount)
                if (!invoice['subscription']) {

                    // This isn't an invoice for a subscription, so we don't care at the moment
                    break
                }
                subscription = await str.getSubscriptionById(invoice['subscription'])
                if (!subscription) {
                    console.log(`Received ${event.type} event from Stripe but the subscription ID ${invoice['subscription']} for this invoice did not return any results`)
                    break
                }

                let matchingCompanies = await prisma.company.findMany({
                    where: { stripeCustomerId: subscription.customer.toString() },
                  });
                if (matchingCompanies.length === 0) {
                    console.log(`Received ${event.type} event from Stripe but customer for subscription ${invoice['subscription']} does not exist in our DB`)
                    break
                }
                company = matchingCompanies[0]

                for (let idx = 0; idx < company.subscriptions.length; idx++) {
                    console.log("Cancelling Old Subscription: ", company.subscriptions)
                    try { 
                      const subs = await str.getSubscriptionById(company.subscriptions[idx])
                      await str.cancelSubscription(company.subscriptions[idx])
                    } 
                    catch (error){
                    console.log("Stripe get sub error: ",error.message)
                    }
                  
                }

                console.log("Activating New Subscription: ", subscription.id)

                await prisma.company.update({data: {
                    subscriptions: {
                      set: [
                        // ...company.subscriptions,
                        invoice['subscription']
                      ]
                    }
                  }, where: {
                    id: company.id
                }})      

                plan = subscription['plan']
                product = await str.getProductInfoById(plan['product']['id'])
                if (!product) {
                    console.log(`Received ${event.type} evencreateEventInvitationt from Stripe but the product ID ${plan['product']} associated with subscription ${invoice['subscription']} did not return any results`)
                    break
                }

                internalProducts = await prisma.billingProduct.findMany({
                    where: { stripeProductId: product.id },
                  });

                if ((product.metadata && product.metadata.hasOwnProperty('internalProductId')) || internalProducts.length > 0) {
                    let internalProduct: any = internalProducts[0];
                    // if (product.metadata && product.metadata.hasOwnProperty('internalProductId')) {
                    //     console.log('product_id', product.metadata['internalProductId'])
                    //     internalProduct = await prisma.billingProduct({ _id: product.metadata['internalProductId'] })
                    // }
                    if (!internalProduct) {
                        console.log(`Received ${event.type} event from Stripe but could not find internal product for ${product.metadata['internalProductId']}`)
                        break
                    }


                    let currDate = new Date()

                    let selectedPrice = internalProduct.prices.find((item: any) => item && item.currency.toLowerCase() === company.currency.toLowerCase()) || internalProduct.prices[0];
                    let stripePrice = await str.getPricingInfoById(selectedPrice.stripePriceId);

                    let price = stripePrice ? (stripePrice.unit_amount / 100) : 0;
                    let discountUsed = amountPaid === price ? false : true
                    let netPrice = price - amountPaid
                    let taxAmount = selectedPrice?.currency.toUpperCase() === "GBP" ? Math.round(price * ( 20/ 100)) : 0 ;
                    let discountForGbp = false
                    let discountedTaxAmount
                    if (discountUsed === true && selectedPrice?.currency.toUpperCase() === "GBP" ){
                        discountForGbp = true
                        let calcTaxWithDiscount =  await calculateTaxWithDiscount(price, "GBP", amountPaid)
                        discountedTaxAmount = calcTaxWithDiscount.payable || (stripePrice.unit_amount / 100)
                    }

                    if (internalProduct.fulfilment.hasOwnProperty('services')) {
                        const subscriptionPackage = internalProduct
                        // Add credits for the service
                        await addSubscriptionCredits(company, subscriptionPackage)                        
                        // for (let serviceDetails of internalProduct.fulfilment.services) {
                        //     console.log('service details', serviceDetails)
                        //     let service = await prisma.marketingTopupService({ id: serviceDetails.id })
                        //     if (!service) {
                        //         console.log(`Received ${event.type} event from Stripe but could not find service ${serviceDetails.id} in our DB`)
                        //         break
                        //     }

                        //     // Add credits for the service
                        //     await addSubscriptionCredits(company, service.id, serviceDetails.quantity)
                        // }

                        schedule.sendSubscriptionRenewalReminderMail({
                            price: discountUsed ? price - discountAmount : price || selectedPrice?.price,
                            currency: selectedPrice?.currency || subscription.plan.currency.toUpperCase(),
                            subscriptionId: subscription.id,
                            email: company.billingEmail,
                            firstName: company.name,
                            package: internalProduct.name, 
                            nextBillingCyle: moment.unix(subscription["current_period_end"]).format("MMMM DD, YYYY"),
                            reminderDate: moment.unix(subscription["current_period_end"]).subtract(10, 'days').toDate()
                        });
                    }
                    //izas - we don't see redeemstripecoupon logic here, we handle this in syncTAR function
                    console.log("create invoice")
                    const invoice = await createInvoice(company.id, titlePrefix + 'Subscription', [
                      {
                        // refer to LineItem fields below & update BillingItem in prisma (come back to when pt updates template)
                        // Name: `${internalProduct.name} Package`,
                        description: internalProduct.description,
                            quantity: 1,
                            unitAmount: price,
                            taxType: 'NONE',
                            accountCode: XeroAccountCode.SUBSCRIPTION,
                            taxAmount: discountForGbp ? discountedTaxAmount : taxAmount,
                            lineAmount: discountUsed ? price - discountAmount : price ,  // account for discounts
                            discountAmount: discountUsed ?  discountAmount : 0 , // account for discounts,
                            // discountRate: 1 // come back to once pt updates template
                        }
                      ])
                      const invoicePdf = await getInvoicePDF(company.id, invoice.invoiceID);
                      let attachment = await convertBufferToMailgunAttachment(invoicePdf, `invoice-${currDate.getTime()}.pdf`)
                      await createBillingEmail(company, attachment, {companyLogo: company.logoURL, titlePrefix: titlePrefix})
                      let { id } = createObjectID();
                      //  Create an invoice entry
                        await prisma.billingInvoice.create({
                            data: {
                              id,
                              company: { connect: { id: company.id } },
                              LineItems: {
                                create: {
                                  lineID: Generator.generateString(32),
                                  description: 'Subscription',
                                  referenceId: internalProduct.id,
                                  gross: price,
                                  net: price - price / 10,
                                  tax: price / 10,
                                  quantity: 1,
                                  service: 'PACKAGE',
                                },
                              },
                              net: price - price / 10,
                              gross: price,
                              issueDate: new Date().toISOString(),
                              dueDate: new Date().toISOString(),
                              status: 'AUTHORISED',
                              xeroID: Generator.generateString(32),
                              paymentRefs: {},
                              extra: {},
                            },
                          });
                    
                    console.log('invoice subscription created', id)            
                    // todo: move this somewhere else to avoid webhook repition
                    // console.log("testing syncTAR")
                    // await syncTAR()
                    // console.log("done testing syncTar")
                    
                } else {
                    console.log(`Received ${event.type} event from Stripe but could not find correct metadata for product ${plan['product']}`)
                }

                break
            case 'customer.subscription.deleted':
                // Subscription was cancelled or deleted
                // TODO: remove from subscriptions in company object
                // console.log('subscription deleted event', event)
                subscription = event.data.object
                let customer = subscription.customer

                let matching = await prisma.company.findMany({
                    where: { stripeCustomerId: subscription.customer.toString() },
                  });
                if (matching.length === 0) throw new Error('Cannot find company with this subscription')

                company = matching[0]
                let newSubs = [...company.subscriptions]

                newSubs = newSubs.filter((subId) => { return subId !== subscription.id })

                console.log(`Updating company subscriptions for ${company.id}. Removing ${subscription.id}`)
                await prisma.company.update({
                    where: { id: company.id },
                    data: {
                      subscriptions: {
                        set: newSubs,
                      },
                    },
                  });

                //cancelling agenda job subscription renewal reminder email
                schedule.cancelSubscriptionRenewalReminderMail({subscriptionId: subscription.id})

                plan = subscription['plan']
                product = await str.getProductInfoById(plan['product'])

                internalProducts = await prisma.billingProduct.findMany({ where: { stripeProductId: product.id }})
                let internalProduct: any = internalProducts[0];

                if (!internalProduct) {
                    console.log(`Received ${event.type} event from Stripe but could not find internal product for ${product.metadata['internalProductId']}`)
                    break
                }

                let selectedPrice = internalProduct?.prices.find((item: any) => item && item.currency.toLowerCase() === company.currency.toLowerCase()) || internalProduct?.prices[0];
                let stripePrice = await str.getPricingInfoById(selectedPrice?.stripePriceId);
                let price = stripePrice ? (stripePrice?.unit_amount / 100) : 0;

                // firstName
                // package (i.e small, medium or large)
                // price (package price)
                // currency (company currency)
                // for renewed subscription
                console.log("sending cancellation email")
                await cancelSubEmail({ 
                    price: selectedPrice?.price || price,
                    currency: selectedPrice?.currency || subscription.plan.currency.toUpperCase(),
                    subscriptionId: subscription.id,
                    email: company.billingEmail,
                    firstName: company.name,
                    package: internalProduct.name
                })


            
                break
            // TODO: check if we are calling this hook, if not then remove it    
            case 'checkout.session.completed':
                const cartIds: any = Object.values(event.data.object.metadata);
                const paymentStatus = event.data.object.payment_status === 'paid' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED';
                const carts = await prisma.platformEventCart.findMany({
                    where: {
                      id: { in: cartIds },
                    },
                    select: {
                      id: true,
                      item: true,
        
                      event: {
                        select: {
                          id: true,
                          name: true,
                          organiser: {
                            select: {
                              company: {
                                select: {
                                  logoURL: true,
                                  id: true,
                                  name: true,
                                  vatNum: true,
                                },
                              },
                            },
                          },
                          contents: {
                            select: {
                              id: true,
                              name: true,
                            },
                          },
                          cluster: {
                            select: {
                              id: true,
                              subClusters: {
                                select: {
                                  id: true,
                                  name: true,
                                  users: {
                                    select: {
                                      id: true,
                                      user: {
                                        select: {
                                          id: true,
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      pricing: {
                        select: {
                          id: true,
                          booked_slots: true,
                          employee: {
                            select: {
                              id: true,
                              email: true,
                              user: {
                                select: {
                                  id: true,
                                  email: true,
                                  firstName: true,
                                  lastName: true,
                                },
                              },
                            },
                          },
                          currency: true,
                          price: true,
                          duration: true,
                        },
                      },
                      user: {
                        select: {
                          id: true,
                          email: true,
                          firstName: true,
                          lastName: true,
                        },
                      },
                      userCompanyMembership: {
                        select: {
                          id: true,
                          company: {
                            select: {
                              id: true,
                              name: true,
                              currency: true,
                              billingEmail: true,
                              address: {
                                select: {
                                  town: true,
                                  country: true,
                                  address: true,
                                  postcode: true,
                                },
                              },
                            },
                          },
                        },
                      },
                      type: true,
                      quantity: true,
                      qrcodeKey: true,
                      qrcodeImage: true,
                      createdAt: true,
                      updatedAt: true,
                      status: true,
                      invitation: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  });
        

                if (paymentStatus === 'PAYMENT_SUCCESS') {
                    try {
                        const { event: { organiser, cluster }, user }: any = carts[0];
                        if (cluster && cluster.id) {
                            let paidCluster = cluster.subClusters.find((item: any) => item.name.includes('(PAID)'))
                            let nonPaidCluster = cluster.subClusters.find((item: any) => item.name.includes('(NONPAID)'))
                            let crmUser = await createOrGetCrmUser(organiser.company, {id: user.id}, true)

                            if (paidCluster && !paidCluster.users.find((csUser: any) => csUser.id === crmUser.id)) {
                                await prisma.crmSubCluster.update({
                                    where: { id: paidCluster.id },
                                    data: {
                                        users: {connect: {id: crmUser.id}}
                                    }
                                })
                                await prisma.crmSubCluster.update({
                                    where: { id: nonPaidCluster.id },
                                    data: {
                                        users: {disconnect: {id: crmUser.id}}
                                    }
                                })
                            }
                        }
                    } catch (error) {
                        console.log(`ERROR Change Paid Subcluster`, error.message)
                    }
                }

                carts.forEach(async (cart: any) => {
                    const { id, event: eventContent, pricing: { id: pricingId, price, currency, employee, booked_slots }, invitation, userCompanyMembership }: any = cart;
                    if (invitation && invitation.length > 0) {
                        await prisma.eventInvitation.update({
                          where: { id: invitation[0].id },
                          data: { invitationStatus: 'ACCEPTED' },
                        });
                      } else {
                        await prisma.eventInvitation.create({
                          data: {
                            id: createObjectID().id,
                            invitee: { connect: { id: userCompanyMembership.id } },
                            lastInviteSent: new Date(),
                            eventType: 'PLATFORM_EVENT_PRICING_SLOT',
                            platformEvent: { connect: { id: eventContent.id } },
                            platformEventPricingSlot: { connect: { id } },
                            invitationStatus: 'ACCEPTED',
                          },
                        });
                      }
          
                      await prisma.platformEventContentPricing.update({
                        where: { id: pricingId },
                        data: {
                          booked_slots: booked_slots + 1,
                        },
                      });
          
          
                      for (const emp of employee) {
                        await prisma.eventInvitation.create({
                          data: {
                            id: createObjectID().id,
                            invitee: { connect: { id: emp.id } },
                            lastInviteSent: new Date(),
                            eventType: 'PLATFORM_EVENT_PRICING_SLOT',
                            platformEvent: { connect: { id: eventContent.id } },
                            platformEventPricingSlot: { connect: { id } },
                            invitationStatus: 'AWAITING',
                          },
                        });
                      }
                    
                    // CHange status to PAYMENT_VERIFICATION
                    await prisma.platformEventCart.update({
                        where: {
                          id: cart.id,
                        },
                        data: {
                          status: paymentStatus,
                          paymentIntentId: event.data.object.payment_intent,
                          currentPrice: price,
                          currentCurrency: currency,
                        },
                      });
                });

                if (carts.length) {    
                    const { event: { id: eventId, organiser, name }, user: { id: userId, email, firstName, lastName }, userCompanyMembership: { company: compMem } }: any = carts[0];
                    await prisma.platformEventTransaction.create({
                        data: {
                          id: createObjectID().id,
                          event: {
                            connect: {
                              id: eventId,
                            },
                          },
                          status: 'INCOME',
                          amount: event.data.object.amount_total,
                          currency: event.data.object.currency,
                          carts: {
                            connect: cartIds.map((item) => ({ id: item })),
                          },
                          user: {
                            connect: {
                              id: userId,
                            },
                          },
                          stripeRaw: JSON.stringify(event),
                        },
                      });
          

                    let currDate = new Date()
                    //hiding these references as redundant now
                    const eventInvoice = await createInvoice(company.id, titlePrefix + 'EventContent - DEACTIVATED', carts.map((cart: any) => {
                        const { event: eventContent, pricing: { price }, quantity }: any = cart;

                        return {
                            description: eventContent.name,
                            quantity: +quantity,
                            unitAmount: (+price * 5 / 100),
                            taxType: 'NONE',
                            discountAmount: 0,
                            accountCode: XeroAccountCode.EVENT_PURCHASE,
                            taxAmount: (+price * 5 / 100) / 10,
                            lineAmount: +quantity * ((+price * 5 / 100))
                        }
                    }))
                    // const invoicePdf = await getInvoicePDF(company.id, eventInvoice.invoiceID);
                    // let attachment = await convertBufferToMailgunAttachment(invoicePdf, `invoice-${currDate.getTime()}.pdf`)
                    // await createEventEmail(company.billingEmail, attachment, {companyLogo: company.logoURL, titlePrefix: titlePrefix})

                    const subTotal = carts.reduce((acc: any, cart: any) => {
                        const { pricing: { price }, quantity }: any = cart;

                        return acc + (+price * +quantity)
                    }, 0)
                    const currency = carts.length > 0 ? carts[0].pricing.currency : 'GBP'

                    let invoicePdfCustomer = await createCustomerInvoicePDF({
                        logo: organiser.company.logoURL,
                        vatNum: organiser.company.vatNum,
                        username: [firstName, lastName].filter(Boolean).join(" "),
                        useremail: email,
                        discount: '0',
                        eventname: name,
                        issueDate: currDate,
                        dueDate: currDate,
                        companyName: company.name,
                        companyAddress: company.address.address,
                        companyCity: company.address.town,
                        companyPostcode: company.address.postcode,
                        companyCountry: company.address.country,
                        userName: compMem.name,
                        userAddress: compMem.address.address,
                        userCity: compMem.address.town,
                        userPostcode: compMem.address.postcode,
                        userCountry: compMem.address.country,
                        // invoicenumber: eventInvoice.invoiceID,
                        invoiceItems: carts.map((cart: any) => {
                            const { event: eventContent, pricing: { price }, quantity }: any = cart;
        
                            return {
                                description: eventContent.name,
                                quantity: +quantity,
                                service: 'Item',
                                unitAmount: +price / 100,
                                netAmount: +price / 100 * +quantity,
                            }
                        }),
                        subtotal: +subTotal / 100,
                        tax: subTotal / 10 / 100,
                        total: subTotal / 100 + (subTotal / 10 / 100),
                        currency: currency
                    })
                    let attachmentCustomer = await convertBufferToMailgunAttachment(invoicePdfCustomer, `invoice-${currDate.getTime()}.pdf`)
                    await createEventEmail(carts[0].user.email, attachmentCustomer, {companyLogo: company.logoURL, titlePrefix: titlePrefix})

                    await prisma.platformEventCart.updateMany({
                        where: {
                          id: { in: carts.map((item) => item.id) },
                        },
                        data: {
                          // xeroId: eventInvoice.invoiceID,
                          paymentIntentId: event.data.object.payment_intent,
                        },
                      });
                }

                break
            case 'charge.refunded':
                
                // const refundStatus = await prisma.updateManyPlatformEventTransactions({
                //     where: {
                //         txnId: event.data.object.payment_intent
                //     },
                //     data: {
                //         refunded: true
                //     }
                // })

                event.data.object.refunds.data.forEach(async (refund:any) => {
                    const { cartId, type } = refund.metadata

                    
            if (type === 'cart') {
                const cart = await prisma.platformEventCart.findUnique({
                  where: { id: cartId },
                  select: {
                    id: true,
                    item: true,
                    event: {
                      select: {
                        id: true,
                        contents: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                    pricing: {
                      select: {
                        id: true,
                        employee: {
                          select: {
                            id: true,
                            email: true,
                            user: {
                              select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                              },
                            },
                          },
                        },
                        currency: true,
                        price: true,
                        duration: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                      },
                    },
                    type: true,
                    quantity: true,
                    qrcodeKey: true,
                    qrcodeImage: true,
                    createdAt: true,
                    updatedAt: true,
                    status: true,
                    invitation: {
                      select: {
                        id: true,
                      },
                    },
                  },
                });
  
                const {
                  event: { id: eventId },
                  user: { id: userId },
                } = cart;
  
                await prisma.platformEventTransaction.create({
                  data: {
                    id: createObjectID().id,
                    event: {
                      connect: {
                        id: eventId,
                      },
                    },
                    status: 'OUTCOME',
                    amount:
                      event.data.object.amount_refunded ||
                      event.data.object.amount,
                    currency: event.data.object.currency,
                    carts: {
                      connect: [{ id: cartId }],
                    },
                    user: {
                      connect: {
                        id: userId,
                      },
                    },
                    stripeRaw: JSON.stringify(event),
                  },
                });
              }
                });
                break
            case 'checkout.session.async_payment_succeeded':
                // CHange status to PAYMENT_SUCCESS
                // console.log(event.data.object)
                break
            case 'checkout.session.async_payment_failed':
                // CHange status to PAYMENT_FAILED
                // console.log(event.data.object)
                break
            default:
                console.log(`Unhandled event type from Stripe: ${event.type}`)
                break
        }
    } catch (err) {
        res.status(500).send(`Stripe webhook error: ${err.message}`)
        console.error(`Stripe webhook error: ${err.message}`)
        return
    }

    res.send()
})


router.post('/revolut', express.raw({ type: 'application/json' }), async (req, res) => {
    

    const { event, data } = req.body;

    switch (event) {

      case 'TransactionCreated':
       
        break;

      case 'TransactionStateChanged':

        break;

      case 'PayoutLinkCreated':

        break;

      case 'PayoutLinkStateChanged':

        break;

      default:
        console.warn(`Received an unknown event: ${event}`);

    }
 
        // event: string;
        // timestamp: string;
        // data: {
        //   id: string;
        //   type: string;
        //   state: string;
        //   request_id: string;
        //   created_at: string;
        //   updated_at: string;
        //   reference: string;
        //   legs: {
        //     leg_id: string;
        //     account_id: string;
        //     counterparty: {
        //       id: string;
        //       account_type: string;
        //       account_id: string;
        //     };
        //     amount: number;
        //     currency: string;
        //     description: string;
        //   }[];
     
})

router.get('/revolut-auth',  express.raw({ type: 'application/json' }), async (req, res) => {
  // refresh revolut auth - revolut token - revolut admin has to trigger this endpoint (by enabling cert in settings, follow steps from this link below)
  // https://developer.revolut.com/docs/guides/manage-accounts/get-started/make-your-first-api-request#re-authorise-the-api
  // sample of what revolut will trigger
  // https://graphql-dev.synkd.life/?code=oa_sand_gBgpaEKSYYtUHYqOe7tH_YQnxD1iwBPYTZ3Hg9mLSm8
    
    let auth_code: string = req.query?.code as string
    if(auth_code){ 
      const revolutBusiness = new RevolutBusiness()
      console.log("valid code: ", auth_code)
      revolutBusiness.authenticate(auth_code);
    } else { 
      console.log("no valid code: ", auth_code)
    }
    return res.send(true);

})

router.get('/xero-auth',  express.raw({ type: 'application/json' }), async (req, res) => {
    let consentUrl = await xeroInstance.buildConsentUrl();

    return res.redirect(consentUrl);
})



router.get('/xero-callback',  express.raw({ type: 'application/json' }), async (req, res) => {
    const tokenSet = await xeroInstance.apiCallback(req.url);
    const tenants = await xeroInstance.updateTenants();
    console.log(tenants)

    await redisClient.set('xero_token', JSON.stringify(tokenSet), {EX: 60 * 60 * 24 * 365});
    return res.send(true);
})

router.get('/xero-refresh-token',  express.raw({ type: 'application/json' }), async (req, res) => {
    let rawdata: any = await redisClient.get('xero_token');
    let tokenSet = JSON.parse(rawdata);

    const newTokenSet = await xeroInstance.refreshWithRefreshToken(process.env.XERO_CLIENT_ID, process.env.XERO_CLIENT_SECRET, tokenSet.refresh_token)
    await redisClient.set('xero_token', JSON.stringify(newTokenSet), {EX: 60 * 60 * 24 * 365});

    return res.send(true);
})

router.get('/xero-download-invoice', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const invoicePdf = await getInvoicePDF(req.query.company_id as string, req.query.invoice_id as string);
        return res.send(invoicePdf);
    } catch (error) {
        res.send(error)
    }
})

router.get('/xero-all-invoice',  express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const invoicePdf = await getAllInvoice(req.query.company_id as string);
        return res.send(invoicePdf);
    } catch (error) {
        res.send(error)
    }
})


router.get('/xero-all-invoice-by-id',  express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const invoices = await getAllInvoice(req.query.company_id as string);
        // console.log(invoices.invoices[0])
        return res.send(invoices.invoices.find((item: any) => item.invoiceID === req.query.invoice_id) || { status: false, data: invoices.invoices[0] });
    } catch (error) {
        console.log(error.message)
        res.send(error)
    }
})

cron.schedule('*/20 * * * *', async () => {
    await refreshXeroToken()
});
