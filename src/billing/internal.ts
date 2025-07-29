import { Generator } from '../../util/generator';
import { createObjectID } from '../../util/createIDs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { db } from "../helpers/mongoHelper"

/**
 * Adds a number of credits for a marketing service to a company
 * @param serviceId - ID of the service in our database
 * @param quantity - Quantity of the service to add
 */
export const addServiceCredits = async (
  company: any,
  serviceId: string,
  quantity: number
) => {
  // Lookup the service
  const service = await prisma.marketingTopupService.findUnique({
    where: { id: serviceId },
  });
  if (!service) throw new Error(`Service with ID ${serviceId} does not exist`);
  // Create the ledger entry
  const { id: ledgerID } = createObjectID();
  await prisma.billingLedger.create({
    data: {
      id: ledgerID,
      company: { connect: { id: company.id } },
      service: service.name,
      description: 'Top-up',
      amount: quantity,
      timestamp: new Date().toISOString(),
      campaign: null,
      invoiceID: Generator.generateString(32),
      type: 'TOPUP',
      // user: null
    },
  });


  console.log("service: ", service)
  let currentBalance;

  try {

    currentBalance = await prisma.balance.findMany({ where: { companyId: company.id, balanceType: "TOPUP"}})
   console.log("currentBalance: ", currentBalance[0])

   const currentServices: any = currentBalance[0].services
   console.log("currentServices: ", currentServices)

   const updatedServices = currentServices.filter(item => item.type === service.name).map(item => {
     item.balance = item.balance + quantity
     return item
  });
 

   console.log("updatedServices: ", updatedServices)
   
   const balancesCollection = db.collection("Balance")

   await balancesCollection.updateOne(
    {
      companyId: company.id,
      balanceType: "TOPUP",
      'services.type': service.name
    },
    {
      $set: {
        'services.$.balance': updatedServices[0].balance
      }
    }
  )
  } catch (error) {
    console.log("can't get balance: ", error.message)
  }
  return true;
};

export const addSubscriptionCredits = async (company: any,  subscriptionPackage: any) => {

  const subscriptionServices = subscriptionPackage.fulfilment.services

    // Lookup the service
    const services = await prisma.marketingTopupService.findMany({});
    // if (!service) throw new Error(`Service with ID ${serviceId} does not exist`)

   const balancesCollection = db.collection("Balance");

   const updatedServices = subscriptionServices.map(service => {
    const currentItem = services.find((item) => item?.id?.toString() === service?.id?.toString())
    return {
      type: currentItem?.name,
      balance: service.quantity
    }
   })
  const ledgerCollection = db.collection('billingLedgers');

  const createObjects = [];

  for (const service of updatedServices) {

    const { id: ledgerID } = createObjectID()

    createObjects.push({
      id: ledgerID,
      company: { id: company.id },
      service: service.type,
      description: 'Credits from active subscription',
      amount: service.balance,
      timestamp: new Date().toISOString(),
      campaign: null,
      invoiceID: Generator.generateString(32),
      type: 'MONTHLY',
      user: null,
    });

    //update service balance
    try {
      const response = await balancesCollection.updateOne(
        {
          companyId: company.id,
          balanceType: "SUBSCRIPTION",
          'services.type': service.type
        },
        {
          $set: {
            package: { id: subscriptionPackage.id },
            'services.$.balance': service.balance
          }
        }
      );
      console.log(response);
    } catch (error) {
      console.error(error);
    }

  }


  // Perform bulk insert
  await ledgerCollection.insertMany(createObjects);

  // Perform bulk update subscription service
  //console.log("updatedServices: ", updatedServices)
  // // Construct an update query using the $[] positional operator
  // const updateQuery = updatedServices.map(service => ({
  //   'services.$[elem].balance': service.balance,
  // }));
  // // Construct arrayFilters based on the 'type' field
  // const arrayFilters = updatedServices.map(service => ({ 'elem.type': service.type })); 

  // console.log("updateQuery: ", updateQuery)
  
  // Perform the update
 
  // await balancesCollection.updateOne(
  //   {
  //     companyId: company.id,
  //     balanceType: "SUBSCRIPTION",
  //   },
  //   {
  //     $set: Object.assign({}, ...updateQuery),
  //   },
  //   {
  //     arrayFilters: arrayFilters,
  //   }
  // );





    return true
}
