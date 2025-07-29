// 560
import { ObjectId } from 'mongodb';
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { createObjectID } from '../../util/createIDs';
import { hashCode } from '../../util/hashCode';
import { Context } from '../auth/context.interface';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { json } from '../helpers';
import { connectMedia, db } from '../helpers/mongoHelper';
import {
  allChannelPermissions,
  checkIfUserIsInCompany,
  checkIfUserIsSynkd,
  getEmployeeIdFromUserCompany,
  hasPermission,
} from '../helpers/permissionsHelper';
import {
  ArchiveOrRestoreCampaignInput,
  CreateBrandInput,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../inputs/campaign';
import { ChannelScopesEnum } from '../inputs/permissions';

const preCampaignChecks = async (data: any, ctx: Context) => {
  // Ensure authenticated user is part of the advertiser company
  const advertiserComp = await checkIfUserIsInCompany(
    ctx.user.id,
    data.advertiser
  );
  if (advertiserComp === null)
    throw new Error(`User is not part of this advertiser company`);

  // Ensure advertiser and brand exists
  // const clientComp = await prisma.company({id: data.client})
  const clientComp = await prisma.company.findUnique({
    where: {
      id: data.client,
    },
  });
  // 22/2/21 client should match advertiser for now
  if (!clientComp) throw new Error('Advertiser does not exist');
  const brandComp = await prisma.brand.findUnique({
    where: {
      id: data.brand,
    },
  });

  if (!brandComp) throw new Error('Brand does not exist');

  return { clientComp, advertiserComp, brandComp };
};

/**
 * Returns all of the channel counts for a specific campaign
 * @param campaignId - int
 */
const getChannelCountsForCampaign = async (campaignId: string) => {
  let channels = {
    email: 0,
    events: 0,
    sms: 0,
    search: 0,
    social: 0,
    codes: 0,
    media: 0,
    research: 0,
    studio: 0,
  };

  // mailing countconst brandComp = await prisma.brand({ id: data.brand })
  let mailingCount = await prisma.mailBatch.findMany({
    where: {
      campaign: campaignId,
    },
    select: {
      id: true,
    },
  });

  channels['email'] = mailingCount.length;

  // media count
  let mediaCount = await prisma.mediaFlight.findMany({
    where: {
      campaign: campaignId,
    },
    select: {
      id: true,
    },
  });

  channels['media'] = mediaCount.length;

  // codes count
  let codesCount = await prisma.code.findMany({
    where: {
      campaign: campaignId,
    },
    select: {
      id: true,
    },
  });

  channels['codes'] = codesCount.length;

  // research count
  let researchCount = await prisma.research.findMany({
    where: {
      campaignId: campaignId,
    },
    select: {
      id: true,
    },
  });

  channels['research'] = researchCount.length;

  // studio count
  let studioCount = await prisma.legacyStudioProject.findMany({
    where: {
      Campaign: campaignId,
    },
    select: {
      id: true,
    },
  });

  channels['studio'] = studioCount.length;

  return channels;
};

@Resolver()
export class campaignResolver {
  @Authorized()
  @Query((returns) => json)
  async myCampaigns(@Ctx() ctx: Context) {
    const companies = await prisma.user.findMany({
      where: {
        id: ctx.user.id,
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

    const companyIds: string[] = companies.map((c) => {
      return c['company']['id'];
    });

    const campaigns = await prisma.campaign.findMany({
      where: {
        advertiser: {
          id: {
            in: companyIds,
          },
        },
      },
      select: {
        id: true,
        advertiser: {
          select: {
            id: true,
            name: true,
          },
        },
        archiveMethod: true,
        bookingAmount: true,
        brand: true,
        budget: true,
        category: true,
        channel: true,
        channelsCreated: true,
        client: true,
        country: true,
        currency: true,
        idIncrement: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            email: true,
          },
        },
        end: true,
        name: true,
        percentage: true,
        spend: true,
        start: true,
        status: true,
        crmUsersAtCreation: true,
        crmClustersAtCreation: true,
        crmQuestionsAtCreation: true,
      },
    });

    // add channel #s
    for (let c of campaigns) {
      c['channels'] = await getChannelCountsForCampaign(c.id);
    }

    return campaigns;
  }

  @Authorized()
  @Query((returns) => json)
  async getCampaignsForCompany(
    @Arg('companyId') companyId: string,
    @Ctx() ctx: Context
  ) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId, true);
    if (company === null) throw new Error(`User is not part of this company`);

    let isSynkd = await checkIfUserIsSynkd(ctx.user.id);
    let employeeId = await getEmployeeIdFromUserCompany(
      ctx.user.id,
      company.id
    );

    // Permissions check
    let perm = true,
      eaPerm = true;
    if (!isSynkd && !company['fromRelationship']) {
      perm = await hasPermission(
        'marketing_campaigns',
        PERMISSION_ACCESS_TYPES.view_only,
        employeeId
      );
      if (!perm) return { error: 'NO_PERMISSION' };
      eaPerm = await hasPermission(
        'marketing_campaigns',
        PERMISSION_ACCESS_TYPES.edit_and_archive,
        employeeId
      );
    } else if (company['fromRelationship']) {
      eaPerm = false;
    }
    const campaigns = await prisma.campaign.findMany({
      where: {
        advertiser: {
          id: company.id,
        },
      },
      select: {
        id: true,
        advertiser: {
          select: {
            id: true,
            name: true,
          },
        },
        archiveMethod: true,
        bookingAmount: true,
        brand: true,
        budget: true,
        category: true,
        channel: true,
        channelsCreated: true,
        client: true,
        country: true,
        currency: true,
        idIncrement: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            email: true,
          },
        },
        end: true,
        name: true,
        percentage: true,
        spend: true,
        start: true,
        status: true,
        crmUsersAtCreation: true,
        crmClustersAtCreation: true,
        crmQuestionsAtCreation: true,
      },
    });

    // Prisma doesn't support OR for MongoDB
    const campaignsAsClient = await prisma.campaign.findMany({
      where: {
        client: {
          id: company.id, // Assuming `clientRelation` is the correct relation field for `_client`
        },
      },
      select: {
        id: true,
        advertiser: {
          select: {
            id: true,
            name: true,
          },
        },
        archiveMethod: true,
        bookingAmount: true,
        brand: true,
        budget: true,
        category: true,
        channel: true,
        channelsCreated: true,
        client: true,
        country: true,
        currency: true,
        idIncrement: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            email: true,
          },
        },
        end: true,
        name: true,
        percentage: true,
        spend: true,
        start: true,
        status: true,
        crmUsersAtCreation: true,
        crmClustersAtCreation: true,
        crmQuestionsAtCreation: true,
      },
    });

    for (let i = 0; i < campaignsAsClient.length; i++) {
      // Merge the two arrays
      let curr = campaignsAsClient[i];
      if (!campaigns.find((c) => c.id === curr.id)) {
        campaigns.push(curr);
      }
    }

    let accessibleCampaigns = [];

    if (!isSynkd) {
      let scopePermissions = await allChannelPermissions(
        employeeId,
        ChannelScopesEnum.CAMPAIGN
      );
      for (let sp of scopePermissions) {
        if (sp.campaign && sp.campaign.hasOwnProperty('id')) {
          accessibleCampaigns.push(sp.campaign.id);
        }
      }
    }
    const permCampaigns = await prisma.campaign.findMany({
      where: {
        id: {
          in: accessibleCampaigns, // This replaces `id_in` from the previous version
        },
      },
      select: {
        id: true,
        advertiser: true,
        archiveMethod: true,
        bookingAmount: true,
        brand: true,
        budget: true,
        category: true,
        channel: true,
        channelsCreated: true,
        client: true,
        country: true,
        currency: true,
        idIncrement: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            email: true,
          },
        },
        end: true,
        name: true,
        percentage: true,
        spend: true,
        start: true,
        status: true,
        crmUsersAtCreation: true,
        crmClustersAtCreation: true,
        crmQuestionsAtCreation: true,
      },
    });

    for (let i = 0; i < permCampaigns.length; i++) {
      // Merge the two arrays
      let curr = permCampaigns[i];
      if (!campaigns.find((c) => c.id === curr.id)) {
        campaigns.push(curr);
      }
    }
    for (var i = 0; i < campaigns.length; i++) {
      let c = campaigns[i];
      // TODO: thriple check this logic @IZA:02-06-2023
      //         if (!c || !(c.id in accessibleCampaigns)) {
      //             // no access to campaign, don't return this campaign
      //             campaigns = campaigns.splice(i, 1)
      //             continue
      //     }
      // add channel counts
      c['channel'] = Object.values(
        await getChannelCountsForCampaign(c.id)
      ).reduce((a, b) => a + b, 0);
    }

    // Sort the campaigns by recently created
    campaigns.sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return campaigns;
  }

  @Authorized()
  @Query((returns) => json)
  async getCampaign(@Arg('id') id: string) {
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: id, // The ID to find the specific campaign
      },
      select: {
        id: true,
        advertiser: {
          select: {
            id: true,
            name: true,
          },
        },
        archiveMethod: true,
        bookingAmount: true,
        brand: true,
        budget: true,
        category: true,
        channel: true,
        channelsCreated: true,
        client: true,
        country: true,
        currency: true,
        idIncrement: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            email: true,
          },
        },
        end: true,
        name: true,
        percentage: true,
        spend: true,
        start: true,
        status: true,
        crmUsersAtCreation: true,
        crmClustersAtCreation: true,
        crmQuestionsAtCreation: true,
      },
    });

    campaign['channels'] = await getChannelCountsForCampaign(campaign.id);
    return campaign;
  }

  @Authorized()
  @Query((returns) => json)
  async getCampaignByIdNumber(@Arg('id') id: string) {
    let campaign: any;
    campaign = await prisma.campaign.findMany({
      where: {
        id: id, // Convert id to a number if necessary (use `+id` for conversion)
      },
      select: {
        id: true,
        advertiser: {
          select: {
            id: true,
            name: true,
          },
        },
        archiveMethod: true,
        bookingAmount: true,
        brand: true,
        budget: true,
        category: true,
        channel: true,
        channelsCreated: true,
        client: true,
        country: true,
        currency: true,
        idIncrement: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            email: true,
          },
        },
        end: true,
        name: true,
        percentage: true,
        spend: true,
        start: true,
        status: true,
        crmUsersAtCreation: true,
        crmClustersAtCreation: true,
        crmQuestionsAtCreation: true,
      },
    });

    if (campaign.length > 0) {
      campaign = campaign[0];
    } else {
      campaign = null;
    }
    campaign['channels'] = await getChannelCountsForCampaign(campaign.id);
    return campaign;
  }

  @Authorized()
  @Mutation((returns) => json)
  async createCampaign(
    @Arg('data') data: CreateCampaignInput,
    @Ctx() ctx: Context
  ) {
    const { clientComp, advertiserComp, brandComp } = await preCampaignChecks(
      data,
      ctx
    );

    // Check for existing name, if exists do not create the campaign
    let campaignsWithSameName = await prisma.campaign.findMany({
      where: {
        name: data.name,
      },
    });

    if (campaignsWithSameName.length > 0)
      throw new Error('This campaign name is already in use');

    // Permissions check
    console.log('CHECKING CREATE CAMPAIGN PERMS');
    let perm = await hasPermission(
      'marketing_campaigns',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      advertiserComp.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };
    // get current counts of crm-based tables
    const crmUserCursor = db
      .collection('CrmUser')
      .find({ associatedCompany: new ObjectId(ctx.company.id) });
    const crmUsers = await crmUserCursor.toArray();
    // const crmUsers = await prisma.crmUsers({where: {}})

    const crmClusters = await prisma.crmCluster.findMany({
      where: {
        company: {
          id: ctx.company.id,
        },
        status: {
          not: 'ARCHIVED',
        },
      },
      select: {
        id: true,
        clusterType: true,
        users: {
          select: {
            id: true,
          },
        },
      },
    });

    const crmQuestions = await prisma.crmQuestion.findMany({
      where: {
        company: {
          id: ctx.company.id,
        },
      },
    });

    const crmUsersFromClusters = Array.from(
      new Set([].concat(...crmClusters.map((item) => item.users)))
    );

    const { id } = createObjectID();

    let campaigns: any = await prisma.campaign.findMany({
      where: {
        client: {
          id: ctx.company.id,
        },
      },
      select: {
        idIncrement: true,
      },
    });

    campaigns = campaigns
      .map((item) => item.idIncrement)
      .filter((item) => item);
    const newIdIncrement =
      campaigns.length === 0 ? 1 : Math.max(...campaigns) + 1;

    let hc = hashCode(id);

    // Create the campaign
    const campaign = await prisma.campaign.create({
      data: {
        id,
        name: data.name,
        status: data.status,
        currency: data.currency,
        budget: +data.budget || 1,
        advertiser: {
          connect: { id: advertiserComp.id },
        },
        brand: { connect: { id: brandComp.id } },
        client: { connect: { id: clientComp.id } },
        crmUsersAtCreation: crmUsers.length,
        crmClustersAtCreation: crmClusters.filter((item: any) => item).length,
        crmQuestionsAtCreation: crmQuestions.filter(
          (item: any) => item.status === 'LIVE'
        ).length,
        createdByUser: { connect: { id: ctx.user.id } },
        idIncrement: newIdIncrement,
      },
    });

    // Create indexes for the campaign
    try {
      console.log(`Creating indexes for campaign ${id} (${hc})`);
      let mc = await connectMedia();
      let db = mc.db('media');
      let coll = await db.createCollection(hc.toString());
      await coll.createIndexes([
        {
          name: 'General',
          key: {
            Created: -1,
            Creative: -1,
            Events: -1,
            Fingerprint: -1,
            Flight: -1,
            IP: -1,
            SessionID: -1,
            Tag: -1,
            URL: -1,
          },
          background: true,
        },
        { name: 'Session', key: { SessionID: -1 }, background: true },
        {
          name: 'Retargeting',
          key: { Creative: -1, Fingerprint: 1 },
          background: true,
        },
        {
          name: 'Fraud',
          key: { IP: 1, Events: 1, Created: -1 },
          background: true,
        },
        { name: 'TagCount', key: { Tag: -1 }, background: true },
      ]);
    } catch (err) {
      console.error(
        `Could not create indexes for campaign ${id} (${hc}). This may cause CPU issues when querying the media collection. Address urgently. Error message:`,
        err
      );
    }

    // Add permission to view campaign
    console.log(
      `Creating permissions for campaign ${id} and employee ${ctx.companyMembership?.id}`
    );
    if (ctx.companyMembership?.id) {
      await prisma.channelPermissions.create({
        data: {
          employee: { connect: { id: ctx.companyMembership.id } },
          scope: 'CAMPAIGN', // Ensure this is the correct enum value
          campaign: { connect: { id: campaign.id } },
        },
      });
    }

    return campaign;
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateCampaign(
    @Arg('data') data: UpdateCampaignInput,
    @Ctx() ctx: Context
  ) {
    const { clientComp, advertiserComp, brandComp } = await preCampaignChecks(
      data,
      ctx
    );

    // Check for existing name, if exists do not create the campaign
    //   let campaignsWithSameName = await prisma.campaigns({
    //     where: {
    //         name: data.name
    //     }
    // })
    // if (campaignsWithSameName.length > 0) throw new Error("This campaign name is already in use")

    // Permissions check
    let perm = await hasPermission(
      'marketing_campaigns',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let campaign = await prisma.campaign.findUnique({
      where: {
        id: data.id,
      },
    });

    if (!campaign) throw new Error('Campaign does not exist');

    return await prisma.campaign.update({
      data: {
        name: data.name,
        status: data.status,
        currency: data.currency,
        advertiser: { connect: { id: advertiserComp.id } },
        brand: { connect: { id: brandComp.id } },
        client: { connect: { id: clientComp.id } },
        budget: +data.budget || 1,
      },
      where: {
        id: campaign.id,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async archiveOrRestoreCampaign(
    @Arg('data') data: ArchiveOrRestoreCampaignInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_campaigns',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership?.id,
      ctx.user.id,
      ctx.company.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let campaign = await prisma.campaign.findUnique({
      where: {
        id: data.id,
      },
    });

    if (!campaign) throw new Error('Campaign does not exist');

    return await prisma.campaign.update({
      data: {
        status: campaign.status === 3 ? 7 : 3,
        archiveDate: new Date(),
      },
      where: {
        id: campaign.id,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async copyCampaign(@Arg('id') campaignId: string, @Ctx() ctx: Context) {
    let campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },
      select: {
        id: true,
        name: true,
        currency: true,
        budget: true,
        advertiser: {
          select: {
            id: true,
          },
        },
        brand: {
          select: {
            id: true,
          },
        },
        client: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!campaign) throw new Error('Campaign does not exist');

    const { clientComp, advertiserComp, brandComp } = await preCampaignChecks(
      {
        advertiser: campaign.advertiser.id,
        client: campaign.client.id,
        brand: campaign.brand.id,
      },
      ctx
    );

    return await this.createCampaign(
      {
        name: `${campaign.name} (copy)`,
        advertiser: advertiserComp.id,
        brand: brandComp.id,
        status: 7,
        client: clientComp.id,
        currency: campaign.currency,
        budget: campaign.budget,
      },
      ctx
    );
  }

  /**
   * Brands
   */

  @Authorized()
  @Mutation((returns) => json)
  async createBrand(@Arg('data') data: CreateBrandInput, @Ctx() ctx: Context) {
    const company = await checkIfUserIsInCompany(
      ctx.user.id,
      data.advertiserId
    );
    if (company === null) throw new Error(`User is not part of this company`);

    const clientCompany = await prisma.company.findUnique({
      where: {
        id: data.clientId,
      },
    });

    if (!clientCompany) throw new Error('Client does not exist');

    let id = new ObjectId().toString();

    const newBrand = await prisma.brand.create({
      data: {
        id,
        advertiserId: company.id,
        clientId: clientCompany.id,
        name: data.name,
      },
    });

    return newBrand;
  }

  /**
   * Replacement for api-fenix `/general/ba`
   * @param companyId - Advertiser company ID
   * @param ctx
   */
  @Authorized()
  @Query((returns) => json)
  async getBrandsForCompany(
    @Arg('companyId') companyId: string,
    @Ctx() ctx: Context
  ) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId, true);
    if (company === null) throw new Error(`User is not part of this company`);

    const brands = await prisma.brand.findMany({
      where: {
        advertiser: {
          id: company.id,
        },
      },
      select: {
        id: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        advertiser: {
          select: {
            id: true,
            name: true,
          },
        },
        name: true,
      },
    });

    return brands;
  }

  /**
   * Advertiser
   */

  /**
   * Replacement for api-fenix functionality
   * TODO: Deprecate this
   * @param companyId - Advertiser company ID
   * @param ctx
   */
  @Authorized()
  @Query((returns) => json)
  async getAdvertiserForCompany(
    @Arg('companyId') companyId: string,
    @Ctx() ctx: Context
  ) {
    const company = await checkIfUserIsInCompany(ctx.user.id, companyId, true);
    if (company === null) throw new Error(`User is not part of this company`);

    const advertiser = await prisma.advertiser.findMany({
      where: {
        company: {
          id: companyId,
        },
      },
      select: {
        id: true,
        company: {
          select: {
            id: true,
          },
        },
        name: true,
      },
    });

    if (advertiser.length === 0) throw new Error('Advertiser does not exist');

    // There's only ever going to be one advertiser for a company
    return advertiser[0];
  }
}
