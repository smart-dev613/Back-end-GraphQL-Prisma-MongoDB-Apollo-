import { XeroClient, Contacts, Contact, CurrencyCode, Address, Invoice, BrandingTheme, LineItem, LineAmountTypes } from 'xero-node';
import fs from 'fs';
import crypto from 'crypto';
import { PrismaClient , company } from "@prisma/client";
const prisma = new PrismaClient();
import moment from 'moment';
import { redisClient } from '../helpers/redisHelper';
import { Company } from '../auth/user.interface';

export const xeroInstance = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [
    // `http://localhost:800/xero-callback`
    `https://${process.env.NODE_ENV === "production" ? "graphql": "graphql-dev"}.synkd.life/xero-callback`
  ],
  scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.attachments', 'accounting.settings', 'accounting.contacts', 'offline_access'],
});

export const XeroAccountCode = {
  SUBSCRIPTION: '220',
  TOPUP: '221',
  EVENT_PURCHASE: '222',
  PAYOUT_REFERRALS: '226',
  STUDIO_MARKETPLACE: '223',
  STRIPE_FEES: '81072',
  EVENT_PAYOUT:'225' ,
  EVENT_SYNKDFEE:'227' ,
}

export const initXero = async () => {
  try {
    console.log(`[XERO]: Init Xero with Existing Token`)
    let rawdata: any = await redisClient.get('xero_token');

    if (!rawdata) {
      console.log(`[XERO]: Token not found. Needs re-auth`)
      return
    }

    let tokenSet = JSON.parse(rawdata);

    const newTokenSet = await xeroInstance.refreshWithRefreshToken(process.env.XERO_CLIENT_ID, process.env.XERO_CLIENT_SECRET, tokenSet.refresh_token)
    await xeroInstance.updateTenants();
    await redisClient.set('xero_token', JSON.stringify(newTokenSet), {EX: 60 * 60 * 24 * 365});

    console.log(`[XERO]: Refresh Xero Token`)
  } catch (error) {
    console.log(error)
    console.log(`[XERO]: Token not found`)
  }
}

export const refreshXeroToken = async () => {
  try {
    let rawdata: any = await redisClient.get('xero_token');
    if (!rawdata) {
      console.log(`[XERO]: Token not found. Needs re-auth`)
      return
    }

    let tokenSet = JSON.parse(rawdata);

    const newTokenSet = await xeroInstance.refreshWithRefreshToken(process.env.XERO_CLIENT_ID, process.env.XERO_CLIENT_SECRET, tokenSet.refresh_token)

    await redisClient.set('xero_token', JSON.stringify(newTokenSet), {EX: 60 * 60 * 24 * 365});

    console.log(`[XERO]: Refresh Xero Token`)
} catch (error) {
    console.log(error)
}
}

const xeroErrorHandler = (result) => {
  return new Promise((resolve, reject) => {
    // This is magic
    let hasErrors = []

    Object.keys(result).map(v => {
      if (!['Id', 'Status', 'ProviderName', 'DateTimeUTC'].includes(v)) {
        if (result[v] instanceof Array) {
          result[v].map(e => {
            if (e.HasVailidationErrors || e.StatusAttributeString === 'ERROR') {
              hasErrors.push(e.ValidationErrors)
            }
          })
        } else {
          if (result[v].HasVailidationErrors || result[v].StatusAttributeString === 'ERROR') {
            hasErrors.push(result[v].ValidationErrors)
          }
        }
      }
    })

    if (hasErrors.length) {
      console.log(hasErrors)
      reject('REQUEST_HAS_ERRORS')
    } else
      resolve(result)
  })
}

export const getActiveTenantId = (country: string) => {
  // let tenant = xeroInstance.tenants.find((tenant: any) => tenant.orgData.countryCode === country)
  // if (!tenant || country === 'UK') {
    //   tenant = xeroInstance.tenants.find((tenant: any) => tenant.orgData.countryCode === 'GB')
    // }
  // defaulting to UK tenant for now - this is because of the new branding themes
  // this will be removed when we have the new branding themes for all countries - tbc
  let tenant = xeroInstance.tenants.find((tenant: any) => tenant.orgData.countryCode === 'GB')

  return tenant?.tenantId
}

