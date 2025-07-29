import 'reflect-metadata'
import { prisma, Int, UserGroup } from "../src/generated/prisma-client";
import { ObjectId } from "mongodb";
import { hashCode } from "../util/hashCode";
import {hash} from 'bcryptjs'
import {createOrUpdateCompany, createBrandIfNone, createAdvertiserIfNone} from './readExcel'

import xlsx from 'xlsx'
import { UserGroupNameEnum } from "../util/interfaces/user";
import { createInitialPermsForUserGroup } from "../src/helpers/permissionsHelper";



interface CompanyDetails {
  id: string;
  _id: Int;
}

interface CompanyGroupDetails {
  name: UserGroupNameEnum;
}

interface UserGroupDetails {
    _id: string
    
}

interface UserDetails {
    firstName: string,
    lastName: string,
    email: string
    password?: string,
    _company?: Int,
    company?: string
}

export const createUserGroup = async (
  companyDetails: CompanyDetails,
  groupDetails: CompanyGroupDetails
) => {
  const { name } = groupDetails;
  const id = new ObjectId().toString();
  const _id = id;

  let group = await prisma.createUserGroup({
    // _company: companyDetails._id,
    name,
    id,
    _id,
    _company: companyDetails._id,
    company: {
      connect: {
        id: companyDetails.id
      }
    }
  });

  // Create default permissions
  try {
    console.log(`Creating initial perms for user group ${group.id}`)
    await createInitialPermsForUserGroup(group.id)
  } catch (err) {
    console.error(`Can't create default perms for user group ${group.id}`)
  }

  return group
};

const createAndLinkUser = async (userGroupDetails: UserGroupDetails, userDetails: UserDetails) => {
    let id = new ObjectId().toString();
    let _id = hashCode(id);
    // const userGroup = await prisma.userGroups({where:{

    // }})
    const user = await prisma.createUser({
        id,
        _id,
         fenixUserGroup: {connect: {
             id: userGroupDetails._id,
         }},
         firstName: userDetails.firstName,
         lastName: userDetails.lastName,
         email: userDetails.email,
         password: await hash(userDetails.password, 12),
         _company: userDetails._company,
         company: {
             connect: {
                 id: userDetails.company
             }
         },
         emailVerified: true
    })

    return user
}


const password = "Imag!ne100@"

/**
 * FLOW
 * 
 * 1. Create company (if it doesn't exist)
 * 2. Create userGroup (if doesn't exist)
 * 3. Create and link the user to the group
 */

 



interface UserExcelData {
    email: string,
    firstName: string,
    lastName: string,
    userGroup: UserGroupNameEnum,
    company: string,
    currency: string
    
}


 
export const seedUsers = async () => {

    const xbook = xlsx.readFile("./scripts/upload/users.xlsx");
    const xsheets = xbook.SheetNames;
    const allUserData = xlsx.utils.sheet_to_json(xbook.Sheets[xsheets[0]], {
      defval: null
    }) as [UserExcelData];


    for (let userData of allUserData){

      if (await prisma.$exists.user({email: userData.email})){
        console.log(`User already exists ${userData.email}`)
        continue
      }
        
    // Create company 
    const company = await createOrUpdateCompany({name: userData.company, currency: userData.currency, isChild: false, ...userData.company === "Synkd" && {overrideID: 11, overrideType: 10, canDoRotationalTags: true, canDoScriptTracking: true}})
    
    console.log("COMPANY", company)
    
    // const advertiser = await createAdvertiserIfNone({companyDetails: {...company}})
    // await createBrandIfNone({companyDetails:{...company}, brandDetails:{advertiserID:advertiser._id}})
    // Check if usergroups exist for this company already
    let userGroups = await prisma.userGroups({where:{company:{id: company.id}}})

    // If usergroups don't exist for this company
    if (userGroups.length < 4){
        //TODO only Create missing user groups
        // Right now creates all user groups
        for (let value of Object.values(UserGroupNameEnum)){
            const companyUserGroup = await createUserGroup({id: company.id, _id: company._id}, {name: value})
            userGroups.push(companyUserGroup)
        }
    }

    console.log("User groups", userGroups)

    let assignedUserGroup: UserGroup

    for (let group of userGroups){
        if (group.name === userData.userGroup){
            assignedUserGroup = group
        }
    }

    console.log("Assigned user group", assignedUserGroup)

    const createUser = await createAndLinkUser({_id: assignedUserGroup._id}, {...userData, email: userData.email.toLowerCase(), password, company: company.id, _company: company._id})

    console.log("Created user", createUser)
    
}
   

    
}
