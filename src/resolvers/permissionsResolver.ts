// 650
import { ObjectId } from 'mongodb';
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { Context } from '../auth/context.interface';
import { PERMISSION_ACCESS_TYPES, PERMISSION_KEYS } from '../constants/perms';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { json } from '../helpers';
import {
  checkIfUserIsInCompany,
  fullAccessOfCampaignPermission,
  hasPermission,
  _getPermissionsRawCombined,
  _getPermissionsRawEmployee,
  _getPermissionsRawUserGroup,
} from '../helpers/permissionsHelper';
import {
  CreateRelationshipPermissionInput,
  DeleteRelationshipPermissionInput,
  GetRelationshipPermissionInput,
  SetEmployeePermissionsInput,
  SetGroupPermissionsInput,
  SetChannelPermissionInput,
  ChannelScopesEnum,
} from '../inputs/permissions';
import { validate as validateUUID } from 'uuid';
import { Client as PostgresClient } from 'pg';

@Resolver()
export class PermissionsResolver {
  /**
   * Employee permissions
   */
  @Authorized()
  @Query((returns) => json)
  async getEmployeePermissions(
    @Arg('employeeId') id: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'msl_companyPermissions',
      PERMISSION_ACCESS_TYPES.view_only,
      null,
      ctx.user.id,
      id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return (await _getPermissionsRawEmployee(id)) || {};
  }

