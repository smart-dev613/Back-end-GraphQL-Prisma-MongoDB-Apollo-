import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { createObjectID } from '../util/createIDs';
import { Generator } from '../util/generator';
import { addSubscriptionCredits } from '../src/billing/internal';


const addCredit = async (companyId: string) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
          });
          if (!company) throw new Error('Company does not exist');
      
          let internalProducts = await prisma.billingProduct.findMany({
            where: { name: 'Free' },
          });
       
         let internalProduct = internalProducts[0]

        if (!internalProduct) throw new Error('Internal product not found');

        let { id } = createObjectID();
        //  Create an invoice entry
        // Create an invoice entry
    await prisma.billingInvoice.create({
        data: {
          id,
          company: { connect: { id: company.id } },
          LineItems: {
            create: {
              lineID: Generator.generateString(32),
              description: 'Free',
              gross: 0,
              referenceId: internalProduct.id,
              net: 0,
              tax: 0,
              quantity: 1,
              service: 'PACKAGE',
            },
          },
          net: 0,
          gross: 0,
          issueDate: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          status: 'AUTHORISED',
          xeroID: Generator.generateString(32),
          paymentRefs: {},
          extra: {},
        },
      });

        await addSubscriptionCredits(company, internalProduct)

        // for (let serviceDetails of internalProduct.fulfilment.services) {
        //     console.log('service details', serviceDetails)
        //     let service = await prisma.marketingTopupService({ id: serviceDetails.id })
        //     if (!service) {
        //         console.log(`Could not find service ${serviceDetails.id} in our DB`)
        //         break
        //     }

        //     // Add credits for the service
        //     await addSubscriptionCredits(company, service.id, serviceDetails.quantity)
        // }
    } catch (error) {
        console.log(error)
    }
};

export const addCreditForFreeCompanies = async () => {
    try {
        const companies = await prisma.company.findMany();
        for (let comp of companies) {
            if (comp.subscriptions.length === 0) {
                addCredit(comp.id)
            }
        }
    } catch (error) {
        console.log(error)
    }
}
