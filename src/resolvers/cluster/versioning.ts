// /*
// @author - Rishabh Jindal

// @description - Allows versioning of CRM User data

// */
import { ObjectId } from "mongodb";
import { KeywordType, PrismaClient, user } from "@prisma/client";
const prisma = new PrismaClient();
import { Mutation, Query, Resolver, Arg, InputType, Field } from "type-graphql";
import { json } from "../../helpers";
import { db } from "../../helpers/mongoHelper";
import { equals, IsOptional } from "class-validator";
import { KeywordInterface } from "../../types/KeywordInterface";
import { KeywordInput } from "../keywordsResolver";
import { SearchHelper } from "../../helpers/SearchHelper";

interface companyPermissions {
  id?: string;
  companyProfiles?: boolean;
  companyURL?: boolean;
  companyEmail?: boolean;
  companyPhone?: boolean;
  companyAddress?: boolean;
  companyCategory?: boolean;
  companyKeywords?: boolean;
  companyWebsite?: boolean;

  employeeEmail?: boolean;
  employeeJobTitle?: boolean;
}

interface employeePermissions {
  shareEmployeeKeywords?: boolean;
  shareJobTitle?: boolean;
}

interface marketingPreferences {
  sharePersonalEmail?: boolean;
  sharePersonalPhone?: boolean;
  shareDateOfBirth?: boolean;
  shareGender?: boolean;
  shareCompanyData?: companyPermissions[];
}

enum PermissionedCollection {
  "company" = "company",
  "employee" = "CompanyMembership",
  "user" = "user",
}

/* At the moment the permissions don't hold information about which collection they refer to, and which fields they allow to access
   For the program to know what fields are associated with each permission, the following map is needed.
   In case in the future we have better permission structure with knowledge of fields/collections, this can be improved
*/
const permissionToFieldMap: {
  [key: string]: {
    collection: PermissionedCollection;
    fields: string | string[];
  };
} = {
  companyAddress: {
    collection: PermissionedCollection.company,
    fields: ["address"],
  },
  companyProfiles: {
    collection: PermissionedCollection.company,
    fields: ["profiles"],
  },
  companyEmail: {
    collection: PermissionedCollection.company,
    fields: ["email"],
  },
  companyURL: { collection: PermissionedCollection.company, fields: ["URL"] },
  companyCategory: {
    collection: PermissionedCollection.company,
    fields: ["category"],
  },

  employeeEmail: {
    collection: PermissionedCollection.employee,
    fields: ["email"],
  },
  employeeProfiles: {
    collection: PermissionedCollection.employee,
    fields: ["profiles"],
  },
  employeeJobTitle: {
    collection: PermissionedCollection.employee,
    fields: ["jobTitle"],
  },

  sharePersonalEmail: {
    collection: PermissionedCollection.user,
    fields: ["Email", "emailVerified"],
  },
  sharePersonalPhone: {
    collection: PermissionedCollection.user,
    fields: ["Phone", "phoneVerified"],
  },
  shareDateOfBirth: {
    collection: PermissionedCollection.user,
    fields: ["BirthDate"],
  },
  shareGender: { collection: PermissionedCollection.user, fields: ["Gender"] },
  shareCity: { collection: PermissionedCollection.user, fields: ["city"] },
  shareCountry: {
    collection: PermissionedCollection.user,
    fields: ["country"],
  },
  sharePersonalProfile: {
    collection: PermissionedCollection.user,
    fields: ["profiles"],
  },
};

