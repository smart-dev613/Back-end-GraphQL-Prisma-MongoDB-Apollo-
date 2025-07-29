import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { createInitialPermsForUserGroup } from "../../src/helpers/permissionsHelper";
import { createObjectID } from "../createIDs";
import { CompanyUniqueValuesMust } from "../interfaces/company";
import { UserGroupNameEnum } from "../interfaces/user";

type Int = number;

interface CompanyDetails {
  id: string;
}

interface CompanyGroupDetails {
  name: UserGroupNameEnum;
  role: string;
}

export const createUserGroup = async (
  companyDetails: CompanyDetails,
  groupDetails: CompanyGroupDetails
) => {
  const { name, role } = groupDetails;
  let group = await prisma.userGroup.create({
    data: {
      // Assuming createObjectID() returns an object with valid fields
      id: createObjectID().id, // if your model requires an ID
      name,
      role,
      company: {
        connect: {
          id: companyDetails.id,
        },
      },
    },
  });

  try {
    console.log(`Creating initial perms for user group ${group.id}`);
    await createInitialPermsForUserGroup(group.id);
  } catch (err) {
    console.error(`Can't create default perms for user group ${group.id}`);
  }

  return group;
};

export const createAllUserGroups = async (
  companyInfo: CompanyUniqueValuesMust
) => {
  // Check if usergroups exist for this company already
  let userGroups = await prisma.userGroup.findMany({
    where: {
      company: {
        id: companyInfo.id,
      },
    },
  });

  // If usergroups don't exist for this company
  if (userGroups.length < 4) {
    console.log("no usergroups exist");
    //TODO only Create missing user groups
    // Right now creates all user groups
    for (let [k, v] of Object.entries(UserGroupNameEnum)) {
      const companyUserGroup = await createUserGroup(
        { id: companyInfo.id },
        { name: v, role: k }
      );
      userGroups.push(companyUserGroup);
    }
  }

  return userGroups;
};
