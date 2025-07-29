// 2200
import {
  Resolver,
  Query,
  Ctx,
  Field,
  InputType,
  Arg,
  Mutation,
  Int,
} from 'type-graphql';
import { json } from '../helpers';
// import { CrmUser, prisma } from "../generated/prisma-client";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { Context } from '../auth/context.interface';
import { createObjectID } from '../../util/createIDs';
import { SignupInput } from '../inputs/auth';
import { User } from '../auth/user.interface';
import { adminSignup } from './resolver';
import { getCompanyForLegacyStudioToken } from '../legacyStudioHelper';
import { inspect } from 'util';
import { sendEmail } from '../emailHelper';
import { queueSelector } from '../queueHelper';
import { allChannelPermissions, checkIfUserIsInCompany, checkIfUserIsSynkd, getEmployeeIdFromUserCompany, hasPermission } from '../helpers/permissionsHelper';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';
import moment from 'moment';
import { hashCode } from '../../util/hashCode';
import {
  CreateGenericAddressInput,
  UpdateGenericAddressInput,
} from '../inputs/company';
import { IsPhoneNumber, IsEmail, Max } from 'class-validator';
import { isBalanceAvailableForService, useBalance } from './billingResolver';
import { ObjectId } from 'mongodb';
import { ChannelScopesEnum } from '../inputs/permissions';

interface UserIDConnection {
  id: string;
  userData?: SignupInput;
  crmUser?: any;
}

export const createPlatformEventClusters = async (event: any) => {


  try {
    // Fetch event members
    const eventMembers = await prisma.platformEventMember.findMany({
      where: { platformEvent: { id: event.id } },
      select: {
        id: true,
        platformEvent: true,
        profile: true,
        role: true,
        status: true,
        user: true,
      },
    });
    // Create CRM users for all event members
    const crmUsers = await Promise.all(
      eventMembers.map(async (member) => {
        return await createOrGetCrmUser(event.organiser.company, {
          id: member?.user?.id,
          userData: { ...member.user },
        }, true);
      })
    );

    // Create parent clusters with nested sub-clusters and connected users
    const parentClustersData = [
      {
        id: createObjectID().id,
        name: `${event.name} QR code`,
        description: `${event.name} QR code`,
        companyId: event.organiser.company.id,
        clusterType: "EVENT",
        users: {
          connect: crmUsers.map((user) => ({ id: user.id })), // Connect users to the main cluster
        },
        subClusters: {
          create: [
            {
              id: createObjectID().id,
              name: "Attended",
              clusterType: "EVENT",
            },
            {
              id: createObjectID().id,
              name: "Not Attended",
              clusterType: "EVENT",
              users: {
                connect: crmUsers.map((user) => ({ id: user.id })), // Connect users to "Not Attended" sub-cluster
              },
            },
          ],
        },
      },
      {
        id: createObjectID().id,
        name: `${event.name} Annual Membership`,
        companyId: event.organiser.company.id,
        clusterType: "EVENT",
        users: {
          connect: crmUsers.map((user) => ({ id: user.id })), // Connect users to the main cluster
        },
        subClusters: {
          create: [
            {
              id: createObjectID().id,
              name: "Paid",
              clusterType: "EVENT",
            },
            {
              id: createObjectID().id,
              name: "Not Paid",
              clusterType: "EVENT",
              users: {
                connect: crmUsers.map((user) => ({ id: user.id })), // Connect users to "Not Paid" sub-cluster
              },
            },
          ],
        },
      },
      {
        id: createObjectID().id,
        name: `${event.name} Members`,
        companyId: event.organiser.company.id,
        clusterType: "EVENT",
        users: {
          connect: crmUsers.map((user) => ({ id: user.id })), // Connect users to the main cluster
        },
        subClusters: {
          create: [
            {
              id: createObjectID().id,
              name: "Invited",
              clusterType: "EVENT",
            },
            {
              id: createObjectID().id,
              name: "Joined",
              clusterType: "EVENT",
            },
          ],
        },
      },
    ];

    // Create parent clusters with nested sub-clusters and connected users
    const createdClusters = await Promise.all(
      parentClustersData.map((cluster) =>
        prisma.crmCluster.create({
          data: cluster,
          include: {
            subClusters: true, // Include sub-clusters in the response
          },
        })
      )
    );

    // Connect the parent clusters to the platform event as `clusters`
    await prisma.platformEvent.update({
      where: {
        id: event.id,
      },
      data: {
        cluster: {
          connect: createdClusters.map((cluster) => ({ id: cluster.id })), // Connect all clusters
        },
      },
    });

    console.log("Successfully created clusters and sub-clusters for event:", event.id);
  } catch (error) {
    console.error("Error in createPlatformEventClusters:", error.message);
    throw error; // Re-throw the error for further handling
  }
};

// export const createPlatformEventContentQRCodeCluster = async (event: any) => {

//     console.log("creating createPlatformEventContentQRCodeCluster")

//     const eventMembers: any = await prisma.platformEventMember.findMany({
//       where: { platformEvent: { id: event.id} },
//       select: {
//         id: true,
//         platformEvent: true,
//         profile: true,
//         role: true,
//         status: true,
//         user: true,
//       }
//     })
    

//       // Create subcluster and record the ID in the options

      

//       const {id} = createObjectID();

//       try {

//         const parentCluster = await prisma.crmCluster.create({ 
//           data: {
//             name:  `${event.name} QR code`,
//             description:  `${event.name} QR code`,
//             company: {
//               connect: {
//                 id: event.organiser.company.id
//               }
//             },
//             clusterType: "EVENT",
//             id: createObjectID().id
//         }});


//          let notAttendedSubClusterID;


//           let subCluster = ["Attended", "Not Attended"]


//           let subClusterOptions =[]

//           for (let option of subCluster) {
//             subClusterOptions.push({
//               clusterType: "EVENT",
//               name: option,
//               id: createObjectID().id,
//             });
//           }

//           // Bulk create sub-clusters
//           let newSubClusters = await prisma.crmSubCluster.createMany({
//             data: subClusterOptions,
//           });

       
//         for (let member of eventMembers) {

//           let crmUser = await createOrGetCrmUser(event.organiser.company, { id: member?.user?.id, userData: {...member.user}}, true)
    
//           await prisma.crmCluster.update({
//             where: { id: parentCluster.id },
//             data: {
//               users: { connect: { id: crmUser?.id } }
//             }
//           })

//           await prisma.crmSubCluster.update({
//             where: { id: notAttendedSubClusterID },
//             data: {
//               users: { connect: { id: crmUser?.id } }
//             }
//           })
//         }


//         await prisma.platformEvent.update({
//           where: {
//             id: event.id
//           },
//           data: {
//             customCluster: {
//               connect: {
//                 id: parentCluster.id
//               }
//             }
//           }

//         })

//       } catch(error){

//         console.log("error createPlatformEventContentQRCodeCluster: ", error.message)

//       }
// }

// export const createClusterFromEvent = async (event: any) => {
//   try {
//     console.log(`[Event Cluster]: Start generate cluster for ${event.id}`);

//     // Create or get CRM user
//     let crmUser = await createOrGetCrmUser(event.organiser.company, {
//       id: event?.organiser?.user?.id,
//       userData: { ...event?.organiser?.user },
//     }, true);

//     if (!event.cluster) {
//       const { id: crmMainClusterID } = createObjectID();
//       const { id: annualMembershipClusterID } = createObjectID();
//       const { id: memberClusterID } = createObjectID();

//       // Bulk create main clusters
//       const clustersToCreate = [
//         {
//           id: crmMainClusterID,
//           name: event.name,
//           description: event.description,
//           companyId: event.organiser.company.id,
//           clusterType: "EVENT",
//         },
//         {
//           id: annualMembershipClusterID,
//           name: `${event.name} Annual Membership`,
//           companyId: event.organiser.company.id,
//           clusterType: "EVENT",
//         },
//         {
//           id: memberClusterID,
//           name: `${event.name} Members`,
//           companyId: event.organiser.company.id,
//           clusterType: "EVENT",
//           ...(crmUser?.id && { userId: crmUser?.id }), // Connect user if exists
//         },
//       ];

//       // Bulk create clusters
//       await prisma.crmCluster.createMany({
//         data: clustersToCreate,
//       });

//       // Update platform event with main cluster
//       await prisma.platformEvent.update({
//         where: {
//           id: event.id,
//         },
//         data: {
//           cluster: {
//             connect: { id: crmMainClusterID },
//           },
//           customCluster: {
//             connect: [{ id: annualMembershipClusterID }, { id: memberClusterID }],
//           },
//         },
//       });

//       // Create sub-clusters
//       const subClusters = [
//         {
//           clusterType: "EVENT",
//           name: `Invited`,
//           parentClusterId: memberClusterID,
//           id: createObjectID().id,
//         },
//         {
//           clusterType: "EVENT",
//           name: `Joined`,
//           parentClusterId: memberClusterID,
//           ...(crmUser?.id && { userId: crmUser?.id }), // Connect user if exists
//           id: createObjectID().id,
//         },
//         {
//           clusterType: "EVENT",
//           name: `Paid`,
//           parentClusterId: annualMembershipClusterID,
//           id: createObjectID().id,
//         },
//         {
//           clusterType: "EVENT",
//           name: `Not Paid`,
//           parentClusterId: annualMembershipClusterID,
//           id: createObjectID().id,
//         },
//       ];

