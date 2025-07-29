import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Returns the company associated with a legacy studio token.
 * Grabs the legacy studio project for the token, then the campaign for that project,
 * then the company which is the "advertiser" for that campaign.
 * @param token
 */
export const getCompanyForLegacyStudioToken = async (token: string) => {
  const lst = await prisma.legacyStudioToken.findUnique({
    where: {
      key: token,
    },
  });

  if (!lst) throw new Error('Invalid legacy studio token provided');

  const user = await prisma.user.findUnique({
    where: { id: lst.user },
    include: {
      company: true,
    },
  });

  if (!user) throw new Error(`Invalid user for LST token ${token}`);

  // Uncomment and update the following code if needed
  // const project = await prisma.legacyStudioProject.findUnique({
  //   where: { id: lst.projectId },
  // });

  // if (!project) throw new Error(`Invalid project ID for LST token ${token}`);

  // const campaign = await prisma.campaign.findUnique({
  //   where: { id: project.campaignId },
  // });

  // if (!campaign) throw new Error(`Invalid campaign ID for project ${project.id}`);

  // const company = await prisma.company.findUnique({
  //   where: { id: campaign.advertiserId },
  // });

  // if (!company) throw new Error(`Invalid company ID for advertiser ${campaign.advertiserId} for project ${project.id}`);

  // return company;

  return user.company;
};
