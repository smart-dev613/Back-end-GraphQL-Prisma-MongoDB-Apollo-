import { prisma } from "../../src/generated/prisma-client";
import { CompanyUniqueValues } from "./seedCompany";
import { createObjectID } from "../createIDs";
import { Generator } from "../generator";

export const allCompanyServices = [
    "USER",
    "EMAIL",
    "SMS",
    "RESEARCH",
    "ADVERT",
    "CODE",
    "CANVAS",
    "NEWSLETTER",
    "CUSTOMERS"
  ];
  
  export const createInitialBillingEntries = async (company: CompanyUniqueValues) => {
    try {
      console.log(`Creating billing entry for ${company.name}, ${company._id}`);
      let internalProduct: any = await prisma.billingProducts({
          where: {
              name: 'Free'
          }
      })

      internalProduct = internalProduct.length && internalProduct[0]
      
      let { id, _id } = createObjectID();
      //  Create an invoice entry
      await prisma.createBillingInvoice({
        id,
        _id,
        company: { connect: { id: company.id } },
        _company: company._id,
        LineItems: {
          create: {
            lineID: Generator.generateString(32),
            description: "Free",
            referenceId: internalProduct._id,
            gross: 0,
            net: 0,
            tax: 0,
            quantity: 1,
            service: "PACKAGE"
          }
        },
        net: 0,
        gross: 0,
        issueDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        status: "AUTHORISED",
        xeroID: Generator.generateString(32),
        paymentRefs: {},
        extra: {}
      });
  
      // Create an entry for each service type
      allCompanyServices.forEach(async service => {
        console.log(`Creating ${service} service for ${company.name}`);
        const { id: ledgerID } = createObjectID();
        await prisma.createBillingLedger({
          id: ledgerID,
          _id: ledgerID,
          _company: company._id,
          company: { connect: { id: company.id } },
          _user: null,
          service,
          description: "Initial Sign Up",
          amount: 1,
          timestamp: new Date().toISOString(),
          campaign: null,
          invoiceID: Generator.generateString(32),
          type: "FREE",
          user: null
        });
      });
    } catch (e) {
      console.log(`Encountered error with ${company.name}`, e);
    }
  };