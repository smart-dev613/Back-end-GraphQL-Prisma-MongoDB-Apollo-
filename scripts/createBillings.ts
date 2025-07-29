import { CompanyUniqueValues } from '../util/interfaces/company';
import { createObjectID } from '../util/createIDs';
import { Generator } from '../util/generator';
import Bottleneck from 'bottleneck';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const limiter = new Bottleneck({
  maxConcurrent: 100,
  minTime: 100,
});

export const allCompanyServices = [
  'USER',
  'EMAIL',
  'SMS',
  'RESEARCH',
  'ADVERT',
  'CODE',
  'CANVAS',
  'EVENT',
  'NEWSLETTER',
  'CUSTOMERS',
  'STRATEGY',
];

export const createInitialBillingEntries = async (
  company: CompanyUniqueValues,
  skipAddTopup = false
) => {
  try {
    console.log(`Creating billing entry for ${company.name}, ${company.id}`);

    const internalProduct = await prisma.billingProduct.findFirst({
      where: {
        name: 'Free',
      },
    });

    if (!internalProduct) {
      throw new Error('Internal product "Free" not found');
    }

    const invoiceId = createObjectID().id;

    // Create an invoice entry
    await prisma.billingInvoice.create({
      data: {
        id: invoiceId,
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

    if (!skipAddTopup) {
      // Create an entry for each service type
      for (const service of allCompanyServices) {
        console.log(`Creating ${service} service for ${company.name}`);
        const { id: ledgerID } = createObjectID();

        // Set initial amounts based on service type
        let amount = 3;
        switch (service) {
          case 'EMAIL':
          case 'SCAN':
            amount = 500;
            break;
          case 'EVENT':
            amount = 20;
            break;
        }

        await prisma.billingLedger.create({
          data: {
            id: ledgerID,
            company: { connect: { id: company.id } },
            service,
            description: 'Initial Sign Up',
            amount: amount,
            timestamp: new Date().toISOString(),
            campaign: null,
            invoiceID: Generator.generateString(32),
            type: 'FREE',
            // user: null,
          },
        });
      }
    }
  } catch (e) {
    console.log(`Encountered error with ${company.name}`, e);
  }
};

const createBillingEntriesForCompanies = async () => {
  const companies = await prisma.company.findMany();

  await Promise.all(
    companies.map((company) =>
      limiter.schedule(() => createInitialBillingEntries(company))
    )
  );
};

// createBillingEntriesForCompanies().then(() => console.log("done"));
