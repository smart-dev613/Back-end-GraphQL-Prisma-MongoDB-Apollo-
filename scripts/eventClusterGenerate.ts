import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { createOrGetCrmUser } from "../src/resolvers/clusterResolver";
import { createObjectID } from "../util/createIDs";
import { hashCode } from "../util/hashCode";


export const createPlatformEventContentQRCodeCluster = async (event: any) => {

    console.log("creating createPlatformEventContentQRCodeCluster")

    const eventMembers: any = await prisma.platformEventMember.findMany({
      where: { platformEvent: { id: event.id} },
      select: {
        id: true,
        platformEvent: true,
        profile: true,
        role: true,
        status: true,
        user: true,
      }
    })
    

      // Create subcluster and record the ID in the options

      

      const {id} = createObjectID();

      try {

        const parentCluster = await prisma.crmCluster.create({ 
          data: {
            name:  `${event.name} QR code`,
            description:  `${event.name} QR code`,
            company: {
              connect: {
                id: event.organiser.company.id
              }
            },
            clusterType: "EVENT",
            id: createObjectID().id
        }});


         let notAttendedSubClusterID;


          let subCluster = ["Attended", "Not Attended"]


          let subClusterOptions =[]

          for (let option of subCluster) {
            subClusterOptions.push({
              clusterType: "EVENT",
              name: option,
              id: createObjectID().id,
            });
          }

          // Bulk create sub-clusters
          let newSubClusters = await prisma.crmSubCluster.createMany({
            data: subClusterOptions,
          });

       
        for (let member of eventMembers) {

          let crmUser = await createOrGetCrmUser(event.organiser.company, { id: member?.user?.id, userData: {...member.user}}, true)
    
          await prisma.crmCluster.update({
            where: { id: parentCluster.id },
            data: {
              users: { connect: { id: crmUser.id } }
            }
          })

          await prisma.crmSubCluster.update({
            where: { id: notAttendedSubClusterID },
            data: {
              users: { connect: { id: crmUser.id } }
            }
          })
        }


        await prisma.platformEvent.update({
          where: {
            id: event.id
          },
          data: {
            customCluster: {
              connect: {
                id: parentCluster.id
              }
            }
          }

        })

      } catch(error){

        console.log("error createPlatformEventContentQRCodeCluster: ", error.message)

      }

}

export const createClusterFromEvent = async (event: any) => {
  try {
    console.log(`[Event Cluster]: Start generate cluster for ${event.id}`);

    // Create or get CRM user
    let crmUser = await createOrGetCrmUser(event.organiser.company, {
      id: event?.organiser?.user?.id,
      userData: { ...event?.organiser?.user },
    }, true);

    if (!event.cluster) {
      const { id: crmMainClusterID } = createObjectID();
      const { id: annualMembershipClusterID } = createObjectID();
      const { id: memberClusterID } = createObjectID();

      // Bulk create main clusters
      const clustersToCreate = [
        {
          id: crmMainClusterID,
          name: event.name,
          description: event.description,
          companyId: event.organiser.company.id,
          clusterType: "EVENT",
        },
        {
          id: annualMembershipClusterID,
          name: `${event.name} Annual Membership`,
          companyId: event.organiser.company.id,
          clusterType: "EVENT",
        },
        {
          id: memberClusterID,
          name: `${event.name} Members`,
          companyId: event.organiser.company.id,
          clusterType: "EVENT",
          ...(crmUser?.id && { userId: crmUser.id }), // Connect user if exists
        },
      ];

      // Bulk create clusters
      await prisma.crmCluster.createMany({
        data: clustersToCreate,
      });

      // Update platform event with main cluster
      await prisma.platformEvent.update({
        where: {
          id: event.id,
        },
        data: {
          cluster: {
            connect: { id: crmMainClusterID },
          },
          customCluster: {
            connect: [{ id: annualMembershipClusterID }, { id: memberClusterID }],
          },
        },
      });

      // Create sub-clusters
      const subClusters = [
        {
          clusterType: "EVENT",
          name: `Invited`,
          parentClusterId: memberClusterID,
          id: createObjectID().id,
        },
        {
          clusterType: "EVENT",
          name: `Joined`,
          parentClusterId: memberClusterID,
          ...(crmUser?.id && { userId: crmUser.id }), // Connect user if exists
          id: createObjectID().id,
        },
        {
          clusterType: "EVENT",
          name: `Paid`,
          parentClusterId: annualMembershipClusterID,
          id: createObjectID().id,
        },
        {
          clusterType: "EVENT",
          name: `Not Paid`,
          parentClusterId: annualMembershipClusterID,
          id: createObjectID().id,
        },
      ];

      // Bulk create sub-clusters
      await prisma.crmSubCluster.createMany({
        data: subClusters,
      });
    }

    console.log(`[Event Cluster]: Finish generate cluster for ${event.id}`);
  } catch (error) {
    console.error(error);
    // throw error;
  }
};



// generateClusterFromAllEvents().then(() => console.log("done"));
