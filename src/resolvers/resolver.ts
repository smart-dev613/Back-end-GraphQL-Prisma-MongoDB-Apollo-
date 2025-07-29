// 5400

import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  InputType,
  Field,
} from "type-graphql";
import { generateQrCode, json } from "../helpers";
import {
  checkIfUserIsInCompany,
  hasPermission,
} from "../helpers/permissionsHelper";
import {
  SignupInput,
  LoginInput,
  UserVerification,
  VerificationType,
  UpdateUserEmailInput,
  UpdateUserPhoneInput,
} from "../inputs/auth";
import {
  CalendarInvitationListInput,
  CalendarStatus,
  CheckUserInput,
  CreateCalendarInvitationInput,
  EditCalendarInvitationInput,
  GetEmployeesEventInput,
  RemoveCalendarInvitationInput,
  UpdateChildProfileInput,
  UpdateMembershipRole,
  updateUserWalkthroughInput,
  SwitchCompanyInput,
} from "../inputs/company";

import { ObjectId } from "mongodb";
import { Context } from "../auth/context.interface";
import { encodeUser } from "../auth/tokeniser";
import { Generator } from "../../util/generator";
import { stripe } from "../billing/stripe";
import _ from "lodash";
import moment from "moment";
import {
  CreateCompanyInput,
  UpdateCompanyInput,
  AddEmployeeInput,
  UpdateEmployeeInput,
  GetEmployeesInput,
  GetAllCustomersInput,
  CompanyUniqueInput,
  GetEmployeeInput,
  // UpdateUserInput,
  UpdateUserProfileInput,
  GetS3POSTUploadTokenInput,
  UpdatePasswordInput,
  CreateCompanyRelationshipInput,
  ConfirmCompanyRelationshipInput,
  AddUserToCompanyRelationshipInput,
  ArchiveEmployeeInput,
  UpdateCompanyAccessToMarketingInput,
} from "../inputs/company";
import { AuthenticationError } from "apollo-server";
import bcrypt from "bcryptjs";
import { User } from "../auth/user.interface";
import { createObjectID } from "../../util/createIDs";
import { generateLegacySessionToken } from "../../util/session";
import { setCookies, createCookieOptions } from "../../util/cookies";
import { createAllUserGroups } from "../../util/legacySeed/seedUserGroup";
import { createInitialBillingEntries } from "../../scripts/createBillings";
import { CompanyUniqueValues } from "../../util/interfaces/company";
import { UserGroupNameEnum } from "../../util/interfaces/user";
import {
  createEmailChallenge,
  createInvite,
  verifyUserEmail,
  sendEmail,
  sendWelcomeEmail,
  passwordUpdateSuccess,
} from "../emailHelper";
import { createPhoneChallenge, verifyUserPhone, sendSMS } from "../smsHelper";
import { S3UploadParams, getS3UploadURL } from "../ossHelper";
import { createOrGetCrmUser } from "./clusterResolver";
import { PERMISSION_ACCESS_TYPES } from "../constants/perms";
import { PromoValueUnit } from "../inputs/billing";
import {
  parsePhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import { getIPInfo } from "../external/ipinfo";
import {
  AddUserToFamilyRelationshipInput,
  CreateFamilyRelationshipInput,
  FamilyRelationshipByUsersInput,
  GetUsersInput,
  relationshipTypeUpdateInput,
} from "../inputs/familyRelation";
import { NotificationStatus } from "../inputs/event";
import { CompanyMembership, PrismaClient, UserGender } from "@prisma/client";
import { S3LocationFilterSensitiveLog } from "@aws-sdk/client-s3";
const prisma = new PrismaClient();

interface StandardResponse {
  success: boolean;
  message: string;
  errors?: any;
}

interface LegacyUserGroup {
  id: string;
}

interface LegacyCompany {
  id: number;
  Name: string;
  userGroups: LegacyUserGroup[];
}

enum POSTUploadTokenType {
  AVATAR,
  SECONDARY_PROFILE_PIC,
  COMPANY_AVATAR,
  EVENT_LOGO,
  EMPLOYEE_AVATAR,
  COMMUNITY_IMAGE,
  COMMUNITY_VIDEO,
  MARKETPLACE_PREVIEW,
  COMPANY_AVATAR_ADMIN,
  CREATIVE_ASSET,
}

const isUserProfileLocked = async (userID: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userID },
    select: { userProfileLockedUntil: true },
  });

  if (!user || !user.userProfileLockedUntil) {
    return false;
  }

  const lockUntilDate = user.userProfileLockedUntil;
  const isLocked = new Date(lockUntilDate) > new Date();

  return isLocked;
};

/**
 * Creates a unique company name that is not present in the db
 */
const createUniqueCompanyName = async (name: string) => {
  let start = 0;
  let uniqueName;
  // generate the new name based on the current value of start
  const generateName = (index) => (index === 0 ? name : `${name} ${index}`);
  // Keep checking if a company with the generated name exists
  do {
    uniqueName = generateName(start); // Generate the name
    start++; // Increment for the next iteration
  } while (await prisma.company.findUnique({ where: { name: uniqueName } }));

  return uniqueName; // Return the unique name
};

const checkIfUserAccountExists = async (email: string, phone: string) => {
  // Try and get user account via their email address
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      phone: true,
      email: true,
      firstName: true,
      isChild: true,
    },
  });

  if (user) {
    // Success! Account exists with the email address
    return user;
  }

  // Check if the phone number is valid
  if (!phone || phone === "+") return null;

  // Try and get user account via their phone number
  const userByPhone = await prisma.user.findMany({
    where: { phone },
    select: {
      id: true,
      phone: true,
      email: true,
      firstName: true,
      isChild: true,
    },
  });

  if (userByPhone.length > 0) {
    return userByPhone[0];
  }

  // No user found, return null
  return null;
};

/**
 * Returns an array of companies that match conditions, or null if none did
 * @param email - Email to use for lookup
 * @param phone - Phone to use for lookup
 */
const checkIfCompanyExists = async (email: string, phone: string) => {
  let companies = null;

  console.log(`[checkIfCompanyExists] email: ${email} phone: ${phone}`);

  // Find companies by email
  const companiesByEmail = await prisma.company.findMany({
    where: {
      email: email.toLowerCase(),
    },
  });

  console.log("[checkIfCompanyExists] companiesByEmail", companiesByEmail);

  // Find company memberships by email
  const companyMembershipsByEmail = await prisma.companyMembership.findMany({
    where: {
      email: email.toLowerCase(),
    },
  });

  console.log(
    "[checkIfCompanyExists] companyMembershipsByEmail",
    companyMembershipsByEmail
  );

  // Find company memberships by phone
  const companyMembershipsByPhone = await prisma.companyMembership.findMany({
    where: {
      phone,
    },
  });

  console.log(
    "[checkIfCompanyExists] companyMembershipsByPhone",
    companyMembershipsByPhone
  );

  // Check if companies exist by email
  if (companiesByEmail?.length > 0) {
    companies = companiesByEmail[0];
  }
  // Check if any memberships exist by email
  else if (companyMembershipsByEmail?.length > 0) {
    companies = await prisma.company.findMany({
      where: {
        members: {
          some: {
            id: companyMembershipsByEmail[0]?.id,
          },
        },
      },
    });
  }
  // Check if any memberships exist by phone
  else if (companyMembershipsByPhone.length > 0) {
    companies = await prisma.company.findMany({
      where: {
        members: {
          some: {
            id: companyMembershipsByPhone[0]?.id,
          },
        },
      },
    });
  }

  console.log("[checkIfCompanyExists] returning:");

  return companies || null; // Return null if no companies found
};

const createChallenges = async (user: User, sendInvite: boolean = false) => {
  if (!sendInvite) {
    if (user.email) {
      await createEmailChallenge(user);
    }
    if (user.phone) {
      await createPhoneChallenge(user);
    }
  } else {
    await createInvite(user);
  }
};

export async function adminSignup(data: SignupInput) {
  if (data.email) data.email = data.email.toLowerCase();

  // Check if a user with this mobile already exists
  if (!(await checkIfUserAccountExists(data.email, data.phone))) {
    let sendInvite = false;
    if (!data.isChild || !data.password || !data.phone) {
      sendInvite = true;
    }

    const password = bcrypt.hashSync(
      data.password ? data.password : "Inspired100@",
      12
    );
    const isChild = !!data.isChild;
    data.password = password;
    data.isChild = isChild;

    console.log(
      `[adminSignup] creating new User with email ${data.email} and phone ${data.phone}`
    );
    const companyID = createObjectID().id;
    console.log(data, "data in admin signup");
    // Create a new user
    const user = await prisma.user.create({
      data: {
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.isChild ? null : data.phone,
        phoneVerified: data.isChild ? true : false,
        email: data.email,
        isChild: data.isChild,
        id: createObjectID().id,
        dob: data.dob ? data.dob : null,
        gender: data.gender,
        companyId: companyID, //for some reason prisma doesn't link this because company isn't generated (see createlegacycompany below)
      },
    });

    const {
      overrideType,
      overrideCompanyID: overrideID,
      canDoRotationalTags,
    } = data;

    const company = await createLegacyCompany({
      user: { id: user.id },
      company: {
        name: data.companyName
          ? data.companyName
          : await createUniqueCompanyName(`${user.firstName} Company`),
        overrideType,
        overrideID,
        canDoRotationalTags,
        companyId: companyID,
        email: data.email,
        relationshipCreatorCurrency: data.isChild
          ? data.relationshipCreatorCurrency
          : null,
      },
    });
    // link user to personal company after being created
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        companyId: company.id,
      },
    });

    /** Create initial Marketing Preferences */
    // iz: avoid duplicate with crmusr prefs
    // await prisma.userMarketingPreference.create({
    //   data: {
    //     id: createObjectID().id,
    //     company: {
    //       connect: { id: company.id },
    //     },
    //     user: {
    //       connect: { id: user.id },
    //     },
    //     preferences: {
    //       seeAds: true,
    //     },
    //   },
    // });
    // IZA: come back to (do we need this anymore?)
    // throws random id error for users that reset pw or created an account after they're crmUsers in the db
    // Match any existing CrmUser objects with this new user
    const crmUsersWithSameEmail = data.email
      ? await prisma.crmUser.findMany({
          where: { email: data.email },
          select: {
            id: true,
            user: { select: { id: true } },
            associatedCompany: { select: { id: true } },
          },
        })
      : [];

    const crmUsersWithSamePhone = data.phone
      ? await prisma.crmUser.findMany({
          where: { phone: data.phone },
          select: {
            id: true,
            user: { select: { id: true } },
            associatedCompany: { select: { id: true } },
          },
        })
      : [];

    const crmUsers = [...crmUsersWithSameEmail, ...crmUsersWithSamePhone];

    for (const u of crmUsers) {
      if (u.user && u.user.id) {
        // Do nothing if the CRM user is already linked
        continue;
      }
      try {
        // Update the CRM user and connect it to our new User object
        console.log(
          `Linking existing CrmUser ${u.id} with new User ${user.id}`
        );
        await prisma.crmUser.update({
          where: { id: u.id },
          data: { user: { connect: { id: user.id } } },
        });

        console.log(`Creating empty marketing preferences for CrmUser ${u.id}`);

        // Check for existing marketing preferences
        let currentPrefsForCompany: any =
          await prisma.userMarketingPreference.findMany({
            where: {
              company: {
                id: u.associatedCompany.id,
              },
              user: {
                id: user.id,
              },
            },
          });

        currentPrefsForCompany =
          currentPrefsForCompany.length > 0 ? currentPrefsForCompany[0] : null;

        if (currentPrefsForCompany == null) {
          // Add empty marketing preferences for the user
          console.log(
            `[adminSignup] Creating empty marketing preferences for user ${user.id} with company ${u.associatedCompany.id}`
          );
          await prisma.userMarketingPreference.create({
            data: {
              id: createObjectID().id,
              company: {
                connect: { id: u.associatedCompany.id },
              },
              user: {
                connect: { id: user.id },
              },
              preferences: {
                seeAds: true,
              },
            },
          });
        }
      } catch (err) {
        console.error(
          `Could not link existing CrmUser ${u.id} with new User ${user.id}`
        );
        continue;
      }
    }

    return { ...user, company };
  } else {
    console.log(
      `[adminSignup] User account already exists for email/phone ${data.email} ${data.phone}, returning null`
    );
    return null;
  }
}

export interface LegacyCompanyInput {
  company: {
    name: string;
    type?: number;
    companyId: string;
    url?: string;
    regNumber?: string;
    relationshipCreatorCurrency?: string;
    taxNumber?: string;
    email?: string;

    // Override id of the company
    overrideID?: string;
    // Pass to override company type (default is 5)
    overrideType?: number;
    canDoRotationalTags?: boolean;
  };
  user?: { id: string };
  companyAddress?: {
    country?: string;
    town?: string;
    address?: string;
    postcode?: string;
  };
}

export interface UserUniqueValues {
  id: string;
}

export interface UserAssigntoGroupInput {
  id: string;
  // Corporate email of the user - this is mandatory and supploed by the company
  corporateEmail: string;
}

interface LegacyUserGroupAssignInput {
  user: UserAssigntoGroupInput;
  /**
   * Company ID
   */
  company: CompanyUniqueValues;
  userGroup: UserGroupNameEnum;
}

interface UserGroupAssignInput extends LegacyUserGroupAssignInput {
  fenixUserGroup: {
    id: string;
    name: string;
  };
}

const convertUserGroupsToPrisma = (userGroup: UserGroupNameEnum) => {
  switch (userGroup) {
    case UserGroupNameEnum.ADMIN:
      return "ADMIN";
    case UserGroupNameEnum.SUPER_ADMIN:
      return "SUPER_ADMIN";
    case UserGroupNameEnum.MASTER_ADMIN:
      return "MASTER_ADMIN";
    default:
      return "USER";
  }
};

const updateLegacyUserGroupForUser = async (
  data: LegacyUserGroupAssignInput
) => {
  console.log(
    `[updateLegacyUserGroupForUser] Retrieving user groups for company ${data.company.id}`
  );

  // Get all user groups for this company
  const userGroups = await prisma.userGroup.findMany({
    where: { companyId: data.company.id }, // Assuming companyId is the foreign key
  });

  console.log(
    `[updateLegacyUserGroupForUser] Finding user group ${data.userGroup} for company ${data.company.id}`
  );

  // Find the desired group from created groups
  const desiredGroup = userGroups.find(
    (element) => element.name === data.userGroup
  );

  if (!desiredGroup) {
    throw new Error(
      `User group ${data.userGroup} not found for company ${data.company.id}`
    );
  }

  console.log(
    `[updateLegacyUserGroupForUser] Updating user ${data.user.id} with group ${desiredGroup.id}`
  );

  // Assign user to this group
  await prisma.user.update({
    where: { id: data.user.id },
    data: {
      fenixUserGroup: {
        connect: { id: desiredGroup.id },
      },
    },
  });

  return {
    success: true,
    groupDetails: desiredGroup,
  };
};

const upsertCompanyMembershipForUser = async (data: any) => {
  // Retrieve existing company memberships for the user and company
  const companyMemberships = await prisma.companyMembership.findMany({
    where: {
      userId: data.user.id, // Use the foreign key directly
      companyId: data.company.id, // Use the foreign key directly
    },
  });

  // Check if a membership already exists
  const existingMembershipId =
    companyMemberships.length > 0 ? companyMemberships[0].id : undefined;

  // Upsert company membership
  return await prisma.companyMembership.upsert({
    where: {
      id: existingMembershipId || new ObjectId().toString(),
    },
    update: {
      company: { connect: { id: data.company.id } },
      user: { connect: { id: data.user.id } },
      fenixUserGroup: { connect: { id: data.fenixUserGroup.id } }, // Adjust field if necessary
      role: convertUserGroupsToPrisma(data.userGroup),
    },
    create: {
      company: { connect: { id: data.company.id } },
      user: { connect: { id: data.user.id } },
      fenixUserGroup: { connect: { id: data.fenixUserGroup.id } }, // Adjust field if necessary
      role: convertUserGroupsToPrisma(data.userGroup),
      email: data.user.corporateEmail,
      personalEmail: data.user.personalEmail,
      id: createObjectID().id,
      // salaryRange: data.salaryRange ?? "Not specified", // or however you determine this
      // startDate: data.startDate ?? new Date(), // or use an explicit value
    },
  });
};

const linkUserToGroupAndMembership = async (
  data: LegacyUserGroupAssignInput
) => {
  console.log(
    `[linkUserToGroupAndMembership] Linking user ${data.user.id} to company ${data.company.id} with group ${data.userGroup}`
  );

  const legacyGroup = await updateLegacyUserGroupForUser(data);
  const companyMembership = await upsertCompanyMembershipForUser({
    fenixUserGroup: {
      id: legacyGroup.groupDetails.id,
      name: legacyGroup.groupDetails.name,
    },
    ...data,
  });

  // Add user to company's 'Employees' cluster
  let cs = await prisma.crmCluster.findMany({
    where: {
      name: "Employees",
      companyId: data.company.id,
      clusterType: "EMPLOYEES",
    },
  });

  if (cs.length > 0) {
    const currentUser = await prisma.user.findUnique({
      where: { id: data.user.id },
    });

    let crmUser = await createOrGetCrmUser(data.company, {
      id: data.user.id,
      userData: {
        firstName: currentUser?.firstName,
        lastName: currentUser?.lastName,
        email: currentUser?.email,
        phone: currentUser?.phone,
        gender: currentUser?.gender,
        address: {
          address: currentUser?.address?.address,
          town: currentUser?.address?.town,
          postcode: currentUser?.address?.postcode,
          country: currentUser?.address?.country,
        },
        dob: currentUser?.dob,
      },
    });

    await prisma.crmCluster.update({
      where: { id: cs[0].id },
      data: {
        users: {
          connect: {
            id: crmUser.id, // Ensure this is the correct id
          },
        },
      },
    });

    let mp = await prisma.userMarketingPreference.findMany({
      where: {
        companyId: data.company.id,
        userId: data.user.id,
      },
    });

    if (mp.length > 0) {
      let currPrefs = mp[0].preferences;
      currPrefs["shareEmployeeProfile"] = true;

      await prisma.userMarketingPreference.update({
        where: { id: mp[0].id },
        data: {
          preferences: currPrefs,
        },
      });
    }
  }

  return {
    success: true,
    legacyGroup,
    companyMembership,
  };
};

