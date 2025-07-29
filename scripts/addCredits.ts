import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
import { createObjectID } from '../util/createIDs';
import { Generator } from '../util/generator';

// SYNKD - live
const COMPANY_ID = '622b68d0a072010007372129';
// Imagine SG - live
// const COMPANY_ID = '622cd949a072010007372c72'

const SERVICES_TO_ADD = {
  //CODE: 5,
  // DIGITAL_AD: 5000,
  // EMAIL: 50,
  // EVENT:50,
  LANDING_PAGES: 3,
  NEWSLETTER: 3,
  // MEDIA: 500,
  // RESEARCH:5,
  // SMS:50,
  // STRATEGY: 3,
  // USER: 5
  //    WEBSITE_TEMPLATE: 5
};

const init = async () => {
  const company = await prisma.company({ id: COMPANY_ID });
  if (!company) throw new Error('Company does not exist');

  for (let s of Object.keys(SERVICES_TO_ADD)) {
    console.log(`Adding ${SERVICES_TO_ADD[s]} of ${s} for ${company.name}`);
    const { id: ledgerID } = createObjectID();
    await prisma.createBillingLedger({
      id: ledgerID,
      _id: ledgerID,
      _company: company._id,
      company: { connect: { id: company.id } },
      _user: null,
      service: s,
      description: 'Gift Credits',
      amount: SERVICES_TO_ADD[s],
      // amount: 1,
      timestamp: new Date().toISOString(),
      campaign: null,
      invoiceID: Generator.generateString(32),
      type: 'FREE',
      user: null,
    });
  }
};

init().then(() => console.log('done'));