//       // Bulk create sub-clusters
//       await prisma.crmSubCluster.createMany({
//         data: subClusters,
//       });
//     }

//     console.log(`[Event Cluster]: Finish generate cluster for ${event.id}`);
//   } catch (error) {
//     console.error(error);
//     // throw error;
//   }
// };



// Create or get user from the user data
const createOrGetUser = async (data: SignupInput): Promise<User> => {
  // TODO: consider company memberships

  let user = null;

  if (data.phone) {
    console.log(
      `[createOrGetUser] looking for existing user with phone ${data.phone}`
    );
    // Try to find a user matching this phone
    let existingUser = await prisma.user.findMany({
      where: {
        phone: data.phone,
      },
    });

    if (existingUser.length > 0) {
      user = existingUser[0];
    }
  }

  if (!user) {
    console.log(
      `[createOrGetUser] looking for existing user with email ${data.email}`
    );
    // Try to find a user matching this email
    let existingUser = await prisma.user.findMany({
      where: {
        email: data.email,
      },
    });

    if (existingUser.length > 0) {
      user = existingUser[0];
    } else {
      console.log(
        `[createOrGetUser] creating new user with email ${data.email} as no user exists`
      );
      // If not found, create a new user
      const userResult = await adminSignup(data);
      user = userResult;
    }
  }

  return user;
};

export const createOrGetCrmUser = async (
  clusterCompany: any,
  user: any,
  skipEmail = false
) => {
  let existing = [];
  let userWithEmail
  let userWithPhone

  if (!user?.userData?.id && !user?.id ) {
    // User does not have an id, check if there's an existing user with the
    // uploaded details and use that instead
    console.log(
      `[createOrGetCrmUser] Looking for existing user with email ${user?.userData?.email}`
    );
    if (user?.userData?.email) {
       userWithEmail = await prisma.user.findMany({
        where: {
          email: user?.userData?.email,
        },
      });

      if (userWithEmail.length > 0) user['id'] = userWithEmail[0].id;
    }
    console.log(
      `[createOrGetCrmUser] Looking for existing user with phone ${user?.userData?.phone}`
    );
    if (!userWithEmail && user?.userData?.phone) {
        userWithPhone = await prisma.user.findMany({
        where: {
          phone: user?.userData?.phone,
        },
      });

      if (userWithPhone.length > 0) user['id'] = userWithPhone[0].id;
    }
  }

  let crmUser ;
  let newCrmUser = false;
  
  if (user?.userData?.id || user?.id) {
    console.log(
      `[createOrGetCrmUser] Looking for existing CrmUser with company ${clusterCompany.id} and user ID ${user.id}`
    );
    const userId = user?.id || user?.userData?.id
     let crmByUser =  await prisma.crmUser.findMany({
      where: {
        userId: userId,
        associatedCompany: {
          id: clusterCompany.id,
        },
      },
    });

    if (crmByUser.length > 0) {
      crmUser = crmByUser[0];
      console.log(
        `[createOrGetCrmUser] Crm user with userId ${userId} found`
      );
    }
  }

  let userWithEmailCrm
  if (!crmUser && user?.userData?.email) {
    // Check existing crm user or not
    console.log(
      `[createOrGetCrmUser] Looking for existing crm user with email ${user?.userData?.email}`
    );
    userWithEmailCrm = await prisma.crmUser.findMany({
      where: {
        email: user?.userData?.email,
        associatedCompany: {
          id: clusterCompany.id,
        },
      },
    });

    if (userWithEmailCrm.length > 0) {
      crmUser = userWithEmailCrm[0];
      console.log(
        `[createOrGetCrmUser] Crm user with email ${user?.userData?.email} founded`
      );
    }
  }
  let userWithPhoneCrm
  if (!crmUser && user?.userData?.phone) {
    console.log(
      `[createOrGetCrmUser] Looking for existing crm user with phone ${user?.userData?.phone}`
    );
    userWithPhoneCrm = await prisma.crmUser.findMany({
      where: {
        phone: user?.userData?.phone,
        associatedCompany: {
          id: clusterCompany.id,
        },
      },
    });

    if (userWithPhoneCrm.length > 0) {
      crmUser = userWithPhoneCrm[0];
      console.log(
        `[createOrGetCrmUser] Crm user with phone ${user?.userData?.phone} founded`
      );
    }
  }
    console.log('exisitng',crmUser?.id )
    if (crmUser && crmUser?.id) {
      console.log(`[createOrGetCrmUser] Updating CrmUser ${crmUser?.id}`);
      // CRM user already exists, update it with the new data if required
      crmUser = await prisma.crmUser.update({
        where: {
          id: crmUser?.id,
        },
        data: {
          firstName: user?.userData?.firstName || crmUser.firstName,
          lastName: user?.userData?.lastName || crmUser.lastName,
          email: user?.userData?.email || crmUser.email,
          phone: user?.userData?.phone || crmUser.phone,
          gender: user?.userData?.gender || crmUser.gender,
          dob: new Date(moment(user?.userData.dob).toISOString()) || 
          new Date(moment(crmUser.dob).toISOString()),

          // Use the conditional logic for nested update on address
          address: {
            address: user?.userdata?.address?.address || crmUser.address?.address,
            city: user?.userdata?.address?.city || crmUser.address?.city,
            country: user?.userdata?.address?.country || crmUser.address?.country,
            postcode: user?.userdata?.address?.postcode || crmUser.address?.postcode,
            state: user?.userdata?.address?.state || crmUser.address?.state,
            town: user?.userdata?.address?.town || crmUser.address?.town,
          },

          // Other fields updated as needed
          personal_facebook:
            user?.userData?.personal_facebook || crmUser.personal_facebook,
          personal_instagram:
            user?.userData?.personal_instagram ||
            crmUser.personal_instagram,
          personal_twitter:
            user?.userData?.personal_twitter || crmUser.personal_twitter,
          personal_wechat:
            user?.userData?.personal_wechat || crmUser.personal_wechat,
          personal_qq: user?.userData?.personal_qq || crmUser.personal_qq,
          personal_personal_id:
            user?.userData?.personal_personal_id ||
            crmUser.personal_personal_id,
          personal_notes:
            user?.userData?.personal_notes || crmUser.personal_notes,
          personal_notes_follow_up_date:
            user?.userData?.personal_notes_follow_up_date ||
            crmUser.personal_notes_follow_up_date ||
            null,

          em_job_type: user?.userData?.em_job_type || crmUser.em_job_type,
          em_department:
            user?.userData?.em_department || crmUser.em_department,
          em_email: user?.userData?.em_email || crmUser.em_email,
          em_phone: user?.userData?.em_phone || crmUser.em_phone,
          em_notes: user?.userData?.em_notes || crmUser.em_notes,
          em_notes_follow_up_date:
            user?.userData?.em_notes_follow_up_date ||
            crmUser.em_notes_follow_up_date ||
            null,

          cm_name: user?.userData?.cm_name || crmUser.cm_name,
          cm_email: user?.userData?.cm_email || crmUser.cm_email,
          cm_website: user?.userData?.cm_website || crmUser.cm_website,
          cm_phone: user?.userData?.cm_phone || crmUser.cm_phone,
          cm_regnum: user?.userData?.cm_regnum || crmUser.cm_regnum,
          cm_sales_tax:
            user?.userData?.cm_sales_tax || crmUser.cm_sales_tax,
          cm_address: user?.userData?.cm_address || crmUser.cm_address,
          cm_city: user?.userData?.cm_city || crmUser.cm_city,
          cm_zipcode: user?.userData?.cm_zipcode || crmUser.cm_zipcode,
          cm_country: user?.userData?.cm_country || crmUser.cm_country,
          cm_category: user?.userData?.cm_category || crmUser.cm_category,
          cm_notes: user?.userData?.cm_notes || crmUser.cm_notes,
          cm_notes_follow_up_date:
            user?.userData?.cm_notes_follow_up_date ||
            crmUser.cm_notes_follow_up_date ||
            null,
        },
      });
    } else {
      // CRM user doesn't exist, create a new one
      console.log(
        `[createOrGetCrmUser] Creating new CrmUser for cluster company ${clusterCompany.id} and user ${user.userData.email}`
      );
      newCrmUser = true;

      let crmUserData = {
        associatedCompany: { connect: { id: clusterCompany.id } },
        firstName: user?.userData?.firstName,
        lastName: user?.userData?.lastName,
        email: user?.userData?.email,
        phone: user?.userData?.phone,
        gender: user?.userData?.gender,
        address: {
            ...user?.userData?.address
        },
        dob: new Date(moment(user?.userData.dob).toISOString()),
        otherData: user?.userData?.otherData,

        personal_facebook: user?.userData?.personal_facebook,
        personal_instagram: user?.userData?.personal_instagram,
        personal_twitter: user?.userData?.personal_twitter,
        personal_wechat: user?.userData?.personal_wechat,
        personal_qq: user?.userData?.personal_qq,
        personal_personal_id: user?.userData?.personal_personal_id,
        personal_notes: user?.userData?.personal_notes,
        personal_notes_follow_up_date:
          user?.userData?.personal_notes_follow_up_date || null,

        em_job_type: user?.userData?.em_job_type,
        em_department: user?.userData?.em_department,
        em_email: user?.userData?.em_email,
        em_phone: user?.userData?.em_phone,
        em_notes: user?.userData?.em_notes,
        em_notes_follow_up_date:
          user?.userData?.em_notes_follow_up_date || null,

        cm_name: user?.userData?.cm_name,
        cm_email: user?.userData?.cm_email,
        cm_website: user?.userData?.cm_website,
        cm_phone: user?.userData?.cm_phone,
        cm_regnum: user?.userData?.cm_regnum,
        cm_sales_tax: user?.userData?.cm_sales_tax,
        cm_address: user?.userData?.cm_address,
        cm_city: user?.userData?.cm_city,
        cm_zipcode: user?.userData?.cm_zipcode,
        cm_country: user?.userData?.cm_country,
        cm_category: user?.userData?.cm_category,
        cm_notes: user?.userData?.cm_notes,
        cm_notes_follow_up_date:
          user?.userData?.cm_notes_follow_up_date || null,
      };

      if (user?.userData?.id || user?.id ) {
        // If a user ID has been passed, connect the user here
        const userId = user?.id || user?.userData?.id;
        crmUserData['user'] = { connect: { id: userId } };
        console.log('[createOrGetCrmUser]  connecting via userdata user')
      } else if (crmUser && crmUser?.id ){
        crmUserData['user'] = { connect: { id: crmUser?.id } };
       console.log('[createOrGetCrmUser]  connecting via existing user')
      }
      crmUser = await prisma.crmUser.create({
        data: crmUserData, // Pass the data for the new CRM user here
      });

      console.log(`Created new CrmUser ${crmUser?.id}`);
      // now add user to all customers cluster ${clusterCompany.id}
      let acs = await prisma.crmCluster.findMany({
        where: {
          name: 'All Customers',
          company: {
            id: clusterCompany.id,
          },
          clusterType: 'CUSTOMERS',
        },
      });
    // if All customer cluster exists for this company (otherwsie skip and create in createlegacycompany)
    if (acs.length > 0 && newCrmUser === true ){
      await prisma.crmCluster.update({
        where: { id: acs[0].id },
        data: {
          users: {
            connect: { id: crmUser?.id },
          },
        },
      }); 
      console.log('added user to ACFC ');
    }

    }
  

  let userObj = await prisma.crmUser.findUnique({
    where: { id: crmUser?.id },
    include: { user: true }, // Use 'include' to fetch related user
  });

  if (userObj) {
    // CrmUser has an associated User object

    // Check for existing marketing preferences
    let currentPrefsForCompany: any =
      await prisma.userMarketingPreference.findMany({
        where: {
          company: {
            id: clusterCompany.id,
          },
          user: {
            id: user.id,
          },
        },
      });

    currentPrefsForCompany =
      currentPrefsForCompany.length > 0 ? currentPrefsForCompany[0] : null;
    if (!currentPrefsForCompany) {
      // Add empty marketing preferences for the user
      console.log(
        `[createOrGetCrmUser] Creating empty marketing preferences for user ${user.id} with company ${clusterCompany.id}`
      );
      await prisma.userMarketingPreference.create({
        data: {
          id: createObjectID().id, // Ensure this function returns an object that matches your schema
          company: {
            connect: { id: clusterCompany.id }, // Connect the company by its ID
          },
          user: {
            connect: { id: user.id }, // Connect the user by their ID
          },
          preferences: {
            seeAds: true, // Ensure preferences are correctly structured according to your schema
          },
        },
      });
    }
  }

  // Send an email informing the user that their data has been uploaded
  // if (
  //   !skipEmail &&
  //   newCrmUser &&
  //   userObj &&
  //   (userObj?.email || user?.userData?.email)
  // ) {
  //   try {
  //     await sendEmail({
  //       from: {
  //         name: 'Synkd',
  //         email: 'no-reply@synkd.life',
  //       },
  //       to: userObj?.email || user?.userData?.email,
  //       subject: `${clusterCompany.name} has uploaded your data to Synkd`,
  //       template: 'excel-upload',
  //       vars: {
  //         'company-name': clusterCompany.name,
  //       },
  //     });
  //   } catch (err) {
  //     console.log(err);
  //     console.log(
  //       `Failed to send CRM data uploaded email. userObj.email is ${userObj.email}. user?.userData?.email is ${user?.userData?.email}`
  //     );
  //   }
  // }

  return crmUser;
};

