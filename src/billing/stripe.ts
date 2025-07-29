import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { CreateConnectAccount, PromoValueUnit } from "../inputs/billing";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { createObjectID } from "../../util/createIDs";

const { company: company } = prisma;

export class stripe {
    _stripe: Stripe | null

    constructor() {
        // Initialise Stripe otherwise we can't do anything
        try {
          this._stripe = new Stripe(process.env.STRIPE_API_KEY, {
              // @ts-ignore
                apiVersion: '2023-10-16'
            })
        } catch (err) {
            throw new Error(`Could not load Stripe: ${err}`)
        }
    }

    async customerAccountExist(stripeCustomerId){

        try {
            let customer = await this._stripe.customers.retrieve(stripeCustomerId)

            // stop returning deleted customers
            if(!customer.deleted){
                return true

            } else {
                customer = null;
                return false;
            }
            
        } catch (err) {
            console.log(`Could not retrieve Stripe customer ${stripeCustomerId}. Creating new customer instead`)
            return false;
        }
    }

    /**y
     * Creates a new Stripe Customer for a Company if it does not already exist.
     * If a Customer already exists, this function will return it instead.
     * @param company [Company|string]
     */
    async createCustomerIfNotExists(company: any | string) {
        let customer

        if (typeof company === 'string') {
            company = await prisma.company.findUnique({
                where: { id: company },
              });        
        }

        if (!company) throw new Error('No valid company provided')

        if (company.stripeCustomerId) {
            console.log(`Found existing Stripe customer ${company.stripeCustomerId} for company ${company.id}`)
            try {
                customer = await this._stripe.customers.retrieve(company.stripeCustomerId, )
                // stop returning deleted customers
                if(!customer.deleted){
                    return customer
                } else {
                    customer = null;
                }
                
                
            } catch (err) {
                console.log(`Could not retrieve Stripe customer ${company.stripeCustomerId}. Creating new customer instead`)
            }
        }
        if (!customer) {
            console.log(`Creating new Stripe customer for company ${company.id}`)
            customer = await this._stripe.customers.create({
                email: company.billingEmail,
                name: company.name,
                metadata: {
                    companyId: company.id
                }
            })
            await prisma.company.update({
                where: {
                  id: company.id,
                },
                data: {
                  stripeCustomerId: customer.id,
                },
              });
        }

        return customer
    }

