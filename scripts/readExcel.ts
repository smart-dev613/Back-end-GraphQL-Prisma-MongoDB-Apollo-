import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
import { Generator } from '../util/generator';
import Bottleneck from 'bottleneck';
import { createObjectID } from '../util/createIDs';
import { createInitialBillingEntries } from './createBillings';

interface CompanyDetails {
  id: string;
  _id: Int;
}

export enum UserGroupNameEnum {
  SUPER_ADMIN = 'Super Admins',
  MASTER_ADMIN = 'Master Admins',
  ADMIN = 'Admins',
  USER = 'Users',
  DEFAULT = 'Default',
}

interface CompanyGroupDetails {
  name: UserGroupNameEnum;
}

export interface CompanyUniqueValuesMust {
  id: string;
  _id: Int;
  name: string;
}

export const createUserGroup = async (
  companyDetails: CompanyDetails,
  groupDetails: CompanyGroupDetails
) => {
  const { name } = groupDetails;

  return await prisma.createUserGroup({
    id: createObjectID().id,
    name,
    _company: companyDetails._id,
    company: {
      connect: {
        id: companyDetails.id,
      },
    },
  });
};

const trimSafe = (text: any) => {
  if (text && typeof text == 'string') {
    return text.trim();
  }

  return null;
};

export const createAllUserGroups = async (
  companyInfo: CompanyUniqueValuesMust
) => {
  const userGroups = [];

  if (userGroups.length < 4) {
    //TODO only Create missing user groups
    // Right now creates all user groups
    for (let value of Object.values(UserGroupNameEnum)) {
      const companyUserGroup = await createUserGroup(
        { id: companyInfo.id, _id: companyInfo._id },
        { name: value }
      );
      userGroups.push(companyUserGroup);
    }
  }
  return userGroups;
};

export const limiter = new Bottleneck({
  maxConcurrent: 400,
  minTime: 50,
});

const readNames = [];

interface ExcelData {
  PublisherGroup?: string;
  Broker?: string;
  Publisher?: string;
  Country?: string;
  Zone?: string;
  Vertical?: string;
  PricingModel?: string;
  AverageVolume?: number;
  AverageDailyUniqueReach?: number;
  AverageDailyFrequency?: number;
  Format?: string;
  FormatSize?: string;
  Device?: string;
  Placement?: string;
  Currency?: string;
  PublisherRate: number;
  PublisherFee: number;
  ClientRate: number;
}

interface CompanyUniqueValues {
  id?: string;
  _id?: Int;
  name?: string;
}

export type Int = number;
export type Float = number;
export type String = string;

export interface CreateMediaRatesInput {
  publisherID: string;
  _publisher: Int;
  country?: String;
  zone?: String;
  vertical?: String;
  pricingModel?: String;
  averageVolume?: Int;
  averageDailyUniqueReach?: Int;
  averageDailyFrequency?: Int;
  format?: String;
  formatSize?: String;
  device?: String;
  placement?: String;
  currency?: String;
  publisherRate?: Float;
  publisherFee?: Float;
  clientRate?: Float;
}

export interface CreateOrUpdateCompanyInput {
  isChild?: boolean;
  name?: string;
  parentName?: string;
  currency?: string;
  overrideID?: Int;
  overrideType?: Int;
  canDoRotationalTags?: boolean;
  canDoScriptTracking?: boolean;
}

interface CompanyBrand {
  advertiserID: Int;
  name?: string;
}

interface CreateBrandForCompany {
  companyDetails: CompanyUniqueValues;
  brandDetails: CompanyBrand;
}

interface CompanyAdvertiser {
  name: string;
}

interface CreateAdvertiserForCompany {
  advertiserDetails?: CompanyAdvertiser;
  companyDetails: CompanyUniqueValues;
}

export const createOrUpdateCompany = async ({
  name,
  isChild = true,
  parentName,
  currency,
  overrideID,
  overrideType,
  canDoScriptTracking,
  canDoRotationalTags,
}: CreateOrUpdateCompanyInput) => {
  // Returns null if no name is provided - useful in case where there is no parent company
  if (!name) {
    return null;
  }

  const { _id: IntID, id } = createObjectID();

  const _id = overrideID ? overrideID : IntID;
  const type = overrideType ? overrideType : isChild ? 5 : 5;

  // If a company has parent
  const parent = parentName
    ? { childOf: { connect: { name: parentName } } }
    : {};

  if (readNames.includes(name)) {
    return await prisma.company({ name });
  }

  const company = await prisma.upsertCompany({
    create: {
      _id,
      id,
      currency,
      name,
      publisherKey: Generator.generateString(32),
      type, // Publisher
      ...parent,
      uniqueKey: Generator.generateString(32),
      canDoRotationalTags,
      canDoScriptTracking,
    },
    where: {
      name,
    },
    update: {},
  });

  const companyUnique = {
    id: company.id,
    _id: company._id,
    name: company.name,
  };

  await createInitialBillingEntries(companyUnique);

  const advertiser = await createAdvertiserIfNone({
    companyDetails: { ...companyUnique },
  });
  await createBrandIfNone({
    companyDetails: { ...companyUnique },
    brandDetails: { advertiserID: advertiser._id },
  });

  await createAllUserGroups(companyUnique);

  return companyUnique;
};