@InputType()
export class CrmSignupInput {
  @Field()
  firstName: string;
  @Field()
  lastName: string;

  // Allow user to sign up without password
  @Field({ description: 'brypted password', nullable: true })
  password?: string;

  @IsEmail()
  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  companyName?: string;

  @Field({ nullable: true })
  jobTitle?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field({ nullable: true })
  dob?: Date;

  @Field({ nullable: true })
  address?: CreateGenericAddressInput;

  @Field({ nullable: true, description: 'Used for CRM - stringified JSON' })
  otherData?: string;

  @Field({ nullable: true })
  personal_facebook?: string;

  @Field({ nullable: true })
  personal_instagram?: string;

  @Field({ nullable: true })
  personal_twitter?: string;

  @Field({ nullable: true })
  personal_wechat?: string;

  @Field({ nullable: true })
  personal_qq?: string;

  @Field({ nullable: true })
  personal_personal_id?: string;

  @Field({ nullable: true })
  personal_notes?: string;

  @Field({ nullable: true })
  personal_notes_follow_up_date?: string;

  @Field({ nullable: true })
  em_job_type?: string;

  @Field({ nullable: true })
  em_department?: string;

  @Field({ nullable: true })
  em_email?: string;

  @Field({ nullable: true })
  em_phone?: string;

  @Field({ nullable: true })
  em_notes?: string;

  @Field({ nullable: true })
  em_notes_follow_up_date?: string;

  @Field({ nullable: true })
  cm_name?: string;

  @Field({ nullable: true })
  cm_email?: string;

  @Field({ nullable: true })
  cm_website?: string;

  @Field({ nullable: true })
  cm_phone?: string;

  @Field({ nullable: true })
  cm_regnum?: string;

  @Field({ nullable: true })
  cm_sales_tax?: string;

  @Field({ nullable: true })
  cm_address?: string;

  @Field({ nullable: true })
  cm_city?: string;

  @Field({ nullable: true })
  cm_zipcode?: string;

  @Field({ nullable: true })
  cm_country?: string;

  @Field({ nullable: true })
  cm_category?: string;

  @Field({ nullable: true })
  cm_notes?: string;

  @Field({ nullable: true })
  cm_notes_follow_up_date?: string;

  @Field({ nullable: true })
  socialLine?: string;

  @Field({ nullable: true })
  passportNumber?: string;

  @Field({ nullable: true })
  nationalSecurityNumber?: string;

  @Field({ nullable: true })
  secondaryProfilePic?: string;

  @Field({ nullable: true })
  deliveryAddress?: CreateGenericAddressInput;
}

@InputType()
export class CrmUserInput {
  @Field((type) => CrmSignupInput, { nullable: true })
  userData?: CrmSignupInput;
}

@InputType()
export class CrmClusterAddUserInput {
  @Field((type) => [String], { nullable: true })
  userIDs?: string[];

  @Field((type) => [CrmUserInput], { nullable: true })
  users?: CrmUserInput[];

  @Field()
  clusterID: string;
  userData: any;
}

@InputType()
export class CrmClustersAddUserInput {
  @Field((type) => [String], { nullable: true })
  userIDs?: string[];

  @Field((type) => [CrmUserInput], { nullable: true })
  users?: CrmUserInput[];

  @Field((type) => [String])
  clusterIDs: string[];
  userData: any;
}

@InputType()
export class CreateCrmClusterInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  companyID?: string;

  @Field((type) => [String], { nullable: true })
  userIDs?: string[];

  @Field((type) => [String], { nullable: true })
  crmUserIDs?: string[];
}

@InputType()
export class GetSubClusterInput {
  @Field({ description: 'ID of the parent cluster' })
  parentClusterID: string;
}

@InputType()
export class UpdateCrmQuestionInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  questionShortText?: string;

  @Field({ nullable: true })
  questionDescription?: string;

  @Field((type) => Int, { nullable: true })
  maximumSelections?: number;

  @Field((type) => Int, { nullable: true })
  minimumSelections?: number;
}

@InputType()
export class UpdateCrmOptionInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  optionShortText?: string;

  @Field({ nullable: true })
  optionDescription?: string;
}