export const onMarketingPermissionUpdate = async (
  changedPermission: marketingPreferences,
  userID: string,
  associatedCompanyID: string
) => {
  // Stage 0: check whether this CrmUser is set to update automatically
  const syncDataBool = await db.collection("CrmUser").findOne(
    {
      user: new ObjectId(userID),
      associatedCompany: new ObjectId(associatedCompanyID),
    },
    { projection: { syncData: 1 } }
  );

  // Return if the user is set to not sync or CrmUser is not found
  if (!syncDataBool || !syncDataBool["syncData"]) {
    return;
  }

  let fieldsToUnset = {};
  let fieldsToUpdate = {};

  // Stage 1: set/unset personal data
  let userFieldsToFetch = {};
  for (let k of Object.keys(changedPermission)) {
    if (
      k in permissionToFieldMap &&
      permissionToFieldMap[k].collection == PermissionedCollection.user
    ) {
      if (changedPermission[k] == true) {
        const fields = permissionToFieldMap[k].fields;
        for (let field of fields) {
          userFieldsToFetch[field] = 1;
        }
      } else if (changedPermission[k] == false) {
        const fields = permissionToFieldMap[k].fields;
        for (let field of fields) {
          fieldsToUnset[field] = 1;
        }
      }
    }
  }

  // Only if there are any user fields to fetch
  if (Object.keys(userFieldsToFetch).length > 0) {
    const user = await db.collection(PermissionedCollection.user).findOne(
      { id: new ObjectId(userID) },
      { projection: { _id: 0, ...userFieldsToFetch } }
      // userFieldsToFetch
    );

    fieldsToUpdate = { ...fieldsToUpdate, ...user };
  }

  // Stage 2. prepare the company data
  if (changedPermission.shareCompanyData) {
    // There was no easy way to update the objects inside array in MongoDB, thus we are taking the approach of touching the whole object
    const companiesQuery = await db.collection("CrmUser").findOne(
      {
        user: new ObjectId(userID),
        associatedCompany: new ObjectId(associatedCompanyID),
      },
      { projection: { companies: 1 } }
    );
    let existingCompanies: any[] = companiesQuery.companies
      ? companiesQuery.companies
      : [];

    for (let companyPermission of changedPermission.shareCompanyData) {
      const companyFieldsToFetch = {};
      const employeeFieldsToFetch = {};

      if (companyPermission.id) {
        // Fetch name in any case
        companyFieldsToFetch["Name"] = 1;

        let existingCompanyIndex = existingCompanies.findIndex((v) =>
          new ObjectId(companyPermission.id).equals(v["id"])
        );
        let existingCompany: any =
          existingCompanyIndex > -1
            ? existingCompanies.splice(existingCompanyIndex, 1)[0]
            : { id: new ObjectId(companyPermission.id) };

        for (let k of Object.keys(companyPermission)) {
          if (
            k in permissionToFieldMap &&
            permissionToFieldMap[k].collection == PermissionedCollection.company
          ) {
            if (companyPermission[k] == true) {
              const fields = permissionToFieldMap[k].fields;
              for (let field of fields) {
                companyFieldsToFetch[field] = 1;
              }
            } else if (companyPermission[k] == false) {
              const fields = permissionToFieldMap[k].fields;
              for (let field of fields) {
                delete existingCompany[field];
              }
            }
          }

          // handle employee fields to fetch/unset
          else if (
            k in permissionToFieldMap &&
            permissionToFieldMap[k].collection ==
              PermissionedCollection.employee
          ) {
            if (companyPermission[k] == true) {
              const fields = permissionToFieldMap[k].fields;
              for (let field of fields) {
                employeeFieldsToFetch[field] = 1;
              }
            } else if (companyPermission[k] == false) {
              const fields = permissionToFieldMap[k].fields;
              for (let field of fields) {
                delete existingCompany?.employeeDetails[field];
              }
            }
          }
        }
        // fetch this company fields
        if (Object.keys(companyFieldsToFetch).length > 0) {
          const companyDataToUpdate = await db
            .collection(PermissionedCollection.company)
            .findOne(
              { id: new ObjectId(companyPermission.id) },
              { projection: { _id: 0, ...companyFieldsToFetch } }
            );
          existingCompany = { ...existingCompany, ...companyDataToUpdate };
        }

        const selectObject: any = {};
        for (let field of Object.keys(employeeFieldsToFetch)) {
          if (field === "profiles") {
            selectObject.profiles = {
              select: {
                locale: true,
                bio: true,
                keywords: true,
              },
            };
          } else {
            selectObject[field] = true;
          }
        }

        if (Object.keys(selectObject).length > 0) {
          // Fetch employee data using Prisma Client
          const employeeData = await prisma.companyMembership.findMany({
            where: {
              userId: userID,
              companyId: companyPermission.id,
            },
            select: selectObject,
          });

          if (employeeData.length > 0) {
            existingCompany = {
              ...existingCompany,
              employeeDetails: employeeData[0],
            };
          }
        }

        // we removed this company earlier. now putting the updated value back
        existingCompanies.push(existingCompany);
      }
    }

    // update the db companies array with the whole array here
    fieldsToUpdate["companies"] = existingCompanies;
  }

  await db.collection("CrmUser").updateOne(
    {
      user: new ObjectId(userID),
      associatedCompany: new ObjectId(associatedCompanyID),
    },
    { $set: fieldsToUpdate, $unset: fieldsToUnset }
  );
};

