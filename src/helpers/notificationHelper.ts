import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { CommunityNotificationType } from '../inputs/community';

export const saveNotificationForAllUsers = async (
  type: CommunityNotificationType,
  title: string,
  targetId: string
) => {
  try {
    const synkdUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@synkd.life',
        },
      },
    });

    for (const [index, synkdUser] of synkdUsers.entries()) {
      const result = await prisma.communityNotification.create({
        data: {
          type: type,
          title: title,
          targetId: targetId,
          receiver: { connect: { id: synkdUser.id } },
          isSeen: false,
        },
      });

      if (result) {
        console.log('Notification #' + index + ' created');
      }
    }
  } catch (error) {
    console.error('Error saving notifications:', error);
  }
};