@InputType()
export class CreateCrmOptionInput {
  @Field()
  optionShortText: string;

  @Field({ nullable: true })
  optionDescription?: string;
}

@InputType()
export class AddCrmOptionInput {
  @Field()
  questionID: string;

  @Field()
  optionShortText: string;

  @Field({ nullable: true })
  optionDescription?: string;
}

@InputType()
export class CreateCrmQuestionInput {
  @Field()
  questionShortText: string;

  @Field()
  questionDescription?: string;

  @Field((type) => Int)
  maximumSelections: number = 1;

  @Field((type) => Int)
  minimumSelections: number = 1;

  @Field((type) => [CreateCrmOptionInput])
  options: CreateCrmOptionInput[];
}

@InputType()
export class CrmQuestionResponseInput {
  @Field({ description: 'ID of the CRM question' })
  questionID: string;

  @Field((type) => [String], {
    description: 'Selected options for this question',
  })
  optionIDs: string[];
}

@InputType()
export class UserFeedbackInput {
  @Field()
  email: string;

  @Field()
  feedback: string;
}

@InputType()
export class DeleteClusterInput {
  @Field()
  clusterID: string;
}

@InputType()
export class CreateCrmQuestionResponseInput {
  @Field((type) => [CrmQuestionResponseInput!]!, {
    description: 'Response data for a set of questions',
  })
  questionResponses: CrmQuestionResponseInput[];

  @Field({ nullable: true, description: "Responding user's information" })
  userData?: SignupInput;

  @Field({ nullable: true })
  bypassLoggedin?: boolean;
}

@InputType()
export class CreateCrmUserInput {
  @Field((type) => [String!])
  clusters: string[];

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field()
  address: CreateGenericAddressInput;

  @Field((type) => String)
  dob: any;

  @Field({ nullable: true })
  personal_facebook?: string;

  @Field({ nullable: true })
  personal_instagram?: string;

  @Field({ nullable: true })
  personal_twitter?: string;

  @Field({ nullable: true })
  personal_wechat?: string;

  @Field({ nullable: true })
  personal_qq?: string;

  @Field({ nullable: true })
  personal_personal_id?: string;

  @Field({ nullable: true })
  personal_notes?: string;

  @Field({ nullable: true })
  personal_notes_follow_up_date?: string;

  @Field({ nullable: true })
  em_job_type?: string;

  @Field({ nullable: true })
  em_department?: string;

  @Field({ nullable: true })
  em_email?: string;

  @Field({ nullable: true })
  em_phone?: string;

  @Field({ nullable: true })
  em_notes?: string;

  @Field({ nullable: true })
  em_notes_follow_up_date?: string;

  @Field({ nullable: true })
  cm_name?: string;

  @Field({ nullable: true })
  cm_email?: string;

  @Field({ nullable: true })
  cm_website?: string;

  @Field({ nullable: true })
  cm_phone?: string;

  @Field({ nullable: true })
  cm_regnum?: string;

  @Field({ nullable: true })
  cm_sales_tax?: string;

  @Field({ nullable: true })
  cm_address?: string;

  @Field({ nullable: true })
  cm_city?: string;

  @Field({ nullable: true })
  cm_zipcode?: string;

  @Field({ nullable: true })
  cm_country?: string;

  @Field({ nullable: true })
  cm_category?: string;

  @Field({ nullable: true })
  cm_notes?: string;

  @Field({ nullable: true })
  cm_notes_follow_up_date?: string;

  @Field({ nullable: true })
  socialLine?: string;

  @Field({ nullable: true })
  passportNumber?: string;

  @Field({ nullable: true })
  nationalSecurityNumber?: string;

  @Field({ nullable: true })
  secondaryProfilePic?: string;

  @Field({ nullable: true })
  deliveryAddress?: CreateGenericAddressInput;
}

@InputType()
export class UpdateCrmUserInput {
  @Field()
  crmUserId: string;

  @Field((type) => [String!])
  clusters: string[];

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field()
  address: UpdateGenericAddressInput;

  @Field((type) => String)
  dob: any;

  @Field({ nullable: true })
  personal_facebook?: string;

  @Field({ nullable: true })
  personal_instagram?: string;

  @Field({ nullable: true })
  personal_twitter?: string;

  @Field({ nullable: true })
  personal_wechat?: string;

  @Field({ nullable: true })
  personal_qq?: string;

  @Field({ nullable: true })
  personal_personal_id?: string;

  @Field({ nullable: true })
  personal_notes?: string;

  @Field({ nullable: true })
  personal_notes_follow_up_date?: string;

  @Field({ nullable: true })
  em_job_type?: string;

  @Field({ nullable: true })
  em_department?: string;

  @Field({ nullable: true })
  em_email?: string;

  @Field({ nullable: true })
  em_phone?: string;

  @Field({ nullable: true })
  em_notes?: string;

  @Field({ nullable: true })
  em_notes_follow_up_date?: string;

  @Field({ nullable: true })
  cm_name?: string;

  @Field({ nullable: true })
  cm_email?: string;

  @Field({ nullable: true })
  cm_website?: string;

  @Field({ nullable: true })
  cm_phone?: string;

  @Field({ nullable: true })
  cm_regnum?: string;

  @Field({ nullable: true })
  cm_sales_tax?: string;

  @Field({ nullable: true })
  cm_address?: string;

  @Field({ nullable: true })
  cm_city?: string;

  @Field({ nullable: true })
  cm_zipcode?: string;

  @Field({ nullable: true })
  cm_country?: string;

  @Field({ nullable: true })
  cm_notes?: string;

  @Field({ nullable: true })
  cm_category?: string;

  @Field({ nullable: true })
  cm_notes_follow_up_date?: string;

  @Field({ nullable: true })
  socialLine?: string;

  @Field({ nullable: true })
  passportNumber?: string;

  @Field({ nullable: true })
  nationalSecurityNumber?: string;

  @Field({ nullable: true })
  secondaryProfilePic?: string;

  @Field({ nullable: true })
  deliveryAddress?: CreateGenericAddressInput;
}

const autoClusterFN = {
  msl_account: async () => {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'asc', // or 'desc' for descending order
      },
      select: {
        createdAt: true,
        dob: true,
        email: true,
        firstName: true,
        gender: true,
        lastName: true,
        phone: true,
      },
    });

    const monthsList = [1, 12, 36];

    let userCluster = [[], [], [], []];
    let monthClusterName = [
      'New (joined in last 30 days)',
      'Month 2 to 1 Year',
      '1 Year to 3 Years',
      'More than 3 Years',
    ];

    let monthIdx = 0;
    for (let idx = 0; idx < users.length; idx++) {
      const user = users[idx];
      if (!user.createdAt && monthIdx === monthsList.length) continue;
      if (
        moment(user.createdAt).diff(
          moment().subtract(monthsList[monthIdx], 'months')
        ) < 0
      ) {
        monthIdx++;
      }
      if (user.createdAt) userCluster[monthIdx].push(user);
    }

    return {
      name: 'MSL Account',
      clusterType: 'AGGREGATE',
      users,
      subClusters: userCluster.map((item: any, idx) => ({
        name: monthClusterName[idx],
        users: item,
      })),
    };
  },
  account_package: async () => {
    return {
      name: 'Account Package',
      clusterType: 'AGGREGATE',
      users: [],
      subClusters: [].map((item: any, idx) => ({
        name: '',
        users: item,
      })),
    };
  },
  platform_usage: async () => {
    return {
      name: 'Platform Usage',
      clusterType: 'AGGREGATE',
      users: [],
      subClusters: [].map((item: any, idx) => ({
        name: '',
        users: item,
      })),
    };
  },
  employees: async (ctx: Context) => {
    return {
      name: 'Employees',
      clusterType: 'AGGREGATE',
      users: [],
      subClusters: [].map((item: any, idx) => ({
        name: '',
        users: item,
      })),
    };
  },
  all_customers: async (ctx: Context) => {
    return {
      name: 'All Customers',
      clusterType: 'AGGREGATE',
      users: [],
      subClusters: [].map((item: any, idx) => ({
        name: '',
        users: item,
      })),
    };
  },
  access_type: async (ctx: Context) => {
    return {
      name: 'Access Type',
      clusterType: 'AGGREGATE',
      users: [],
      subClusters: [].map((item: any, idx) => ({
        name: '',
        users: item,
      })),
    };
  },
};