const crmUsersMeetingSpecifiedQuery = async (
  crmUserFieldsQuery: any,
  associatedCompanyID: string,
  keyWordQuery: KeyWordQuery
) => {
  // TODO: query based on cluster membership

  // (((lastname: wong && jobTitle: actors) && firstName: Ibrahim) or age 25) or

  // Warning: this may be hard on the memory if there are many documents since the below code loads them all in memory
  let usersMatchingCrmUserFields = await db
    .collection("CrmUser")
    .aggregate([
      { $match: { associatedCompany: new ObjectId(associatedCompanyID) } },

      {
        $match: crmUserFieldsQuery,
      },
    ])
    .toArray();

  if (keyWordQuery) {
    // get the user base on the associated crmUser
    // this is done becasue the profile keyword is stored in the user profile not the crmUser collection
    const userIds = usersMatchingCrmUserFields.map((crmUser) => crmUser.user);
    // Create Cluster Query
    const userQuery = {
      [keyWordQuery.operator.toLowerCase()]: [
        {
          profiles: {
            some: {
              categorisedKeywords: {
                hasSome: [...(keyWordQuery.keyword.map((k) => k.slug))],
              },
            },
          },
        },
      ],
    };

    // filter the user based on associated keywords  :
    const searchHelper = new SearchHelper("user");
    const userResults = await searchHelper.search<user>({
      and: [{ _id: { in: userIds } }, userQuery],
    });
    const matchedUsers = userResults.map((u) => u.id);
    usersMatchingCrmUserFields = usersMatchingCrmUserFields.filter((crmUser) =>
      matchedUsers.includes(crmUser.user)
    );
  }

  return usersMatchingCrmUserFields;
};

@InputType()
class KeyWordQuery {
  @Field((type) => KeywordInput, { nullable: false })
  keyword: KeywordInput[];

  @Field()
  operator: string;
}

@InputType()
class CrmUsersMeetingConditionsInput {
  @Field()
  crmUserConditions: string;

  @Field()
  associatedCompanyID: string;

  @Field((type) => KeyWordQuery, { nullable: true })
  query?: KeyWordQuery;
}

@InputType()
class ToggleCrmUserSynkdDataInput {
  @Field((type) => [String])
  crmUserIDs: string[];

  @Field()
  syncData: boolean;
}

@Resolver()
export class CrmQueries {
  @Query((returns) => json)
  async crmUsersMeetingConditions(
    @Arg("data") data: CrmUsersMeetingConditionsInput
  ) {
    return crmUsersMeetingSpecifiedQuery(
      JSON.parse(data.crmUserConditions),
      data.associatedCompanyID,
      data.query
    );
  }

  @Mutation((returns) => json)
  async toggleCrmUserSynkdData(@Arg("data") data: ToggleCrmUserSynkdDataInput) {
    await toggleCrmUserSynkdData(data.crmUserIDs, data.syncData);
    return { success: true };
  }
}

const stringToMongoIDs = (stringIDs: string[]): ObjectId[] => {
  return stringIDs.map((id) => new ObjectId(id));
};
/*
Toggles whether to sync data or not for the target CrmUser IDs
*/
const toggleCrmUserSynkdData = async (
  crmUserIDs: string[],
  syncData: boolean
) => {
  // TODO: apply permissions pipeline (associatedCompany == authenticated company)

  const crmUserObjIds = crmUserIDs.map((id) => new ObjectId(id));
  await db
    .collection("CrmUser")
    .updateMany({ _id: { $in: crmUserObjIds } }, { $set: { syncData } });

  syncExistingUsersData(crmUserIDs);
};

const syncExistingUsersData = async (crmUserIDs: string[]) => {
  // only keep the CrmUsers with a synkd user association
  const existingCrmUsersWithUserAssociation = await db
    .collection("CrmUser")
    .find(
      { _id: { $in: stringToMongoIDs(crmUserIDs) }, user: { $exists: true } },
      { projection: { user: 1, associatedCompany: 1 } }
    )
    .toArray();

  if (existingCrmUsersWithUserAssociation.length == 0) {
    return;
  }

  const associatedCompanyID =
    existingCrmUsersWithUserAssociation[0].associatedCompany;

  const userObjectIDs = existingCrmUsersWithUserAssociation.map(
    (crmUser) => crmUser.user
  );
  // get preferences for users
  const marketingPrefs = db
    .collection("UserMarketingPreference")
    .find({ user: { $in: userObjectIDs }, company: associatedCompanyID });

  marketingPrefs.forEach((pref) => {
    onMarketingPermissionUpdate(
      JSON.parse(pref.preferences),
      pref.user,
      associatedCompanyID
    );
  });
};
