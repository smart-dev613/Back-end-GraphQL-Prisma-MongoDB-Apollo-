import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * WARNING: This method will permanently delete a company and all
 * of the company's data. Do not use unless you absolutely want to
 * delete an entire company.
 */
export const permanentlyDeleteCompany = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) throw new Error('No valid company');

  // TODO: delete RelationshipInfo relation
  // TODO: delete EventInvitation relation
  // TODO: delete PlatformEvent relation

  // 1. Delete all campaigns and other marketing data
  await prisma.campaign.deleteMany({
    where: { advertiserId: company.id },
  });
  console.log(`Deleted all campaigns for ${company.id}`);

  // 2. Delete all relationships
  await prisma.companyRelationship.deleteMany({
    where: { companies: { some: { id: company.id } } },
  });
  console.log(`Deleted all relationships for ${company.id}`);

  // 3. Delete all user groups
  await prisma.userGroup.deleteMany({
    where: { companyId: company.id },
  });
  console.log(`Deleted all user groups for ${company.id}`);

  // 5. Delete all employees
  await prisma.companyMembership.deleteMany({
    where: { companyId: company.id },
  });
  console.log(`Deleted all employees for ${company.id}`);

  // 6. Delete all user sessions
  await prisma.userSession.deleteMany({
    where: { companyId: company.id },
  });
  console.log(`Deleted all user sessions for ${company.id}`);

  // 7. Delete all billing ledgers
  await prisma.billingLedger.deleteMany({
    where: { companyId: company.id },
  });
  console.log(`Deleted all billing ledgers for ${company.id}`);

  // 8. Delete all billing invoices
  await prisma.billingInvoice.deleteMany({
    where: { companyId: company.id },
  });
  console.log(`Deleted all billing invoices for ${company.id}`);

  // 9. For every user that is switched to this company...
  const companyUsers = await prisma.user.findMany({
    where: { companyId: company.id },
  });
  for (const u of companyUsers) {
    let targetCompany = null;

    const userCompanies = await prisma.user.findUnique({
      where: { id: u.id },
      select: { companies: true },
    });

    if (userCompanies && userCompanies.companies.length > 0) {
      const newCompany = await prisma.companyMembership.findUnique({
        where: { id: userCompanies.companies[0].id },
        select: { company: true },
      });
      if (newCompany) {
        targetCompany = { connect: { id: newCompany.company.id } };
      }
    }

    await prisma.user.update({
      where: { id: u.id },
      data: { company: targetCompany },
    });
    console.log(
      `Set user ${u.id}'s switched company: ${JSON.stringify(targetCompany)}`
    );
  }

  // 10. Delete the company itself
  const del = await prisma.company.delete({
    where: { id: company.id },
  });
  console.log(`Deleted company ${company.id}`);
  return del;
};

/**
 * WARNING: This method will permanently delete a user and remove all
 * associated data. It will also disassociate the user from any company
 * that they are part of, unless they are the only employee, in which
 * case the company will be deleted too.
 */
export const permanentlyDeleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new Error('No valid user');

  const allCompanyMemberships = await prisma.companyMembership.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      company: {
        select: {
          id: true,
          members: true,
        },
      },
    },
  });

  for (const mem of allCompanyMemberships) {
    const memId = mem.id;

    // Delete all event invitations for the company memberships
    await prisma.eventInvitation.deleteMany({
      where: { inviteeId: memId },
    });
    console.log(
      `Deleted all event invitations for company membership ${memId}`
    );

    const platformEvents = await prisma.platformEvent.findMany({
      where: { organiserId: memId },
    });
    for (const event of platformEvents) {
      await prisma.platformEventSlot.deleteMany({
        where: { venue: { platformEventId: event.id } },
      });
      console.log(`Deleted all platform event slots for event ${event.id}`);
      await prisma.platformEventVenue.deleteMany({
        where: { platformEventId: event.id },
      });
      console.log(`Deleted all platform event venues for event ${event.id}`);
    }

    // Delete all platform events that the user created
    await prisma.platformEvent.deleteMany({
      where: { organiserId: memId },
    });
    console.log(`Deleted all platform events for company membership ${memId}`);

    // Delete companies if the user is the only member of it
    if (mem.company.members.length === 1) {
      await permanentlyDeleteCompany(mem.company.id);
    }
  }

  // Delete all company memberships for this user
  await prisma.companyMembership.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted all company memberships for ${user.id}`);

  // Delete login challenges
  await prisma.loginChallenge.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted all login challenges for ${user.id}`);

  // Delete user sessions
  await prisma.userSession.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted all user sessions for ${user.id}`);

  // Delete all permissions
  //   Rahul help
  //   await prisma.permissions.deleteMany({
  //     where: { User: user.id },
  //   });

  console.log(`Deleted all permissions for ${user.id}`);

  // Delete all studio templates
  await prisma.studioTemplate.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted all studio templates for ${user.id}`);

  // Delete all user feedback
  await prisma.userFeedback.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted all user feedback for ${user.id}`);

  // Delete all CRM question responses
  await prisma.crmQuestionResponse.deleteMany({
    where: { respondingUserId: user.id },
  });

  await prisma.userMarketingPreference.deleteMany({
    where: { userId: user.id },
  });

  // Finally, we can delete the user itself
  const del = await prisma.user.delete({
    where: { id: user.id },
  });
  console.log(`Deleted user ${user.id}`);
  return del;
};