export const createBrandIfNone = async (data: CreateBrandForCompany) => {
  const name =
    data.brandDetails && data.brandDetails.name
      ? data.brandDetails.name
      : data.companyDetails.name;
  const { _id: companyIntID, id: companyID } = data.companyDetails;
  const { _id, id } = createObjectID();
  // Check if brand exists for this company
  // const existingBrands = await prisma.brands({
  //   where: { _advertiser: companyIntID },
  // });

  // ! Overrirde existing brands
  const existingBrands = [];

  // No brand exists, create one
  if (existingBrands.length < 1) {
    return await prisma.createBrand({
      id,
      _id,
      _advertiser: data.brandDetails.advertiserID,
      _client: companyIntID,
      advertiser: { connect: { id: companyID } },
      client: { connect: { id: companyID } },
      name,
    });
  }

  // Return null if no brand needs to be created
  return null;
};

// Creates advertiser for the company
export const createAdvertiserIfNone = async (
  data: CreateAdvertiserForCompany
) => {
  const name =
    data.advertiserDetails && data.advertiserDetails.name
      ? data.advertiserDetails.name
      : data.companyDetails.name;
  const { _id: companyIntID, id: companyID } = data.companyDetails;
  const { _id, id } = createObjectID();
  // const existingAdvertisers = await prisma.advertisers({
  //   where: { _company: companyIntID },
  // });
  // ! Overrirde existing advertisers
  const existingAdvertisers = [];

  // No brand exists, create one
  if (existingAdvertisers.length < 1) {
    return await prisma.createAdvertiser({
      _id,
      id,
      _company: companyIntID,
      company: { connect: { id: companyID } },
      name,
    });
  }
  return existingAdvertisers[0];
};

// const createMediaRates = async (media: CreateMediaRatesInput) => {
//   const { publisherID, ...restOfMedia } = media;
//   const { id, _id } = createObjectID();
//   await prisma.createMediaRates({
//     publisher: {
//       connect: {
//         id: media.publisherID,
//       },
//     },
//     id,
//     _id,
//     ...restOfMedia,
//   });
// };

// Helper to run create or update on both parent and child
// const sequentialCreateMedia = async (excelCompanyData: ExcelData) => {
//   try {
//     const stringify = (something?: any) => {
//       if (something) {
//         return something.toString();
//       }
//       return null;
//     };

//     const {
//       ClientRate,
//       PublisherFee = 0,
//       PublisherRate = 0,
//       AverageVolume,
//       AverageDailyFrequency,
//       AverageDailyUniqueReach,
//       Publisher,
//       PublisherGroup,
//       Broker,
//       Country,
//       Currency,
//       Device,
//       Format,
//       Placement,
//       FormatSize,
//       PricingModel,
//       Vertical,
//       Zone,
//     } = excelCompanyData;

//     const companyUnique = await prisma.company({name: trimSafe(Publisher)})

//     const roundToTwo = (numberToRound: number) => {
//       return Math.round(numberToRound * 100) / 100;
//     };
//     await createMediaRates({
//       _publisher: companyUnique._id,
//       publisherID: companyUnique.id,
//       averageVolume: AverageVolume,
//       averageDailyFrequency: AverageDailyFrequency,
//       averageDailyUniqueReach: AverageDailyUniqueReach,
//       country: Country,
//       currency: Currency,
//       device: Device,
//       format: Format,
//       formatSize: FormatSize,
//       placement: Placement,
//       pricingModel: PricingModel,
//       publisherFee: roundToTwo(PublisherFee),
//       publisherRate: roundToTwo(PublisherRate),
//       clientRate: roundToTwo(ClientRate),
//       vertical: Vertical,
//       zone: Zone,
//     });

//   } catch (e) {
//     console.log(e);
//   }
// };

export const readAndCreateMedia = async () => {
  // const xbook = xlsx.readFile("./upload/pub-may2.xlsx");
  // const xsheets = xbook.SheetNames;
  // const allCompanies = xlsx.utils.sheet_to_json(xbook.Sheets[xsheets[0]], {
  //   defval: null,
  // }) as [ExcelData];
  // allCompanies.forEach(async (company) => {
  //   await limiter.schedule(() => sequentialCreateMedia(company));
  // });
};

interface company {
  [name: string]: CompanyUniqueValues;
}

const companies: company = {};

export const readAndCreateCompanies = async () => {
  const xbook = xlsx.readFile('./upload/pub-may2.xlsx');
  const xsheets = xbook.SheetNames;
  const allCompanies = xlsx.utils.sheet_to_json(xbook.Sheets[xsheets[0]], {
    defval: null,
  }) as [ExcelData];

  for (let company of allCompanies) {
    if (companies[company.PublisherGroup]) {
      // skip
    } else {
      companies[company.PublisherGroup] = {};
      companies[company.PublisherGroup] = await createOrUpdateCompany({
        name: trimSafe(company.PublisherGroup),
        isChild: false,
        currency: company.Currency,
      });
    }

    if (!companies[company.Publisher]) {
      companies[company.Publisher] = {};
      await limiter
        .schedule(() =>
          createOrUpdateCompany({
            name: trimSafe(company.Publisher),
            parentName: trimSafe(company.PublisherGroup),
            currency: company.Currency,
          })
        )
        .then((val) => (companies[company.Publisher] = val));
    }
  }
};