    async createConnectAccount(company: any | string, data: CreateConnectAccount) {
        try {
        if (typeof company === 'string') {
            company = await prisma.company.findUnique({
                where: { id: company },
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  address: {
                    select: {
                      town: true,
                      country: true,
                      address: true,
                      postcode: true,
                    },
                  },
                  logoURL: true,
                  email: true,
                  url: true,
                  vatNum: true,
                  regNum: true,
                  info: true,
                  profiles: {
                    select: {
                      locale: true,
                      bio: true,
                      keywords: true,
                    },
                  },
                  category: true,
                  representativeContact: {
                    select: {
                      id: true,
                      email: true,
                      phone: true,
                      user: {
                        select: {
                          dob: true,
                          email: true,
                          firstName: true,
                          lastName: true,
                          phone: true,
                          address: {
                            select: {
                              town: true,
                              country: true,
                              address: true,
                              postcode: true,
                            },
                          },
                          country: true,
                        },
                      },
                    },
                  },
                  bankAccount: {
                    select: {
                      id: true,
                      stripeBankAccountId: true,
                      country: true,
                      currency: true,
                      account_holder_name: true,
                      account_holder_type: true,
                      routing_number: true,
                      account_number: true,
                    },
                  },
                  landline: true,
                  stripeAccountId: true,
                },
              });
        }

        console.log("createConnectAccount: ", company)

        const companySelected = company as any


        if (!companySelected) throw new Error('No valid company provided')

        let account = null;

        if (companySelected.stripeAccountId) {
            console.log(`Found existing Stripe connect account ${companySelected.stripeAccountId} for company ${companySelected.id}`)
            try {
                account = await this._stripe.accounts.retrieve(companySelected.stripeAccountId)
            } catch (err) {
                console.log(`Could not retrieve Stripe connect account ${companySelected.stripeAccountId}. Creating new connect account instead`)
            }
        }
       

        
            if (!account) {
                console.log(`Creating new Stripe connect account for company ${companySelected.id}`)
                // console.log(company)

                const userAddress = companySelected.representativeContact && companySelected.representativeContact?.user && companySelected.representativeContact?.user.address

                // const token = await this._stripe.tokens.create({
                //     bank_account: {
                //         country: companySelected.bankAccount.country === 'UK' ? 'GB' : companySelected.bankAccount.country,
                //         currency: companySelected.bankAccount.currency,
                //         account_holder_name: companySelected.bankAccount.account_holder_name,
                //         account_holder_type: companySelected.bankAccount.account_holder_type,
                //         routing_number: companySelected.bankAccount.routing_number,
                //         account_number: companySelected.bankAccount.account_number,
                //     },
                // });
                const parsedPhoneNumber = parsePhoneNumberFromString((companySelected.representativeContact?.phone || companySelected.representativeContact?.user?.phone || ''));

                var dob = new Date(companySelected.representativeContact?.user.dob)
                const payloadStripe: Stripe.AccountCreateParams = {
                    type: 'custom',
                    email: companySelected.email,
                    capabilities: {
                        card_payments: {
                            requested: true,
                        },
                        transfers: {
                            requested: true,
                        },
                    },
                    country: (companySelected.address.country.toUpperCase() === 'UK' ? 'GB' : companySelected.address.country) || (userAddress && (userAddress.country === 'UK' ? 'GB' : userAddress.country)),
                    business_type: (companySelected.business_type || 'individual') as Stripe.Account.BusinessType,
                    business_profile: {
                        // mcc: companySelected.mcc,
                        mcc: '5411',
                        url: companySelected.url,
                        product_description: 'Lorem ipsum'
                    },
                    individual: {
                        first_name: companySelected.representativeContact?.user.firstName,
                        last_name: companySelected.representativeContact?.user.lastName,
                        email: companySelected.representativeContact?.email || companySelected.representativeContact?.user.email,
                        phone: parsedPhoneNumber?.formatInternational(),
                        dob: {
                            day: dob.getDate(),
                            month: dob.getMonth() + 1,
                            year: dob.getFullYear()
                        },
                        address: {
                            line1: userAddress.address,
                            // line1: 'address_full_match',
                            // line2: 'address_full_match',
                            postal_code:  userAddress.postcode,
                            // postal_code: 'B19',
                            // city: company.address.city || 'Birmingham',
                            city: userAddress.city,
                            state: userAddress.city || userAddress.town,
                            // state: 'Birmingham',
                            country: (userAddress.country.toUpperCase() === 'UK' ? 'GB' : userAddress.country)
                        },
                        id_number: companySelected.representativeContact?.user.passportNumber,
                    },
                    tos_acceptance: {
                        ip: data.ipAddress,
                        date: data.date
                    },
                    company: {
                        name: companySelected.name,
                        address: {
                            line1: companySelected.address.address,
                            // line1: 'address_full_match',
                            postal_code: companySelected.address.postcode,
                            // postal_code: 'B19',
                            city: companySelected.address.city,
                            state: companySelected.address.city,
                            country: companySelected.address.country.toUpperCase() === 'UK' ? 'GB' : companySelected.address.country
                            // city: 'Birmingham',
                        },
                        phone: companySelected.billingPhone,
                        tax_id: companySelected.vatNum
                    },
                    // external_account: token.id
                    external_account: companySelected.stripeBankAccountId
                }
                if(userAddress.country.toUpperCase() === 'US'){
                    payloadStripe.individual.ssn_last_4 = companySelected.representativeContact?.user?.nationalSecurityNumber.slice(-4)
                }
                

                // console.log(payloadStripe)
                account = await this._stripe.accounts.create(payloadStripe)
                await prisma.company.update({
                    where: {
                      id: companySelected.id,
                    },
                    data: {
                      stripeAccountId: account.id,
                      tos_acceptance: {
                        ip: data.ipAddress,
                        date: data.date,
                        id: createObjectID().id,
                      },
                    },
                  })
            }

            return account;

        } catch(error){

            console.log("Stripe/CreateConnectAccount: ", error)

            if(error.statusCode === 400){

                throw new Error(error.message)
            }
        }
 
        
    }

    async updateConnectAccount(company: any | string, data: any) {
        try {
            if (typeof company === 'string') {
                company = await prisma.company.findUnique({
                    where: { id: company },
                    select: {
                      id: true,
                      name: true,
                      currency: true,
                      address: {
                        select: {
                          town: true,
                          country: true,
                          address: true,
                          postcode: true,
                        },
                      },
                      logoURL: true,
                      email: true,
                      url: true,
                      vatNum: true,
                      regNum: true,
                      info: true,
                      profiles: {
                        select: {
                          locale: true,
                          bio: true,
                          keywords: true,
                        },
                      },
                      category: true,
                      representativeContact: {
                        select: {
                          id: true,
                          email: true,
                          phone: true,
                          user: {
                            select: {
                              dob: true,
                              nationalSecurityNumber: true,
                              email: true,
                              firstName: true,
                              lastName: true,
                              phone: true,
                              address: {
                                select: {
                                  town: true,
                                  country: true,
                                  address: true,
                                  postcode: true,
                                },
                              },
                              country: true,
                            },
                          },
                        },
                      },
                      bankAccount: {
                        select: {
                          id: true,
                          stripeBankAccountId: true,
                          country: true,
                          currency: true,
                          account_holder_name: true,
                          account_holder_type: true,
                          routing_number: true,
                          account_number: true,
                          sort_bsb_number: true,
                        },
                      },
                      landline: true,
                      stripeAccountId: true,
                    },
                  })
            }

            const companySelected = company as any

            if (!companySelected) throw new Error('No valid company provided')

            let account = null;

            // if (companySelected.stripeAccountId) {
            //     console.log(`Found existing Stripe connect account ${companySelected.stripeAccountId} for company ${companySelected.id}`)
            //     try {
            //         account = await this._stripe.accounts.retrieve(companySelected.stripeAccountId)
            //     } catch (err) {
            //         console.log(`Could not retrieve Stripe connect account ${companySelected.stripeAccountId}. Creating new connect account instead`)
            //     }
            // }

            if (companySelected) {
                console.log(`Updating Stripe connect account for company ${companySelected.id}`)
                // console.log(company)

                const userAddress = companySelected.representativeContact && companySelected.representativeContact.user && companySelected.representativeContact.user.address

                var dob = new Date(companySelected.representativeContact.user.dob)
                var newInfo = {
                    email: companySelected.email,
                    capabilities: {
                        card_payments: {
                            requested: true,
                        },
                        transfers: {
                            requested: true,
                        },
                    },
                    business_type: (companySelected.business_type || 'individual') as Stripe.Account.BusinessType,
                    business_profile: {
                        // mcc: companySelected.mcc,
                        mcc: '5411',
                        url: companySelected.url,
                        product_description: 'Lorem ipsum'
                    },
                    individual: {
                        first_name: companySelected.representativeContact.user.firstName,
                        last_name: companySelected.representativeContact.user.lastName,
                        email: companySelected.representativeContact.email || companySelected.representativeContact.user.email,
                        phone: (companySelected.representativeContact.phone || companySelected.representativeContact.user.phone),
                        dob: {
                            day: dob.getDate(),
                            month: dob.getMonth() + 1,
                            year: dob.getFullYear()
                        },
                        id_number:companySelected.representativeContact.user.nationalSecurityNumber,
                        ssn_last_4: companySelected.representativeContact.user.nationalSecurityNumber.slice(-4),
                        address: {
                            line1: (userAddress && userAddress.address),
                            // line1: 'address_full_match',
                            // line2: 'address_full_match',
                            postal_code: (userAddress && userAddress.postcode),
                            // postal_code: 'B19',
                            // city: company.address.city || 'Birmingham',
                            city: (userAddress && (userAddress.city || userAddress.town)),
                            state: (userAddress && (userAddress.city || userAddress.town)),
                            // state: 'Birmingham',
                            country: (userAddress && (userAddress.country === 'UK' ? 'GB' : userAddress.country))
                        },
                    },
                    company: {
                        name: companySelected.name,
                        address: {
                            line1: companySelected.address.address,
                            // line1: 'address_full_match',
                            postal_code: companySelected.address.postcode,
                            // postal_code: 'B19',
                            city: companySelected.address.city,
                            state: companySelected.address.city,
                            country: companySelected.address.country,
                            // city: 'Birmingham',
                        },
                        phone: companySelected.billingPhone,
                        tax_id: companySelected.vatNum
                    },
                    // external_account: token.id
                    external_account: companySelected.stripeBankAccountId,
                    tos_acceptance: {
                        ip: data.ipAddress,
                        date: data.date
                    },
                }

                account = await this._stripe.accounts.update(companySelected.stripeAccountId, newInfo)
            }

            
            return account;                
        } catch (error) {
            console.log("Stripe/UpdateConnectAccount: ", error)
             
             if(error.statusCode === 400){
                throw new Error(error.message)
            }
        }
    }

    async deleteConnectAccount(company: any | string, stripeAccountId: string) {
        if (typeof company === 'string') {
            company = await prisma.company.findUnique({
                where: { id: company },
              })
        }

        if (!company) throw new Error('No valid company provided')

        if (company.stripeAccountId !== stripeAccountId) throw new Error('StripeAccountId not valid')

        const deletedAccount = await this._stripe.accounts.del(stripeAccountId);

        await prisma.company.update({
            where: {
              id: company.id,
            },
            data: {
              stripeAccountId: null,
            },
          })
      

        return deletedAccount
    }

    async setupConnectAccount(stripeAccountId: string) {
        return await this._stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: 'https://localhost:3000',
            return_url: 'https://localhost:3000',
            type: 'account_onboarding',
        })
    }

    async getCheckoutSession (stripeAccountId: string, amounts: number, tax: number, items: any, itemsId: any, slug?: string) {
        const session = await this._stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items,
            metadata: {
                ...itemsId.reduce((acc: any, curr: any, idx: any) => {
                    acc[`item_${idx}`] = curr;
                    return acc;
                }, {})
            },
            payment_intent_data: {
              application_fee_amount: Math.round(((amounts - tax) * 100) * 5 / 100),
              transfer_data: {
                destination: stripeAccountId,
              },
            },
            success_url: `https://${process.env.NODE_ENV == "production" ? "events": "events-dev"}.synkd.life/${slug}/cart?success=true`,
            cancel_url: `https://${process.env.NODE_ENV == "production" ? "events": "events-dev"}.synkd.life/${slug}/cart?cancel=true`,
            // success_url: `https://localhost:8080/${slug}/cart?success=true`,
            // cancel_url: `https://localhost:8080/${slug}/cart?cancel=true`,
        });
        return session;
    }

    async checkoutWithPaymentIntent(stripeAccountId: string, amounts: number, tax: number, items: any, itemsId: any, currency: any, customer: any, paymentMethodId?: any) {

        let customerStripeAccount = await this._stripe.accounts.retrieve(stripeAccountId)
    

        let { country, default_currency } = customerStripeAccount

        // if(country.toUpperCase() === "GB" && default_currency.toUpperCase() === "GBP"){

        //     paymentDetails['application_fee_amount'] =  Math.round((amounts - tax) * 5 / 100);
        //     paymentDetails['transfer_data'] =  {
        //         destination: stripeAccountId,
        //     }

        // }
        
        const paymentIntent = await this._stripe.paymentIntents.create({
            amount: amounts + tax,
            currency: currency,
            customer,
            payment_method: paymentMethodId,
            payment_method_types: ['card'],
            //payment_method_options: ['card']['request_three_d_secure']['challenge'],
            payment_method_options: {
                card: {
                  request_three_d_secure: "challenge"
                }
              },
            metadata: {
                type: 'event-cart',
                ...itemsId.reduce((acc: any, curr: any, idx: any) => {
                    acc[`item_${idx}`] = curr;
                    return acc;
                }, {})
            },
            
            //on_behalf_of: stripeAccountId
           
        });

        

        return paymentIntent;
    }

    async getDirectPayments(){

        // Calculate the start and end timestamps for the current month
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // Note: Months are 0-based, so add 1.
        const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59));

        const transfers = await this._stripe.paymentIntents.list({
            limit: 100,
            created: {
                gte: Math.floor(startOfMonth.getTime() / 1000), // Start of the current month
                lt: Math.floor(endOfMonth.getTime() / 1000), // End of the current month
            },
          });
        
          let groupedTransactions = {};

          transfers.data.map(tx => {

            if (tx.on_behalf_of) {

                let account = tx.on_behalf_of.toString()

              if (!groupedTransactions[account]) {

                groupedTransactions[account] = {
                  total_amount: 0,
                  total_service: 0,
                  transactions: [],
                };
                
              }
          
              const transaction = {
                id: tx.id,
                amount: tx.amount,
                account: tx.on_behalf_of,
                status: tx.status,
                currency: tx.currency,
                created: tx.created,
              };
          
              groupedTransactions[account].transactions.push(transaction);
              groupedTransactions[account].total_amount += tx.amount;
              groupedTransactions[account].total_service += (tx.amount * 5) / 100; // Assuming 5% service fee
            }
          }) 
          

        console.log("direct transcations: ", groupedTransactions)

    }

    async createSetupIntent(customerId?: string) : Promise<Stripe.SetupIntent> {
       return this._stripe.setupIntents.create({customer: customerId, payment_method_types:["card"]})
    }
    async createRefund(txnId: string){
        return this._stripe.refunds.create({
            payment_intent: txnId,
        })
    }
    async refund(cartId: string) {
        try {
            const cart: any = await prisma.platformEventCart.findUnique({
                where: { id: cartId },
                select: {
                  id: true,
                  event: {
                    select: {
                      id: true,
                    },
                  },
                  user: {
                    select: {
                      id: true,
                    },
                  },
                  pricing: {
                    select: {
                      price: true,
                      currency: true,
                    },
                  },
                  currentPrice: true,
                  currentCurrency: true,
                  quantity: true,
                  paymentIntentId: true,
                },
              });
        
            if (cart && cart.paymentIntentId) {
                const refund = await this._stripe.refunds.create({
                    amount: (cart.currentPrice || cart.pricing.price) * cart.quantity,
                    payment_intent: cart.paymentIntentId,
                    metadata: {
                        type: 'cart',
                        cartId,
                    },
                });

                return await prisma.platformEventCart.update({
                    where: {
                      id: cartId,
                    },
                    data: {
                      status: "REJECTED",
                    },
                  });
            }
        } catch (error) {
            console.log(error)
        }
    }

    async getPaymentMethod(methodId: string) {
        let card = await this._stripe.paymentMethods.retrieve(methodId)
        return card
    }

    async getBalanceTransaction(paymentIntentId: string){

        const paymentIntent = await this._stripe.paymentIntents.retrieve(paymentIntentId,
        {
            expand: ['latest_charge.balance_transaction'],
        }
        );

        //@ts-ignore

        const transaction = paymentIntent.latest_charge?.balance_transaction;

        return transaction
    }

    async getPaymentCardsForCustomer(customerId: string) {
        let cards = await this._stripe.paymentMethods.list({
            customer: customerId,
            type: 'card'
        })

        return cards
    }

    async deleteCardByPaymentMethod(stripePaymentMethodId: string) {
        let paymentMethod = await this._stripe.paymentMethods.detach(stripePaymentMethodId)

        return paymentMethod
    }

    async createPaymentIntent(amount, customer, currency, payment_method, description, otherStripeParams = {}) {

        let paymentIntent = await this._stripe.paymentIntents.create({
            amount,
            currency,
            description,
            payment_method,
            payment_method_options: {
                card: {
                  request_three_d_secure: "challenge"
                }
              },
            customer,
            ...otherStripeParams
        })

        return paymentIntent
    }

    async getProductInfoById(productId: string) {
        let product = await this._stripe.products.retrieve(productId)
        return product
    }

    /** Do not use unless Inspired admin */
    async createNewPrice(stripeParams: Stripe.PriceCreateParams) {
        let price = await this._stripe.prices.create(stripeParams)
        return price
    }

    async getPricingInfoById(priceId: string) {
        let price = await this._stripe.prices.retrieve(priceId)
        return price
    }

    async getSubscriptionById(subscId: string) {
        let subsc = await this._stripe.subscriptions.retrieve(subscId, {
            expand: ['plan.product']
        })
        return subsc
    }
    
    async getActive3monthsSubscriptionsByCoupon(couponId: string) {
    try {
        const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
        const threeMonthsAgo = now - (3 * 30 * 24 * 60 * 60); // Unix timestamp for 3 months ago

        // List all active subscriptions
        const subscriptions = await this._stripe.subscriptions.list({
            status: 'active',
            // No date filter here; we'll filter manually below
        });

        // Filter for those that have a discount and were created at least 3 months ago using the specified coupon
        const filteredSubscriptions = subscriptions.data.filter(subscription => {
            return (
                subscription.discount &&
                subscription.discount.coupon &&
                (subscription.discount.coupon.metadata._id === couponId || 
                 subscription.discount.coupon.metadata.id === couponId) && 
                 subscription.created >= threeMonthsAgo // Ensure the subscription was created within the last 3 months
                // subscription.created <= threeMonthsAgo // Ensure the subscription was created atleast the last 3 months
            );
        });

        return filteredSubscriptions; // Return the filtered subscriptions
    } catch (error) {
        console.log("Error getting active subscriptions for TAR:", error);
        return error || [];
    }
}

    async createSubscription(customer: string, items: string[], otherParams: any) {
        let subscription = await this._stripe.subscriptions.create({
            customer,
            items: items.map((priceId) => {
                return {price: priceId}
            }),
            //expand: ['latest_invoice'],
            expand: ['latest_invoice.payment_intent'],
            ...otherParams
        })

        return subscription
    }

    async cancelSubscription(subscId: string) {
        return await this._stripe.subscriptions.cancel(subscId)
    }

    async getCouponById(couponId: string) {
        let coupon = await this._stripe.coupons.retrieve(couponId)
        return coupon
    }
    // get coupon using the serviceId id (using this in getting topups data for now)
    async getCouponByServiceId(serviceId: string) {
        // Retrieve all invoices (or subscriptions) to find the one with the given serviceId
        const invoices = await this._stripe.invoices.list()

        // Find the invoice with the matching serviceId in metadata
        const matchingInvoice = invoices.data.find(invoice => invoice.metadata.serviceId === serviceId);

        if (matchingInvoice && matchingInvoice.discount) {
            const couponId = matchingInvoice.discount.coupon.id
        // Retrieve the coupon details
        let coupon = await this._stripe.coupons.retrieve(couponId)
        return coupon
    }
   }

    async createCoupon(data: any) {
        let coupon = await this._stripe.coupons.create({
            ...(data.unit === PromoValueUnit.FIXED ? { amount_off: data.value } : { percent_off: data.value }),
            duration: data.duration,
            currency: data.currency,
            name: data.name,
            metadata: data
        })
        return coupon
    }

    async getPromoByCode(code: string) {
        let promotionCodes = await this._stripe.promotionCodes.list({
            code
        });

        return promotionCodes;
    }
}