interface CompanyBrand {
  advertiserID: string;
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
export const createBrandIfNone = async (data: CreateBrandForCompany) => {
  const name = data.brandDetails?.name || data.companyDetails.name;
  const { id: companyID } = data.companyDetails;

  // Check if brand exists for this company
  const existingBrands = await prisma.brand.findMany({
    where: {
      advertiserId: companyID,
    },
  });

  // No brand exists, create one
  if (existingBrands.length === 0) {
    return await prisma.brand.create({
      data: {
        id: createObjectID().id,
        advertiser: { connect: { id: companyID } },
        client: { connect: { id: companyID } },
        name,
      },
    });
  }

  // Return null if no brand needs to be created
  return null;
};

// Creates advertiser for the company
export const createAdvertiserIfNone = async (
  data: CreateAdvertiserForCompany
) => {
  const name = data.advertiserDetails?.name || data.companyDetails.name;
  const { id: companyID } = data.companyDetails;

  // Check if advertiser exists for this company
  const existingAdvertisers = await prisma.advertiser.findMany({
    where: {
      companyId: companyID,
    },
  });

  // No advertiser exists, create one
  if (existingAdvertisers.length === 0) {
    return await prisma.advertiser.create({
      data: {
        id: createObjectID().id,
        companyId: companyID,
        name,
      },
    });
  }

  // Return the first existing advertiser if one is found
  return existingAdvertisers[0];
};

export const createLegacyCompany = async (data: LegacyCompanyInput) => {
  let userCreateData: {
    members?: {
      create: {
        id: string;
        user: {
          connect: {
            id: string;
          };
        };
        role: string;
        personalEmail?: string;
        email?: string;
      }[];
    };
  } = {};

  let userObj;
  if (data.user) {
    userObj = await prisma.user.findUnique({
      where: { id: data.user.id },
    });
    if (!userObj) throw new Error(`User with ID ${data.user.id} not found`);

    const userCompanyLimit =
      userObj.companyLimit !== null ? userObj.companyLimit : 2;
    const ecomps = await prisma.company.findMany({
      where: {
        members: {
          some: {
            user: { id: data.user.id },
            role: "MASTER_ADMIN",
          },
        },
      },
    });

    if (ecomps.length >= userCompanyLimit) {
      throw new Error("Reached maximum company limit for this user");
    }
    // iza come back
  }

  const {
    company: { overrideType: type = 5 }, // use type from add company or default to company if from signup
  } = data;

  const { companyId, name, url, regNumber, taxNumber } = data.company;

  const currentUser = await prisma.user.findUnique({
    where: { id: data.user.id },
  });
  let currency;
  if (!currentUser.isChild) {
    // if this is an adult, find their phone number for currency check
    const userPhone = currentUser.phone;
    // map currencies to the country codes based on two-letter country code
    const currencyMapping = {
      AS: "USD", // American Samoa
      AD: "EUR", // Andorra
      AU: "AUD", // Australia
      CA: "CAD", // Canada
      CN: "CNY", // China
      DK: "DKK", // Denmark
      EG: "EGP", // Egypt
      EU: "EUR", // European Union
      GB: "GBP", // United Kingdom
      HK: "HKD", // Hong Kong
      HR: "HRK", // Croatia
      ID: "IDR", // Indonesia
      IN: "INR", // India
      JP: "JPY", // Japan
      KR: "KRW", // South Korea
      MX: "MXN", // Mexico
      MY: "MYR", // Malaysia
      NZ: "NZD", // New Zealand
      PH: "PHP", // Philippines
      PL: "PLN", // Poland
      RSD: "RSD", // Serbia
      SG: "SGD", // Singapore
      SE: "SEK", // Sweden
      TH: "THB", // Thailand
      TWD: "TWD", // Taiwan
      UA: "UAH", // Ukraine
      VN: "VND", // Vietnam
      ZAR: "ZAR", // South Africa
      BR: "BRL", // Brazil
      ARS: "ARS", // Argentina
      NGN: "NGN", // Nigeria
      KES: "KES", // Kenya
      ETB: "ETB", // Ethiopia
      MAD: "MAD", // Morocco
      DZD: "DZD", // Algeria
      TND: "TND", // Tunisia
      HUF: "HUF", // Hungary
      RON: "RON", // Romania
      BGN: "BGN", // Bulgaria
      BAM: "BAM", // Bosnia and Herzegovina
      GHS: "GHS", // Ghana
      PKR: "PKR", // Pakistan
      ILS: "ILS", // Israel
      RUB: "RUB", // Russia
      SAR: "SAR", // Saudi Arabia
      AED: "AED", // United Arab Emirates
    };
    const phoneNumber = parsePhoneNumber(userPhone); // Verify this is a real number and get the country info
    const countryCode = phoneNumber.country; // Get the two-letter country code
    // Determine currency based on the country code
    currency = currencyMapping[countryCode] || "USD"; // Default to USD if not found
  } else {
    // if child account default currency to that of creator of the relationship
    currency = data.company.relationshipCreatorCurrency;
  }
  // Get the last company ID
  const lastCompanyWithId = await prisma.company.findMany({
    orderBy: { id: "desc" },
    take: 1,
  });

  let newCompanyID = companyId;
  // Override id if overrideID is present
  if (data.company.overrideID) {
    newCompanyID = data.company.overrideID;
  }

  const couponName = `${_.camelCase(name).substring(0, 35)}${Math.floor(
    Math.random() * 9999
  )}`.toLowerCase();

  const refferalCouponName = `${_.camelCase(name).substring(0, 35)}${Math.floor(
    Math.random() * 9999
  )}`.toLowerCase();

  const refferalCouponPayload = {
    id: createObjectID().id,
    name: refferalCouponName,
    promoCode: refferalCouponName,
    value: 50, //50% off for now
    unit: PromoValueUnit.PERCENTAGE,
    startDate: new Date(),
    endDate: null,
    oneUsePerCompany: false,
    oneUsePerUser: false,
    isReferral: true,
    isSignupCoupon: false,
    duration: "forever",
    // createdByUser: { connect: { id: data.user.id } }
  };

  const str = new stripe();
  const referralCoupon = await str.createCoupon({
    ...refferalCouponPayload,
    currency: currency || "GBP",
  });

  const company = await prisma.company.create({
    data: {
      id: newCompanyID,
      currency,
      name,
      url,
      email: data.company.email,
      regNum: regNumber,
      vatNum: taxNumber,
      publisherKey: Generator.generateString(32),
      type,
      canDoRotationalTags: data.company.canDoRotationalTags,
      uniqueKey: Generator.generateString(32),
      enabled: 1,
      billingReferral: {
        create: {
          ...refferalCouponPayload,
          stripeCouponId: referralCoupon.id,
          companyId: newCompanyID,
        },
      },
      address: {
        ...data.companyAddress,
      },
    },
  });

  await prisma.companyMembership.create({
    data: {
      id: createObjectID().id,
      companyId: company.id,
      userId: data.user.id,
      role: "MASTER_ADMIN",
      personalEmail: userObj.email,
      email: userObj.email,
    },
  });

  const userGroups = await createAllUserGroups({
    id: company.id,
    name: company.name,
  });

  await createCompanyBalance(company);

  if (data.user) {
    const { user } = data;

    const superAdminGroupID = userGroups.find(
      (element) => element.role === "MASTER_ADMIN"
    );

    await upsertCompanyMembershipForUser({
      fenixUserGroup: {
        id: superAdminGroupID.id,
        name: superAdminGroupID.name,
      },
      company,
      user: {
        id: user.id,
        corporateEmail: userObj.email, // TODO: something here
        personalEmail: userObj.email,
      },
      userGroup: UserGroupNameEnum.MASTER_ADMIN,
    });

    // If this is the first company for this user
    if (
      (await prisma.companyMembership.count({
        where: { user: { id: data.user.id } },
      })) === 1
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          fenixUserGroup: { connect: { id: superAdminGroupID.id } },
          company: { connect: { id: company.id } },
        },
      });
    }
  }

  const companyUnique = {
    id: company.id,
    name: company.name,
  };

  await createInitialBillingEntries(companyUnique, true);

  const advertiser = await createAdvertiserIfNone({
    companyDetails: { ...companyUnique },
  });

  await createBrandIfNone({
    companyDetails: { ...companyUnique },
    brandDetails: { advertiserID: advertiser.id },
  });
  // Try to find a user matching this email
  let existingUser = await prisma.user.findUnique({
    where: {
      id: new ObjectId(data.user.id).toString(),
    },
  });
  console.log("existing", existingUser);
  if (existingUser !== null) {
    // create the crmuser
    const crmUser = await createOrGetCrmUser(
      { id: company.id },
      { id: data.user.id, userData: existingUser },
      true
    );
    // create employee clusters and add this crmUser
    await prisma.crmCluster.create({
      data: {
        id: createObjectID().id,
        name: "Employees",
        description: `Employees of ${company.name}`,
        clusterType: "EMPLOYEES",
        company: {
          connect: {
            id: company.id,
          },
        },
        users: {
          connect: {
            id: crmUser.id,
          },
        },
      },
    });

    // create All Customers clusters and add this crmUser
    await prisma.crmCluster.create({
      data: {
        id: createObjectID().id,
        name: "All Customers",
        description: `All Customers of ${company.name}`,
        clusterType: "CUSTOMERS",
        company: {
          connect: {
            id: company.id,
          },
        },
        users: {
          connect: {
            id: crmUser.id,
          },
        },
      },
    });
  } else {
    console.log("no exisitng user, add logic in this unilikely event");
  }

  return company;
};

@Resolver()
export class mainResolver {
  @Query((returns) => json)
  async debug(@Arg("arg") arg: string, @Ctx() ctx: Context) {
    // await createOrGetCrmUser(ctx.company, ctx.user)
    await sendEmail({
      from: {
        name: "Synkd",
        email: "no-reply@synkd.life",
      },
      to: "jayden@synkd.life",
      subject: "Test",
      text: "Test",
      html: "<p>test</p>",
    });
  }