export const getReferralBrandingTheme = async (country: string) => {
  const activeTenantId = getActiveTenantId(country);

  const { body: { brandingThemes } } = await xeroInstance.accountingApi.getBrandingThemes(activeTenantId);
  let referralTheme = brandingThemes.find((item: BrandingTheme) => item.name.includes('Synkd Referral'))

  return referralTheme
}

export const getBrandingTheme = async (country: string, invoiceType: string) => {
  // get the tenenat id of company country
  const activeTenantId = getActiveTenantId(country); // hard code this becuse of new themes
  //filter the branding themes of said tenant id
  const { body: { brandingThemes } } = await xeroInstance.accountingApi.getBrandingThemes(activeTenantId);
  // define brandingSelected parameter
  let brandingSelected 
    // we have 3 new branding themes - remove logic for country checks
    // for xero admin: DO NOT RENAME THE INVOICES, we use the name to check which invoice to use
    //1. Synkd Referral - for later come back to
    //2. Synkd Event Attendee Receipt (company to attendee)
    //3. Synkd Event Payout (for synkd fee )
    //4. Synkd Event Payout (for synkd payout)
  if (invoiceType === XeroAccountCode.EVENT_PURCHASE) {// xerocode: 222 for event purchase
     brandingSelected = brandingThemes.find((item: BrandingTheme) => item.name.includes('Synkd Event Attendee Receipt'))
  } else if (invoiceType === XeroAccountCode.EVENT_PAYOUT || invoiceType === XeroAccountCode.EVENT_SYNKDFEE) { // xerocode: 225 && 227 for event payout and synkd fee
     brandingSelected = brandingThemes.find((item: BrandingTheme) => item.name.includes('Synkd Event Payout'))
  }
  // we need a fallback - so it goes to the UK branding theme (Standard)
  // this should fix the issue with subscription and topup invoices not sending
  if (!brandingSelected) {
    brandingSelected = brandingThemes.find((item: BrandingTheme) => item.name.toUpperCase().endsWith('UK'))
  }
  // if we still dont have a branding theme, we need to fallback to the first one we get
  if (!brandingSelected) {
    brandingSelected = brandingThemes[0]
  }
  
  return brandingSelected;
}

