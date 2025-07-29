import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
import dotenv from 'dotenv';
dotenv.config();

export const deleteOldFaqQuestions = async () => {
  try {
    // Delete test questions from yesterday
    const yesterday = new Date();
    const deletePeriod = parseInt(process.env.DELETE_PERIOD) || 0;
    yesterday.setDate(new Date().getDate() - deletePeriod);

    const ratesCount = await prisma.deleteManyCommunityReplyRates().count();
    console.log('number of deleted rates = ', ratesCount);

    const replyCount = await prisma.deleteManyCommunityReplies().count();
    console.log('number of deleted replies = ', replyCount);

    const deletedRowsCount =
      deletePeriod === -1
        ? await prisma.deleteManyCommunityQuestions().count()
        : await prisma
            .deleteManyCommunityQuestions({
              createdAt_gt: yesterday,
            })
            .count();
    console.log(deletedRowsCount + ' Rows deleted successfully');
  } catch (err) {
    console.log('Error in deleting data: ', err);
  }
};

deleteOldFaqQuestions();
