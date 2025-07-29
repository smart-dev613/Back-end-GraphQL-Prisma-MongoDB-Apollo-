import { prisma } from "../src/generated/prisma-client";
import { createObjectID } from "../util/createIDs";
import { ObjectId } from "mongodb";
import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
  maxConcurrent: 100,
  minTime: 100
});

const createPlatformEventMembership = async () => {

    prisma.deleteManyPlatformEventMembers().then( async()=> {

        const invitations: any = await prisma.eventInvitations({ where: { invitationStatus: 'ACCEPTED' }})
    .$fragment(`
    {
        id
        invitationStatus
        eventType
        updatedAt
        invitee {
          id
        }
        platformEvent {
          id
        }
      }`);
  
      for (const invitation of invitations){
        if(invitation.invitationStatus === "ACCEPTED"){
          
         try {

          const id = new ObjectId().toString()
          const profile:any = await prisma.companyMembership({ id: invitation.invitee.id }).$fragment(
            `{
              id
              status
              role
              email
              avatar
              user {
                id
              }
            }
            `
          )
          const member = await prisma.platformEventMembers({where: { platformEvent: { id: invitation.platformEvent.id }, user: { id: profile.user.id }} })
         

          if(!member?.length){
            console.log("creating member ship")
            await prisma.createPlatformEventMember({
              _id: id,
              id: id,
              platformEvent: { connect: { id: invitation.platformEvent.id } },
              profile: { connect: { id: profile.id } },
              user: { connect: { id: profile.user.id } },
              status: "ACTIVE"
            })
        }
          
         } catch (error){
          console.error(error)
         }
         
    
        }

      }

    })

    
   


//   const companies = await prisma.companies();

//   companies.forEach(async company => {
//     await limiter.schedule(() => createInitialBillingEntries(company));
//   });
};

createPlatformEventMembership().then(() => console.log("done"));