export const getOrCreateContact = async (company: any | string): Promise<Contact> => {
  try {

    if (typeof company === 'string') {
      company = await prisma.company.findUnique({
        where: { id: company },
        select: {
          id: true,
          name: true,
          billingEmail: true,
          vatNum: true,
          currency: true,
          contactXeroId: true,
          address: {
            select: {
              country: true,
              town: true,
              postcode: true,
              address: true,
            },
          },
        },
      });    }
    const activeTenantId = getActiveTenantId(company.address.country);

if (activeTenantId){
  try {
  
      console.log(`[XERO]: Found ActiveTenant -> ${activeTenantId} & contactXeroId -> ${company.contactXeroId}`)
     if (company?.contactXeroId) {
      const contactsData = await xeroInstance.accountingApi.getContact(activeTenantId, company.contactXeroId);
      console.log(`[XERO]: Get Contact by ContactID`)    
      const res = await xeroInstance.accountingApi.updateContact(activeTenantId, company.contactXeroId, {
        contacts: [
          {
            emailAddress: company.billingEmail,
            taxNumber: company.vatNum,
            defaultCurrency: company.currency as unknown as CurrencyCode,
            addresses: [
              {
                addressType: Address.AddressTypeEnum.POBOX,
                city: company.address.city || company.address.town,
                country: company.address.country,
                postalCode: company.address.postcode,
                addressLine1: company.address.address
              }
            ],
          }
        ]
      })
      await xeroErrorHandler(res);
      return contactsData.body.contacts[0]
    } else {
      console.log(`[XERO]: No existing contact...creating`)
      let { body: { contacts } } = await xeroInstance.accountingApi.getContacts(activeTenantId, null, `EmailAddress=="${company.billingEmail}"`);
    if ((contacts || []).length) {
      console.log(`[XERO]: Get Contact by EmailAddress`)
      await prisma.company.update({
        where: {
          id: company.id,
        },
        data: {
          contactXeroId: contacts[0].contactID,
        },
      });
      return contacts[0];
    }

    console.log(`[XERO]: Get Contact by CreateContact`)
    let generatedIdentifier = crypto.randomBytes(10).toString('hex')
    let newContact: Contacts = {
      contacts: [
        {
          name: `${company.name} (${generatedIdentifier})`,
          emailAddress: company.billingEmail,
          taxNumber: company.vatNum,
          defaultCurrency: company.currency as unknown as CurrencyCode,
          addresses: [
            {
              addressType: Address.AddressTypeEnum.POBOX,
              city: company.address.city || company.address.town,
              country: company.address.country,
              postalCode: company.address.postcode,
              addressLine1: company.address.address
            }
          ],
        }
      ]
    }

    const data = await xeroInstance.accountingApi.createContacts(activeTenantId, newContact);
    await xeroErrorHandler(data);

    await prisma.company.update({
      where: {
        id: company.id,
      },
      data: {
        contactXeroId: data.body.contacts[0].contactID,
      },
    });

    return data.body.contacts[0]
  }
  } catch (error) {
     if (error.response && error.response.statusCode === 404) {
        // Handle specific case: contact not found
        console.log(`[XERO]: Contact not found. Attempting to create a new contact.`);
      let { body: { contacts } } = await xeroInstance.accountingApi.getContacts(activeTenantId, null, `EmailAddress=="${company.billingEmail}"`);
    if ((contacts || []).length) {
      console.log(`[XERO]: Get Contact by EmailAddress`)
      await prisma.company.update({
        where: {
          id: company.id,
        },
        data: {
          contactXeroId: contacts[0].contactID,
        },
      });
      return contacts[0];
    }

    console.log(`[XERO]: Get Contact by CreateContact`)
    let generatedIdentifier = crypto.randomBytes(10).toString('hex')
    let newContact: Contacts = {
      contacts: [
        {
          name: `${company.name} (${generatedIdentifier})`,
          emailAddress: company.billingEmail,
          taxNumber: company.vatNum,
          defaultCurrency: company.currency as unknown as CurrencyCode,
          addresses: [
            {
              addressType: Address.AddressTypeEnum.POBOX,
              city: company.address.city || company.address.town,
              country: company.address.country,
              postalCode: company.address.postcode,
              addressLine1: company.address.address
            }
          ],
        }
      ]
    }

    const data = await xeroInstance.accountingApi.createContacts(activeTenantId, newContact);
    await xeroErrorHandler(data);

    await prisma.company.update({
      where: {
        id: company.id,
      },
      data: {
        contactXeroId: data.body.contacts[0].contactID,
      },
    });

    return data.body.contacts[0]
      } else {
        console.error("Error interacting with Xero API:", error);
        // Handle other types of errors appropriately
    }
}
} else {
  console.log("[XERO]:Error... No activeTenantId")
  }
  } catch (error) {
    console.log('XERO Error: getting contacts',error)
    throw error
  }
}