@Resolver()
export class ClusterResolver {
  @Query((returns) => json, {
    description: 'Gets all crm questions for a company',
  })
  async getAllCrmQuestions(
    @Ctx() ctx: Context,
    @Arg('showDrafts', { defaultValue: false }) showDrafts: boolean,
    @Arg('legacyStudioToken', { nullable: true }) legacyStudioToken: string
  ) {
    let ourCompany;

    if (legacyStudioToken) {
      ourCompany = await getCompanyForLegacyStudioToken(legacyStudioToken);
    } else {
      ourCompany = ctx.company;
    }

    const crmQuestions: any = await prisma.crmQuestion.findMany({
      where: showDrafts
        ? { company: { id: ourCompany.id } }
        : { status: 'LIVE', company: { id: ourCompany.id } },
      select: {
        id: true,
        id_number: true,
        createdAt: true,
        updatedAt: true,
        questionShortText: true,
        questionDescription: true,
        status: true,
        type: true,
        minimumSelections: true,
        maximumSelections: true,
        options: {
          select: {
            id: true,
            optionShortText: true,
            optionDescription: true,
          },
        },
      },
    });

    for (let idx = 0; idx < crmQuestions.length; idx++) {
      try {
        crmQuestions[idx].responses = [];
        crmQuestions[idx].total_responses = 0;
        crmQuestions[idx].total_current_month = 0;
        crmQuestions[idx].total_last_month = 0;

        const crmResponse = await prisma.crmQuestionResponse.findMany({
          where: {
            responseToQuestion: {
              id: crmQuestions[idx].id,
            },
          },
        });

        crmQuestions[idx].responses = crmResponse;
        crmQuestions[idx].total_responses = crmResponse.length;
        crmQuestions[idx].total_current_month = crmResponse.filter(
          (item: any) => moment(item.createdAt).month() === moment().month()
        ).length;
        crmQuestions[idx].total_last_month = crmResponse.filter(
          (item: any) =>
            moment(item.createdAt).month() ===
            moment().subtract(1, 'month').month()
        ).length;
      } catch (error) {
        console.log(error);
      }
    }

    return crmQuestions;
  }

  // TODO: restrict access to current company users only
  @Query((returns) => json, {
    description: 'Gets details for a specific crm question',
  })
  async getCrmQuestion(
    @Ctx() ctx: Context,
    @Arg('questionID') questionID: string
  ) {
    const question = await prisma.crmQuestion.findUnique({
      where: { id: questionID },
      select: {
        id: true,
        id_number: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        questionShortText: true,
        questionDescription: true,
        minimumSelections: true,
        maximumSelections: true,
        options: {
          select: {
            id: true,
            optionShortText: true,
            optionDescription: true,
          },
        },
      },
    });

    return question;
  }

  @Mutation((returns) => json)
  async archiveCrm(
    @Ctx() ctx: Context,
    @Arg('id') crmId: string,
    @Arg('archived') archived: boolean
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.crmQuestion.update({
      data: {
        status: archived ? 'ARCHIVED' : 'DRAFT',
        archiveDate: new Date(),
      },
      where: {
        id: crmId,
      },
    });
  }

  @Query((returns) => json, { description: 'Gets cluster for a company' })
  async getAllClusters(@Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.view_only,
      null,
      ctx.user.id,
      ctx.company.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };
    
    const company = await checkIfUserIsInCompany(ctx.user.id, ctx.company.id, true)
    if (!company) return { error: 'USER_NOT_A_MEMBER' }

    let isSynkd = await checkIfUserIsSynkd(ctx.user.id)
    let employeeId = await getEmployeeIdFromUserCompany(ctx.user.id, company.id)
    let accessibleClusters = []
    let scopePermissions = await allChannelPermissions(employeeId, ChannelScopesEnum.CLUSTER)
      for (let sp of scopePermissions) {
        if (sp.cluster && sp.cluster !== null) {
          accessibleClusters.push(sp.cluster)
        }
      }
      // convert the cluster ids to mongodb objects before quering
    const accessibleClusterIds = accessibleClusters.map(clusterId => clusterId.toString());
    const synkdOrMasterCreds = isSynkd && !accessibleClusterIds.length ||  // if this is a synkd member and perms haven't been manually restricted
       ctx.companyMembership.role === 'SUPER_ADMIN' ||// && !accessibleClusterIds.length || // if this user is a super admin, give them access if no manual perm
        ctx.companyMembership.role === 'MASTER_ADMIN'// && !accessibleClusterIds.length // if this user is a master admin, give them access if no manual perm
         
