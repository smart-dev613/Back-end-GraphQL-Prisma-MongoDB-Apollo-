import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
import xlsx from 'xlsx';
import { createObjectID } from '../util/createIDs';

const genServicePricingArrayObject = (s: any, currency: string) => {
  if (!s[currency]) return null; // if no pricing, return null
  return {
    id: createObjectID().id,
    currency: currency.trim(), // trim whitespace
    amount: s['Quantity'],
    price: s[currency] * 100, // convert to cents
  };
};

const genServicePricingArray = (s: any) => {
  // Filter and Get the currency codes dynamically from the keys of the service object in the excel sheet
  const currencyCodes = Object.keys(s).filter(key => 
    key !== 'Service' && key !== 'Quantity' && key !== 'User friendly name'
  );

  // Generate pricing objects for each currency code
  let arrToReturn = currencyCodes.map(currency => genServicePricingArrayObject(s, currency));

  // Filter out null objects
  arrToReturn = arrToReturn.filter(el => el != null);

  return arrToReturn;
};

export const runScript = async () => {
  const xbook = xlsx.readFile('./scripts/upload/billingservices_2025.xlsx');
  const xsheets = xbook.SheetNames;
  const serviceJson = xlsx.utils.sheet_to_json(xbook.Sheets[xsheets[0]], {
    defval: null,
  });

  let services: Record<string, any> = {};

  serviceJson.forEach((s) => {
    const pricingArray = genServicePricingArray(s); // Get pricing for the current service

    if (services.hasOwnProperty(s['Service'])) {
      // Ensure 'pricing' is initialized as an array if not already
      if (!services[s['Service']]['pricing']) {
        services[s['Service']]['pricing'] = [];
      }
      services[s['Service']]['pricing'] = [
        ...services[s['Service']]['pricing'],
        ...pricingArray,
      ];
    } else {
      services[s['Service']] = {
        name: s['Service'],
        userFriendlyName: s['User friendly name'],
        description: 'changeme',
        pricing: pricingArray,
      };
    }
  });

  for (let serv in services) {
    let currentObject = services[serv];
    await prisma.MarketingTopupService.create({
      data: { 
        id: createObjectID().id,
        ...currentObject
      }
    });
    console.log(
      `Added MarketingTopupService ${currentObject['name']} to the database`
    );
  }
};

runScript().then(() => console.log("Done creating billingServices"))