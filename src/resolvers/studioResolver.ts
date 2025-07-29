import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { Context } from '../auth/context.interface';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { json } from '../helpers';
import {
  checkIfUserIsInCompany,
  hasPermission,
} from '../helpers/permissionsHelper';
import {
  CreateStudioProjectInput,
  CreateStudioTemplateInput,
  UpdateStudioTemplateInput,
  StudioProjectForCampaignInput,
} from '../inputs/studio';
import {validate as validateUUID } from 'uuid';

import { Client as PostgresClient } from 'pg';
import { createObjectID } from '../../util/createIDs';

// Cleaned up studio project fragment to select fields directly in the Prisma query
const sanitisedStudioProjectSelect = {
  id: true,
  Campaign: true,
  title: true,
  comments: true,
  size: true,
  type: true,
  crossDeviceURL: true,
  smartphoneProjectID: true,
  tabletProjectID: true,
  desktopProjectID: true,
  status: true,
  user: true,
  createdAt: true,
  updatedAt: true,
};

const resolveStudioProjUserReference = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  return user || null;
};

@Resolver()
export class studioResolver {
  /**
   * Studio
   */

  @Authorized()
  @Query((returns) => json)
  async getStudioProjectsForCampaign(
    @Arg('data') data: StudioProjectForCampaignInput,
    @Ctx() ctx: Context
  ) {
    const perm = await hasPermission(
      'marketing_studio',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const campaign = await prisma.campaign.findUnique({
      where: { id: data.campaignId ?? data.legacyCampaignId },
    });

    if (!campaign)
      throw new Error('Campaign does not exist or could not be found');
    console.log('campaign', campaign);

    // const studioProjects = await prisma.legacyStudioProject.findMany({
    //   where: { campaignId: campaign.id },
    //   select: sanitisedStudioProjectSelect,
    // });

    // const userIdCache: Record<number, any> = {};

    // for (const sp of studioProjects) {
    //   let user = null;
    //   if (sp.user) {
    //     user =
    //       userIdCache[sp.user] ??
    //       (userIdCache[sp.user] = await resolveStudioProjUserReference(
    //         sp.user
    //       ));
    //   }
    //   sp.user = user;
    // }

    const pg = new PostgresClient({
      connectionString: process.env.POSTGRES_URL,
    });
    await pg.connect();
    const v3Results = await pg.query(
      `SELECT * FROM canvases WHERE campaign_id = $1`,
      [campaign.id]
    );
    const v3Projects = v3Results.rows.map((canvas) => ({
      _id: canvas.id,
      _campaign: Number(canvas.campaign_id),
      createdAt: canvas.created_at,
      updatedAt: canvas.updated_at,
      title: canvas.title,
      status: canvas.status,
      type: canvas.type,
      requiresWarning: canvas.status === 8,
      user: {},
    }));
    await pg.end();
    // ...studioProjects,
    return [ ...v3Projects];
  }

  @Authorized()
  @Query((returns) => json)
async getStudioProjectsForCompany(
  @Arg('companyId') companyId: string,
  @Ctx() ctx: Context
) {
  const company: any = await checkIfUserIsInCompany(
    ctx.user.id,
    companyId,
    true
  );
  if (!company) throw new Error(`User is not part of this company`);

  const perm =
    company.fromRelationship ||
    (await hasPermission(
      'marketing_studio',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership?.id,
      ctx.user.id,
      ctx.company.id
    ));
  if (!perm) return { error: 'NO_PERMISSION' };

  const permStudioCampaign = await prisma.channelPermissions.findMany({
    where: {
      employeeId: ctx.companyMembership.id,
      scope: 'STUDIO',
    },
    select: { item: true },
  });

  const permStudioIds = permStudioCampaign.map((p) => p.item);

  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId: company.id },
    select: { id: true },
  });

  if (campaigns.length === 0) return [];

  const campaignIds = campaigns.map((c) => c.id);