  @Authorized()
  @Query((returns) => json)
  async getCurrentCompany(@Ctx() ctx: Context) {
    const userId = ctx.user.id;

    // Fetch all company memberships of the user
    const allCompanyMemberships = await prisma.companyMembership.findMany({
      where: { userId },
      select: {
        id: true,
        company: {
          select: {
            id: true,
          },
        },
      },
    });

    // Fetch the user's current company
    const currentCompany = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        company: true, // Assuming there is a `company` field directly related to the user
      },
    });

    if (!currentCompany?.company) {
      throw new Error("No current company found for the user");
    }

    // Find the current company membership
    const currentCompanyMembership = allCompanyMemberships.find(
      (mem) => mem.company.id === currentCompany.company.id
    );

    return {
      membership: currentCompanyMembership,
      company: currentCompany.company,
    };
  }

  @Mutation((returns) => json)
  async switchCompanyOld(
    @Arg("data", {
      description: "Company details. Both id and id are required",
    })
    data: SwitchCompanyInput,
    @Ctx() ctx: Context
  ) {
    console.log("switching ctx.user: ", ctx.user);

    const newSession = await generateLegacySessionToken({
      id: ctx.user.id,
      company: { id: data.id },
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    // Check whether a group information can be retrieved about this user's company
    // Fetch company memberships for the specific user and company
    const companyMemberships: any = await prisma.companyMembership.findMany({
      where: {
        companyId: data.id, // Prisma 2 uses direct relation IDs
        userId: ctx.user.id,
      },
    });

    // Fetch fenix user groups with a condition and include the _fenixUserGroup relation
    let fenixUserGroups: any = await prisma.companyMembership.findMany({
      where: {
        companyId: data.id,
        userId: ctx.user.id,
        status: {
          not: "ARCHIVED",
        },
      },
      select: {
        fenixUserGroup: {
          select: {
            id: true,
          },
        },
      },
    });

    let userGroup;

    console.log(fenixUserGroups);

    if (fenixUserGroups.length !== 1) {
      console.log(
        `[switchCompany] No company membership/user group for user ${ctx.user.id} trying to switch to ${data.id}`
      );
      // TODO: check for client/agency/etc relationship

      // Check for Inspired master access
      let inspiredMembership: any = await prisma.companyMembership.findMany({
        where: {
          userId: ctx.user.id, // Use userId directly instead of nested object
          company: {
            type: 10, // The type field under the company relation
          },
          status: {
            not: "ARCHIVED", // Use the `not` condition for status
          },
        },
      });

      // Company type 10 is Inspired

      if (inspiredMembership.length > 0) {
        console.log(
          `[switchCompany] ${ctx.user.id} has Inspired master access. Trying to switch to ${data.id}`
        );

        // get Super Admins user group for given company
        // as we aren't part of it but should be able to switch to it
        const fenixUserGroup = await prisma.userGroup.findMany({
          where: {
            companyId: data.id,
            name: "Super Admins",
          },
        });

        if (fenixUserGroups.length === 0) {
          throw new Error(
            `No Super Admins group found for company ${data.id} (master override)`
          );
        } else {
          userGroup = fenixUserGroups[0];
        }
      } else {
        // Check for access via a company relationship
        let companyRelationships: any =
          await prisma.companyRelationship.findMany({
            where: {
              companies: {
                some: {
                  users: {
                    some: {
                      userId: ctx.user.id, // Use userId directly to filter by user
                    },
                  },
                },
              },
            },
            select: {
              id: true,
              status: true,
              companies: {
                select: {
                  id: true,
                  role: true,
                  company: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          });

        if (companyRelationships.length > 0) {
          let canSwitch = false;

          companyRelationships.forEach((rel) => {
            if (rel.status === "SENT") {
              // If the relationship hasn't been accepted, we're not doing anything
              return;
            }

            console.log("rel", rel);

            // Check to see if there is a company in any of the user's relationships
            // with the same ID as the one we're trying to switch to
            let matchingCompany = rel["companies"].filter((comp) => {
              return comp.company.id === data.id;
            });

            if (matchingCompany.length > 0) {
              // If there is, they can switch!
              canSwitch = true;
            }
          });

          if (canSwitch) {
            // get Admins user group for given company
            // as we aren't part of it but should be able to switch to it
            fenixUserGroups = await prisma.userGroup.findMany({
              where: {
                companyId: data.id, // Assuming 'companyId' is the foreign key for the company
                name: "Admins",
              },
            });

            if (fenixUserGroups.length === 0) {
              throw new Error(
                `No Admins group found for company ${data.id} (relationships override)`
              );
            } else {
              userGroup = fenixUserGroups[0];
            }
          } else {
            throw new Error(
              `No user group found for this user under company ${data.id} and no existing relationships`
            );
          }
        } else {
          throw new Error(
            `No user group found for this user under company ${data.id}`
          );
        }
      }
    } else {
      userGroup = fenixUserGroups[0]["fenixUserGroup"];
    }

    if (!userGroup) {
      throw new Error(
        `Error. User group ${userGroup} is being used for company ${data.id}`
      );
    }

    // Update the user's default company
    await prisma.user.update({
      where: {
        id: ctx.user.id,
      },
      data: {
        fenixUserGroup: {
          connect: {
            id: userGroup.id, // Assuming userGroup.id is the correct ID for the relation
          },
        },
        company: {
          connect: {
            id: data.id, // Assuming data.id is the correct ID for the relation
          },
        },
      },
    });

    const user = await this.getUserWithCompanyByEmail(ctx.user.email);

    const cookieArray = [
      {
        name: "FenixToken",
        value: encodeUser({ token: newSession.SessionID }),
        options: createCookieOptions(ctx),
      },
    ];
    // if (companyMemberships.length > 0) {
    //   cookieArray.push({ name: "CurrentCompany", options: createCookieOptions(ctx), value: encodeMembership(companyMemberships[0]) })
    // }

    console.log(`[switchCompany] setting updated cookies for ${user.id}`);
    setCookies(ctx, cookieArray);
    return user;
  }

  @Mutation((returns) => json)
  async switchCompany(
    @Arg("data", {
      description: "Company details. The id is required",
    })
    data: SwitchCompanyInput,
    @Ctx() ctx: Context
  ) {
    // Retrieve company membership for the user
    const companyMembership = await prisma.companyMembership.findMany({
      where: { company: { id: data.id }, user: { id: ctx.user.id } },
    });

    console.log("Switching->companyMembership: ", companyMembership);

    // Retrieve event membership for the user
    const eventMembership = await prisma.platformEventMember.findMany({
      where: {
        user: { id: ctx.user.id },
        platformEvent: { id: data.eventID },
      },
    });

    console.log("Switching->eventMembership: ", eventMembership);

    // If both event and company membership exist, update event memberships
    if (eventMembership.length && companyMembership.length) {
      for (const membership of eventMembership) {
        await prisma.platformEventMember.update({
          data: {
            profile: { connect: { id: companyMembership[0].id } },
          },
          where: { id: membership.id },
        });
      }
    } else {
      // If only event membership exists, disconnect the user's profile
      if (eventMembership.length) {
        for (const membership of eventMembership) {
          try {
            await prisma.platformEventMember.update({
              data: { profile: { disconnect: true } },
              where: { id: membership.id },
            });
          } catch (error) {
            console.log("Error disconnecting profile:", error.message);
          }
        }
      }
    }

    // Generate a new session token
    const newSession = await generateLegacySessionToken({
      id: ctx.user.id,
      company: { id: data.id },
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    // Retrieve the user's group memberships for the target company
    let fenixUserGroups: any = await prisma.companyMembership.findMany({
      where: {
        company: { id: data.id },
        user: { id: ctx.user.id },
        status: "ACTIVE",
      },
      include: {
        fenixUserGroup: true,
      },
    });

    let userGroup;

    // If no valid user group is found, check Inspired membership or relationships
    if (fenixUserGroups.length !== 1) {
      console.log(
        `[switchCompany] No valid membership for user ${ctx.user.id} trying to switch to company ${data.id}`
      );

      // Check if user has Inspired master access
      let inspiredMembership = await prisma.companyMembership.findMany({
        where: {
          user: { id: ctx.user.id },
          company: { type: 10 },
          status: "ACTIVE",
        },
      });

      if (inspiredMembership.length > 0) {
        console.log(
          `[switchCompany] User ${ctx.user.id} has Inspired access. Trying to switch to company ${data.id}`
        );

        // Look for Super Admins group in the target company
        fenixUserGroups = await prisma.userGroup.findMany({
          where: { company: { id: data.id }, name: "Super Admins" },
        });

        if (fenixUserGroups.length === 0) {
          throw new Error(
            `No Super Admins group found for company ${data.id} (master override)`
          );
        } else {
          userGroup = fenixUserGroups[0];
        }
      } else {
        // Check company relationships for valid user group
        // let companyRelationships = await prisma.companyRelationship.findMany({
        //   where: { companies: { users: { user: { id: ctx.user.id } } } },
        //   select: {
        //     id: true,
        //     status: true,
        //     companies: {
        //       select: { id: true, role: true, company: { select: { id: true } } }
        //     }
        //   }
        // });
        // if (companyRelationships.length > 0) {
        //   let canSwitch = false;
        //   companyRelationships.forEach(rel => {
        //     if (rel.status === 'SENT') return;
        //     const matchingCompany = rel.companies.filter(comp => comp.company.id === data.id);
        //     if (matchingCompany.length > 0) {
        //       canSwitch = true;
        //     }
        //   });
        //   if (canSwitch) {
        //     // Look for Admins group in the target company
        //     fenixUserGroups = await prisma.userGroup.findMany({
        //       where: { company: { id: data.id }, name: 'Admins' }
        //     });
        //     if (fenixUserGroups.length === 0) {
        //       throw new Error(`No Admins group found for company ${data.id} (relationships override)`);
        //     } else {
        //       userGroup = fenixUserGroups[0];
        //     }
        //   } else {
        //     throw new Error(`No valid user group found for user under company ${data.id}`);
        //   }
        // } else {
        //   throw new Error(`No user group found for this user under company ${data.id}`);
        // }
      }
    } else {
      userGroup = fenixUserGroups[0].fenixUserGroup;
    }

    if (!userGroup) {
      throw new Error(`Error. No user group assigned for company ${data.id}`);
    }

    // Update the user's default company and group
    await prisma.user.update({
      where: { id: ctx.user.id },
      data: {
        fenixUserGroup: { connect: { id: userGroup.id } },
        company: { connect: { id: data.id } },
      },
    });

    // Retrieve the updated user
    const user = await this.getUserWithCompanyByEmail(ctx.user.email);

    // Set the session cookie
    const cookieArray = [
      {
        name: "FenixToken",
        value: encodeUser({ token: newSession.SessionID }),
        options: createCookieOptions(ctx),
      },
    ];

    console.log(`[switchCompany] Setting updated cookies for ${user.id}`);
    setCookies(ctx, cookieArray);

    return user;
  }

  @Query((returns) => json)
  async getUserGroupWithId(@Arg("id") id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        fenixUserGroup: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async myCompanies(@Ctx() ctx: Context) {
    return {
      companyMemberships: await prisma.companyMembership.findMany({
        where: { userId: ctx.user.id }, // Assuming the relation is set up correctly in your schema
        select: {
          id: true,
          role: true,
          company: {
            select: {
              id: true,
              name: true,
              email: true,
              logoURL: true,
              type: true,
              address: {
                select: {
                  town: true,
                  postcode: true,
                  country: true,
                  address: true,
                },
              },
            },
          },
        },
      }),
    };
  }

  async getUserWithCompanyByEmail(email: string): Promise<any> {
    if (email) email = email.toLowerCase();
    // Fetch the user by email
    const userWithoutCompany: any = await prisma.user.findUnique({
      where: { email },
      include: {
        companies: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!userWithoutCompany) {
      return null; // Return null if no user found
    }

    // Fetch the user's group (you may want to handle this part more cleanly)
    const group = await this.getUserGroupWithId(userWithoutCompany.id);

    // Fetch the user's company
    const userCompany = await prisma.companyMembership.findFirst({
      where: { userId: userWithoutCompany.id },
      include: {
        company: true,
      },
    });

    let companyMembership: CompanyMembership | null = null;

    if (userCompany) {
      // Fetch the company membership
      companyMembership = await prisma.companyMembership.findFirst({
        where: {
          companyId: userCompany?.company?.id,
          userId: userWithoutCompany?.id,
        },
      });
    }

    // Fetch other memberships
    const otherMemberships = await prisma.companyMembership.findMany({
      where: {
        userId: userWithoutCompany.id,
      },
      select: {
        id: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const personalCompany = await prisma.companyMembership.findFirst({
      where: { userId: userWithoutCompany.id },
      include: {
        company: true,
      },
    });

    return {
      ...userWithoutCompany,
      company: userCompany?.company || null,
      selectedCompanyMembership: companyMembership,
      otherMemberships,
      personalCompany,
    };
  }

  @Query((returns) => String)
  async helloWorld() {
    return "Hello world";
  }

  @Query((returns) => json)
  async me(@Ctx() ctx: Context) {
    if (!ctx.user) {
      throw new Error("Not logged in");
    }

    return await this.getUserWithCompanyByEmail(ctx.user.email);
  }

  @Mutation((returns) => json)
  async signup(@Arg("data") data: SignupInput, @Ctx() ctx: Context) {
    if (ctx.req.ip) {
      const location = await getIPInfo(ctx.req.ip);
      data.country = location?.country?.names?.en;
    }
    const user = await adminSignup(data);
    if (user) {
      console.log(`created new user ${user.id}`);
      const session = await generateLegacySessionToken({
        id: user.id,
        company: { id: user.company.id },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });
      setCookies(ctx, [
        {
          name: "FenixToken",
          value: encodeUser({
            token: session.SessionID,
            // IZA : ommitting this as it exceeds browser cookie limit (this bug crashes the fenixToken step)
            // should we need it, make sure it's optimised so it doesn't surpase 4096
            // ...user,
            emailVerified: false,
            phoneVerified: false,
          }),
          options: createCookieOptions(ctx),
        },
      ]);
      return { success: true, id: user.id };
    } else {
      throw new AuthenticationError(
        "Details entered are already associated with an account, Please retry with different email and mobile"
      );
    }
  }

  @Mutation((returns) => json)
  async login(@Arg("data") data: LoginInput, @Ctx() ctx: Context) {
    if (data.email) data.email = data.email.toLowerCase();
    const user = await this.getUserWithCompanyByEmail(data.email);
    if (!user) {
      console.error(`Could not login to ${data.email} as user doesn't exist`);
      throw new Error("Details incorrect");
    }

    /**
     * ! This contains the user password field. DO NOT directly expose outside.
     */
    const userSensitive = await prisma.user.findUnique({
      where: { email: data.email },
    });

    const sessionToken = await generateLegacySessionToken({
      company: { id: user.company?.id },
      id: user.id,
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });
    if (!(await bcrypt.compare(data.password, userSensitive.password))) {
      throw new AuthenticationError("Details incorrect");
    }

    // Set to the first/default companyMembership
    const selectedCompanyMembership = await prisma.companyMembership.findFirst({
      where: { userId: user.id }, // Assuming user.id is the correct reference
    });

    // Update the last login time
    const lastActivityTime = new Date().toISOString();
    await prisma.user.update({
      data: { lastActivity: lastActivityTime },
      where: { id: user.id },
    });

    const cookieArray = [
      {
        name: "FenixToken",
        options: createCookieOptions(ctx),
        value: encodeUser({ token: sessionToken.SessionID }),
      },
    ];
    // if (selectedCompanyMembership.length > 0) {
    //   cookieArray.push({ name: "CurrentCompany", options: createCookieOptions(ctx), value: encodeMembership(selectedCompanyMembership[0]) })
    // }
    setCookies(ctx, cookieArray);
    return { success: true };
  }

  @Mutation((returns) => json)
  async userVerification(
    @Arg("data") data: UserVerification,
    @Ctx() ctx: Context
  ) {
    let user;
    if (data.verificationType == VerificationType.EMAIL) {
      if (data.sendCode) {
        await createEmailChallenge(ctx.user);
        return { success: true };
      }
      user = await verifyUserEmail(data.userID, data.verificationCode);
    }
    if (data.verificationType == VerificationType.PHONE) {
      if (data.sendCode) {
        await createPhoneChallenge(ctx.user);
        return { success: true };
      }
      user = await verifyUserPhone(data.userID, data.verificationCode);
      console.log("sending welcome email now.......");
      await sendWelcomeEmail(user);
    }
    const userWithCompany = await this.getUserWithCompanyByEmail(user.email);
    const session = await generateLegacySessionToken({
      id: userWithCompany.id,
      company: {
        id: userWithCompany.company.id,
      },
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });
    if (user) {
      setCookies(ctx, [
        {
          name: "FenixToken",
          value: encodeUser({ token: session.SessionID, ...user }),
          options: createCookieOptions(ctx),
        },
      ]);
      return { success: true };
    }
    return { success: false };
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateUserEmail(
    @Arg("data") data: UpdateUserEmailInput,
    @Ctx() ctx: Context
  ) {
    if (data.email) {
      // Convert email to lowercase
      data.email = data.email.toLowerCase();

      // Check if the email already exists
      const usersWithEmail = await prisma.user.findMany({
        where: { email: data.email },
      });

      if (usersWithEmail.length > 0) {
        throw new Error(`Email address already in use`);
      }

      const code = Generator.generateNumber(6).toString();

      // Create the update challenge
      const challenge = await prisma.updateChallenge.create({
        data: {
          id: createObjectID().id,
          user: {
            connect: { id: ctx.user.id },
          },
          challengeType: "EMAIL",
          code,
          unverifiedEmail: data.email,
        },
      });

      // Send verification email
      await sendEmail({
        from: {
          name: "Synkd",
          email: "no-reply@synkd.life",
        },
        to: data.email,
        subject: "Email Verification - Log into Synkd",
        template: "verify-email",
        vars: {
          "verify-code": code,
          "first-name": ctx.user.firstName,
          "last-name": ctx.user.lastName,
        },
      });

      return { id: challenge.id };
    } else {
      // Handle email verification challenge
      if (!data.challengeId) throw new Error(`No challenge ID provided`);
      if (!data.code) throw new Error(`No code provided`);

      const challenge = await prisma.updateChallenge.findUnique({
        where: { id: data.challengeId },
      });

      if (!challenge) {
        throw new Error(`Challenge not found`);
      }

      if (challenge.status === "USED") {
        throw new Error(`Challenge has been used`);
      }
      // TODO: Check if challenge is older than 24 hrs

      if (challenge.code === data.code) {
        const usersWithEmail = await prisma.user.findMany({
          where: { email: challenge.unverifiedEmail },
        });

        if (usersWithEmail.length > 0) {
          throw new Error(`Email address for this challenge is already in use`);
        }

        // Update the user's email
        const user = await prisma.user.update({
          where: {
            id: ctx.user.id,
          },
          data: {
            email: challenge.unverifiedEmail,
            emailVerified: true,
          },
        });

        // Update the status of the challenge
        await prisma.updateChallenge.update({
          where: { id: challenge.id },
          data: { status: "USED" },
        });

        return user;
      } else {
        throw new Error(`Incorrect code for this challenge`);
      }
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateUserPhone(
    @Arg("data") data: UpdateUserPhoneInput,
    @Ctx() ctx: Context
  ) {
    if (data.phone) {
      // Check if phone number is already in use
      const usersWithPhone = await prisma.user.findMany({
        where: { phone: data.phone },
      });

      if (usersWithPhone.length > 0) {
        throw new Error(`Phone number already in use`);
      }

      // Generate code for verification
      const code = Generator.generateNumber(6).toString();

      // Create a new phone update challenge
      const challenge = await prisma.updateChallenge.create({
        data: {
          id: createObjectID().id,
          user: { connect: { id: ctx.user.id } },
          challengeType: "PHONE",
          code,
          unverifiedPhone: data.phone,
        },
      });

      // Send SMS with the verification code
      await sendSMS(
        data.phone,
        "Inspired",
        `Inspired Code: ${code}`,
        "SMS_10845376",
        { code },
        { Type: "OTP" }
      );

      return { id: challenge.id };
    } else {
      if (!data.challengeId) throw new Error(`No challenge ID provided`);
      if (!data.code) throw new Error(`No code provided`);

      // Fetch the challenge
      const challenge = await prisma.updateChallenge.findUnique({
        where: { id: data.challengeId },
      });

      if (!challenge) throw new Error(`Challenge not found`);
      if (challenge.status === "USED")
        throw new Error(`Challenge has been used`);

      // TODO: Add check if the challenge is older than 24 hours

      if (challenge.code === data.code) {
        // Ensure the phone number isn't already in use
        const usersWithPhone = await prisma.user.findMany({
          where: { phone: challenge.unverifiedPhone },
        });

        if (usersWithPhone.length > 0) {
          throw new Error(`Phone number for this challenge is already in use`);
        }

        // Update the user's phone number and mark it as verified
        const user = await prisma.user.update({
          where: { id: ctx.user.id },
          data: {
            phone: challenge.unverifiedPhone,
            phoneVerified: true,
          },
        });

        // Mark the challenge as used
        await prisma.updateChallenge.update({
          where: { id: challenge.id },
          data: {
            status: "USED",
          },
        });

        return user;
      } else {
        throw new Error(`Incorrect code for this challenge`);
      }
    }
  }

  /**
   * Legacy platform
   */

  @Query((returns) => json)
  async getSessionInfo(@Ctx() ctx: Context) {
    if (ctx.user) {
      // User has a session. Fetch the latest info without relying on the FenixToken cookie.
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dob: true,
          email: true,
          phone: true,
          fenixUserGroup: {
            select: {
              name: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              currency: true,
              canDoScriptTracking: true,
              canDoRotationalTags: true,
              type: true,
              vatNum: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } else {
      // No session
      throw new Error("No valid session");
    }
  }
  /**
   * Company resolvers
   */

  @Authorized()
  @Mutation((returns) => json)
  async addCompany(@Arg("data") data: CreateCompanyInput, @Ctx() ctx: Context) {
    const companyID = createObjectID().id;
    const company = await createLegacyCompany({
      company: {
        name: data.name,
        url: data?.url,
        taxNumber: data?.taxNumber,
        regNumber: data?.regNumber,
        companyId: companyID,
        email: data?.email,
        // type: data?.type
      },
      user: {
        id: ctx.user.id,
      },
      companyAddress: {
        country: data.companyaddress.country,
        postcode: data.companyaddress.postcode,
        town: data.companyaddress.town,
        address: data.companyaddress.address,
      },
    });
    return company;
  }
  @Authorized()
  @Mutation((returns) => json)
  async updateCompany(
    @Arg("data") data: UpdateCompanyInput,
    @Ctx() ctx: Context
  ) {
    const company = await prisma.company.findUnique({
      where: { id: data.id },
    });

    let existingLocales =
      company?.profiles?.map((profile) => profile.locale) || [];

    let profileUpdateInput = [],
      profileCreateInput = [];

    data.profiles.forEach((profile) => {
      profileCreateInput.push({
        locale: profile.locale,
        keywords: profile.keywords,
        categorisedKeywords: profile.categorisedKeywords,
        bio: profile.bio,
      });
    });

    if (data.email) data.email = data.email.toLowerCase();

    let bank: any = {};
    if (data.bankAccount) {
      if (data.bankAccount.id) {
        bank = await prisma.bankAccount.update({
          where: {
            id: data.bankAccount.id,
          },
          data: {
            currency: data.currency,
            country: data?.address?.country,
            account_holder_name: data.bankAccount.account_holder_name,
            account_holder_type: data.bankAccount.account_holder_type,
            routing_number: data.bankAccount.routing_number,
            account_number: data.bankAccount.account_number,
          },
        });
      } else {
        bank = await prisma.bankAccount.create({
          data: {
            currency: data.currency,
            country: data?.address?.country,
            stripeBankAccountId: "", // Assuming a placeholder for future stripe integration
            account_holder_name: data.bankAccount.account_holder_name,
            account_holder_type: data.bankAccount.account_holder_type,
            routing_number: data.bankAccount.routing_number,
            account_number: data.bankAccount.account_number,
          },
        });
      }
    }

    // Update the company data
    let update = await prisma.company.update({
      where: { id: data.id },
      data: {
        name: data.name,
        url: data?.url,
        email: data?.email,
        logoURL: data?.logoURL,
        info: data?.info,
        regNum: data?.regNum,
        vatNum: data?.vatNum,
        landline: data?.landline,
        currency: data.currency,
        address: {
          country: data?.address?.country,
          postcode: data?.address?.postcode,
          town: data?.address?.town,
          address: data?.address?.address,
        },
        profiles: profileCreateInput,
        category: data?.category,
        business_type: data?.business_type,
        ...(data?.representativeContact
          ? {
              representativeContact: {
                connect: { id: data?.representativeContact },
              },
            }
          : {}),
        ...(bank?.id ? { bankAccount: { connect: { id: bank.id } } } : {}),
        billingDefaultType: data?.billingDefaultType,
      },
    });

    // Stripe integration logic
    // IZ: come back to , why are we updating with empty values?
    // const str = new stripe();
    // if (company.stripeAccountId) {
    //   await str.updateConnectAccount(company.id, {});
    // } else {
    //   try {
    //     await str.createConnectAccount(company.id, {
    //       ipAddress: data.ipAddress || "",
    //       date: +moment().format("X"),
    //       companyID: company.id,
    //     });
    //   } catch (error) {
    //     console.log(error);
    //   }
    // }

    return update;
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateCompanyAccessToMarketing(
    @Arg("data") data: UpdateCompanyAccessToMarketingInput,
    @Ctx() ctx: Context
  ) {
    const company = await prisma.company.update({
      where: {
        id: ctx.company.id,
      },
      data: {
        employeeCanAccessMarketing: {
          set: data.companyMembershipIds.map((id) => ({ id })),
        },
      },
    });

    return company;
  }

  @Authorized()
  @Query((returns) => json)
  async getEmployeeAccessToMarketing(@Ctx() ctx: Context) {
    const company = await prisma.company.findUnique({
      where: {
        id: ctx.company.id,
      },
      select: {
        employeeCanAccessMarketing: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }

    return company;
  }

  @Authorized()
  @Query((returns) => json)
  async getMyEmployeeForCompany(
    @Arg("companyId") companyId: string,
    @Ctx() ctx: Context
  ) {
    const membership = await prisma.companyMembership.findFirst({
      where: {
        companyId: companyId, // Assuming you have a companyId field in the CompanyMembership model
        userId: ctx.user.id, // Assuming you have a userId field in the CompanyMembership model
      },
    });

    // If a membership exists, return it; otherwise, return an empty object
    return membership || {};
  }

  @Authorized()
  @Mutation((returns) => json)
  async addEmployee(@Arg("data") data: AddEmployeeInput, @Ctx() ctx: Context) {
    let newAccount = false;
    console.log(data, "data");
    // 1. Do some sanity checks to ensure that the company already exists
    const company = await prisma.company.findUnique({
      where: { id: data.companyID },
    });
    if (!company) {
      throw new Error(`Specified company ${data.companyID} does not exist`);
    }

    // 2. Check if the user already exists
    if (data.personalEmail)
      data.personalEmail = data.personalEmail.toLowerCase();
    let user = await checkIfUserAccountExists(data.personalEmail, data.phone);
    if (user && user.isChild === true) {
      throw new Error(
        `This is a child Account, you can not add a child as an Employee`
      );
    }
    if (!user) {
      // If it doesn't exist, we'll create a new account
      const password = Generator.generateString(8);
      user = await adminSignup({
        firstName: data.firstName,
        password: password,
        lastName: data.lastName,
        email: data.personalEmail,
        phone: data.phone,
      });
      if (!user) {
        throw new Error(
          `Could not create new user for ${data.personalEmail} ${data.phone}`
        );
      }

      newAccount = true;
      await sendEmail({
        from: {
          name: "Synkd",
          email: "no-reply@synkd.life",
        },
        to: data.personalEmail,
        subject: `Hello ${data.firstName}, a Synkd account has been created for you`,
        template: "accountcreated-by-addingemployee",
        vars: {
          "first-name": data.firstName,
          "company-name": company.name,
          password: password,
        },
      });
    }

    // 3. Ensure that the user is not already linked to the company
    const memberships = await prisma.companyMembership.findMany({
      where: {
        companyId: data.companyID,
        userId: user.id,
      },
    });

    if (memberships.length > 0) {
      throw new Error(
        `User ${user.id} is already linked to company ${data.companyID}`
      );
    }

    // 4. Link the user to the company
    if (data.corporateEmail)
      data.corporateEmail = data.corporateEmail.toLowerCase();

    const { companyMembership } = await linkUserToGroupAndMembership({
      company,
      user: { id: user.id, corporateEmail: data.corporateEmail },
      userGroup: data.role,
    });

    // Update the company membership with department and job title
    await prisma.companyMembership.update({
      where: { id: companyMembership.id },
      data: {
        department: data.department,
        jobTitle: data.jobTitle,
        personalEmail: data.personalEmail,
        // salaryRange:data.salaryRange,
        //  startDate:data.startDate,
      },
    });

    console.log("newAccount", newAccount);

    // 5. Send them a confirmation email (if necessary)
    if (!newAccount) {
      console.log("not a new account, send email");
      await sendEmail({
        from: {
          name: "Synkd",
          email: "no-reply@synkd.life",
        },
        to: user.email,
        subject: `Hello ${user.firstName}, you have been added to a new company on Synkd`,
        template: "msl-company-new-employee",
        vars: {
          "first-name": user.firstName,
          "company-name": company.name,
        },
      });
    }

    return await this.getUserWithCompanyByEmail(user.email);
  }

  @Authorized("synkd")
  @Mutation((returns) => json)
  async unlockUserProfile(@Arg("userID") userID: string) {
    return prisma.user.update({
      where: { id: userID },
      data: { userProfileLockedUntil: null },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async lockUserProfile(@Ctx() ctx: Context) {
    const lockProfileDefaultPeriodDays = 90;
    const lockProfileDefaultPeriodMs =
      lockProfileDefaultPeriodDays * 1000 * 60 * 60 * 24;
    return prisma.user.update({
      data: {
        userProfileLockedUntil: new Date(
          new Date().getTime() + lockProfileDefaultPeriodMs
        ),
      },
      where: { id: ctx.user.id },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async toggleSynkdDataSell(
    @Ctx() ctx: Context,
    @Arg("synkdDataSellAllowed") synkdDataSellAllowed: boolean
  ) {
    const allowedDate = synkdDataSellAllowed ? new Date() : null;
    return prisma.user.update({
      data: { synkdDataSellAllowed, synkdDataSellAllowedDate: allowedDate },
      where: { id: ctx.user.id },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateUserWalkthrough(
    @Arg("data") data: updateUserWalkthroughInput,
    @Ctx() ctx: Context
  ) {
    // check if user exists
    const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
    if (!user) {
      throw new Error("User does not exist");
    }

    // get walkthrough data from request
    let { walkthroughStep, doNotShowWalkthrough } = data;
    let userInput = {
      walkthroughStep,
      doNotShowWalkthrough,
    };

    // update userData for walkthrough
    let update = await prisma.user.update({
      where: { id: ctx.user.id },
      data: { ...userInput },
    });

    return update;
  }

  async addUserToKeywordCluster(user: any, keywords: any) {
    const crmUser = await prisma.crmUser.findFirst({
      where: { user: { id: user?.id || user?._id } },
    });
    console.log("addUserToKeywordCluster crmUser: ", crmUser);

    if (crmUser) {
      const clusterIds = keywords?.map((keyword) => keyword?.id);

      const keywordSubClusters = await prisma.crmSubCluster.findMany({
        where: {
          id: { in: clusterIds },
        },
      });

      keywordSubClusters?.map((cluster) => {
        try {
          const update = prisma.crmCluster.update({
            data: { users: { connect: { id: crmUser[0].id } } },
            where: { id: cluster?.id },
          });
        } catch (error) {
          console.log("Error adding user keyword cluster: ", error.message);
        }
      });
    }
  }

  // @Authorized()
  // @Mutation((returns) => json)
  // async updateUserProfile(
  //   @Arg("data") data: UpdateUserProfileInput,
  //   @Ctx() ctx: Context
  // ) {
  //   if (await isUserProfileLocked(ctx.user.id)) {
  //     throw new Error("User profile is locked");
  //   }

  //   let {
  //     firstName,
  //     lastName,
  //     dob,
  //     gender,
  //     avatar,
  //     address,
  //     facebook,
  //     instagram,
  //     linkedIn,
  //     qq,
  //     skype,
  //     twitter,
  //     weChat,
  //     weibo,
  //     socialLine,
  //     passportNumber,
  //     nationalSecurityNumber,
  //     deliveryAddress,
  //     secondaryProfilePic,
  //   } = data;

  //   const user = await prisma.user.findUnique({
  //     where: { id: ctx.user.id },
  //   });

  //   // Handle profiles
  //   let existingLocales = [];

  //   for (const i in user.profiles) {
  //     let currProf = user.profiles[i];
  //     existingLocales.push(currProf.locale);
  //   }

  //   let profileUpdateInput = [],
  //     profileCreateInput = [];

  //   if (data.profiles) {
  //     data.profiles.forEach((profile) => {
  //       if (existingLocales.includes(profile.locale)) {
  //         profileUpdateInput.push({
  //           categorisedKeywords: profile.categorisedKeywords,
  //           keywords: profile.keywords,
  //         });
  //       } else {
  //         profileCreateInput.push({
  //           locale: profile.locale,
  //           keywords: profile.keywords,

  //           categorisedKeywords: profile.categorisedKeywords,

  //           bio: profile.bio,
  //         });
  //       }
  //     });
  //   }
  //   let userInput = {
  //     firstName,
  //     lastName,
  //     gender,
  //     avatar,
  //     address: {
  //       country: address?.country,
  //       town: address?.town,
  //       postcode: address?.postcode,
  //       address: address?.address,
  //     },
  //     deliveryAddress: {
  //       country: deliveryAddress?.country,
  //       town: deliveryAddress?.town,
  //       postcode: deliveryAddress?.postcode,
  //       address: deliveryAddress?.address,
  //     },
  //     facebook,
  //     instagram,
  //     linkedIn,
  //     qq,
  //     skype,
  //     twitter,
  //     weChat,
  //     weibo,
  //     socialLine,
  //     passportNumber,
  //     nationalSecurityNumber,
  //     secondaryProfilePic,
  //     profiles: profileCreateInput,
  //     ...(dob && !isNaN(new Date(dob).getTime()) ? { dob: new Date(dob) } : {}),
  //   };

  //   console.log(profileCreateInput);
  //   let update = await prisma.user.update({
  //     where: { id: ctx.user.id },
  //     data: { ...userInput },
  //   });

  //   return update;
  // }

  @Authorized()
  @Mutation((returns) => json)
  async updateUserProfile(
    @Arg("data") data: UpdateUserProfileInput,
    @Ctx() ctx: Context
  ) {
    // if (await isUserProfileLocked(ctx.user.id)){
    //   throw new Error('User profile is locked')
    // }

    let {
      firstName,
      lastName,
      dob,
      gender,
      avatar,
      address,
      facebook,
      instagram,
      linkedIn,
      qq,
      skype,
      twitter,
      weChat,
      weibo,
      socialLine,
      passportNumber,
      nationalSecurityNumber,
      deliveryAddress,
      secondaryProfilePic,
      walkthroughStep,
      doNotShowWalkthrough,
    } = data;

    console.log("updateUserProfile->data: ", data);

    const user = await prisma.user.findUnique({
      where: {
        id: ctx.user.id,
      },
    });

    // Handle profiles
    let existingLocales = [];

    for (const i in user.profiles) {
      let currProf = user.profiles[i];
      existingLocales.push(currProf.locale);
    }

    let profileUpdateInput = [],
      profileCreateInput = [];

    if (data.profiles) {
      data.profiles.forEach((profile) => {
        if (
          existingLocales.find(
            (existingprof) => existingprof.locale === profile.locale
          )
        ) {
          profileUpdateInput.push({
            where: {
              locale: profile.locale,
            },
            data: {
              categorisedKeywords: profile.categorisedKeywords || [],
              clusterKeywords: profile.clusterKeywords || [],
              keywords: profile.keywords || [],
              bio: profile.bio,
            },
          });

          this.addUserToKeywordCluster(user, profile.clusterKeywords);
        } else {
          profileCreateInput.push({
            locale: profile.locale,
            keywords: profile.keywords || [],
            clusterKeywords: [],
            categorisedKeywords: profile.categorisedKeywords || [],
            bio: profile.bio,
          });
        }
      });
    }

    let userInput = {
      firstName,
      lastName,
      gender,
      avatar,
      address: {
        country: address?.country,
        town: address?.town,
        postcode: address?.postcode,
        address: address?.address,
      },
      deliveryAddress: {
        country: deliveryAddress?.country,
        town: deliveryAddress?.town,
        postcode: deliveryAddress?.postcode,
        address: deliveryAddress?.address,
      },
      facebook,
      instagram,
      linkedIn,
      qq,
      skype,
      twitter,
      weChat,
      weibo,
      socialLine,
      passportNumber,
      nationalSecurityNumber,
      secondaryProfilePic,
      profiles: profileCreateInput,
      ...(dob && !isNaN(new Date(dob).getTime()) ? { dob: new Date(dob) } : {}),
    };

    let update;
    try {
      update = await prisma.user.update({
        where: { id: ctx.user.id },
        data: { ...userInput },
      });
    } catch (error) {
      console.log("error: ", error);
    }

    return update;
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateCompanyRepresentative(
    @Arg("data") data: UpdateUserProfileInput,
    @Ctx() ctx: Context
  ) {
    if (await isUserProfileLocked(ctx.user.id)) {
      throw new Error("User profile is locked");
    }

    let {
      userId,
      dob,
      gender,
      avatar,
      address,
      passportNumber,
      nationalSecurityNumber,
      deliveryAddress,
    } = data;

    const user = await prisma.user.findUnique({
      where: {
        id: new ObjectId(userId).toString(),
      },
    });

    // Handle profiles
    // let existingLocales = []

    // for (const i in user.profiles) {
    //   let currProf = user.profiles[i]
    //   existingLocales.push(currProf.locale)
    // }

    // let profileUpdateInput = [],
    //     profileCreateInput = []

    // if (data?.profiles) {
    //   data?.profiles.forEach(profile => {
    //     if (existingLocales.includes(profile?.locale)) {
    //       profileUpdateInput.push({
    //         where: {
    //           locale: profile?.locale,
    //         },
    //         data: {
    //           categorisedKeywords: { set: profile?.categorisedKeywords},
    //           keywords: {
    //             set: profile?.keywords
    //           },
    //         }
    //       })
    //     } else if (profile.locale){
    //       profileCreateInput.push({
    //         locale: profile.locale,
    //         keywords: {
    //           set: profile.keywords
    //         },
    //         categorisedKeywords: {
    //           set: profile.categorisedKeywords
    //         },
    //         bio: profile.bio
    //       })
    //     }
    //   })
    // }

    let userInput = {
      gender,
      dob,
      avatar,
      address: {
        country: address.country,
        town: address?.town,
        // these have been removed from the generic address in schema
        // city: address?.city,
        // state: address?.town,
        postcode: address?.postcode,
        address: address?.address,
      },
      deliveryAddress: {
        country: deliveryAddress?.country || address?.country,
        town: deliveryAddress?.town || address?.town,
        // these have been removed from the generic address in schema
        // city: address?.city,
        // state: address?.town,
        postcode: deliveryAddress?.postcode,
        address: deliveryAddress?.address,
      },
      passportNumber,
      nationalSecurityNumber,
      // profiles: {
      //   ...profileCreateInput
      // }
    };

    let update = await prisma.user.update({
      where: { id: new ObjectId(userId).toString() },
      data: { ...userInput },
    });
    //  don't need this anymore with prisma5? tbc - come back to
    // if (profileUpdateInput.length > 0) {
    //   // We need to do an update again for updating any profiles
    //   // otherwise we get "You have several updates affecting the same area of the document underlying User"
    //   update = await prisma.user.update({
    //     where: { id: new ObjectId(userId).toString()},
    //     data: {
    //       profiles: {
    //         ...profileUpdateInput
    //       }
    //     }
    //   })
    // }

    return update;
  }
  @Authorized()
  @Mutation((returns) => json)
  async updateChildProfile(@Arg("data") data: UpdateChildProfileInput) {
    let { firstName, lastName, dob, gender, avatar, phone, userId } = data;
    if (await isUserProfileLocked(userId)) {
      throw new Error("User profile is locked");
    }

    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    // Handle profiles
    let existingLocales = [];

    for (const i in user.profiles) {
      let currProf = user.profiles[i];
      existingLocales.push(currProf.locale);
    }

    let profileUpdateInput = [],
      profileCreateInput = [];

    if (data.profiles) {
      data.profiles.forEach((profile) => {
        if (existingLocales.find((existprof) => existprof === profile.locale)) {
          profileUpdateInput.push({
            where: {
              locale: profile.locale,
            },
            data: {
              keywords: {
                set: profile.keywords,
              },
              categorisedKeywords: {
                set: profile.categorisedKeywords,
              },
              bio: profile.bio,
            },
          });
        } else {
          profileCreateInput.push({
            locale: profile.locale,
            keywords: {
              set: profile.keywords,
            },
            categorisedKeywords: {
              set: profile.categorisedKeywords,
            },
            bio: profile.bio,
          });
        }
      });
    }

    let userInput = {
      firstName,
      lastName,
      gender,
      dob,
      avatar,
      phone,
      profiles: profileCreateInput,
    };

    let update = await prisma.user.update({
      where: { id: userId },
      data: { ...userInput },
    });

    if (profileUpdateInput.length > 0) {
      update = await prisma.user.update({
        where: { id: userId },
        data: {
          profiles: profileUpdateInput,
        },
      });
    }

    return update;
  }

  @Authorized()
  @Mutation((returns) => json)
  async archiveEmployee(
    @Arg("data") data: ArchiveEmployeeInput,
    @Ctx() ctx: Context
  ) {
    // 1. Fetch the company membership of the employee
    const memb = await prisma.companyMembership.findUnique({
      where: { id: data.employeeID },
      select: {
        id: true,
        status: true,
        role: true,
        company: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!memb) {
      throw new Error("No employee found with that ID");
    }

    if (memb.status === "ARCHIVED") {
      throw new Error("Target employee is already archived");
    }

    // 2. Check if the current user is in the same company as the employee
    const userInCompany = await checkIfUserIsInCompany(
      ctx.user.id,
      memb.company.id
    );
    if (!userInCompany) {
      throw new Error(
        "Current user is not in the same company as this employee"
      );
    }

    // 3. Get the current user's memberships in the company
    const employees = await prisma.companyMembership.findMany({
      where: {
        companyId: userInCompany.id,
        userId: ctx.user.id,
      },
    });

    if (employees.length === 0) {
      throw new Error(
        "Current user is not in the same company as this employee"
      );
    }

    const employeeUs = employees[0];

    // 4. Check if the current user has the permission to edit and archive
    const perm = await hasPermission(
      "msl_companyEmployees",
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      employeeUs.id
    );
    if (!perm) {
      return { error: "NO_PERMISSION" };
    }

    // 5. Update the employee status to 'ARCHIVED'
    return await prisma.companyMembership.update({
      where: { id: memb.id },
      data: {
        status: "ARCHIVED",
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateEmployee(
    @Arg("data") data: UpdateEmployeeInput,
    @Ctx() ctx: Context
  ) {
    let { phone, email, landline, jobTitle, avatar, department } = data;

    // 1. Find the company membership by employee ID
    const memb = await prisma.companyMembership.findUnique({
      where: { id: data.employeeID },
    });

    if (!memb) {
      throw new Error(
        "No user with the company details and user details provided was found"
      );
    }

    // 2. Gather existing profile locales
    const existingLocales = memb.profiles.map((profile) => profile.locale);

    let profileUpdateInput = [];
    let profileCreateInput = [];

    // 3. Prepare input for updating and creating profiles
    data?.profiles?.forEach((profile) => {
      profileCreateInput.push({
        locale: profile.locale,
        keywords: profile.keywords,
        categorisedKeywords: profile.categorisedKeywords,
        bio: profile.bio,
      });
    });

    if (email) email = email.toLowerCase();

    // 4. Check if the role has changed, update user groups and reset permissions
    let roleAsPrisma = convertUserGroupsToPrisma(data.role);
    let userGroupId = null;

    if (roleAsPrisma !== memb.role) {
      const userGroups = await prisma.userGroup.findMany({
        where: { role: roleAsPrisma },
      });

      if (userGroups.length > 0) {
        userGroupId = userGroups[0].id;

        console.log(
          `Deleting permissions for employee ${memb.id} as their user group has changed`
        );

        await prisma.permissionsNew.deleteMany({
          where: {
            employee: {
              id: memb.id,
            },
          },
        });
      }
    }

    // 5. Prepare the update data for the membership
    let updateData = {
      phone,
      landline,
      email,
      jobTitle,
      avatar,
      department,
      profiles: profileCreateInput,
    };

    if (userGroupId) {
      updateData["role"] = roleAsPrisma;
      updateData["fenixUserGroup"] = {
        connect: { id: userGroupId },
      };
    }
    console.log("stringify", JSON.stringify(updateData));
    // 6. Perform the membership update
    let update = await prisma.companyMembership.update({
      where: { id: memb.id },
      data: updateData,
    });

    // 7. If there are profile updates, perform a separate update for them
    if (profileUpdateInput.length > 0) {
      console.log("stringify", JSON.stringify(profileUpdateInput));

      update = await prisma.companyMembership.update({
        where: { id: memb.id },
        data: {
          profiles: profileUpdateInput,
        },
      });
    }

    return update;
  }

  @Authorized()
  @Query((returns) => json)
  async getAllCompanies() {
    return await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        logoURL: true,
        address: {
          select: {
            town: true,
            postcode: true,
            country: true,
            address: true,
          },
        },
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async getCompanyById(
    @Arg("data") data: GetEmployeesInput,
    @Ctx() ctx: Context
  ) {
    // Fetch the company by ID and include related data
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyID);
    // IZA come back to : todo, proper validation (synkd user bypass)
    // if (!company) throw new Error(`User is not part of this company`);
    let getCompany = await prisma.company.findUnique({
      where: { id: data.companyID },
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
            categorisedKeywords: true,
          },
        },
        category: true,
        business_type: true,
        representativeContact: {
          select: {
            id: true,
            email: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            country: true,
            currency: true,
            account_holder_name: true,
            account_holder_type: true,
            routing_number: true,
            account_number: true,
            sort_bsb_number: true,
            iban: true,
          },
        },
        billingDefaultType: true,
        landline: true,
        stripeAccountId: true,
        billingReferral: {
          select: {
            id: true,
            promoCode: true,
          },
        },
        type: true,
      },
    });

    let userMembership;
    if (data.employeeID) {
      const rels: any = await prisma.companyMembership.findUnique({
        where: {
          id: data.employeeID,
        },
      });
      userMembership = rels;
    }

    return { getCompany, userMembership }; // Return as an object
  }
  @Authorized()
  @Query((returns) => json)
  async getCompanyMissingInfo(@Arg("data") data: GetEmployeesInput) {
    const companySelected = await prisma.company.findUnique({
      where: { id: data.companyID },
      select: {
        id: true,
        name: true,
        currency: true,
        address: true,
        logoURL: true,
        email: true,
        url: true,
        vatNum: true,
        regNum: true,
        billingPhone: true,
        business_type: true,
        billingEmail: true,
        info: true,
        profiles: {
          select: {
            locale: true,
            bio: true,
            keywords: true,
            categorisedKeywords: true,
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
                passportNumber: true,
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

    const phoneNumbers = [
      companySelected?.billingPhone,
      companySelected?.representativeContact?.phone,
      companySelected?.representativeContact?.user?.phone,
    ];

    // Remove duplicates and filter out any falsy values
    const uniquePhoneNumbers = [...new Set(phoneNumbers.filter(Boolean))];

    //clean the phone numberto avoid multiple +++
    const cleanPhoneNumber = (number) => {
      return number
        .replace(/(\+){2,}/g, "+") // Replace multiple '+' with a single '+'
        .replace(/[^+\d]/g, ""); // Remove any non-digit and non-plus characters
    };

    // Parse the first valid cleaned phone number, if available
    const parsedPhone =
      uniquePhoneNumbers.length > 0
        ? parsePhoneNumberFromString(
            cleanPhoneNumber(uniquePhoneNumbers[0].toString())
          )
        : null;
    const parsedPhoneNumber = parsedPhone.number;
    const userAddress = companySelected?.representativeContact?.user?.address;

    const required = {};
    let companyProfile = [];
    let userProfile = [];
    let companyBilling = [];
    if (!companySelected.name) {
      companyProfile.push("Company Name");
    }
    if (!companySelected.email) {
      companyProfile.push("Company Email");
    }
    if (
      !(
        companySelected.address?.address ||
        (userAddress && userAddress?.address)
      )
    ) {
      userProfile.push("Company Representative Address");
    }
    if (
      !(
        companySelected.address?.postcode ||
        (userAddress && userAddress?.postcode)
      )
    ) {
      userProfile.push("Company Representative Postcode");
    }
    if (!(userAddress && userAddress?.town)) {
      userProfile.push("Company Representative City");
    }

    if (!companySelected.billingPhone) {
      companyBilling.push("Company Billing Phone");
    }
    if (
      !companySelected.regNum &&
      companySelected.business_type != "individual"
    ) {
      companyBilling.push("Company Registration Number");
    }
    //TODO: uncomment  after frontend is fixed
    // if (!companySelected.landline) {
    //   required.push('Company Landline')
    // }
    if (!companySelected.address) {
      companyProfile.push("Company Address");
    }
    if (!companySelected.category) {
      companyProfile.push("Company Category");
    }

    if (
      !companySelected.vatNum &&
      companySelected?.business_type?.toUpperCase() === "COMPANY"
    ) {
      companyProfile.push("Company Tax Number");
    }
    if (!companySelected.bankAccount?.account_holder_name) {
      companyBilling.push("Company Bank Account Name");
    }
    // if (!companySelected.bankAccount?.routing_number || !companySelected.bankAccount?.sort_bsb_number) {
    //   companyBilling.push('Bank Routing Number or Sort Code / BSB Number')
    // }

    if (!companySelected.bankAccount?.account_number) {
      companyBilling.push("Bank Account Number");
    }
    if (!companySelected.bankAccount?.country) {
      companyBilling.push("Bank Account Country");
    }
    if (!companySelected.bankAccount?.currency) {
      companyBilling.push("Bank Account currency");
    }
    if (!companySelected.representativeContact?.user?.firstName) {
      userProfile.push("Company Representative Firstname");
    }
    if (!companySelected.representativeContact?.user?.lastName) {
      userProfile.push("Company Representative Lastname");
    }
    if (!companySelected.representativeContact?.email) {
      userProfile.push("Company Representative Email");
    }
    if (!parsedPhoneNumber) {
      userProfile.push("Company Representative Phone");
    }
    if (!companySelected.representativeContact?.user?.passportNumber) {
      userProfile.push("Company Representative Passport Number");
    }
    if (
      !(
        companySelected.address?.address ||
        (userAddress && userAddress?.address)
      )
    ) {
      companyProfile.push("Company Address");
    }
    if (
      !(
        companySelected.address?.postcode ||
        (userAddress && userAddress?.postcode)
      )
    ) {
      companyProfile.push("Company Postcode");
    }
    if (!companySelected.address?.town) {
      companyProfile.push("Company City");
    }
    if (
      !(
        (companySelected.address?.country === "UK"
          ? "GB"
          : companySelected.address?.country) ||
        (userAddress &&
          (userAddress?.country === "UK" ? "GB" : userAddress?.country))
      )
    ) {
      companyProfile.push("Company Country");
    }
    if (
      !(
        userAddress &&
        (userAddress?.country === "UK" ? "GB" : userAddress?.country)
      )
    ) {
      companyProfile.push("Company Representative Country");
    }

    required["companyProfile"] = companyProfile;
    required["companyBilling"] = companyBilling;
    required["userProfile"] = userProfile;

    return required;
  }

  @Authorized()
  @Query((returns) => json)
  async getCompanyBySearch(@Arg("query") query: string) {
    // Convert the query to lowercase for case-insensitive search
    const lowerCaseQuery = query.toLowerCase();

    // Use findMany to search for companies
    return await prisma.company.findMany({
      where: {
        name: {
          contains: lowerCaseQuery,
          mode: "insensitive", // Enable case-insensitive search
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        status: true,
        isPrepaid: true,
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async employeesInCompany(@Arg("data") data: GetEmployeesInput) {
    return {
      companyMemberships: await prisma.companyMembership.findMany({
        where: {
          company: {
            id: data.companyID,
          },
          status: {
            not: "ARCHIVED",
          },
        },
        select: {
          id: true,
          role: true,
          status: true,
          email: true,
          phone: true,
          landline: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              updatedAt: true,
              address: {
                select: {
                  country: true,
                  postcode: true,
                  town: true,
                  address: true,
                },
              },
            },
          },
          jobTitle: true,
          avatar: true,
          department: true,
        },
      }),
    };
  }

  @Authorized()
  @Query((returns) => json)
  async allCustomersInCompany(@Arg("data") data: GetAllCustomersInput) {
    return await prisma.crmUser.findMany({
      where: {
        associatedCompany: {
          id: data.companyID,
        },
        status: {
          not: "UNSUBSCRIBED",
        },
      },
      select: {
        id: true,
        status: true,
        email: true,
        phone: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            updatedAt: true,
            address: {
              select: {
                country: true,
                postcode: true,
                town: true,
                address: true,
              },
            },
          },
        },
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async companyEmployeesAttendingEvent(
    @Arg("data") data: GetEmployeesEventInput
  ) {
    const { eventID } = data;

    // Fetch the event details along with organiser and attendees
    const eventSelected = await prisma.platformEvent.findUnique({
      where: { id: eventID },
      select: {
        organiser: {
          select: {
            company: {
              select: {
                id: true,
              },
            },
          },
        },
        attendees: {
          select: {
            id: true,
            invitationStatus: true,
            invitee: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!eventSelected) {
      throw new Error(`Event with ID ${eventID} not found`);
    }

    // Filter accepted attendees and map to invitee IDs
    const allAttendeeIds = eventSelected.attendees
      .filter((item) => item.invitationStatus === "ACCEPTED")
      .map((item) => item.invitee.id);

    // Fetch company memberships where the attendees belong to the company
    const companyEmployees = await prisma.companyMembership.findMany({
      where: {
        companyId: eventSelected.organiser.company.id,
        userId: { in: allAttendeeIds }, // Assuming the user ID is stored in userId
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        role: true,
        status: true,
        email: true,
        phone: true,
        landline: true,
        jobTitle: true,
        avatar: true,
        department: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            updatedAt: true,
            address: {
              select: {
                country: true,
                postcode: true,
                town: true,
                address: true,
              },
            },
          },
        },
      },
    });

    return companyEmployees;
  }

  @Authorized()
  @Query((returns) => json)
  async getUserDetails(@Arg("userID") userID: string) {
    // Get user details from ID
    const user = await prisma.user.findUnique({
      where: {
        id: userID,
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        lastActivity: true,
        phone: true,
        avatar: true,
        facebook: true,
        instagram: true,
        linkedIn: true,
        qq: true,
        skype: true,
        twitter: true,
        weChat: true,
        weibo: true,
        gender: true,
        dob: true,
        address: {
          select: {
            country: true,
            postcode: true,
            town: true,
            address: true,
          },
        },
        profiles: {
          select: {
            locale: true,
            bio: true,
            keywords: true,
            categorisedKeywords: true,
          },
        },
      },
    });

    return user;
  }

  @Authorized()
  @Query((returns) => json)
  async getEmployeeDetails(@Arg("data") data: GetEmployeeInput) {
    const employee = await prisma.companyMembership.findUnique({
      where: { id: data.employeeID }, // Use findUnique with where clause
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dob: true,
            gender: true,
            passportNumber: true,
            nationalSecurityNumber: true,
            address: {
              select: {
                country: true,
                postcode: true,
                town: true,
                address: true,
              },
            },
          },
        },
        jobTitle: true,
        avatar: true,
        department: true,
        profiles: {
          select: {
            locale: true,
            bio: true,
            keywords: true,
            categorisedKeywords: true,
          },
        },
        email: true,
        phone: true,
        status: true,
        role: true,
      },
    });

    if (!employee) {
      throw new Error(
        `No employee found with ID ${data.employeeID}. Please double-check the ID you are using.`
      );
    }

    return employee;
  }

  @Query((returns) => json)
  async allUsersForCompany(
    @Arg("companyID", { nullable: true }) companyID?: string,
    @Arg("legacyCompanyID", { nullable: true }) legacyCompanyID?: number
  ) {
    let lookup = {};

    if (companyID) {
      lookup["company"] = { id: companyID };
    } else if (legacyCompanyID) {
      // id is the legacy int ID
      lookup["company"] = { id: legacyCompanyID };
    } else {
      throw new Error(
        "Please provide either the company ID or the legacy company ID (for compatibility)"
      );
    }

    const users = await prisma.companyMembership.findMany({
      where: lookup,
      select: {
        email: true,
        phone: true,
        id: true,
        status: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        fenixUserGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return users;
  }

  @Query((returns) => json)
  async getCompanyMembershipForUser(
    @Arg("userID") userID: string,
    @Arg("legacyCompanyID") legacyCompanyID: string
  ) {
    const rels = await prisma.companyMembership.findMany({
      where: {
        user: { id: userID },
        company: { id: legacyCompanyID },
      },
      select: {
        email: true,
        phone: true,
        status: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
          },
        },
        fenixUserGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (rels.length === 0) {
      throw new Error("No company memberships found");
    }

    return rels[0];
  }

  @Authorized()
  @Query((returns) => json)
  async getUserByID(@Arg("userID") id: string) {
    return await prisma.user.findUnique({ where: { id } });
  }

  @Authorized()
  @Mutation((returns) => json)
  async deleteCompanyMembership(
    @Ctx() ctx: Context,
    @Arg("data") data: GetEmployeeInput
  ) {
    // TODO: check permission to do this
    // 1. Fetch the company membership of the employee
    const memb = await prisma.companyMembership.findUnique({
      where: { id: data.employeeID },
      select: {
        id: true,
        status: true,
        role: true,
        email: true,
        userId: true,
        personalEmail: true,
        company: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!memb) {
      throw new Error("No employee found with that ID");
    }

    // iza: come back to (modify this further by looking up via userid?)
    const empCrmExist = await prisma.crmUser.findMany({
      where: {
        email: memb.personalEmail,
        companyId: ctx.company.id,
      },
      select: {
        id: true,
      },
    });
    if (empCrmExist.length > 0) {
      // 6. get this companie's employee cluster
      const employeesCompanyCluster = await prisma.crmCluster.findFirst({
        where: {
          name: "Employees",
          clusterType: "EMPLOYEES",
          companyId: new ObjectId(ctx.company.id).toString(),
        },
        select: {
          id: true,
        },
      });
      // 7. remove employee's crmUser from Employee cluster
      await prisma.crmCluster.update({
        where: {
          id: new ObjectId(employeesCompanyCluster.id).toString(),
        },
        data: {
          users: {
            disconnect: {
              id: empCrmExist[0].id,
            },
          },
        },
      });
    }
    // 8. remove the employee from membership
    return await prisma.companyMembership.delete({
      where: {
        id: data.employeeID,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async removeCompanyRelationship(
    @Arg("companyRelationshipID") companyRelationshipID: string
  ) {
    const rel = await prisma.companyRelationship.findUnique({
      where: { id: new ObjectId(companyRelationshipID).toString() },
      include: { companies: true }, // Include companies information
    });

    if (!rel) throw new Error("Not a valid company relationship");

    // Delete all associated company relationship info entries
    await Promise.all(
      rel.companies.map(async (relCompInfo) => {
        await prisma.relationshipCompanyInfo.delete({
          where: {
            id: new ObjectId(relCompInfo.id).toString(),
          },
        });
      })
    );

    // Delete the company relationship itself
    const del = await prisma.companyRelationship.delete({
      where: {
        id: new ObjectId(companyRelationshipID).toString(),
      },
    });

    // TODO: send an email to both companies?
    // TODO: ensure that all users that are switched to the secondaryCompany using the switcher are switched back

    return del;
  }

  @Authorized()
  @Mutation((returns) => json)
  async confirmCompanyRelationship(
    @Arg("data") data: ConfirmCompanyRelationshipInput,
    @Ctx() ctx: Context
  ) {
    // Fetch the relationship details using findUnique
    const relationship = await prisma.companyRelationship.findUnique({
      where: { id: new ObjectId(data.companyRelationshipID).toString() },
      select: {
        companies: {
          select: {
            company: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            role: true,
          },
        },
      },
    });

    if (!relationship) {
      throw new Error("Invalid relationship ID");
    }
    const companies = relationship.companies;

    // Find the recipient company
    const recipientCompany = companies.find(
      (comp) => comp.role === "RECIPIENT"
    );

    if (!recipientCompany) {
      throw new Error("Relationship has no recipient company");
    }

    if (recipientCompany.company.id !== data.companyId) {
      throw new Error("Provided company ID is not the recipient");
    }

    // Check the confirming user is part of the company
    const userCompanies = await prisma.companyMembership.findMany({
      where: {
        userId: new ObjectId(ctx.user.id).toString(),
        companyId: new ObjectId(data.companyId).toString(),
      },
    });
    if (userCompanies.length === 0) {
      throw new Error("Not authorised to accept this relationship request");
    }

    const requesterCompany = companies.find(
      (comp) => comp.role === "REQUESTER"
    );

    if (!requesterCompany) {
      throw new Error("No requester company for this relationship");
    }

    // Update the relationship status
    const updatedRel = await prisma.companyRelationship.update({
      where: {
        id: new ObjectId(data.companyRelationshipID).toString(),
      },
      data: {
        status: "CONFIRMED",
      },
    });

    try {
      console.log("send relationship confirmation email");
      await sendEmail({
        from: { name: "Synkd", email: "no-reply@synkd.life" },
        to: requesterCompany.company.email, // Ensure this is correct
        subject: `${recipientCompany.company.name} accepted your family relationship request`,
        template: "msl-relationship-accepted",
        vars: {
          primaryCompany: requesterCompany.company.name,
          secondaryCompany: recipientCompany.company.name,
        },
      });
    } catch (err) {
      console.error(
        `Could not send relationship confirmation to ${requesterCompany.company.email}`
      );
    }

    return updatedRel;
  }

  /**
   * Returns a company ID if the relationship request key matches a company
   * @param key
   */
  @Authorized()
  @Query((returns) => json)
  async checkCompanyRelationshipRequestKey(@Arg("key") key: string) {
    let matchingCompanies = await prisma.company.findMany({
      where: {
        relationshipRequestKey: key,
      },
    });

    if (matchingCompanies.length === 0)
      throw new Error("No matching companies");

    let company = matchingCompanies[0];

    return { id: company.id, name: company.name, logoURL: company.logoURL };
  }

  @Authorized()
  @Query((returns) => json)
  async getRelationshipRequestKey(
    @Arg("companyId") companyId: string,
    @Ctx() ctx: Context
  ) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    let key = null;

    if (!company.relationshipRequestKey) {
      key = Generator.generateString(18);

      await prisma.company.update({
        data: {
          relationshipRequestKey: key,
        },
        where: {
          id: company.id,
        },
      });
    } else {
      key = company.relationshipRequestKey;
    }

    let url = `https://my.synkd.life/relreq/${key}`;
    let dataUrl = await generateQrCode(url);
    return { key: key, image: dataUrl };
  }

  @Authorized()
  @Mutation((returns) => json)
  async createCompanyRelationship(
    @Arg("data") data: CreateCompanyRelationshipInput
  ) {
    let recipientCompany = null;

    if (data.companyId) {
      // Company ID provided, just grab the company straight away
      recipientCompany = await prisma.company.findUnique({
        where: {
          id: data.companyId,
        },
      });
    } else {
      // Otherwise, lookup the target company by their email and phone
      const matchingCompanies = await checkIfCompanyExists(
        data.companyEmail,
        data.companyPhone
      );

      if (matchingCompanies === null || matchingCompanies.length === 0) {
        throw new Error("No companies found for given email or phone.");
      }

      recipientCompany = matchingCompanies[0] || matchingCompanies;
    }

    if (!recipientCompany) throw new Error("Recipient company does not exist");

    const inviterCompany = await prisma.company.findUnique({
      where: {
        id: data.primaryCompany,
      },
    });

    console.log("recipient", recipientCompany);
    console.log("inviter", inviterCompany);

    if (!inviterCompany) throw new Error("No valid company for primaryCompany");

    if (recipientCompany.id === inviterCompany.id)
      throw new Error("Company cannot create a relationship with itself");

    const existingRelationships: any =
      await prisma.companyRelationship.findMany({
        where: {
          companies: {
            some: {
              company: {
                id: recipientCompany.id,
              },
            },
          },
        },
        select: {
          companies: {
            select: {
              company: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

    let existingRelationshipsWithInviter = [];

    existingRelationships.forEach((rel) => {
      const companies = rel["companies"];
      companies.forEach((c) => {
        if (c.company.id === inviterCompany.id) {
          existingRelationshipsWithInviter.push(rel);
        }
      });
    });

    if (existingRelationshipsWithInviter.length > 0)
      throw new Error(
        "Companies already have a relationship, or pending relationship"
      );

    const createObjIds = () => {
      let newObjId = new ObjectId().toString();
      return {
        id: newObjId,
      };
    };
    // iza come back to 2day
    // Create the relationship node
    const newRelationship = await prisma.companyRelationship.create({
      data: {
        id: createObjIds().id,
        companies: {
          create: [
            {
              id: createObjIds().id,
              company: { connect: { id: inviterCompany.id } },
              role: "REQUESTER",
            },
            {
              id: createObjIds().id,
              company: { connect: { id: recipientCompany.id } },
              role: "RECIPIENT",
            },
          ],
        },
        status: "SENT",
      },
    });

    console.log("created new relationship", newRelationship);

    try {
      const acceptUrl = `https://my${
          process.env.NODE_ENV === "development" && "-dev"
        }.synkd.life/?a=accept&key=${newRelationship["id"]}&companyId=${
          recipientCompany["id"]
        }`,
        rejectUrl = `https://my${
          process.env.NODE_ENV === "development" && "-dev"
        }.synkd.life/?a=reject&key=${newRelationship["id"]}&companyId=${
          recipientCompany["id"]
        }`;
      await sendEmail({
        from: { name: "Synkd", email: "no-reply@synkd.life" },
        to: recipientCompany["email"], // TODO check this is correct
        subject: `${inviterCompany["name"]} requested to form a company relationship`,
        template: "msl-relationship-invite",
        vars: {
          primaryCompany: recipientCompany["name"],
          secondaryCompany: inviterCompany["name"],
          secondaryCompanyEmployeeName: inviterCompany["name"],
          Accept: acceptUrl,
          Reject: rejectUrl,
        },
      });
    } catch (e) {
      console.error(
        `Could not send new company relationship email for company ${recipientCompany["email"]}`
      );

      // Remove the new relationship as they won't be able to accept it
      // if (newRelationship) {
      //   await prisma.deleteCompanyRelationship({id: newRelationship.id})
      // }
    }

    return newRelationship;
  }

  @Authorized()
  @Query((returns) => json)
  async getCompanyRelationshipById(
    @Arg("relationshipID") relationshipID: string
  ) {
    return await prisma.companyRelationship.findUnique({
      where: { id: relationshipID },
      include: {
        companies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            users: {
              select: {
                id: true,
                email: true,
                phone: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async getCompanyRelationships(@Arg("companyID") companyID: string) {
    const relationships = await prisma.companyRelationship.findMany({
      where: {
        companies: {
          some: {
            company: {
              id: companyID,
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        companies: {
          select: {
            company: {
              select: {
                id: true,
                name: true,
                email: true,
                landline: true,
              },
            },
            role: true,
            users: {
              select: {
                id: true,
                email: true,
                phone: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return relationships;
  }

  @Authorized()
  @Mutation((returns) => json)
  async createFamilyRelationship(
    @Arg("data") data: CreateFamilyRelationshipInput,
    @Ctx() ctx: Context
  ) {
    try {
      let recipientUser = null;
      const matchingUsers = await checkIfUserAccountExists(
        data.userEmail,
        data.userPhone
      );
      console.log(data, "family data");
      if (data.child) {
        var signupInput: SignupInput = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.userEmail,
          country: data.country,
          // phone: data.userPhone,
          password: data.password,
          // gender: data.selectedGender,
          // dob: data.DOB,
          isChild: true,
          relationshipCreatorCurrency: ctx.company.currency,
        };
        if (matchingUsers) {
          throw new Error("User already exist.");
        }
        recipientUser = await adminSignup(signupInput);
      } else {
        if (matchingUsers === null) {
          throw new Error(
            "No MSL Account exists, check with Family Member for details or Add New Account"
          );
        } else {
          recipientUser = matchingUsers;
        }
      }
      if (!recipientUser) throw new Error("Recipient user does not exist");

      const inviterUser = ctx.user;

      if (!inviterUser) throw new Error("No valid user");

      if (recipientUser.id === inviterUser.id)
        throw new Error("User cannot create a relationship with itself");

      const existingRelationships: any =
        await prisma.familyRelationship.findMany({
          where: {
            users: {
              some: {
                user: {
                  id: recipientUser.id,
                },
              },
            },
          },
          include: {
            users: {
              include: {
                user: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });

      let existingRelationshipsWithInviter = [];

      existingRelationships.forEach((rel) => {
        const users = rel["users"];
        users.forEach((c) => {
          if (c.user.id === inviterUser.id) {
            existingRelationshipsWithInviter.push(rel);
          }
        });
      });

      if (existingRelationshipsWithInviter.length > 0)
        throw new Error(
          "Users already have a relationship, or pending relationship"
        );

      const createObjIds = () => {
        let newObjId = new ObjectId().toString();
        return {
          id: newObjId,
        };
      };
      // iza come back to 2day
      // Create the relationship node
      const newRelationship = await prisma.familyRelationship.create({
        data: {
          ...createObjIds(),
          status: "SENT",
          isChild: data.child,
          type: data.familyRelationship,
          users: {
            create: [
              {
                ...createObjIds(),
                user: { connect: { id: inviterUser.id } },
                role: "REQUESTER",
              },
              {
                ...createObjIds(),
                user: { connect: { id: recipientUser.id } },
                role: "RECIPIENT",
              },
            ],
          },
        },
      });

      console.log("created new relationship", newRelationship);

      try {
        const acceptUrl = `https://my${
            process.env.NODE_ENV === "development" ? "-dev" : ""
          }.synkd.life/family/${recipientUser.id}/relationships`,
          rejectUrl = `https://my${
            process.env.NODE_ENV === "development" ? "-dev" : ""
          }.synkd.life/?a=reject&key=${newRelationship["id"]}&UserId=${
            recipientUser["id"]
          }`;

        await sendEmail({
          from: { name: "Synkd", email: "no-reply@synkd.life" },
          to: recipientUser["email"], // TODO check this is correct
          subject: `${inviterUser["firstName"]} ${""} ${
            inviterUser["lastName"]
          } requested to form a Family relationship`,
          template: "msl-family-relationship-invite",
          vars: {
            primaryUser: recipientUser["firstName"],
            secondaryUser: inviterUser["firstName"],
            secondaryUserLastName: inviterUser["lastName"],
            Accept: acceptUrl,
            Reject: rejectUrl,
            passWord: data.password,
          },
        });
      } catch (e) {
        console.error(
          `Could not send new User relationship email for User ${recipientUser["email"]}`
        );

        // Remove the new relationship as they won't be able to accept it
        // if (newRelationship) {
        //   await prisma.deleteUserRelationship({id: newRelationship.id})
        // }
      }

      return newRelationship;
    } catch (err) {
      console.error(err);
      return err;
    }
  }

  @Authorized()
  @Query((returns) => json)
  async getFamilyRelationships(
    @Arg("userID") userID: string,
    @Ctx() ctx: Context
  ) {
    try {
      const data = await prisma.familyRelationship.findMany({
        where: {
          users: {
            some: {
              user: {
                id: userID,
              },
            },
          },
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  avatar: true,
                  isChild: true,
                },
              },
              // Include any other user fields you need here
            },
          },
        },
      });

      return data;
    } catch (err) {
      console.error(err);
      throw new Error("Failed to fetch family relationships");
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async confirmFamilyRelationship(
    @Arg("familyRelationshipID") familyRelationshipID: string,
    @Ctx() ctx: Context
  ) {
    // Fetch the relationship and users associated with it
    const relationship = await prisma.familyRelationship.findUnique({
      where: {
        id: familyRelationshipID,
      },
      select: {
        users: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            role: true,
          },
        },
      },
    });

    if (!relationship) {
      throw new Error("Invalid relationship ID");
    }

    const users = relationship.users;

    // Find the recipient user
    const recipientUser = users.find((use) => use.role === "RECIPIENT");

    if (!recipientUser) {
      throw new Error("Relationship has no recipient user");
    }
    if (recipientUser.user.id !== ctx.user.id) {
      throw new Error("Provided user ID is not the recipient");
    }

    const requesterUser = users.find((use) => use.role === "REQUESTER");

    if (!requesterUser) {
      throw new Error("No requester user for this relationship");
    }

    // Update the relationship status
    const updatedRel = await prisma.familyRelationship.update({
      where: {
        id: familyRelationshipID,
      },
      data: {
        status: "CONFIRMED",
      },
    });

    // Fetch all confirmed relationships involving the requester user
    const allRelationships = await prisma.familyRelationship.findMany({
      where: {
        users: {
          some: {
            userId: requesterUser.user.id,
          },
        },
        status: "CONFIRMED",
      },
      select: {
        id: true,
        type: true,
        users: {
          select: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const RelationshipUserID = allRelationships.map((item) => {
      const temp = item.users.find(
        (us) => us.user.id !== requesterUser.user.id
      );
      return { id: temp?.user.id }; // Handle case where temp might be undefined
    });

    try {
      await sendEmail({
        from: { name: "Synkd", email: "no-reply@synkd.life" },
        to: requesterUser.user.email, // Ensure this is correct
        subject: `${recipientUser.user.firstName} ${recipientUser.user.lastName} accepted your relationship request`,
        template: "msl-family-relationship-accepted",
        vars: {
          primaryUser: `${requesterUser.user.firstName} ${requesterUser.user.lastName}`,
          secondaryUser: `${recipientUser.user.firstName} ${recipientUser.user.lastName}`,
        },
      });
    } catch (err) {
      console.error(
        `Could not send relationship confirmation to ${requesterUser.user.email}`
      );
    }

    return updatedRel;
  }

  @Authorized()
  @Mutation((returns) => json)
  async removeFamilyRelationship(
    @Arg("familyRelationshipID") familyRelationshipID: string
  ) {
    // Fetch the family relationship, including associated user IDs
    const rel = await prisma.familyRelationship.findUnique({
      where: { id: familyRelationshipID },
      select: {
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!rel) throw new Error("Not a valid family relationship");

    // Delete all associated family relationship info entries
    await Promise.all(
      rel.users.map(async (relFamInfo) => {
        await prisma.relationshipFamilyInfo.delete({
          where: { id: relFamInfo.id },
        });
      })
    );

    // Then delete the family relationship itself
    const deletedRelationship = await prisma.familyRelationship.delete({
      where: { id: familyRelationshipID },
    });

    return deletedRelationship;
  }

  @Authorized()
  @Query((returns) => json)
  async familyMemberInUser(@Arg("data") data: GetUsersInput) {
    const familyRelationships = await prisma.familyRelationship.findMany({
      where: {
        users: {
          some: {
            user: {
              id: new ObjectId(data.userID).toString(),
            },
          },
        },
        status: "CONFIRMED",
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
                isChild: true,
              },
            },
            users: {
              select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return familyRelationships;
  }

  @Authorized()
  @Query((returns) => json)
  async getFamilyRelationshipById(
    @Arg("relationshipID") relationshipID: string
  ) {
    const relationship = await prisma.familyRelationship.findUnique({
      where: {
        id: relationshipID,
      },
      select: {
        id: true,
        status: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            role: true,
            users: {
              select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!relationship) {
      throw new Error(`No family relationship found with ID ${relationshipID}`);
    }

    return relationship;
  }

  @Authorized()
  @Mutation((returns) => json)
  async addUserToFamilyRelationship(
    @Arg("data") data: AddUserToFamilyRelationshipInput,
    @Ctx() ctx: Context
  ) {
    // Sanity check 1: Must be a valid user ID
    const recipientUser = await prisma.user.findUnique({
      where: { id: data.userMembershipId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isChild: true,
      },
    });

    // Sanity check 2: Must be a valid relationship ID
    const rel = await prisma.familyRelationship.findUnique({
      where: { id: data.RelationshipID },
      select: {
        id: true,
        users: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                isChild: true,
              },
            },
            users: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!rel) throw new Error("No such user relationship");

    // Sanity check 2: user must be part of the relationship
    const userInfo = rel.users.find((info) => info.user.id === data.userId);
    const IU = rel.users.filter((info) => info.user.id !== data.userId);

    if (!userInfo)
      throw new Error("Given user ID is not part of the relationship");

    const inviterUser = IU[0]?.user;

    const userInRelationship = userInfo.users.find(
      (compMemb) => compMemb.id === data.userMembershipId
    );
    let ret;

    const existingRelationships = await prisma.familyRelationship.findMany({
      where: {
        users: {
          some: {
            user: {
              id: recipientUser.id,
            },
          },
        },
      },
      select: {
        id: true,
        users: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const existingRelationshipsWithInviter = existingRelationships.filter(
      (rel) => rel.users.some((c) => c.user.id === inviterUser.id)
    );

    if (existingRelationshipsWithInviter.length > 0) {
      const relToDelete = existingRelationshipsWithInviter[0];
      for (const relFamInfo of relToDelete.users) {
        // First delete all associated family relationship info entries too
        await prisma.relationshipFamilyInfo.delete({
          where: { id: relFamInfo.id },
        });
      }
      console.log("remove direct relationship");
      // Then delete the family relationship itself
      await prisma.familyRelationship.delete({
        where: { id: relToDelete.id },
      });

      if (userInRelationship) {
        // If the company membership is already part of the relationship, remove it
        console.log(
          `[addUserToFamilyRelationship] Removing userMembership ${data.userMembershipId} from relationship user info ${userInfo.id}`
        );
        ret = await prisma.relationshipFamilyInfo.update({
          where: { id: userInfo.id },
          data: {
            users: {
              disconnect: { id: data.userMembershipId },
            },
          },
        });
      }
    } else {
      if (!userInRelationship) {
        // Create the relationship node
        const newRelationship = await prisma.familyRelationship.create({
          data: {
            status: "CONFIRMED",
            isChild: inviterUser.isChild,
            type: data.type,
            users: {
              create: [
                {
                  user: { connect: { id: inviterUser.id } },
                  role: "REQUESTER",
                  users: {
                    connect: { id: inviterUser.id },
                  },
                },
                {
                  user: { connect: { id: recipientUser.id } },
                  role: "RECIPIENT",
                  users: {
                    connect: { id: recipientUser.id },
                  },
                },
              ],
            },
          },
        });

        console.log(
          `[addUserToFamilyRelationship] Adding userMembership ${data.userMembershipId} to relationship user info ${userInfo.id}`
        );
        ret = await prisma.relationshipFamilyInfo.update({
          where: { id: userInfo.id },
          data: {
            users: {
              connect: { id: data.userMembershipId },
            },
          },
        });
      }
    }

    return ret;
  }

  @Authorized()
  @Mutation((returns) => json)
  async checkChildCount(@Ctx() ctx: Context) {
    return await prisma.familyRelationship.count({
      where: {
        users: {
          some: {
            user: {
              id: ctx.user.id,
            },
          },
        },
        isChild: true,
      },
    });
  }
  @Authorized()
  @Query((returns) => json)
  async familyRelationshipByUsers(
    @Arg("data") data: FamilyRelationshipByUsersInput
  ) {
    const existingRelationships = await prisma.familyRelationship.findMany({
      where: {
        users: {
          some: {
            userId: data.recipientId,
          },
        },
        status: "CONFIRMED",
      },
      select: {
        id: true,
        type: true,
        users: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const existingRelationshipsWithInviter = existingRelationships.filter(
      (rel) => rel.users.some((c) => c.user.id === data.requesterId)
    );

    return existingRelationshipsWithInviter.length > 0
      ? existingRelationshipsWithInviter
      : [];
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateFamilyType(@Arg("data") data: relationshipTypeUpdateInput) {
    const updatedRel = await prisma.familyRelationship.update({
      where: {
        id: data.relid,
      },
      data: {
        type: data.type,
      },
    });
    return updatedRel;
  }

  @Authorized()
  @Query((returns) => json)
  async getCompanyRelationshipsForUser(@Ctx() ctx: Context) {
    return await prisma.companyRelationship.findMany({
      where: {
        companies: {
          some: {
            users: {
              some: {
                userId: ctx.user.id,
              },
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        companies: {
          select: {
            company: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            role: true,
            users: {
              select: {
                id: true,
                email: true,
                phone: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async addUserToCompanyRelationship(
    @Arg("data") data: AddUserToCompanyRelationshipInput,
    @Ctx() ctx: Context
  ) {
    // Sanity check 1: Must be a valid relationship ID
    const rel = await prisma.companyRelationship.findUnique({
      where: {
        id: data.companyRelationshipID,
      },
      select: {
        id: true,
        companies: {
          select: {
            id: true,
            company: {
              select: {
                id: true,
              },
            },
            users: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!rel) throw new Error("No such company relationship");

    // Sanity check 2: Company must be part of the relationship
    const companyInfo = rel.companies.filter(
      (info) => info.company.id === data.companyId
    );
    if (companyInfo.length === 0) {
      throw new Error("Given company ID is not part of the relationship");
    }

    // Sanity check 3: Current user must be part of the company to be able to add users to the relationship
    const currentUserCompanies = await prisma.companyMembership.findMany({
      where: {
        userId: ctx.user.id,
        companyId: data.companyId,
      },
    });

    if (currentUserCompanies.length === 0) {
      throw new Error("Current user is not part of this company");
    }

    const targetUser = await prisma.companyMembership.findUnique({
      where: {
        id: data.companyMembershipId,
      },
      select: {
        id: true,
        company: {
          select: {
            id: true,
          },
        },
      },
    });

    // Sanity check 4: Ensure target company membership actually exists
    if (!targetUser) {
      throw new Error("Target company membership does not exist");
    }

    // Sanity check 5: Ensure target company membership is actually part of the same company
    if (targetUser.company.id !== data.companyId) {
      throw new Error(
        "Target company membership is not part of the company with given ID"
      );
    }

    console.log(companyInfo[0].users);

    const userInRelationship = companyInfo[0].users.filter(
      (compMemb) => compMemb.id === data.companyMembershipId
    );

    let ret;

    if (userInRelationship.length > 0) {
      // If the company membership is already part of the relationship, remove it
      console.log(
        `[addUserToCompanyRelationship] Removing companyMembership ${data.companyMembershipId} from relationship company info ${companyInfo[0].id}`
      );
      ret = await prisma.relationshipCompanyInfo.update({
        where: {
          id: companyInfo[0].id,
        },
        data: {
          users: {
            disconnect: { id: data.companyMembershipId },
          },
        },
      });
    } else {
      // Otherwise, add them to it
      console.log(
        `[addUserToCompanyRelationship] Adding companyMembership ${data.companyMembershipId} to relationship company info ${companyInfo[0].id}`
      );
      ret = await prisma.relationshipCompanyInfo.update({
        where: {
          id: companyInfo[0].id,
        },
        data: {
          users: {
            connect: { id: data.companyMembershipId },
          },
        },
      });
    }

    return ret;
  }

  @Authorized()
  @Query((returns) => json)
  async activeEmployeesInCompany(@Arg("data") data: GetEmployeesInput) {
    const companyMemberships = await prisma.companyMembership.findMany({
      where: {
        companyId: data.companyID,
        status: {
          not: "ARCHIVED",
        },
      },
      select: {
        id: true,
        role: true,
        status: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            address: {
              select: {
                country: true,
                postcode: true,
                town: true,
                address: true,
              },
            },
          },
        },
        jobTitle: true,
        email: true,
        phone: true,
        avatar: true,
        department: true,
      },
    });

    return companyMemberships;
  }

  @Authorized()
  @Mutation((returns) => json)
  async archiveCompanyMembership(@Arg("data") data: GetEmployeeInput) {
    // TODO: permissions check

    return await prisma.companyMembership.update({
      where: {
        id: data.employeeID,
      },
      data: {
        status: "ARCHIVED",
      },
    });
  }
  //update new password
  @Query((returns) => json)
  //Get login challange and user details
  async getUserWithInviteToken(@Arg("token") token: string) {
    return await prisma.loginChallenge.findFirst({
      where: {
        status: "UNUSED",
        code: token,
      },
      select: {
        id: true,
        status: true,
        user: {
          select: {
            email: true,
            id: true,
          },
        },
      },
    });
  }

  //update login challenge as used
  async updateChallengeAsUsed(challengeId: string) {
    const challenge = await prisma.loginChallenge.update({
      where: { id: challengeId },
      data: { status: "USED" },
    });
    return !!challenge; // Using double negation to return true if challenge exists, otherwise false.
  }

  //update new password
  @Mutation((returns) => json)
  async updatePassword(@Arg("data") data: UpdatePasswordInput) {
    const challengeWithUser = await this.getUserWithInviteToken(data.token);

    if (challengeWithUser) {
      const challenges = [challengeWithUser];

      if (challenges.length > 0) {
        if (challenges[0].status === "UNUSED") {
          const updateSuccess = await this.updateChallengeAsUsed(
            challenges[0].id
          );
          const email = challenges[0].user.email;

          if (updateSuccess) {
            const user = await prisma.user.findUnique({
              where: { email },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            });

            if (user) {
              const hashedPassword = bcrypt.hashSync(data.newPassword, 12);
              await prisma.user.update({
                where: { email },
                data: { password: hashedPassword },
              });

              await passwordUpdateSuccess(user); // Call success callback after password update

              return { success: true };
            } else {
              return { success: false };
            }
          }
        } else {
          throw new Error("Authentication token has already been used");
        }
      } else {
        throw new Error("Sorry, not a valid invite code");
      }
    } else {
      throw new Error("No matching challenge found");
    }
  }
  //Get login invite challenges for an user email, which is unused
  async getUserWithInviteEmail(@Arg("email") email: string) {
    const loginChallenges = await prisma.loginChallenge.findMany({
      where: {
        status: "UNUSED",
        challengeType: "INVITE",
        user: {
          email: email,
        },
      },
      select: {
        id: true,
        code: true,
        user: {
          select: {
            email: true,
            id: true,
          },
        },
      },
    });

    return loginChallenges;
  }

  @Authorized()
  @Mutation((returns) => json)
  async getS3POSTUploadToken(
    @Arg("type") type: POSTUploadTokenType,
    @Ctx() ctx: Context,
    @Arg("data", { nullable: true }) data?: GetS3POSTUploadTokenInput
  ) {
    let generatedPresign;
    const profileDataBucket = "user-profile-data";
    const creativeAssetBucket = "creative-assets";

    let options: S3UploadParams = {
      bucket:
        type === POSTUploadTokenType.CREATIVE_ASSET
          ? creativeAssetBucket
          : profileDataBucket,
      folder: "",
      key: data.key,
    };

    const normalImageConds = [
      ["starts-with", "$Content-Type", "image/"],
      ["content-length-range", 0, 5000000], // File must be 0 to 5MB
      { acl: "public-read" },
    ];

    switch (type) {
      case POSTUploadTokenType.AVATAR:
        options.folder = `lbi-avatars/${ctx.user.id}/`;
        break;
      case POSTUploadTokenType.SECONDARY_PROFILE_PIC:
        options.folder = `secondary-profile-pic/${ctx.user.id}/`;
        break;
      case POSTUploadTokenType.COMPANY_AVATAR:
        options.folder = `lbi-company-avatars/${ctx.company.id}/`;
        break;
      case POSTUploadTokenType.EVENT_LOGO:
        if (!data || !data.eventId)
          throw new Error("No event ID supplied in data parameter");
        // TODO more validation to ensure only organiser can upload an image
        options.folder = `event-logo/${data.eventId}/`;
        break;
      case POSTUploadTokenType.EMPLOYEE_AVATAR:
        if (!data || !data.companyId)
          throw new Error("No company ID supplied in data parameter");

        // Perms check: Check that the current user is an employee of the given company
        const companyMems = await prisma.companyMembership.findMany({
          where: {
            company: {
              id: data.companyId,
            },
            user: {
              id: ctx.user.id,
            },
          },
        });

        if (!companyMems || companyMems.length === 0)
          throw new Error("User is not an employee of given company ID");
        options.folder = `lbi-employee-avatars/${data.companyId}/${companyMems[0].id}/`;
        break;
      case POSTUploadTokenType.CREATIVE_ASSET:
        if (!data) throw new Error("No data supplied in data parameter");
        options.folder = `projectContents/${data.campaignID}/${data.projectID}/${data.formatName}/`;
        break;
      case POSTUploadTokenType.COMMUNITY_IMAGE:
        options.folder = `community-images/${ctx.user.id}/`;
        break;
      case POSTUploadTokenType.COMMUNITY_VIDEO:
        options.folder = `community-images/${ctx.user.id}/`;
        break;
      case POSTUploadTokenType.MARKETPLACE_PREVIEW:
        options.folder = `marketplace-preview/${ctx.user.id}/`;

        break;
      case POSTUploadTokenType.COMPANY_AVATAR_ADMIN:
        if (!data || !data.companyId)
          throw new Error("No company ID supplied in data parameter");

        // Perms check: Check that the current user is an employee of the given company
        let companyMemsAdmin = await prisma.companyMembership.findMany({
          where: {
            company: {
              id: data.companyId,
            },
            user: {
              id: ctx.user.id,
            },
          },
        });

        if (!companyMemsAdmin || companyMemsAdmin.length === 0)
          throw new Error("User is not an employee of given company ID");

        options.folder = `lbi-company-avatars/${data.companyId}/`;
        break;
      default:
        throw new Error("Invalid POSTUploadTokenType");
    }

    generatedPresign = await getS3UploadURL(options);
    if (generatedPresign == null) {
      generatedPresign = {
        error: "S3_ERROR",
        message: "Problem generating S3 pre-sign",
      };
    }
    return {
      generatedPresign,
    };
  }

  //send new password mail with code to user
  @Mutation((returns) => json)
  async sendNewPasswordInvite(@Arg("email") email: string) {
    // Get login challenge associated with the email
    const challengeWithUser = await this.getUserWithInviteEmail(email);

    if (challengeWithUser) {
      const challenges = challengeWithUser;

      if (challenges.length > 0) {
        // If the previous invite exists and is unused, resend the same code
        const user = await prisma.user.findUnique({
          where: { email: challenges[0].user.email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (user) {
          // Rahul JALAN : HELP
          // await resendAnInvite(challenges[0].code, user, false);
          return { resentInvite: true };
        } else {
          throw new Error(`Sorry, no user records found with email - ${email}`);
        }
      } else {
        // If no previous invite, create a new one
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (user) {
          await createInvite(user, false);
          return { createdNewInvite: true };
        } else {
          throw new Error(`No user records found with email - ${email}`);
        }
      }
    } else {
      throw new Error(`No login challenges found for email - ${email}`);
    }
  }

  @Authorized()
  @Query((returns) => json)
  async getCalendarInvitationList(
    @Arg("data") data: CalendarInvitationListInput,
    @Ctx() ctx: Context
  ) {
    const { memIds } = data;

    const users = await prisma.companyMembership.findMany({
      where: {
        id: { in: memIds },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    const userIds = Array.from(new Set(users.map((item) => item.user.id)));

    const senders = await prisma.calendarInvitation.findMany({
      where: {
        calendarEvent: {
          status: { not: "ARCHIVED" },
        },
        invitee: {
          user: {
            id: { in: userIds },
          },
        },
      },
    });

    const accepteds = await prisma.calendarInvitation.findMany({
      where: {
        calendarEvent: {
          status: { not: "ARCHIVED" },
        },
        accepted: {
          some: {
            user: {
              id: { in: userIds },
            },
          },
        },
      },
    });

    const declineds = await prisma.calendarInvitation.findMany({
      where: {
        calendarEvent: {
          status: { not: "ARCHIVED" },
        },
        declined: {
          some: {
            user: {
              id: { in: userIds },
            },
          },
        },
      },
    });

    const attendees = await prisma.calendarInvitation.findMany({
      where: {
        calendarEvent: {
          status: { not: "ARCHIVED" },
        },
        inviteed: {
          some: {
            user: {
              id: { in: userIds },
            },
          },
        },
      },
    });

    const allIds = Array.from(
      new Set([
        ...senders.map((item) => item.id),
        ...accepteds.map((item) => item.id),
        ...declineds.map((item) => item.id),
        ...attendees.map((item) => item.id),
      ])
    );

    return await prisma.calendarInvitation.findMany({
      where: {
        id: { in: allIds },
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        invitee: {
          select: {
            id: true,
            email: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        accepted: {
          select: {
            id: true,
            email: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        declined: {
          select: {
            id: true,
            email: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        inviteed: {
          select: {
            id: true,
            email: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        calendarEvent: {
          select: {
            id: true,
            name: true,
            description: true,
            startAt: true,
            endAt: true,
          },
        },
      },
    });
  }

  @Mutation((returns) => json)
  async createCalendarInvitation(
    @Arg("data") data: CreateCalendarInvitationInput,
    @Ctx() ctx: any
  ) {
    console.log(ctx);
    const { memIds, name, description, startAt, endAt } = data;

    return await prisma.calendarInvitation.create({
      data: {
        id: createObjectID().id,
        invitee: {
          connect: {
            id: ctx.companyMembership.id,
          },
        },
        inviteed: {
          connect: memIds.map((item: any) => ({ id: item })) || ctx.companyMembership.id,
        },
        calendarEvent: {
          create: {
            id: createObjectID().id,
            name,
            description,
            startAt,
            endAt,
            attendees: {
              connect: [],
            },
            organiser: {
              connect: {
                id: ctx.companyMembership.id,
              },
            },
          },
        },
      },
    });
  }

  @Mutation((returns) => json)
  async editCalendarInvitation(
    @Arg("data") data: EditCalendarInvitationInput,
    @Ctx() ctx: Context
  ) {
    const { memIds, name, description, startAt, endAt, invitationId } = data;

    const invitation = await prisma.calendarInvitation.findUnique({
      where: { id: invitationId },
      include: {
        invitee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (invitation && invitation.invitee.user.id !== ctx.user.id) {
      throw new Error(`Not the owner`);
    }

    return await prisma.calendarInvitation.update({
      where: {
        id: invitationId,
      },
      data: {
        inviteed: {
          connect: memIds.map((item: any) => ({ id: item })),
        },
        calendarEvent: {
          update: {
            name,
            description,
            startAt,
            endAt,
          },
        },
      },
    });
  }

  @Mutation((returns) => json)
  async removeCalendarInvitation(
    @Arg("data") data: RemoveCalendarInvitationInput,
    @Ctx() ctx: Context
  ) {
    const { invitationId } = data;

    const invitation = await prisma.calendarInvitation.findUnique({
      where: { id: invitationId },
      include: {
        invitee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (invitation && invitation.invitee.user.id !== ctx.user.id) {
      throw new Error(`Not the owner`);
    }

    return await prisma.calendarInvitation.update({
      where: {
        id: invitationId,
      },
      data: {
        calendarEvent: {
          update: {
            status: CalendarStatus.ARCHIVED,
          },
        },
      },
    });
  }

  @Mutation((returns) => json)
  async updateMembershipRole(
    @Arg("data") data: UpdateMembershipRole,
    @Ctx() ctx: Context
  ) {
    const { memId, role } = data;

    const memb = await prisma.companyMembership.findUnique({
      where: { id: memId },
    });

    let roleAsPrisma = role;
    let userGroupId = null;

    if (roleAsPrisma !== memb.role) {
      let userGroups = await prisma.userGroup.findMany({
        where: { role: roleAsPrisma },
      });

      if (userGroups.length > 0) {
        userGroupId = userGroups[0].id;

        console.log(
          `Deleting permissions (access types) for employee ${memb.id} as their user group has changed to ${userGroupId}`
        );

        await prisma.permissionsNew.deleteMany({
          where: {
            employee: {
              id: memb.id,
            },
          },
        });
      }
      // update user company membership with new perms
      return await prisma.companyMembership.update({
        where: {
          id: memId,
        },
        data: {
          role,
          fenixUserGroup: {
            connect: {
              id: userGroupId,
            },
          },
        },
      });
    }
    // if requested role is the same as user's current role
    return "requested role is already the same as user's current role";
  }

  @Authorized()
  @Query((returns) => json)
  async checkUserAvailable(
    @Arg("data") data: CheckUserInput,
    @Ctx() ctx: Context
  ) {
    const { email, phone } = data;

    if (!email && !phone) return [];

    const parameter: any = {};
    if (email) {
      parameter.email = email;
    }
    if (phone) {
      parameter.phone = phone;
    }
    return await prisma.user.findMany({
      where: parameter,
    });
  }

  @Query((returns) => json)
  async getUserNotificationList(@Ctx() ctx: Context) {
    const invitations = [];
    const companyMemberships = await prisma.companyMembership.findMany({
      where: {
        // eventInvitations: {
        //   some: {
        //     notificationStatus: {
        //       not: "ARCHIVED", // Adjusting enum value if necessary
        //     },
        //   },
        // },
        id: ctx.companyMembership.id, // Assuming user relation uses a `userId` foreign key
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
          },
        },
        eventInvitations: {
          select: {
            id: true,
            createdAt: true,
            eventType: true,
            invitationStatus: true,
            notificationStatus: true,
            invitee: {
              select: {
                id: true,
                avatar: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                user: {
                  select: {
                    id: true,
                    avatar: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            calendarEvent: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
              },
            },
            platformEvent: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
                organiser: {
                  select: {
                    id: true,
                    company: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        avatar: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
            platformEventSlot: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
                description: true,
                organiser: {
                  select: {
                    id: true,
                    company: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                venue: {
                  select: {
                    id: true,
                    name: true,
                    platformEvent: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            platformEventPricingSlot: {
              select: {
                id: true,
                item: true,
                event: {
                  select: {
                    id: true,
                    name: true,
                    contents: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    organiser: {
                      select: {
                        company: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                        user: {
                          select: {
                            id: true,
                            avatar: true,
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                  },
                },
                pricing: {
                  select: {
                    employee: {
                      select: {
                        id: true,
                        avatar: true,
                        company: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                        user: {
                          select: {
                            id: true,
                            avatar: true,
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                    id: true,
                    currency: true,
                    price: true,
                    duration: true,
                  },
                },
                currentPrice: true,
                currentCurrency: true,
                quantity: true,
                type: true,
                user: {
                  select: {
                    id: true,
                    avatar: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                employeeActionBy: {
                  select: {
                    id: true,
                    avatar: true,
                    company: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        avatar: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                status: true,
                startAt: true,
                endAt: true,
              },
            },
          },
        },
      },
    });

    const allEventIds = [];

    companyMemberships.forEach((mem: any) => {
      mem.eventInvitations.forEach((inv: any) => {
        if(inv.notificationStatus != "ARCHIVED"){
        switch (inv.eventType) {
          case "PLATFORM_EVENT":
            allEventIds.push(inv.platformEvent?.id);
            break;
          case "PLATFORM_EVENT_SLOT":
            allEventIds.push(inv.platformEventSlot?.venue?.platformEvent?.id);
            break;
          case "PLATFORM_EVENT_PRICING_SLOT":
            allEventIds.push(inv.platformEventPricingSlot?.event?.id);
            break;
        }

        }
      });
    });

    const allEvents = await prisma.platformEvent.findMany({
      where: {
        id: {
          in: Array.from(new Set(allEventIds.filter(Boolean))), // Using `in` instead of `idin`
        },
      },
      include: {
        contents: true,
      },
    });

    companyMemberships.forEach((mem: any) => {
      mem.eventInvitations.forEach((inv: any) => {
        if (inv.notificationStatus != NotificationStatus.ARCHIVED) {
          switch (inv.eventType) {
            case "PLATFORM_EVENT":
              invitations.push({
                id: inv.id,
                name: `Event Invitation to ${inv.platformEvent?.name}`,
                description: "",
                start_at: null,
                end_at: null,
                type: inv.eventType,
                invitationStatus: inv.invitationStatus,
                notificationStatus: inv.notificationStatus === null ? "UNREAD" : inv.notificationStatus,
                sender: inv.platformEvent?.organiser.company.name,
                //read: inv.read,
                // raw: inv,
                created_at: inv.createdAt,
                updated_at: inv.updatedAt,
              });
              break;
            case "PLATFORM_EVENT_SLOT":
              invitations.push({
                id: inv.id,
                name: inv.platformEventSlot?.name,
                description: inv.platformEventSlot?.description,
                start_at: inv.platformEventSlot?.startAt,
                end_at: inv.platformEventSlot?.endAt,
                type: inv.eventType,
                invitationStatus: inv.invitationStatus,
                notificationStatus: inv.notificationStatus === null ? "UNREAD" : inv.notificationStatus,
                sender:
                  [
                    inv.platformEventSlot?.organiser.user.firstName,
                    inv.platformEventSlot?.organiser.user.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ") || "",
                //read: inv.read,
                // raw: inv,
                created_at: inv.createdAt,
                updated_at: inv.updatedAt,
              });
              break;
            case "PLATFORM_EVENT_PRICING_SLOT":
              let eventSelected = allEvents.find(
                (evt: any) => evt.id === inv.platformEventPricingSlot?.event?.id
              );
              let content = eventSelected?.contents.find(
                (ctn: any) => ctn?.id === inv.platformEventPricingSlot?.item
              );

              invitations.push({
                id: inv.id,
                name: content?.name,
                description: content?.body,
                start_at: inv.platformEventPricingSlot?.startAt,
                end_at: inv.platformEventPricingSlot?.endAt,
                type: inv.eventType,
                invitationStatus: inv.invitationStatus,
                notificationStatus: inv.notificationStatus === null ? "UNREAD" : inv.notificationStatus,
                sender: "",
                //read: inv.read,

                // raw: inv,
                created_at: inv.createdAt,
                updated_at: inv.updatedAt,
              });
              break;
          }
        }
      });
    });
    // Personal Calendar
    const calendarInvitationsAsSender =
      await prisma.calendarInvitation.findMany({
        where: {
          invitee: {
            user: {
              id: ctx.user.id,
            },
          },
          notificationStatus: {
            not: NotificationStatus.ARCHIVED,
          },
          calendarEvent: {
            status: {
              not: "ARCHIVED",
            },
          },
        },
        include: {
          invitee: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          accepted: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          declined: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          calendarEvent: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              startAt: true,
              endAt: true,
              name: true,
              description: true,
              status: true,
            },
          },
        },
      });

    // Personal Calendar Invitations for "inviteed"
    const calendarInvitationsAsinviteed =
      await prisma.calendarInvitation.findMany({
        where: {
          inviteed: {
            some: {
              user: {
                id: ctx.user.id,
              },
            },
          },
          notificationStatus: {
            not: NotificationStatus.ARCHIVED,
          },
          calendarEvent: {
            status: {
              not: "ARCHIVED",
            },
          },
        },
        include: {
          inviteed: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          invitee: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          accepted: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          declined: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          calendarEvent: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              startAt: true,
              endAt: true,
              name: true,
              description: true,
              status: true,
            },
          },
        },
      });

    calendarInvitationsAsSender.forEach((inv: any) => {
      if (inv.notificationStatus != NotificationStatus.ARCHIVED) {
        let status = "AWAITING";
        if (inv.accepted.map((acc: any) => acc.id).includes(inv.invitee.id)) {
          status = "ACCEPTED";
        } else if (
          inv.declined.map((acc: any) => acc.id).includes(inv.invitee.id)
        ) {
          status = "DECLINED";
        }
        invitations.push({
          id: inv.id,
          name: inv.calendarEvent.name,
          description: inv.calendarEvent.description,
          start_at: inv.calendarEvent.startAt,
          end_at: inv.calendarEvent.endAt,
          type: "CALENDAR_EVENT",
          status: status,
          sender: "",
          //read: inv.read,

          // raw: inv,
          created_at: inv.createdAt,
          updated_at: inv.updatedAt,
        });
      }
    });

    calendarInvitationsAsinviteed.forEach((inv: any) => {
      if (inv.notificationStatus != NotificationStatus.ARCHIVED) {
        let status = "AWAITING";
        if (inv.accepted.map((acc: any) => acc.id).includes(inv.invitee.id)) {
          status = "ACCEPTED";
        } else if (
          inv.declined.map((acc: any) => acc.id).includes(inv.invitee.id)
        ) {
          status = "DECLINED";
        }
        invitations.push({
          id: inv.id,
          name: inv.calendarEvent.name,
          description: inv.calendarEvent.description,
          start_at: inv.calendarEvent.startAt,
          end_at: inv.calendarEvent.endAt,
          type: "CALENDAR_EVENT",
          status: status,
          sender:
            [
              inv.calendarEvent.invitee.user.firstName,
              inv.calendarEvent.invitee.user.lastName,
            ]
              .filter(Boolean)
              .join(" ") || "",
          //read: inv.read,

          // raw: inv,
          created_at: inv.createdAt,
          updated_at: inv.updatedAt,
        });
      }
    });

    // // Billing
    // const billings: any = await prisma.billingLedgers({
    //   where: {
    //     _user: ctx.user.id,
    //     notificationStatus_not: NotificationStatus.ARCHIVED
    //   }
    // })

    // billings.forEach(bil => {
    //   let name = ''
    //   if (bil.type === 'USAGE') {
    //     name = `Use Credit for ${bil.service}`
    //   } else if (bil.type === 'TOPUP') {
    //     name = `Topup Credit for ${bil.service}`
    //   } else if (bil.type === 'FREE') {
    //     name = `Get Free Credit for ${bil.service}`
    //   } else if (bil.type === 'MONTHLY') {
    //     name = `Monthly Credit for ${bil.service}`
    //   }

    //   invitations.push({
    //     id: bil.id,
    //     name: name,
    //     description: bil.description,
    //     start_at: null,
    //     end_at: null,
    //     type: 'BILLING',
    //     status: '',
    //     sender: '',

    //     // raw: bil,
    //     created_at: bil.timestamp,
    //     updated_at: bil.timestamp,
    //   })
    // });

    //Follow Up Date CrmUser
    // Fetch company memberships for the user
    let otherMemberships = await prisma.companyMembership.findMany({
      where: {
        user: {
          id: ctx.user.id,
        },
      },
      select: {
        id: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Extract the company IDs from memberships
    const membershipCompanies = otherMemberships.map((item) => item.company.id);

    // Fetch CRM users associated with the membership companies
    const allCrmUsers = await prisma.crmUser.findMany({
      where: {
        notificationStatus: {
          not: NotificationStatus.ARCHIVED,
        },
        associatedCompany: {
          id: {
            in: membershipCompanies,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        personal_notes: true,
        personal_notes_follow_up_date: true,
        em_notes: true,
        em_notes_follow_up_date: true,
        cm_notes: true,
        cm_notes_follow_up_date: true,
      },
    });

    allCrmUsers.forEach((crmUser) => {
      if (crmUser.personal_notes_follow_up_date) {
        invitations.push({
          id: crmUser.id,
          name: `Follow Up Personal Notes for ${[
            crmUser.firstName,
            crmUser.lastName,
          ]
            .filter(Boolean)
            .join(" ")}`,
          description: crmUser.personal_notes,
          start_at: null,
          end_at: null,
          type: "CRM_USER",
          status: "",
          sender: "",

          // raw: bil,
          created_at: crmUser.personal_notes_follow_up_date,
          updated_at: crmUser.personal_notes_follow_up_date,
        });
      }
      if (crmUser.em_notes_follow_up_date) {
        invitations.push({
          id: crmUser.id,
          name: `Follow Up Employee Notes for ${[
            crmUser.firstName,
            crmUser.lastName,
          ]
            .filter(Boolean)
            .join(" ")}`,
          description: crmUser.em_notes,
          start_at: null,
          end_at: null,
          type: "CRM_USER",
          status: "",
          sender: "",

          // raw: bil,
          created_at: crmUser.em_notes_follow_up_date,
          updated_at: crmUser.em_notes_follow_up_date,
        });
      }
      if (crmUser.cm_notes_follow_up_date) {
        invitations.push({
          id: crmUser.id,
          name: `Follow Up Company Notes for ${[
            crmUser.firstName,
            crmUser.lastName,
          ]
            .filter(Boolean)
            .join(" ")}`,
          description: crmUser.cm_notes,
          start_at: null,
          end_at: null,
          type: "CRM_USER",
          status: "",
          sender: "",

          // raw: bil,
          created_at: crmUser.cm_notes_follow_up_date,
          updated_at: crmUser.cm_notes_follow_up_date,
        });
      }
    });
    invitations.sort((a, b) => moment(b.created_at).diff(a.created_at));

    return invitations;
  }
}

export const createCompanyBalance = async (company: any) => {
  const subscriptionPackage: any = await prisma.billingProduct.findFirst({
    where: { name: "Free" },
  });

  const services = await prisma.marketingTopupService.findMany();

  const topupPackages = {
    EMAIL: 0,
    SMS: 0,
    RESEARCH: 0,
    CODE: 0,
    WEBSITE_TEMPLATE: 0,
    LANDING_PAGES: 0,
    NEWSLETTER: 0,
    DIGITAL_AD: 0,
    STRATEGY: 0,
    MEDIA: 0,
  };

  const subscriptionPackages = {
    USER: 1,
    EMAIL: 500,
    SMS: 0,
    RESEARCH: 1,
    CODE: 100,
    WEBSITE_TEMPLATE: 0,
    LANDING_PAGES: 1,
    NEWSLETTER: 1,
    DIGITAL_AD: 1,
    STRATEGY: 1,
  };

  let updatedServices: {
    type: string;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];
  if (subscriptionPackage?.fulfilment?.services) {
    const subscriptionServices = subscriptionPackage.fulfilment.services;

    updatedServices = subscriptionServices.map((service) => {
      const currentItem = services.find((item) => item.id === service.id);
      return {
        type: currentItem?.name || "UNKNOWN",
        balance: service.quantity,
        createdAt: new Date(), // Set to the current date
        updatedAt: new Date(),
      };
    });
  }

  // Create topup services dynamically
  const topupServices = Object.entries(topupPackages).map(
    ([type, balance]) => ({
      type,
      balance,
      createdAt: new Date(), // Set to the current date
      updatedAt: new Date(),
    })
  );

  // Create subscription services dynamically
  const subscriptionServices = Object.entries(subscriptionPackages).map(
    ([type, balance]) => ({
      type,
      balance,
      createdAt: new Date(), // Set to the current date
      updatedAt: new Date(),
    })
  );

  // Check if a balance already exists for the company
  const existingBalances = await prisma.balance.findMany({
    where: { companyId: company.id /*company_Id: company._id */ },
  });

  if (!existingBalances.length) {
    try {
      // Create TOPUP balance
      await prisma.balance.create({
        data: {
          companyId: company.id,
          // company_Id: company.id,
          balanceType: "TOPUP",
          services: topupServices,
        },
      });
    } catch (error) {
      console.error("Error adding TOPUP balances:", error);
    }

    try {
      // Create SUBSCRIPTION balance
      await prisma.balance.create({
        data: {
          companyId: company.id,
          // company_Id: company.id,
          balanceType: "SUBSCRIPTION",
          package: { connect: { id: subscriptionPackage?.id } },
          services: subscriptionServices,
          // iza use the predefined sub credits to avoid conflicts
          // updatedServices.length
          //   ? updatedServices
          //   : subscriptionServices,
        },
      });
    } catch (error) {
      console.error("Error adding SUBSCRIPTION balances:", error);
    }
  }
};