    const crmClusters = await prisma.crmCluster.findMany({
      where: {
      status: {
        not: 'ARCHIVED',
      },
      OR: [
      // Include company condition if synkdOrMasterCreds is true
      ...(synkdOrMasterCreds || !accessibleClusterIds.length ? [{
        company: {
          id: ctx.company.id,
        }
      }] : []), 
      // Include accessible cluster perms if available
      ...(accessibleClusterIds.length > 0 ? [{ id: { in: accessibleClusterIds } }] : []), 
      ],
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            dob: true,
            phone: true,
            status: true,
            email: true,
            user: {
              select: {
                id: true,
              },
            },
            createdAt: true,
            updatedAt: true,
          },
        },
        subClusters: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            name: true,
            description: true,
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                dob: true,
                phone: true,
                email: true,
                user: {
                  select: {
                    id: true,
                  },
                },
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        crmQuestion: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            company: {
              select: {
                id: true,
              },
            },
            questionShortText: true,
            questionDescription: true,
            minimumSelections: true,
            maximumSelections: true,
            options: {
              select: {
                id: true,
                optionShortText: true,
                optionDescription: true,
                crmSubCluster: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return crmClusters
  }
  @Query(returns => json, { description: "Get crm cluster by ID" })
  async getCrmCluster(
    @Ctx() ctx: Context,
    @Arg("id") id: string
  ) {
    // Permissions check
    let perm = await hasPermission('marketing_strategy', PERMISSION_ACCESS_TYPES.view_only, null, ctx.user.id, ctx.company.id)
    if (!perm) return { error: 'NO_PERMISSION' }

    const crmCluster = await prisma.crmCluster.findUnique({
    where: {
      id: id
    }
    })
    return crmCluster
  }
  @Mutation((returns) => json, {
    description:
      'Adds a question and creates corresponding crm clusters + sub-clusters',
  })
  async addQuestion(
    @Ctx() ctx: Context,
    @Arg('data') data: CreateCrmQuestionInput
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const isCreditAvailable = await isBalanceAvailableForService(
      {
        service: 'STRATEGY',
        amountRequired: '1',
        companyId: ctx.company.id,
      },
      ctx
    );
    // iza come abck to 
    // if (!isCreditAvailable) return { error: 'CREDIT_NOT_AVAILABLE' };

    const { id } = createObjectID();
    const {
      maximumSelections,
      questionShortText,
      questionDescription,
      minimumSelections,
    } = data;



    let { options } = data;
    const optionsWithID = [];

    // Create subcluster and record the ID in the options
    for (let option of options) {
      optionsWithID.push({
        ...option,
        id: createObjectID().id,
      });
    }
    // Check for duplicates
    let qst = questionShortText
    let qd = questionDescription
    const existingQuestion = await prisma.crmQuestion.findFirst({
      where: {
        companyId: ctx.company.id,
        OR: [
          {
            questionShortText: {
              contains: qst,
              mode: 'insensitive',
            },
          },
          {
            questionDescription: {
              contains: qd,
              mode: 'insensitive',
            },
          },
        ],
      },
    })
    if (existingQuestion) {
      throw new Error('A similar question already exists for this company.');
    }   
    // Create the crm question and the related options
    await prisma.crmQuestion.create({
      data: {
        company: {
          connect: {
            id: ctx.company.id,
          },
        },
        id,
        id_number: hashCode(id),
        questionShortText,
        questionDescription,
        maximumSelections,
        minimumSelections,
        options: {
          create: optionsWithID,
        },
      },
    });
    await useBalance(
      {
        company: ctx.company,
        service: 'STRATEGY',
        amount: 1,
        description: `Created '${questionShortText}' strategy.`,
      },
      ctx
    );
    return { success: true };
  }

  @Mutation((returns) => json)
  async addCrmOption(
    @Arg('data') data: AddCrmOptionInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const { optionShortText, optionDescription, questionID: id } = data;
    await prisma.crmQuestionOption.create({
      data: {
        id: createObjectID().id,
        optionDescription,
        optionShortText,
        question: {
          connect: {
            id,
          },
        },
      },
    });

    return { success: true };
  }

  @Mutation((returns) => json)
  async deleteCrmOption(@Arg('optionID') id: string, @Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    await prisma.crmQuestionOption.delete({
      where: {
        id: id,
      },
    });

    return { success: true };
  }

  @Mutation((returns) => json)
  async updateCrmQuestion(
    @Ctx() ctx: Context,
    @Arg('data') data: UpdateCrmQuestionInput
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const {
      maximumSelections,
      minimumSelections,
      questionDescription,
      questionShortText,
      id,
    } = data;
    // Check for duplicates
    let qst = questionShortText
    let qd = questionDescription
    const existingQuestion = await prisma.crmQuestion.findFirst({
      where: {
        companyId: ctx.company.id,
        OR: [
        {
          questionShortText: {
            contains: qst,
            mode: 'insensitive',
          },
        },
        {
          questionDescription: {
            contains: qd,
            mode: 'insensitive',
          },
        },
      ],
      },
    });
    if (existingQuestion) {
      throw new Error('A similar question already exists for this company.');
    } 
    const dataObject: any = {};
    if (maximumSelections) dataObject.maximumSelections = maximumSelections;
    if (minimumSelections) dataObject.minimumSelections = minimumSelections;
    if (questionDescription)
      dataObject.questionDescription = questionDescription;
    if (questionShortText) dataObject.questionShortText = questionShortText;

    await prisma.crmQuestion.update({
      data: dataObject,
      where: {
        id: id,
      },
    });

    return { success: true };
  }

  @Mutation((returns) => json)
  async archiveQuestion(
    @Ctx() ctx: Context,
    @Arg('id') questionId: string,
    @Arg('archived') archived: boolean
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.crmQuestion.update({
      data: {
        status: archived ? 'ARCHIVED' : 'DRAFT',
      },
      where: {
        id: questionId,
      },
    });
  }

  @Mutation((returns) => json)
  async copyQuestion(@Ctx() ctx: Context, @Arg('id') questionId: string) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let existingQuestion = await prisma.crmQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        id_number: true,
        company: {
          select: {
            id: true,
          },
        },
        questionShortText: true,
        questionDescription: true,
        status: true,
        type: true,
        minimumSelections: true,
        maximumSelections: true,
        options: {
          select: {
            optionShortText: true,
            optionDescription: true,
          },
        },
      },
    });

    if (!existingQuestion) throw new Error('CRM_QUESTION_DOES_NOT_EXIST');

    const optionsWithID = [];

    // Create subcluster and record the ID in the options
    for (let option of existingQuestion.options) {
      optionsWithID.push({
        ...option,
        id: createObjectID().id,
      });
    }

    // Copy the crm question
    const { id } = createObjectID();
    let newCrmQuestion = await prisma.crmQuestion.create({
      data: {
        id,
        company: { connect: { id: existingQuestion.company.id } },
        questionShortText: `${existingQuestion.questionShortText} Copy`,
        id_number: hashCode(id),
        questionDescription: `${existingQuestion.questionDescription} (copy)`,
        maximumSelections: existingQuestion.maximumSelections,
        minimumSelections: existingQuestion.minimumSelections,
        options: {
          create: optionsWithID, // Ensure optionsWithID is an array of objects matching your model structure
        },
      },
    });

    return newCrmQuestion;
  }

  @Mutation((returns) => json)
  async updateCrmQuestionOption(
    @Ctx() ctx: Context,
    @Arg('data') data: UpdateCrmOptionInput
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const { optionDescription, optionShortText, id } = data;

    const dataObject: any = {};
    if (optionDescription) dataObject.optionDescription = optionDescription;
    if (optionShortText) dataObject.optionShortText = optionShortText;

    await prisma.crmQuestionOption.update({
      where: {
        id,
      },
      data: dataObject, // Ensure dataObject contains the fields to be updated
    });

    return { success: true };
  }

  @Mutation((returns) => json, {
    description: 'Publishes the CRM question live. No further changes allowed',
  })
  async publishCrmQuestion(@Ctx() ctx: Context, @Arg('questionID') id: string) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_strategy',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    /**
     * Get details about the question and options
     */

    const questionWithOptions = await prisma.crmQuestion.findUnique({
      where: { id },
      select: {
        questionShortText: true,
        questionDescription: true,
        options: {
          select: {
            id: true,
            optionShortText: true,
            optionDescription: true,
          },
        },
      },
    });

    if (!questionWithOptions) {
      throw new Error('Crm question not found');
    }

    const { questionShortText, questionDescription } = questionWithOptions;
     // Check for duplicates
    let qst = questionShortText
    let qd = questionDescription
    const existingQuestion = await prisma.crmCluster.findFirst({
      where: {
        companyId: ctx.company.id,
        OR: [
            {
              name: {
                contains: qst,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: qd,
                mode: 'insensitive',
              },
            },
          ],
      },
    })
    if (existingQuestion) {
      throw new Error('A similar cluster name already exists for this company.');
    }   
      
    /**
     * Creates crm clusters/sub-clusters according to the question and option
     */
    const parentCluster = await prisma.crmCluster.create({
      data: {
        name: questionShortText,
        description: questionDescription,
        company: {
          connect: {
            id: ctx.company.id,
          },
        },
        crmQuestion: {
          connect: {
            id,
          },
        },
        clusterType: 'AUTOMATED',
        id: createObjectID().id, // Ensure createObjectID() returns a valid structure
      },
    });

    const { options } = questionWithOptions;

    // Create subclusters and link with the option IDs
    for (let option of options) {
      const { id: subClusterID } = createObjectID();
      await prisma.crmSubCluster.create({
        data: {
          clusterType: 'AUTOMATED',
          name: option.optionShortText,
          parentCluster: { connect: { id: parentCluster.id } },
          id: subClusterID,
          crmOption: {
            connect: {
              id: option.id,
            },
          },
        },
      });
    }

    /**
     * Make it live
     */
    await prisma.crmQuestion.update({
      data: {
        status: 'LIVE',
      },
      where: {
        id,
      },
    });

    return { success: true };
  }

  @Mutation((returns) => json)
  async gatherUserFeedback(@Arg('data') data: UserFeedbackInput) {
    if (data.feedback) {
      await prisma.userFeedback.create({
        data: {
          user: {
            connect: {
              email: data.email,
            },
          },
          feedback: data.feedback,
          id: createObjectID().id,
        },
      });
    }

    return { success: true };
  }

  @Mutation((returns) => json, {
    description: 'Respond to a set of crm questions',
  })
  async respondToQuestions(
    @Ctx() ctx: Context,
    @Arg('data') data: CreateCrmQuestionResponseInput
  ) {
    console.log('CRM question response', inspect(data, true, null, false));
    let user: User;
    /**
     * Check whether the user is logged in already
     */
    if (ctx.user && !data.bypassLoggedin) {
      user = ctx.user;
    } 
    
    if (!user) {
      throw new Error('No user logged in or provided');
    }

    // Create responses

    for (let questionResponse of data.questionResponses) {
      const prismaFormattedResponses = questionResponse.optionIDs.map((id) => {
        return { id };
      });

      // Link as the question response
      await prisma.crmQuestionResponse.create({
        data: {
          id: createObjectID().id, // Assuming createObjectID() returns valid fields
          respondingUser: {
            connect: { id: user.id },
          },
          responseToQuestion: {
            connect: {
              id: questionResponse.questionID,
            },
          },
          response: {
            connect: prismaFormattedResponses,
          },
        },
      });

      // Find cluster for this question
      const crmClusterForQuestion = await prisma.crmQuestion.findUnique({
        where: { id: questionResponse.questionID },
        include: { crmCluster: true },
      });
      // Find the actual Strategy question
      const crmQuestion = await prisma.crmQuestion.findUnique({
        where: { id: questionResponse.questionID },
        select: {
          id: true,
          id_number: true,
          createdAt: true,
          updatedAt: true,
          questionShortText: true,
          questionDescription: true,
          company: {
            select: {
              id: true,
            },
          },
          status: true,
          type: true,
          minimumSelections: true,
          maximumSelections: true,
          options: {
            select: {
              id: true,
              optionShortText: true,
              optionDescription: true,
            },
          },
        },
      });
      // Get the company that owns this question/cluster  
      const clusterCompany = await prisma.company.findMany({
        where: { id: crmQuestion.company.id },
      });
      // Create a new CRM user if there isn't one already for this user and company
      let crmUser = await createOrGetCrmUser(clusterCompany[0], {
        userData: data.userData,
      });
      
      if (!crmClusterForQuestion.crmCluster.userIds.some(u => u === crmUser?.id)) {
      //     // Add user to the main cluster
          await prisma.crmCluster.update({
            where: { id: crmClusterForQuestion.crmClusterId },
            data: {
              users: {
                connect: {
                  id: crmUser?.id,
                },
              },
            },
          });
        }
      // Remove user from existing sub-clusters linked to the question
      const existingSubClusters = await prisma.crmQuestionOption.findMany({
        where: { questionId: crmQuestion.id },
        include: {
          crmSubCluster: {
            include: {
              users: true, // Include users to check if the user exists
            },
          },
        },
      });
      for (const option of existingSubClusters) {
        const subCluster = option.crmSubCluster;
        if (subCluster && subCluster.users.some(u => u.id === crmUser?.id)) {
          await prisma.crmSubCluster.update({
            where: { id: subCluster.id },
            data: {
              users: {
                disconnect: {
                  id: crmUser?.id,
                },
              },
            },
          });
        }
      }


      // Add to subclusters
      for (let optionID of questionResponse.optionIDs) {
        try {
          const subClusterForOption = await prisma.crmQuestionOption.findUnique(
            {
              where: { id: optionID },
              include: {
                crmSubCluster: true, 
              },
            }
          )          
          // add user to sub-cluster
          await prisma.crmSubCluster.update({
            where: {
              id: subClusterForOption.crmSubCluster.id,
            },
            data: {
              users: {
                connect: {
                  id: crmUser?.id, // Ensure crmUser?.id exists and is valid
                },
              },
            },
          });
        } catch (e) {
          console.error(`Failed for option ${optionID}`, e);
          throw new Error(`Failed for option ${optionID}`);
        }
      }
    }

    return { success: true };
  }

  @Mutation((returns) => json)
  async addUsersToCluster(
    @Arg('data') data: CrmClusterAddUserInput,
    @Ctx() ctx: Context
  ) {
    const cluster: any = await prisma.crmCluster.findUnique({
      where: {
        id: data.clusterID, // Ensure data.clusterID is a valid ID
      },
    });

    if (!cluster) throw new Error('Cluster does not exist');
    let clusterCompany = await prisma.crmCluster.findUnique({
      where: {
        id: data.clusterID, // Ensure data.clusterID is a valid ID
      },
      include: {
        company: true, // This will include the associated company
      },
    });
    clusterCompany.company;
    // Permissions check
    let perm = await hasPermission(
      'marketing_customersUpload',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      clusterCompany.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const crmUsers: any[] = [];

    // Require either user ids or the userData
    if (!data.users && !data.userIDs) {
      throw new Error('You must provide at least one variable');
    }

    queueSelector.push(async (cb) => {
      let user: any;

      if (data.users && data.users.length > 0) {
        console.log(
          `[addUsersToCluster] New user data passed (length: ${data.users.length})`
        );
        for (let u of data.users) {
          // User data has been passed. We should NOT create the user accounts
          // for them (GDPR), but we can still create a CrmUser object
          user = { userData: u.userData };

          // Create a new CRM user if there isn't one already for this user and company
          let crmUser = await createOrGetCrmUser(clusterCompany, user);
          crmUsers.push(crmUser);
        }
        console.log(
          `[addUsersToCluster] End adding New user data passed (length: ${data.users.length})`
        );
      } else if (data.userIDs && data.userIDs.length > 0) {
        console.log(
          `[addUsersToCluster] Existing user IDs passed (length: ${data.userIDs.length})`
        );
        for (let userid of data.userIDs) {
          // User IDs have been passed, create CrmUser objects based on those users
          user = { id: userid };

          // Create a new CRM user if there isn't one already for this user and company
          let crmUser = await createOrGetCrmUser(clusterCompany, user);
          crmUsers.push(crmUser);
        }
        console.log(
          `[addUsersToCluster] End adding Existing user IDs passed (length: ${data.userIDs.length})`
        );
      }

      let crmUsersToConnect = crmUsers.map((u) => {
        return { id: u.id };
      });

      await prisma.crmCluster.update({
        where: { id: data.clusterID }, // Ensure data.clusterID is a valid ID
        data: {
          users: {
            connect: crmUsersToConnect, // crmUsersToConnect should be an array of user objects or IDs
          },
        },
      });

      // Add user to company's 'All Customer' cluster - this is handled from the frontend now
      // let acs = await prisma.crmClusters({
      //   where: {
      //     name: 'All Customers',
      //     company: {id: clusterCompany.id},
      //     clusterType: 'AUTOMATED'
      //   }
      // })
      // await prisma.updateCrmCluster({
      //   where: { id: acs[0].id },
      //   data: {
      //     users: {connect: crmUsersToConnect}
      //   }
      // })
      cb(null, crmUsersToConnect);
    });

    return { success: true };
  }

  @Mutation((returns) => json)
  async addUsersToMultiCluster(
    @Arg('data') data: CrmClustersAddUserInput,
    @Ctx() ctx: Context
  ) {
    const { clusterIDs } = data;
    for (const clusterID of clusterIDs) {
      const cluster = await prisma.crmCluster.findUnique({
        where: { id: clusterID }, // Use the correct ID to fetch the specific cluster
      });

      if (!cluster) throw new Error('Cluster does not exist');
      let clusterCompany = (await prisma.crmCluster.findUnique({
        where: { id: clusterID },
        include: { company: true }, // Include the related company data
      })) as any;
      clusterCompany = clusterCompany.company;

      // Permissions check
      let perm = await hasPermission(
        'marketing_customersUpload',
        PERMISSION_ACCESS_TYPES.view_and_edit,
        null,
        ctx.user.id,
        clusterCompany.id
      );
      if (!perm) return { error: 'NO_PERMISSION' };

      const crmUsers: any[] = [];

      // Require either user ids or the userData
      if (!data.users && !data.userIDs) {
        throw new Error('You must provide at least one variable');
      }

      queueSelector.push(async (cb) => {
        let user;

        if (data.users && data.users.length > 0) {
          console.log(
            `[addUsersToCluster] New user data passed (length: ${data.users.length})`
          );
          for (let u of data.users) {
            // User data has been passed. We should NOT create the user accounts
            // for them (GDPR), but we can still create a CrmUser object
            user = { userData: u.userData };

            // Create a new CRM user if there isn't one already for this user and company
            let crmUser = await createOrGetCrmUser(clusterCompany, user);
            crmUsers.push(crmUser);
          }
          console.log(
            `[addUsersToCluster] End adding New user data passed (length: ${data.users.length})`
          );
        } else if (data.userIDs && data.userIDs.length > 0) {
          console.log(
            `[addUsersToCluster] Existing user IDs passed (length: ${data.userIDs.length})`
          );
          for (let userid of data.userIDs) {
            // User IDs have been passed, create CrmUser objects based on those users
            user = { id: userid };

            // Create a new CRM user if there isn't one already for this user and company
            let crmUser = await createOrGetCrmUser(clusterCompany, user);
            crmUsers.push(crmUser);
          }
          console.log(
            `[addUsersToCluster] End adding Existing user IDs passed (length: ${data.userIDs.length})`
          );
        }

        let crmUsersToConnect: any = crmUsers.map((u) => {
          return u.id ;
        });

        await prisma.crmCluster.update({
          where: { id: clusterID },
          data: {
            users: {
              connect: crmUsersToConnect.map((userId) => ({ id: userId })),
            },
          },
        });

        // console.log(`[also] add users to the All customers cluster`) - handled in the frontend

        // let acs = await prisma.crmClusters({
        //   where: {
        //     name: 'All Customers',
        //     company: {id: clusterCompany.id},
        //     id: clusterID,
        //     clusterType: 'CUSTOMERS'
        //   }
        // })
        // console.log(`found the All customers cluster`)
        // await prisma.updateCrmCluster({
        //   where: { id: acs[0].id },
        //   data: {
        //     users: {connect: crmUsersToConnect}
        //   }
        // })
        // console.log(`updated the All customers cluster with users`)

        cb(null, crmUsersToConnect);
      });
    }

    return { success: true };
  }

  @Mutation((returns) => json)
  async deleteUsersFromCluster(
    @Arg('data') data: CrmClusterAddUserInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_customers',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    if (data.clusterID === 'all') {
      const allClusters = await prisma.crmCluster.findMany({
        where: {
          company: {
            id: ctx.company.id,
          },
        },
      });
      const clusterIds = allClusters.map((item: any) => item.id);
      
      if (!data.userIDs) {
        throw new Error('You must provide at least one variable');
      }
      // Loop through all clusters and remove the users from clusters users and userids
      for (let idx = 0; idx < clusterIds.length; idx++) {
        const currentCluster = await prisma.crmCluster.findMany({
          where: {
            id: clusterIds[idx]
          },
        })
        // Filter out the user IDs we want to delete
         const updatedUserIds = currentCluster[0].userIds.filter(
             (userId) => !data.userIDs.includes(userId)
         );
        await prisma.crmCluster.update({
          where: { id: clusterIds[idx] },
          data: {
            users: {
              disconnect: data.userIDs.map((userId) => ({ id: userId })),
              deleteMany: {
                id: { in: data.userIDs }, // Use `in` for matching multiple IDs
              },
            },
            userIds: { set: updatedUserIds }, // Update with the new userIds array
         },
        });
        //finally to fix disconnect issues, manually delete from all existing subclusters too
         const allSubClusters = await prisma.crmSubCluster.findMany({
          where: {
            parentClusterId: clusterIds[idx]
          },
        });
      for (let subCluster of allSubClusters) {
          await prisma.crmSubCluster.update({
            where: { id: subCluster.id },
            data: {
              users: {
                disconnect: data.userIDs.map((userId) => ({ id: userId })),
              },
            },
          });
        }
        
        //properly delete the crmusers from the crmUser table
        await prisma.crmUser.deleteMany({
          where: {
            id: { in: data.userIDs },
            associatedCompany: {
              id: ctx.company.id
            }
          },
        });
      }
      
    } else {
      const cluster = await prisma.crmCluster.findUnique({
        where: {
          id: data.clusterID,
        },
      });

      if (!cluster) throw new Error('Cluster does not exist'); 
       // Filter out the user IDs we want to delete
       const updatedUserIds = cluster?.userIds.filter(
           (userId) => !data.userIDs.includes(userId)
       );
      // Require either user ids or the userData
      if (!data.userIDs) {
        throw new Error('You must provide at least one variable');
      }

      await prisma.crmCluster.update({
        where: { id: data.clusterID },
        data: {
          users: {
            disconnect: data.userIDs.map((userId) => ({ id: userId })),
          },
          userIds: { set: updatedUserIds }, // Update with the new userIds array
        },
      })
       //finally to fix disconnect issues, manually delete from subclusters linkedto this
         const allSubClusters = await prisma.crmSubCluster.findMany({
          where: {
            parentClusterId: data.clusterID
          },
        });
        for (let subCluster of allSubClusters) {
          await prisma.crmSubCluster.update({
            where: { id: subCluster.id },
            data: {
              users: {
                disconnect: data.userIDs.map((userId) => ({ id: userId })),
              },
            },
          });
        }
    }
    return { success: true };
  }

  @Mutation((returns) => json)
  async createNewCrmCluster(
    @Arg('data') data: CreateCrmClusterInput,
    @Ctx() ctx: Context
  ) {
    // Override companyID if specified
    const companyID = data.companyID ? data.companyID : ctx.company.id;
    const company = await prisma.company.findUnique({
      where: { id: companyID },
    });

    if (!company) throw new Error('Company does not exist');

    // Permissions check
    let perm = await hasPermission(
      'marketing_customersClusters',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      company.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let creationData = { name: data.name };
    if (data.description) {
      creationData['description'] = data.description;
    }

    let userIdsObject: UserIDConnection[] = [];

    if (data.userIDs) {
      userIdsObject = data.userIDs.map((uId) => {
        return { id: uId };
      });
      // why do we need this? only crmUsers will be parsed here anyways
      // for (let i = 0; i < userIdsObject.length; i++) {
      //   let user = userIdsObject[i];

      //   // Create a new CRM user if there isn't one already for this user and company
      //   let crmUser = await createOrGetCrmUser(company, user);
      //   userIdsObject[i].id = crmUser?.id;
      // }

      creationData['users'] = {
        connect: userIdsObject,
      };
    }

    if (data.crmUserIDs) {
      let users = await prisma.crmUser.findMany({
        where: {
          id: {
            in: data.crmUserIDs,
          },
        },
      });

      creationData['users'] = {
        connect: users.map((user: any) => ({ id: user.id })),
      };
    }

    return await prisma.crmCluster.create({
      data: {
        id: createObjectID().id,
        company: {
          connect: {
            id: companyID,
          },
        },
        clusterType: 'MANUAL',
        ...creationData,
      },
    });
  }

  @Mutation((returns) => json)
  async deleteCrmCluster(
    @Arg('data') data: DeleteClusterInput,
    @Ctx() ctx: Context
  ) {
    const cluster = await prisma.crmCluster.findUnique({
      where: { id: data.clusterID },
    });

    if (!cluster) throw new Error('Cluster does not exist');

    // Permissions check
    let perm = await hasPermission(
      'marketing_customersClusters',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    await prisma.crmCluster.update({
      where: { id: data.clusterID },
      data: {
        status: 'ARCHIVED',
      },
    });

    return { success: true };
  }

  @Mutation((returns) => json)
  async updateCrmUserProfile(
    @Arg('data') data: UpdateCrmUserInput,
    @Ctx() ctx: Context
  ) {
    const { crmUserId, clusters, address, email, phone, ...rest } = data;

    // Permissions check
    let perm = await hasPermission(
      'marketing_customersClusters',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const user = await prisma.crmUser.findUnique({
      where: { id: crmUserId },
    });

    if (!user) throw new Error(`Crm User doesn't exist`);

    const userUpdated = await prisma.crmUser.update({
      where: {
        id: crmUserId,
      },
      data: {
        firstName: rest.firstName,
        lastName: rest.lastName,
        gender: rest.gender,
        email: email,
        phone: phone,
        personal_facebook: rest.personal_facebook,
        personal_instagram: rest.personal_instagram,
        personal_twitter: rest.personal_twitter,
        personal_wechat: rest.personal_wechat,
        personal_qq: rest.personal_qq,
        personal_personal_id: rest.personal_personal_id,
        personal_notes: rest.personal_notes,
        personal_notes_follow_up_date:
          rest.personal_notes_follow_up_date || null,
        em_job_type: rest.em_job_type,
        em_department: rest.em_department,
        em_email: rest.em_email,
        em_phone: rest.em_phone,
        em_notes: rest.em_notes,
        em_notes_follow_up_date: rest.em_notes_follow_up_date || null,
        cm_name: rest.cm_name,
        cm_email: rest.cm_email,
        cm_website: rest.cm_website,
        cm_phone: rest.cm_phone,
        cm_regnum: rest.cm_regnum,
        cm_sales_tax: rest.cm_sales_tax,
        cm_address: rest.cm_address,
        cm_city: rest.cm_city,
        cm_zipcode: rest.cm_zipcode,
        cm_country: rest.cm_country,
        cm_category: rest.cm_category,
        cm_notes: rest.cm_notes,
        cm_notes_follow_up_date: rest.cm_notes_follow_up_date || null,
        address: {
          ...address,
        },
      },
    });

    const currentCluster = await prisma.crmCluster.findMany({
      where: {
        users: {
          some: {
            id: crmUserId,
          },
        },
      },
    });

    const clusterSelectedIds = currentCluster.map((item: any) => item.id);
    const deletedCluster = clusterSelectedIds.filter(
      (item: any) => !clusters.includes(item)
    );
    const addedCluster = clusters.filter(
      (item: any) => !clusterSelectedIds.includes(item)
    );
    console.log(deletedCluster, addedCluster);

    for (let idx = 0; idx < deletedCluster.length; idx++) {
      console.log('here', idx, 'delete', deletedCluster[idx], crmUserId);
      await prisma.crmCluster.update({
        where: {
          id: deletedCluster[idx],
        },
        data: {
          users: {
            disconnect: {
              id: crmUserId,
            },
          },
        },
      });
    }

    for (let idx = 0; idx < addedCluster.length; idx++) {
      await prisma.crmCluster.update({
        where: {
          id: addedCluster[idx],
        },
        data: {
          users: {
            connect: {
              id: crmUserId,
            },
          },
        },
      });
    }

    return userUpdated;

    // await prisma.updateCrmCluster({
    //   where: { id: data.clusterID },
    //   data: {
    //     status: 'ARCHIVED'
    //   }
    // })
    // return {success: true}
  }

  @Mutation((returns) => json)
  async createCrmUserProfile(
    @Arg('data') data: CreateCrmUserInput,
    @Ctx() ctx: Context
  ) {
    const { clusters, address, email, phone, ...rest } = data;

    // Permissions check
    let perm = await hasPermission(
      'marketing_customersClusters',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };
    if (email.length) {
      const userExist = await prisma.crmUser.findMany({
        where: {
          email: email,
          associatedCompany: {
            id: ctx.company.id,
          },
        },
      });
      if (userExist.length)
        throw new Error(
          `This Crm User already exists in the Company, Please check user details and try again`
        );
    }

    const user = await createOrGetCrmUser(ctx.company, { userData: data });
    if (!user) throw new Error(`Crm User doesn't exist`);

    const currentCluster = await prisma.crmCluster.findMany({
      where: {
        users: {
          some: {
            id: user.id,
          },
        },
      },
    });

    const clusterSelectedIds = currentCluster.map((item: any) => item.id);
    const deletedCluster = clusterSelectedIds.filter(
      (item: any) => !clusters.includes(item)
    );
    const addedCluster = clusters.filter(
      (item: any) => !clusterSelectedIds.includes(item)
    );

    for (let idx = 0; idx < deletedCluster.length; idx++) {
      await prisma.crmCluster.update({
        where: {
          id: deletedCluster[idx],
        },
        data: {
          users: {
            disconnect: {
              id: user.id,
            },
          },
        },
      });
    }

    for (let idx = 0; idx < addedCluster.length; idx++) {
      await prisma.crmCluster.update({
        where: {
          id: addedCluster[idx],
        },
        data: {
          users: {
            connect: {
              id: user.id,
            },
          },
        },
      });
    }

    return user;
 }

  @Query((returns) => json)
  async autoClustersList(@Ctx() ctx: Context) {
    const allCluster = [];

    allCluster.push(await autoClusterFN.msl_account());
    allCluster.push(await autoClusterFN.account_package());
    allCluster.push(await autoClusterFN.platform_usage());
    allCluster.push(await autoClusterFN.employees(ctx));
    allCluster.push(await autoClusterFN.all_customers(ctx));
    allCluster.push(await autoClusterFN.access_type(ctx));

    return allCluster;
  }

  // @Mutation(returns=> json)
  // async customClusterQuery( @Arg("data") data: DeleteClusterInput,  @Ctx() ctx: Context){
  //   console.log(data)
  //   const users = await prisma.crmUsers({
  //     where: {
  //       user: {
  //         id: '60ce449a95f8a8001aec2899'
  //       }
  //     }
  //   })
  //   for (let idx = 0; idx < users.length; idx++) {
  //     await prisma.updateCrmUser({
  //       where: {
  //         id: users[idx].id
  //       },
  //       data: {
  //         user: {
  //           disconnect: true
  //         }
  //       }
  //     })
  //   }
  //   return await prisma.crmUsers({
  //     where: {
  //       user: {
  //         id: '60ce449a95f8a8001aec2899'
  //       }
  //     }
  //   })
  // }
}