console.log('permStudioIds', permStudioIds)
  // Separate MongoDB IDs from UUIDs using the uuid library
  const mongoStudioIds = permStudioIds.filter((id) => !validateUUID(id));
  const uuidStudioIds = permStudioIds.filter((id) => validateUUID(id));

  // Query MongoDB for non-UUID studio IDs to return by campaign or studio perms
  const studioProjects = await prisma.legacyStudioProject.findMany({
  where: {
    OR: [
      { Campaign: { in: campaignIds } },
      { id: { in: mongoStudioIds } }
    ],
  },
});

  // Query PostgreSQL for UUID studio IDs
  const pg = new PostgresClient({
    connectionString: process.env.POSTGRES_URL,
  });
  await pg.connect();
// get studio projects from v3 perms
  const pgResults = await pg.query(`
    SELECT * FROM canvases WHERE id = ANY($1)
  `, [uuidStudioIds]);

  const permCampaigns = pgResults.rows.map((row) => ({
    id: row.id,
    campaign: row.campaign_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    title: row.title,
    status: 7,
    type: row.type,
  }));

  // Merge the results from both queries
  studioProjects.push(...permCampaigns);

  // Resolve user references
  const userIdCache: Record<number, any> = {};
  for (const sp of studioProjects) {
    let user = null;
    if (sp.user) {
      user =
        userIdCache[sp.user] ??
        (userIdCache[sp.user] = await resolveStudioProjUserReference(sp.user));
    }
    sp.user = user;
  }

  // Get from studio v3 using campaigns in postgres
  const v3Results = await pg.query(
    `SELECT * FROM canvases WHERE campaign_id IN (${campaigns.map((c) => `'${c.id}'`).join(',')})`
  );
  const v3Projects = v3Results.rows.map((canvas) => ({
    id: canvas.id,
    campaign: canvas.campaign_id,
    createdAt: canvas.created_at,
    updatedAt: canvas.updated_at,
    title: canvas.title,
    status: 7,
    type: canvas.type,
    user: canvas?.user,
  }));
  await pg.end()

  return [...studioProjects, ...v3Projects];
}
  
  
  @Authorized()
  @Mutation((returns) => json)
  async editSingleStudioProject(
    @Arg('data') data: CreateStudioProjectInput,
    @Ctx() ctx: Context,
    @Arg('projectId') projectId: string // Assuming you need to pass the project ID as an argument
  ) {
    const company: any = await checkIfUserIsInCompany(
      ctx.user.id,
      ctx.company.id,
      true
    );
    if (!company) throw new Error(`User is not part of this company`);
  
    const perm =
      company.fromRelationship ||
      (await hasPermission(
        'marketing_studio',
        PERMISSION_ACCESS_TYPES.view_only,
        ctx.companyMembership?.id,
        ctx.user.id,
        ctx.company.id
      ));
    
    if (!perm) return { error: 'NO_PERMISSION' };
  
    const pg = new PostgresClient({
      connectionString: process.env.POSTGRES_URL,
    });
  
    try {
      await pg.connect();
      // Use a parameterized query to update the project
      const updateQuery = `
        UPDATE canvases
        SET campaign_id = $1, title = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
  
      const values = [
        data.campaign,
        data.title,
        projectId // Use the projectId argument here
      ];
  
      const result = await pg.query(updateQuery, values);
  
      if (result.rows.length === 0) {
        return { error: 'Project not found' };
      }
  
      const updatedProject = result.rows[0];
  
      // Format the updated project as needed
      const formattedProject = {
        id: updatedProject.id,
        campaign: updatedProject.campaign_id,
        createdAt: updatedProject.created_at,
        updatedAt: updatedProject.updated_at,
        title: updatedProject.title,
        status: 7, // Adjust the status as necessary
        type: updatedProject.type,
        user: {},
      };
  
      return formattedProject; // Return the updated project
    } catch (error) {
      console.error('Error updating project:', error);
      throw error; // Handle or rethrow the error as needed
    } finally {
      await pg.end(); // Ensure the connection is closed
    }
  }
  
  @Authorized()
  @Query((returns) => json)
  async getSingleStudioProject(
    @Arg('projectId') projectId: string,
    @Arg('type') type: string,
    @Ctx() ctx: Context
  ) {
    const company: any = await checkIfUserIsInCompany(
      ctx.user.id,
      ctx.company.id,
      true
    );
    if (!company) throw new Error(`User is not part of this company`);

    const perm =
      company.fromRelationship ||
      (await hasPermission(
        'marketing_studio',
        PERMISSION_ACCESS_TYPES.view_only,
        ctx.companyMembership?.id,
        ctx.user.id,
        ctx.company.id
      ));
    if (!perm) return { error: 'NO_PERMISSION' };
    const pg = new PostgresClient({
      connectionString: process.env.POSTGRES_URL,
    });
    
    try {
      await pg.connect();
      
      // Use a parameterized query to prevent SQL injection
      const v3Results = await pg.query(
        `SELECT * FROM canvases WHERE id = $1`, 
        [projectId] // Pass projectId as an array to safely bind it
      );
    
      const v3Projects = v3Results.rows.map((canvas) => ({
        id: canvas.id,
        campaign: canvas.campaign_id,
        createdAt: canvas.created_at,
        updatedAt: canvas.updated_at,
        title: canvas.title,
        status: 7,
        type: canvas.type,
        user: {},
      }));
    
      return [...v3Projects]; // Return the projects
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error; // Handle or rethrow the error as needed
    } finally {
      await pg.end(); // Ensure the connection is closed
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async createStudioTemplate(
    @Arg('data') data: CreateStudioTemplateInput,
    @Ctx() ctx: Context
  ) {
      // todo: add switchcase for different types and perm checks etc
    return prisma.studioTemplate.create({
      data: {
        id: createObjectID().id,
        name: data.name,
        projectId: data.projectId,
        description: data?.description,
        thumbnails: {
          set:data?.thumbnails,
        },
        html : {
        set: data.html
        },
        variation: data?.variation,
        content: data.content,
        companyId: ctx.company.id,
        campaign: data.campaign,
        format: data.format,
        assets: data.assets,
        size: data.size,
        isPublished: data.isPublished,
        price: data.price,
        projectType: data.projectType,
        keywords: {
          set: data.keywords
        },
        user: {
          connect: { id: ctx.user.id }
        }
      },
    });
  }
  
  @Authorized()
  @Mutation((returns) => json)
  async updateStudioTemplate(
    @Arg('data') data: UpdateStudioTemplateInput,
    @Ctx() ctx: Context
  ) {
      // todo: add switchcase for different types and perm checks etc
      let studioTemplate = await prisma.studioTemplate.findMany({where: { id: data.id} })
       if (studioTemplate.length === 0) throw new Error('studioTemplate does not exist')
  
        return await prisma.studioTemplate.update({
          where: {
            id: studioTemplate[0].id // This could be project Id later
          },
          data: {
            name: data.name,
            description: data?.description,
            thumbnails: {
              set:data?.thumbnails,
            },
            html:{
            set: data?.html
            },
            variation: data?.variation,
            content: data.content,
            companyId: ctx.company.id,
            campaign: data.campaign,
            format: data.format,
            assets: data.assets,
            size: data.size,
            isPublished: data.isPublished,
            price: data.price,
            projectType: data.projectType,
            keywords: {
              set: data.keywords // This assumes that keywords is a list
            }
          }
        });
    
  }

  @Authorized()
  @Query((returns) => json)
  async myStudioTemplates(@Ctx() ctx: Context) {
    return prisma.studioTemplate.findMany({
      where: { userId: ctx.user.id },
    });
  }

  @Query((returns) => json)
  async getStudioTemplateById(
    @Arg('templateId') templateId: string,
    @Ctx() ctx: Context
  ) {
    const template = await prisma.studioTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new Error('No template with that ID');

    return template;
  }

  @Authorized()
  @Mutation((returns) => json)
  async deleteStudioTemplate(
    @Arg('templateId') templateId: string,
    @Ctx() ctx: Context
  ) {
    const template = await prisma.studioTemplate.findUnique({
      where: { id: templateId },
      select: { userId: true },
    });
    if (!template || template.userId !== ctx.user.id) {
      throw new Error('Template is not owned by the current user');
    }

    return prisma.studioTemplate.delete({
      where: { id: templateId },
    });
  }
}
