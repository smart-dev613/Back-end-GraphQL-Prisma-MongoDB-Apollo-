// 200
import { Resolver, Query, Mutation, Arg, Ctx, Authorized } from 'type-graphql';
import { json } from '../helpers';
import {
  checkIfUserIsInCompany,
  hasPermission,
  isSynkdSupportUser,
} from '../helpers/permissionsHelper';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { Context } from '../auth/context.interface';
import {
  CreateCategoryInput,
  EditCategoryInput,
  CreateRejectionResultInput,
  EditRejectionResultInput,
} from '../inputs/community';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';

@Resolver()
export class communityResolver {
  // ================== Category =====================
  //@Authorized()
  @Query((returns) => json)
  async getAllCommunityCategories(@Ctx() ctx: Context) {
    // It's a public API, no need for authentication or permission check
    return await prisma.communityCategory.findMany(); // Use findMany() to fetch all categories
  }

  @Authorized()
  @Mutation((returns) => json)
  async createCommunityCategory(
    @Arg('data') data: CreateCategoryInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.communityCategory.create({
      data: {
        title: data.title,
        // Add other fields if necessary
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateCommunityCategory(
    @Arg('data') data: EditCategoryInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const category = await prisma.communityCategory.findUnique({
      where: {
        id: data.categoryId, // Use `id` since your model uses that
      },
    });
    //console.log('update category =', category);
    if (!category) throw new Error('Category does not exist');

    return await prisma.communityCategory.update({
      where: {
        id: data.categoryId, // Use `id` instead of `_id`
      },
      data: {
        title: data.title,
        // Add other fields here if necessary
      },
    });
  }

  @Authorized()
  @Mutation((results) => json)
  async deleteCommunityCategory(
    @Arg('categoryId') categoryId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const category = await prisma.communityCategory.findUnique({
      where: {
        id: categoryId, // Use `id` since your model uses that
      },
    });
    if (!category) throw new Error('Category does not exist');

    return await prisma.communityCategory.delete({
      where: {
        id: categoryId, // Use `id` instead of `_id`
      },
    });
  }

  // ================== RejectionResult =====================
  //@Authorized()
  @Query((returns) => json)
  async getAllCommunityRejectionResults(@Ctx() ctx: Context) {
    // Permissions check
    /*let perm = await hasPermission('community_boards', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    if (!perm) return {error: 'NO_PERMISSION'}*/
    return await prisma.communityRejectionResult.findMany();
  }

  @Authorized()
  @Mutation((returns) => json)
  async createCommunityRejectionResult(
    @Arg('data') data: CreateRejectionResultInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };
    return await prisma.communityRejectionResult.create({
      data: {
        title: data.title,
        description: data.description,
        // Add other fields if necessary
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateCommunityRejectionResult(
    @Arg('data') data: EditRejectionResultInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const rejectionResult = await prisma.communityRejectionResult.findUnique({
      where: {
        id: data.rejectionResultId, // Ensure you're using the correct field name based on your Prisma model
      },
    });
    if (!rejectionResult) throw new Error('Rejection Result does not exist');

    return await prisma.communityRejectionResult.update({
      where: {
        id: data.rejectionResultId, // Ensure you are using the correct field name for the unique identifier
      },
      data: {
        title: data.title,
        description: data.description,
      },
    });
  }

  @Authorized()
  @Mutation((results) => json)
  async deleteCommunityRejectionResult(
    @Arg('rejectionResultId') rejectionResultId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const rejectionResult = await prisma.communityRejectionResult.findUnique({
      where: {
        id: rejectionResultId, // Use the correct identifier based on your model's unique field
      },
    });

    if (!rejectionResult) throw new Error('Rejection Result does not exist');

    return await prisma.communityRejectionResult.delete({
      where: {
        id: rejectionResultId, // Use the correct unique identifier based on your model's definition
      },
    });
  }

  // ================== Notification =====================

  @Authorized()
  @Query((returns) => json)
  async getCommunityNotifications(@Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    /*await prisma.communityNotifications({
      where: {
        receiver:
      }
    })*/
    return await prisma.user.findUnique({
      where: {
        id: ctx.user.id,
      },
      include: {
        notifications: {
          where: {
            isSeen: false,
          },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async markCommunityNotificationAsSeen(
    @Arg('notificationId') notificationId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    try {
      // Update the notification
      return await prisma.communityNotification.update({
        where: {
          id: notificationId, // Make sure this matches your Prisma model's identifier
        },
        data: {
          isSeen: true,
          seenAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating notification:', error);
      throw new Error('Could not update notification');
    }
  }
}