export const createInvoice = async (company: any | string, title: string, items: LineItem[], otherOptions:any = {}) => {
  try {
    const contact = await getOrCreateContact(company);
      
    if (typeof company === 'string') {
      company = await prisma.company.findUnique({
        where: { id: company },
        select: {
          address: {
            select: {
              country: true,
            },
          },
        },
      });    }
    // get the tenenat id of company country
    const activeTenantId = getActiveTenantId(company.address.country);
    // get the xero account code for this transaction 
    const accountCode = items.map(item => item.accountCode);
    // get transaction branding theme
    const branding = await getBrandingTheme(company.address.country, accountCode[0]);
    // get referrralBranding
    const referralBranding = await getReferralBrandingTheme('UK')
    let isReferralTheme = false
    // Check if isReferral is true and remove it from otherOptions after setting theme
    if (typeof otherOptions === 'object' && otherOptions !== null) {
      const isReferral = (otherOptions as { isReferral?: boolean }).isReferral === true; // referral is true
      if (isReferral) {
        delete otherOptions.isReferral; // Optionally remove isReferral from going to xero
        isReferralTheme = true // assign referralTheme
      }
   }

    const total = items.reduce((acc: number, curr: LineItem) => {
      return curr.discountAmount > 0 ? 
      acc + curr.lineAmount - curr.discountAmount :
      acc + curr.lineAmount
      
    }, 0)
    const totalTax = items.reduce((acc: number, curr: LineItem) => {
      return acc + curr.taxAmount
    }, 0)
    console.log(`[XERO]: total value is ${total} for invoice ${title}`)
    const createdInvoice = await xeroInstance.accountingApi.createInvoices(activeTenantId, {
      invoices: [
        {
          type: Invoice.TypeEnum.ACCREC,
          contact: {
            contactID: contact.contactID
          },
          brandingThemeID: isReferralTheme ? referralBranding.brandingThemeID : branding.brandingThemeID,
          lineItems: items,
          lineAmountTypes: LineAmountTypes.Exclusive,
          total,
          totalTax,
          subTotal: total - totalTax,
          date: moment().format(),
          dueDate: moment().format(),
          reference: title,
          status: Invoice.StatusEnum.AUTHORISED,
          ...otherOptions
        }
      ]
    })

    // const payInvoice = await xeroInstance.accountingApi.createPayment(activeTenantId, {
    //   invoice: {
    //     invoiceID: createdInvoice.body.invoices[0].invoiceID
    //   }
    // })
    return createdInvoice.body.invoices[0];
  } catch (error) {
    console.log(JSON.stringify(error.response.body, null, 2))
    // console.log(error.response)
    throw new error (JSON.stringify(error.response.body, null, 2))
  }
}

// add this dummy for testing deployment
// export const createStripeInvoice = async (title: string, items: LineItem[], otherOptions = {}) => {
//   try {
   
//     const activeTenantId = getActiveTenantId('GB');


//     const total = items.reduce((acc: number, curr: LineItem) => {
//       return acc + curr.lineAmount
//     }, 0)
//     const totalTax = items.reduce((acc: number, curr: LineItem) => {
//       return acc + curr.taxAmount
//     }, 0)
    
//     const createdInvoice = await xeroInstance.accountingApi.createInvoices(activeTenantId, {
//       invoices: [
//         {
//           type: Invoice.TypeEnum.ACCREC,
//           contact: {
//             contactID: "af7f468d-1a1e-4a6c-b174-9ec4760c5291"
//           },
//           brandingThemeID: "6b2ac1d9-344c-4e9f-a804-992ecf8a6f1b",
//           lineItems: items,
//           lineAmountTypes: LineAmountTypes.Exclusive,
//           total,
//           totalTax,
//           subTotal: total - totalTax,
//           date: moment().format(),
//           dueDate: moment().format(),
//           reference: title,
//           status: Invoice.StatusEnum.AUTHORISED,
//           ...otherOptions
//         }
//       ]
//     })

//     return createdInvoice.body.invoices[0];
    
//   } catch (error) {
//     // console.log(JSON.stringify(error.response.body, null, 2))
//     console.log("createstriep invoice error", error.message)
//     throw error;
//   }
// }

export const getInvoicePDF = async (company: any | string, invoiceId: string) => {
  if (typeof company === 'string') {
    company = await prisma.company.findUnique({
      where: { id: company },
      select: {
        address: {
          select: {
            country: true,
          },
        },
      },
    });  }
  const activeTenantId = getActiveTenantId(company.address.country);
  const { body } = await xeroInstance.accountingApi.getInvoiceAsPdf(activeTenantId, invoiceId, { headers: { accept: 'application/pdf' } })

  return body;
}

export const getAllInvoice = async (company: any | string) => {
  if (typeof company === 'string') {
    company = await prisma.company.findUnique({
      where: { id: company },
      select: {
        address: {
          select: {
            country: true,
          },
        },
      },
    });
  }
  const activeTenantId = getActiveTenantId(company.address.country);
  const { body } = await xeroInstance.accountingApi.getInvoices(activeTenantId)

  return body;
}
