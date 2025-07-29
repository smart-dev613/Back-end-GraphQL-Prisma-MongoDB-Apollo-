import { prisma } from "../src/generated/prisma-client";
import { createObjectID } from "../util/createIDs";
import { ObjectId } from "mongodb";
import moment from "moment";
import Bottleneck from "bottleneck";


const limiter = new Bottleneck({
  maxConcurrent: 100,
  minTime: 100
});

export const migrateBalances = async () => {
   
        
        prisma.companies().then(async (companies: any) => {
            
            console.log("companies: ", companies.length)
            // const invoices: any = await prisma.billingInvoices({
            //     where: {
            //     company: { id_in:  companies.map( company => 
            //         {
            //             return company?.id || company?._id 
            //         } )},

            //         LineItems_some: {
            //         service: 'PACKAGE'
            //         }
            //     }
            // }).$fragment(
            //     `{
            //     paymentRefs {
            //         stripe
            //     }
            //     tax
            //     _company
            //     company {
            //         _id
            //         id
            //         name
            //     }
            //     _id
            //     gross
            //     LineItems
            //         {
            //         quantity
            //         tax
            //         description
            //         gross
            //         service
            //         net
            //         lineID
            //         referenceId
            //         }
            //     net
            //     id
            //     xeroID
            //     status
            //     dueDate
            //     currency
            //     extra {
            //       topupService
            //       topupAmount
            //     }
            //     issueDate
            //     }
            //     `
            // )

            
        
          
        

            // console.log("Invoices: ", invoices.length)
          
                
            // const allServices = await prisma.marketingTopupServices()
            // const allProducts = await prisma.billingProducts()

            // const companyInvoices = invoices.reduce((acc, invoice) => {
            //     const companyId = invoice.company.id;
            //     const detailProduct = invoice.LineItems[0].referenceId ? allProducts.find((item: any) => item._id === invoice.LineItems[0].referenceId) : allProducts.find((item: any) => item.name === 'Free');
      
            //     console.log(detailProduct?.name)

            //     if (detailProduct) {
            //         invoice.product_detail = detailProduct
            //         invoice.service_detail = detailProduct?.fulfilment.services.map((item: any) => {
            //         const service = allServices.find((ser: any) => ser._id === item.id || ser.id === item.id)
            //         return {
            //             ...item,
            //             ...service
            //         }
            //         })
            //     }
                
            //     // If the company ID doesn't exist in the accumulator, create an array for it
            //     if (!acc[companyId]) {
            //         acc[companyId] = [];
            //     }

                
            //     // Add the current object to the array associated with the company ID
            //     acc[companyId].push(invoice);
                
            //     return acc;
            // }, {});

            for(const company of companies){
                console.log(company.name)
                // const invoices = companyInvoices[company.id]
                // const balances = await getBalances(invoices, company, allServices)

                const topupPackages =  {
                    EMAIL: 500,
                    SMS: 10,
                    RESEARCH: 10,
                    CODE: 100,
                    WEBSITE_TEMPLATE: 10,
                    LANDING_PAGES: 10,
                    NEWSLETTER: 10,
                    DIGITAL_AD: 10,
                    STRATEGY: 10,
                    MEDIA: 10
                  }

                  const subcriptionPackages =  {
                    USER: 1,
                    EMAIL: 500,
                    SMS: 0,
                    RESEARCH: 1,
                    CODE: 100,
                    WEBSITE_TEMPLATE: 0,
                    LANDING_PAGES: 1,
                    NEWSLETTER: 1,
                    DIGITAL_AD: 1,
                    STRATEGY: 1
                  }

                // const topupBalanceData = balances.topupBalance;
                // const subscriptionBalanceData = balances.subscriptionBalance;
              
                const id = new ObjectId()
                // get the topups services dynamically
                const topupServices = Object.keys(topupPackages).map((service) => ({
                  type: service,
                  balance: topupPackages[service],
                 
                }));
              
                // get the subscription services dynamically
                const subscriptionServices = Object.keys(subcriptionPackages).map((service) => ({
                  // id: new ObjectId(),
                  type: service,
                  balance: subcriptionPackages[service],
                }));

                
                try{
                    const companyBalance = await prisma.balances({ where: { companyId: company.id, company_Id: company._id}})
                    console.log(company.name, companyBalance?.length)
                if(!companyBalance?.length){

                    console.log("updating...")
                      
                    try { 

                        await prisma.createBalance({
                         companyId: company.id,
                        //  company_Id: company._id,
                         balanceType: "TOPUP",
                         services: {
                           create: topupServices,
                         },
                       });
                       console.log("topup", topupServices)

                     } catch(error) {
                     
                       console.error("Error adding topup balances:", error);
                     }
     
                       try {
     
                             await prisma.createBalance({
                                 companyId: company.id,
                                //  company_Id: company._id,
                                 balanceType: "SUBSCRIPTION",
                                 services: {
                                     create: subscriptionServices.length ? subscriptionServices : topupServices ,
                                 },
                             });
                              console.log("subs",subscriptionServices )
     
                         } catch(error) {
                          console.error("Error adding subs balancs:", error);
                        } 

                }
                } catch(error) {
                   console.log("error fetching company balance: ", error)
                }
                

                
                

               
            }
               
           
        
        

        }).catch((error) => console.log(error))
   
    
  }

  export const getBalances = async (lastInvoice: any, company:any, allServices: any) => {

    // const lastInvoice: any = await prisma.billingInvoices({
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
    
    if (lastInvoice.length > 0) {

      let prevInvoiceDate = moment().add(1, 'months');

      for (let idx = 0; idx < lastInvoice.length; idx++) {

        let currentDate = moment(new Date(lastInvoice[idx].issueDate))

        let nextDate = moment(new Date(lastInvoice[idx].issueDate)).add(1, 'months')

        if (prevInvoiceDate.diff(currentDate, 'days') < nextDate.diff(currentDate, 'days')) {
          nextDate = prevInvoiceDate;
        }

        prevInvoiceDate = currentDate
  
        const ledgersNew = await prisma.billingLedgers({
          where: {
            company: {
              id: company.id
            },
            type_in: [
              'USAGE',
            ],
            timestamp_gte: currentDate.toDate(),
            timestamp_lt: nextDate.toDate(),
          }
        })
  
        const ledgersOld = await prisma.billingLedgers({
          where: {
            _company: company._id,
            type_in: [
              'USAGE',
            ],
            timestamp_gte: currentDate.toDate(),
            timestamp_lt: nextDate.toDate(),
          }
        })
  
        const ledgers = [...ledgersNew]
        ledgersOld.forEach((oldLed: any) => {
          if (!(ledgers.find((le) => le._id === oldLed._id))) {
            ledgers.push(oldLed)
          }
        })
  
        allIdsFound.push(...ledgers.map(item => item._id));
        
        let reducerTotal = ledgers.reduce((acc: any, curr: any) => {
          if (!(curr.service in acc)) {
            acc[curr.service] = {
              topup: 0,
              subscription: 0,
              usage: 0,
            }
          }
          if (curr.type === 'USAGE') {
            acc[curr.service].usage += curr.amount
          }
  
          return acc;
        }, {})
  
        lastInvoice[idx]?.service_detail?.forEach((curr: any) => {
          if (!(curr.name in reducerTotal)) {
            reducerTotal[curr.name] = {
              topup: 0,
              subscription: 0,
              usage: 0,
            }
          }
          reducerTotal[curr.name].subscription += curr.quantity
        });
  
        if (moment().isBetween(currentDate, nextDate, undefined, '[)')) {
          for (const key in reducerTotal) {
            if (!(key in topupBalance)) {
              topupBalance[key] = 0
            }
            let subBal = reducerTotal[key].subscription + reducerTotal[key].usage
            let topBal = (subBal < 0 ? subBal : 0)
            subscriptionBalance[key] = subBal < 0 ? 0 : subBal
            topupBalance[key] += topBal
          }
        } else {
          for (const key in reducerTotal) {
            if (!(key in topupBalance)) {
              topupBalance[key] = 0
            }
            let subBal = reducerTotal[key].subscription + reducerTotal[key].usage
            let topBal = (subBal < 0 ? subBal : 0)
            topupBalance[key] += topBal
          }
        }
      }
    }
  
    allServices.forEach(({ name }) => {
      topupBalance[name] = topupBalance[name] || 0
    })
  
    const leftBalance = await prisma.billingLedgers({
      where: {
        company: {
          id: company.id
        },
        type_in: [
          'TOPUP',
          'FREE'
        ],
        _id_not_in: allIdsFound
      }
    })
  
    const reduceLeftTotal = leftBalance.reduce((acc: any, curr: any) => {
      if (!(curr.service in acc)) {
        acc[curr.service] = 0
      }
      acc[curr.service] += curr.amount
      return acc
    }, {})
  
    for (const key in reduceLeftTotal) {
      if (!(key in topupBalance)) {
        topupBalance[key] = 0
      }
      topupBalance[key] += reduceLeftTotal[key]
    }
    
    return {
      topupBalance,
      subscriptionBalance,
    }
  }

  migrateBalances();
  