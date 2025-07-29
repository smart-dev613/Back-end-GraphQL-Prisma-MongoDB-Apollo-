// 70
import { json } from '../helpers';
import { Authorized, Query, Arg, Ctx, Resolver } from 'type-graphql';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { QRCodeForCampaignInput } from '../inputs/codes';
import { Context } from '../auth/context.interface';
import {
  checkIfUserIsInCompany,
  hasPermission,
} from '../helpers/permissionsHelper';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';

@Resolver()
export class CodesResolver {
  @Authorized()
  @Query(() => json)
  async getCodesForCampaign(
    @Arg('data') data: QRCodeForCampaignInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_codes',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    // Fetch campaign based on campaignId or legacyCampaignId
    let campaign = null;

    if (data.campaignId) {
      campaign = await prisma.campaign.findUnique({
        where: {
          id: data.campaignId,
        },
      });
    } else if (data.legacyCampaignId) {
      campaign = await prisma.campaign.findUnique({
        where: {
          id: data.legacyCampaignId,
        },
      });
    }

    // Check if campaign exists
    if (!campaign) {
      throw new Error('Campaign does not exist or could not be found');
    }

    // Fetch codes for the campaign
    const unfilteredCodesForCampaign = await prisma.code.findMany({
      where: {
        campaign: campaign.id
      },
      // select: JSON.parse(sanitisedCodesForCampaign), // Use select instead of fragment for Prisma
    });

    // Filter for live codes only
    const codesForCampaign = unfilteredCodesForCampaign.filter(
      (code) => code.status === 7
    );

    return codesForCampaign;
  }
}
