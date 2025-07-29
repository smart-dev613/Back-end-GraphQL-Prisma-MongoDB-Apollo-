import { PERMISSION_ACCESS_TYPES, PERMISSION_KEYS } from '../constants/perms';
import { PrismaClient } from '@prisma/client';
import { AccessTypesEnum, ChannelScopesEnum } from '../inputs/permissions';
import { Client as PostgresClient } from 'pg';
import { validate as validateUUID } from 'uuid';

const prisma = new PrismaClient();

/**
 * Checks whether the user is part of the Synkd company.
 * @param userId - string
 * @returns CompanyMembership or false
 */
export const checkIfUserIsSynkd = async (userId: string) => {
  const inspiredMembership = await prisma.companyMembership.findMany({
    where: {
      userId: userId,
      company: { type: 10 },
      status: { not: 'ARCHIVED' },
    },
  });

  if (inspiredMembership.length > 0) {
    return inspiredMembership[0];
  }

  return false;
};

/**
 * Returns the matching company if the user is part of it, else null
 * @param userId - a User's id
 * @param companyId - a Company's id
 */
export const checkIfUserIsInCompany = async (
  userId: string,
  companyId: string,
  allowRelationships: boolean = false
) => {
  const matching = await prisma.company.findMany({
    where: {
      id: companyId,
      members: {
        some: {
          userId: userId,
        },
      },
    },
  });

  if (matching.length > 0) {
    return matching[0];
  }

  const inspiredMembership = await prisma.companyMembership.findMany({
    where: {
      userId: userId,
      company: { type: 10 },
      status: { not: 'ARCHIVED' },
    },
  });

  if (inspiredMembership.length > 0) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (company) {
      return company;
    }
  }

  if (allowRelationships) {
    const companyRelationships = await prisma.companyRelationship.findMany({
      where: {
        companies: {
          some: {
            users: {
              some: {
                userId: userId,
              },
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
        companies: {
          select: {
            id: true,
            role: true,
            company: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    let hasRelationship = false;
    for (const rel of companyRelationships) {
      if (rel.status === 'SENT') continue;
      const matchingCompany = rel.companies.filter((comp) => {
        return comp.company.id === companyId;
      });

      if (matchingCompany.length > 0) {
        hasRelationship = true;
      }
    }

    if (hasRelationship) {
      const companyToReturn = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (companyToReturn) {
        companyToReturn['fromRelationship'] = true;
        return companyToReturn;
      }
    }
  }

  return null;
};

/**
 * Checks if the user has permission to view a campaign
 * @param ctx - Context
 * @param campaignId - string
 * @param userId - string (could be left null to use current user)
 */
export const hasViewCampaignPermission = async (
  ctx,
  campaignId,
  userId?: string
) => {
  if (!userId) userId = ctx.user.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      client: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!campaign) throw new Error('Campaign does not exist');
  if (!campaign.client?.id) throw new Error('Campaign client does not exist');

  const clientComp = await checkIfUserIsInCompany(
    ctx.user.id,
    campaign.client.id
  );
  if (!clientComp) throw new Error('User is not part of this client company');

  return true;
};

/**
 * MAIN PERMISSIONS SYSTEM
 * (ACCESS TYPES)
 */

/**
 * Get permissions for an employee (not factoring in their user group)
 * @param employeeId - string
 */
export const _getPermissionsRawEmployee = async (employeeId: string) => {
  return await prisma.companyMembership.findUnique({
    where: { id: employeeId },
    select: {
      permissions: true,
    },
  });
};

/**
 * Get permissions for a user group (not factoring in individual employee perms)
 * @param userGroupId - string
 */
export const _getPermissionsRawUserGroup = async (userGroupId: string) => {
  return await prisma.userGroup.findUnique({
    where: { id: userGroupId },
    select: {
      permissions: true,
    },
  });
};

/**
 * Get permissions for an employee (factoring in their user group permissions too)
 * @param employeeId - string
 */
export const _getPermissionsRawCombined = async (
  employeeId: string,
  split: boolean
) => {
  const employee = await prisma.companyMembership.findUnique({
    where: { id: employeeId },
    select: {
      permissions: {
        select: {
          id: true,
          permissions: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      fenixUserGroup: {
        select: {
          permissions: {
            select: {
              id: true,
              permissions: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });
  const individualPermissions: any = employee.permissions;
  const userGroupPermissions: any = employee.fenixUserGroup.permissions;
// updated: accessing object with [0] in the array because of the new format from db
  if (split) {
    return {
      user: individualPermissions[0]?.permissions || {},
      group: userGroupPermissions[0]?.permissions || {},
    };
  }

  let combinedPermissions = { ...individualPermissions?.permissions };
  if (userGroupPermissions && userGroupPermissions[0]?.permissions) {
    for (let [p, v] of Object.entries(userGroupPermissions[0]?.permissions)) {
      if (!combinedPermissions.hasOwnProperty(p)) {
        combinedPermissions[p] = v;
      }
    }
  }

  return combinedPermissions;
};

/**
 * Returns an employee ID for a user based on a given user ID and company ID
 * @param userId
 * @param companyId
 * @returns
 */
export const getEmployeeIdFromUserCompany = async (
  userId: string,
  companyId: string
) => {
  const res = await prisma.companyMembership.findMany({
    where: {
      companyId: companyId,
      userId: userId,
    },
  });
  if (res.length === 0) return null;
  return res[0].id;
};

/**
 * Checks if an employee has the required permission
 * @param employeeId - string
 * @param permName - string
 * @param minimumAccess - int
 */
export const hasPermission = async (
  permName: string,
  minimumAccess: PERMISSION_ACCESS_TYPES = 0,
  employeeId?: string,
  userId?: string,
  companyId?: string
) => {
  if (!employeeId && !userId && !companyId)
    throw new Error(
      'Missing arguments for hasPermission. Either no employee ID provided, or no user ID & company ID.'
    );

  if (userId && companyId) {
    const isSynkd = await checkIfUserIsSynkd(userId);
    if (isSynkd) return true;

    employeeId = await getEmployeeIdFromUserCompany(userId, companyId);
    if (!employeeId)
      throw new Error(
        `No company membership results for user ${userId}, company ${companyId}`
      );
  }

  const perms = await _getPermissionsRawCombined(employeeId, false);
  if (!perms.hasOwnProperty(permName)) return false;
  return perms[permName] >= minimumAccess;
};

/**
 * Returns a specific permission value for an employee
 * @param employeeId - string
 * @param permName - string
 */
export const getPermission = async (employeeId: string, permName: string) => {
  const perms = await _getPermissionsRawCombined(employeeId, false);
  if (!perms.hasOwnProperty(permName)) return null;
  return perms[permName];
};

/**
 * Creates the initial permissions for a new user group
 * @param groupId - string
 */
export const createInitialPermsForUserGroup = async (groupId: string) => {
  const group = await prisma.userGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      permissions: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!group)
    throw new Error("User group does not exist - can't create initial perms");

  let permsToSet = {};

  for (let [p, v] of Object.entries(PERMISSION_KEYS)) {
    switch (group.name) {
      case 'Master Admins':
        permsToSet[p] = v.defaults.master_admin;
        break;
      case 'Super Admins':
        permsToSet[p] = v.defaults.super_admin;
        break;
      case 'Admins':
        permsToSet[p] = v.defaults.admin;
        break;
      default:
        permsToSet[p] = v.defaults.user;
        break;
    }
  }
  // update this to check if permissions actually exists (db data changed)
  if (!group.permissions.length) {
    console.log(`Creating initial perms for user group ${group.id}`);

    return await prisma.userGroup.update({
      where: { id: group.id },
      data: {
        permissions: {
          create: {
            permissions: permsToSet,
          },
        },
      },
    });
  }
};

/**
 * SCOPE PERMISSIONS
 */
export const allChannelPermissions = async (
  employeeId: string,
  scope?: ChannelScopesEnum
) => {
  const permissions = await prisma.channelPermissions.findMany({
    where: {
      employeeId: employeeId,
      scope,
    },
    select: {
      id: true,
      scope: true,
      campaign: {
        select: {
          id: true,
          name: true,
        },
      },
      cluster: true,
      item: true,
      createdAt: true,
    },
  });

  for (let p of permissions) {
    let itemId = p.item;
    let lookup = null;
    let itemObj = null;

    switch (p.scope) {
      case ChannelScopesEnum.STUDIO:
        lookup = await prisma.legacyStudioProject.findMany({
          where: {
            id: itemId,
          },
        });
        if (lookup.length > 0) {
          itemObj = lookup[0];
        }
        break;
      case ChannelScopesEnum.RESEARCH:
        lookup = await prisma.research.findMany({
          where: {
            id: itemId,
          },
        });
        if (lookup.length > 0) {
          itemObj = lookup[0];
        }
        break;
      case ChannelScopesEnum.MAILING:
        lookup = await prisma.mailBatch.findMany({
          where: {
            id: itemId,
          },
        });
        if (lookup.length > 0) {
          itemObj = lookup[0];
        }
        break;
      case ChannelScopesEnum.CODE:
        lookup = await prisma.code.findMany({
          where: {
            id: itemId,
          },
        });
        if (lookup.length > 0) {
          itemObj = lookup[0];
        }
        break;
      case ChannelScopesEnum.FLIGHT:
        lookup = await prisma.mediaFlight.findMany({
          where: {
            id: itemId,
          },
        });
        if (lookup.length > 0) {
          itemObj = lookup[0];
        }
        break;
      case ChannelScopesEnum.CLUSTER:
        lookup = await prisma.crmCluster.findMany({
          where: {
            id: itemId,
          },
        });
        if (lookup.length > 0) {
          itemObj = lookup[0];
        }
        break;
      case ChannelScopesEnum.CAMPAIGN:
      default:
        break;
    }

    p.item = itemObj;
  }

  return permissions;
};

/** Check if the user is a Synkd support user or not?
 * @param user - user context info
 * @returns a boolean which presents if the input user a Synkd user or not
 */
export const isSynkdSupportUser = async (user: any) => {
  const company = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      company: {
        select: {
          type: true,
        },
      },
    },
  });

  return (
    user.email.toLowerCase().endsWith('@synkd.life') ||
    company.company.type === 10
  );
};

/**
 * Set permission full campaign permission of employee
 * @param data
 */
export const fullAccessOfCampaignPermission = async (data: any) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: data.campaignId },
  });

  const allCampaignChannelItems = [];
  const v2studio = await prisma.legacyStudioProject.findMany({
    where: {
      Campaign: campaign.id,
    },
    select: {
      id: true,
    },
  });

  const pg = new PostgresClient({ connectionString: process.env.POSTGRES_URL });
  await pg.connect();
  const v3Results = await pg.query(
    `select * from canvases where campaign_id = $1`,
    [campaign.id]
  );

  const v3Projects = v3Results.rows.map((canvas) => ({
    id: canvas.id,
  }));
  await pg.end();

  const studio = [...v2studio, ...v3Projects];
  Array.prototype.push.apply(
    allCampaignChannelItems,
    studio.map((obj) => ({ ...obj, scope: ChannelScopesEnum.STUDIO }))
  );
  const research = await prisma.research.findMany({
    where: {
      campaignId: campaign.id,
    },
    select: { 
     id: true
    }
  });
  Array.prototype.push.apply(
    allCampaignChannelItems,
    research.map((obj) => ({ ...obj, scope: ChannelScopesEnum.RESEARCH }))
  );
  const codes = await prisma.code.findMany({
    where: {
      campaign: campaign.id,
    },
    select: {
      id: true,
    },
  });

  Array.prototype.push.apply(
    allCampaignChannelItems,
    codes.map((obj) => ({ ...obj, scope: ChannelScopesEnum.CODE }))
  );

  const medias = await prisma.mediaFlight.findMany({
    where: {
      campaign: campaign.id,
    },
    select: {
      id: true,
    },
  });
  Array.prototype.push.apply(
    allCampaignChannelItems,
    medias.map((obj) => ({ ...obj, scope: ChannelScopesEnum.FLIGHT }))
  );
  const mailBatches = await prisma.mailBatch.findMany({
    where: {
      campaign: campaign.id,
    },
    select: {
      id: true,
    },
  });
  Array.prototype.push.apply(
    allCampaignChannelItems,
    mailBatches.map((obj) => ({ ...obj, scope: ChannelScopesEnum.MAILING }))
  );

  await Promise.all(
    allCampaignChannelItems.map(async (channelItem) => {
      const existing = await prisma.channelPermissions.findMany({
        where: {
          employeeId: data.employeeId,
          scope: channelItem.scope,
          campaignId: data.campaignId,
          item: channelItem.id.toString(),
        },
      });
      if (data.access && existing.length === 0) {
        await prisma.channelPermissions.create({
          data: {
            employee: { connect: { id: data.employeeId } },
            scope: channelItem.scope,
            campaign: { connect: { id: data.campaignId } },
            item: channelItem.id.toString(),
          },
        });
      } else if (!data.access && existing.length > 0) {
        await prisma.channelPermissions.deleteMany({
          where: { id: existing[0].id },
        });
      }
    })
  );
};