  @Authorized()
  @Query((returns) => json)
  async getGroupPermissions(@Arg('groupId') id: string, @Ctx() ctx: Context) {
    // Check if group exists
    let group: any = await prisma.userGroup.findUnique({
      where: { id },
      select: {
        company: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!group) throw new Error(`Invalid user group ${id}`);

    // Permissions check
    let perm = await hasPermission(
      'msl_companyPermissions',
      PERMISSION_ACCESS_TYPES.view_only,
      null,
      ctx.user.id,
      group.company.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return (await _getPermissionsRawUserGroup(id)) || {};
  }

  @Authorized()
  @Query((returns) => json)
  async getCombinedPermissions(
    @Arg('employeeId') id: string,
    @Arg('split', { nullable: true }) split: boolean
  ) {
    let combined = {};
    if (split === null) split = false;

    try {
      combined = (await _getPermissionsRawCombined(id, split)) || {};
    } catch (err) {
      console.error(err);
    }

    // For testing ONLY - override the permissions below...
    // combined = {
    //     ...combined,
    //     marketing_campaigns: 0
    // }

    return combined;
  }

  @Authorized()
  @Query((returns) => json)
  async getPermissionConstants() {
    return PERMISSION_KEYS;
  }

  @Authorized()
  @Mutation((returns) => json)
  async setEmployeePermissions(
    @Arg('data') data: SetEmployeePermissionsInput,
    @Ctx() ctx: Context
  ) {
    let employee: any = await prisma.companyMembership.findUnique({
      where: { id: data.employeeId },
      select: {
        company: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!employee)
      throw new Error(`Employee does not exist: ${data.employeeId}`);

    // Permissions check
    let perm = await hasPermission(
      'msl_companyPermissions',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      employee.company.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let perms = (await _getPermissionsRawEmployee(data.employeeId)) || {
      _id: new ObjectId().toString(),
      permissions: {},
    };
    for (let [p, v] of Object.entries(data.permissions)) {
      // Set the new permissions
      perms['permissions'][p] = v;
    }

    let newPerms = await prisma.permissionsNew.upsert({
      where: {
        id: new ObjectId(perms['_id']).toString(), // Ensure this matches your field name in the model
      },
      create: {
        permissions: perms['permissions'],
        employee: {
          connect: {
            id: data.employeeId,
          },
        },
      },
      update: {
        permissions: perms['permissions'],
      },
    });

    return newPerms;
  }

  @Authorized()
  @Mutation((returns) => json)
  async setGroupPermissions(
    @Arg('data') data: SetGroupPermissionsInput,
    @Ctx() ctx: Context
  ) {
    // Check if group exists
    let group: any = await prisma.userGroup.findUnique({
      where: { id: data.groupId },
      select: {
        company: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!group) throw new Error(`Invalid user group ${data.groupId}`);

    // Permissions check
    let perm = await hasPermission(
      'msl_companyPermissions',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      group.company.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let perms = (await _getPermissionsRawUserGroup(data.groupId)) || {
      _id: new ObjectId().toString(),
      permissions: {},
    };
    for (let [p, v] of Object.entries(data.permissions)) {
      // Set the new permissions
      perms['permissions'][p] = v;
    }
    let newPerms = await prisma.permissionsNew.upsert({
      where: {
        id: perms['_id'], // Ensure this matches your field name in the model
      },
      create: {
        permissions: perms['permissions'],
        group: {
          connect: {
            id: data.groupId,
          },
        },
      },
      update: {
        permissions: perms['permissions'],
      },
    });

    return newPerms;
  }

  /**
   * Channel permissions
   */
  @Authorized()
  @Query((returns) => json)
  async getChannelPermissions(
    @Arg('employeeId') employeeId: string,
    @Arg('scope', { nullable: true }) scope: ChannelScopesEnum,
    @Ctx() ctx: Context
  ) {
    const permData: any = {
      employee: {
        id: employeeId,
      },
    };
    if (scope) {
      permData['where']['scope'] = scope;
    }

    let permissions: any = await prisma.channelPermissions.findMany({
      where: permData, // Assuming permData is an object containing filtering criteria
      select: {
        id: true, // Use `id` instead of `_id` if your model uses `id`
        scope: true,
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        item: true,
        createdAt: true,
      },
    });

    for (let k in permissions) {
      try {
        let p = permissions[k];
        let itemId = p.item;
        let lookup = null;
        let itemObj = null;

        switch (p.scope) {
          case ChannelScopesEnum.STUDIO:
          // search for v3 projects if this is a postgres id
          if(validateUUID(itemId)){ 
              // Query PostgreSQL for UUID studio IDs
              const pg = new PostgresClient({
                connectionString: process.env.POSTGRES_URL,
              });
              await pg.connect();
            // get studio projects from v3 perms
              const pgResults = await await pg.query(`SELECT * FROM canvases WHERE id = $1`, 
              [itemId] // Pass projectId as an array to safely bind it
            );
            
              lookup = pgResults.rows.map((row) => ({
                id: row.id,
                campaign: row.campaign_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                title: row.title,
                type: row.type,
              }));
              await pg.end()
          } else {
              // search for projects in objectids
              lookup = await prisma.legacyStudioProject.findUnique({
                where: {
                  id: itemId,
                },
              });
              
            }    
          

            permissions[k]['item'] = p['item']
            break;
          case ChannelScopesEnum.RESEARCH:
            lookup = await prisma.research.findUnique({
              where: {
                id: itemId,
              },
            });
            if (lookup?.id) {
              itemObj = lookup;
            }
            break;
            case ChannelScopesEnum.MAILING:
              lookup = await prisma.mailBatch.findUnique({
                where: {
                  id: itemId,
                },
              });

            if (lookup?.id) {
              itemObj = lookup;
            }
            break;
          case ChannelScopesEnum.CODE:
            lookup = await prisma.code.findUnique({
              where: {
                id: itemId,
              },
            });

            if (lookup?.id) {
              itemObj = lookup;
            }
            break;
          case ChannelScopesEnum.FLIGHT:
            lookup = await prisma.mediaFlight.findUnique({
              where: {
                id: itemId,
              },
            });

            if (lookup?.id) {
              itemObj = lookup;
            }

            break;
          case ChannelScopesEnum.CLUSTER:
            lookup = await prisma.crmCluster.findUnique({
              where: {
                id: itemId,
              },
            });

            if (lookup?.id) {
              itemObj = lookup;
            }

            break;
          case ChannelScopesEnum.CAMPAIGN:
          default:
            break;
        }

        p._item = itemObj;
      } catch (error) {
        console.log('error', error);
      }
    }

    return permissions;
  }

  @Authorized()
  @Mutation((returns) => json)
  async setChannelPermissions(
    @Arg('data') data: SetChannelPermissionInput,
    @Ctx() ctx: Context
  ) {
    let result = { result: 'success', outcome: null, item: null };

    // Input validation
    if (data.scope !== ChannelScopesEnum.CAMPAIGN && !data.itemId) {
      throw new Error('Missing item ID for this scope');
    }
    
    if (!data.employeeId) {
      throw new Error('Missing employee ID');
    }
    let existing
    if (data.scope === ChannelScopesEnum.CLUSTER) {
      existing = await prisma.channelPermissions.findMany({
        where: {
          employee: { id: data.employeeId },
          scope: data.scope,
          cluster: data.clusterId ,
          item: data.itemId as string,
        },
      });
    } else {
      existing = await prisma.channelPermissions.findMany({
        where: {
          employee: { id: data.employeeId },
          scope: data.scope,
          campaign: { id: data.campaignId },
          item: data.itemId as string,
        },
      });
    }
    if (existing.length > 0) {
      // Permission already exists
      let existingPerm = existing[0];
      if (data.access === false) {
        await prisma.channelPermissions.delete({
          where: {
            id: existingPerm.id, // Use `id` instead of `_id`
          },
        });

        result.outcome = 'DELETED';
      } else {
        result.item = existingPerm;
        result.outcome = 'ALREADY_EXISTS';
      }
    } else {
      if (data.access) {
        let itemId = data.itemId;
        let lookup = null;
        let existingItem = null;

        switch (data.scope) {
          case ChannelScopesEnum.STUDIO:
          // search for v3 projects if this is a postgres id
          if(validateUUID(itemId)){ 
              // Query PostgreSQL for UUID studio IDs
              const pg = new PostgresClient({
                connectionString: process.env.POSTGRES_URL,
              });
              await pg.connect();
            // get studio projects from v3 perms
              const pgResults = await await pg.query(`SELECT * FROM canvases WHERE id = $1`, 
              [itemId] // Pass projectId as an array to safely bind it
            );
              lookup = pgResults.rows.map((row) => ({
                id: row.id,
                campaign: row.campaign_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                title: row.title,
                type: row.type,
              }));
               await pg.end()
               lookup = lookup[0]; // Get the first result since we expect one
          } else {
            lookup = await prisma.legacyStudioProject.findUnique({
              where: {
                id: itemId,
              },
            });
           }
           
            if (lookup?.id) {
              existingItem = lookup;
            }
            break;
          case ChannelScopesEnum.RESEARCH:
            lookup = await prisma.research.findUnique({
              where: {
                id: itemId,
              },
            })
          
            if (lookup?.id) {
              existingItem = lookup;
            }
            break;
          case ChannelScopesEnum.MAILING:
            lookup = await prisma.mailBatch.findUnique({
              where: {
                id: itemId,
              },
            });

            if (lookup?.id) {
              existingItem = lookup;
            }
            break;
          case ChannelScopesEnum.CODE:
            lookup = await prisma.code.findUnique({
              where: {
                id: itemId,
              },
            });

            if (lookup?.id) {
              existingItem = lookup;
            }
            break;
          case ChannelScopesEnum.FLIGHT:
            lookup = await prisma.mediaFlight.findUnique({
              where: {
                id: itemId,
              },
            });

            if (lookup?.id) {
              existingItem = lookup;
            }

            break;
          case ChannelScopesEnum.CLUSTER:
            lookup = await prisma.crmCluster.findUnique({
              where: {
                id: itemId,
              },
            });

            if (lookup?.id) {
              existingItem = lookup;
            }
            break;
          case ChannelScopesEnum.CAMPAIGN:
          default:
            break;
        }

        if (data.itemId && !existingItem) {
          throw new Error(
            `Item does not exist with ID ${data.itemId} and scope ${data.scope}`
          );
        }

        if (data.scope === ChannelScopesEnum.CLUSTER) {
        // Permission doesn't exist, create a new one for cluster
        result.item = await prisma.channelPermissions.create({
          data: { 
          employee: { connect: { id: data.employeeId } },
          scope: data.scope,
          cluster: data.clusterId,
          item: data.itemId,
          }
         });
        } else {
        // Permission doesn't exist, create a new one
        result.item = await prisma.channelPermissions.create({
          data: {
            employee: { connect: { id: data.employeeId } },
            scope: data.scope, // Make sure `data.scope` is of type `ChannelScopes`
            campaign: { connect: { id: data.campaignId } },
            item: data.itemId,
          },
        });
      }
        result.outcome = 'CREATED';
      } else {
        result.outcome = 'NO_ACTION';
      }
    }
    // give access to full campaign of user
    if (ChannelScopesEnum.CAMPAIGN === data.scope) {
      await fullAccessOfCampaignPermission(data);
    } else {
      // manually access time campaign permission and remove
      if (data.access) {
        let existingCampaign = await prisma.channelPermissions.findMany({
          where: {
            employee: { id: data.employeeId },
            scope: ChannelScopesEnum.CAMPAIGN,
            campaign: { id: data.campaignId },
          },
        });

        if (!existingCampaign.length) {
          await prisma.channelPermissions.create({
            data: {
              employee: { connect: { id: data.employeeId } },
              scope: ChannelScopesEnum.CAMPAIGN,
              campaign: { connect: { id: data.campaignId } },
            },
          });
        }
      } else {
        let existingCampaign = await prisma.channelPermissions.findMany({
          where: {
            employee: { id: data.employeeId },
            campaign: { id: data.campaignId },
          },
        });

        if (
          existingCampaign.length < 2 &&
          existingCampaign[0].scope === ChannelScopesEnum.CAMPAIGN
        ) {
          await prisma.channelPermissions.delete({
            where: {
              id: existingCampaign[0].id, // Use `id` instead of `_id` if your model uses `id`
            },
          });
        }
      }
    }

    return result;
  }

  /**
   * Relationship permissions
   */
  @Authorized()
  @Query((returns) => json)
  async getRelationshipPermissions(
    @Arg('data') data: GetRelationshipPermissionInput,
    @Ctx() ctx: Context
  ) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    // Ensure the relationship exists
    let relationship = await prisma.companyRelationship.findUnique({
      where: {
        id: data.relationshipId,
      },
      select: {
        id: true,
        companies: {
          select: {
            id: true,
            company: {
              select: {
                id: true,
              },
            },
            users: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!relationship) throw new Error('Invalid relationship ID');

    // Ensure the company is part of the relationship
    if (
      !relationship['companies'] ||
      !relationship['companies'].find(
        (relCInfo) => relCInfo['company']['id'] === company.id
      )
    ) {
      throw new Error('Company is not part of this relationship');
    }

    return await prisma.relationshipPermissions.findMany({
      where: {
        relationship: {
          id: relationship.id,
        },
      },
      select: {
        id: true, // Use `id` instead of `_id` if your model uses `id`
        type: true,
        campaign: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async createRelationshipPermission(
    @Arg('data') data: CreateRelationshipPermissionInput,
    @Ctx() ctx: Context
  ) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission(
      'msl_companyRelationships',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      data.companyId
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    // Ensure the relationship exists
    let relationship = await prisma.companyRelationship.findUnique({
      where: {
        id: data.relationshipId,
      },
      select: {
        id: true,
        companies: {
          select: {
            id: true,
            company: {
              select: {
                id: true,
              },
            },
            users: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!relationship) throw new Error('Invalid relationship ID');

    // Ensure the company is part of the relationship
    if (
      !relationship['companies'] ||
      !relationship['companies'].find(
        (relCInfo) => relCInfo['company']['id'] === company.id
      )
    ) {
      throw new Error('Company is not part of this relationship');
    }

    // Ensure the campaign exsits
    let campaign = await prisma.campaign.findUnique({
      where: {
        id: data.campaignId,
      },
      select: {
        id: true,
        client: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!campaign) throw new Error('Invalid campaign ID');

    // Ensure the company is the creator of the campaign
    if (campaign['client']['id'] !== company.id) {
      throw new Error('Company is not the creator of this campaign');
    }

    return await prisma.relationshipPermissions.create({
      data: {
        relationship: {
          connect: { id: data.relationshipId },
        },
        type: data.type,
        campaign: {
          connect: { id: data.campaignId },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async deleteRelationshipPermission(
    @Arg('data') data: DeleteRelationshipPermissionInput,
    @Ctx() ctx: Context
  ) {
    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission(
      'msl_companyRelationships',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      null,
      ctx.user.id,
      data.companyId
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    // Ensure the relationship exists
    let relPerm = await prisma.relationshipPermissions.findUnique({
      where: {
        id: data.relationshipPermissionId, // Use `id` instead of `_id`
      },
      include: {
        relationship: {
          include: {
            companies: {
              include: {
                company: {
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

    if (!relPerm) throw new Error('Invalid relationship permission ID');

    // Ensure the company is part of the relationship
    if (
      !relPerm['relationship']['companies'] ||
      !relPerm['relationship']['companies'].find(
        (relCInfo) => relCInfo['company']['id'] === company.id
      )
    ) {
      throw new Error('Company is not part of this relationship');
    }

    return await prisma.relationshipPermissions.delete({
      where: {
        id: relPerm.id, // Use `id` instead of `_id`
      },
    });
  }
}
