import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
import { connectMedia } from '../src/helpers/mongoHelper';
import { ObjectId } from 'mongodb';
import moment from 'moment';

export const deleteCampaignData = async (date?: number) => {
  try {
    console.log(`[DELETE CAMPAIGN]: Start delete campaign`);
    await prisma.campaign.deleteMany({
      where: {
        archiveDate: {
          lt: date
            ? moment.unix(date).toDate()
            : moment().subtract(3, 'months').toDate(),
        },
        status: 3,
      },
    });
    console.log(`[DELETE CAMPAIGN]: End delete campaign`);
  } catch (error) {
    console.error(`[DELETE CAMPAIGN]: Error deleting campaign`, error);
  }
};

export const deleteCodeData = async (date?: number) => {
  try {
    console.log(`[DELETE CODE]: Start delete code`);
    await prisma.code.deleteMany({
      where: {
        archiveDate: {
          lt: date
            ? moment.unix(date).toDate()
            : moment().subtract(3, 'months').toDate(),
        },
        status: 3,
      },
    });
    console.log(`[DELETE CODE]: End delete code`);
  } catch (error) {
    console.error(`[DELETE CODE]: Error deleting code`, error);
  }
};

export const deletePublisherSiteData = async (date?: number) => {
  try {
    console.log(`[DELETE PUBLISHER SITE]: Start delete publisher site`);
    await prisma.publisherSite.deleteMany({
      where: {
        archiveDate: {
          lt: date
            ? moment.unix(date).toDate()
            : moment().subtract(3, 'months').toDate(),
        },
        status: 'ARCHIVED',
      },
    });
    console.log(`[DELETE PUBLISHER SITE]: End delete publisher site`);
  } catch (error) {
    console.error(
      `[DELETE PUBLISHER SITE]: Error deleting publisher site`,
      error
    );
  }
};

export const deleteResearchData = async (date?: number) => {
  try {
    const researches = await prisma.research.findMany({
      where: {
        archiveDate: {
          lt: date
            ? moment.unix(date).toDate()
            : moment().subtract(3, 'months').toDate(),
        },
        status: 'ARCHIVED',
      },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    const questionsIds = researches.flatMap((research) =>
      research.questions.map((question) => question.id)
    );
    const answerIds = researches.flatMap((research) =>
      research.questions.flatMap((question) =>
        question.answers.map((answer) => answer.id)
      )
    );

    console.log(`[DELETE RESEARCH]: Start delete answers`);
    await prisma.researchAnswer.deleteMany({
      where: {
        id: {
          in: answerIds,
        },
      },
    });
    console.log(`[DELETE RESEARCH]: End delete answers`);

    console.log(`[DELETE RESEARCH]: Start delete questions`);
    await prisma.researchQuestion.deleteMany({
      where: {
        id: {
          in: questionsIds,
        },
      },
    });
    console.log(`[DELETE RESEARCH]: End delete questions`);

    console.log(`[DELETE RESEARCH]: Start delete researches`);
    await prisma.research.deleteMany({
      where: {
        archiveDate: {
          lt: date
            ? moment.unix(date).toDate()
            : moment().subtract(3, 'months').toDate(),
        },
        status: 'ARCHIVED',
      },
    });
    console.log(`[DELETE RESEARCH]: End delete researches`);
  } catch (error) {
    console.error(`[DELETE RESEARCH]: Error deleting research`, error);
  }
};

export const deleteCrmQuestionData = async (date?: number) => {
  try {
    const crmQuestions = await prisma.crmQuestion.findMany({
      where: {
        archiveDate: {
          lt: date
            ? moment.unix(date).toDate()
            : moment().subtract(3, 'months').toDate(),
        },
        status: 'ARCHIVED',
      },
      include: {
        options: {
          include: {
            answers: true,
          },
        },
        crmCluster: true,
      },
    });

    const crmQuestionsIds = crmQuestions.map((question) => question.id);

    console.log(`[DELETE CRM QUESTION]: Start delete Crm Responses`);
    await prisma.crmQuestionResponse.deleteMany({
      where: {
        responseToQuestionId: {
          in: crmQuestionsIds,
        },
      },
    });
    console.log(`[DELETE CRM QUESTION]: End delete Crm Responses`);

    console.log(`[DELETE CRM QUESTION]: Start delete Crm Options`);
    await prisma.crmQuestionOption.deleteMany({
      where: {
        questionId: {
          in: crmQuestionsIds,
        },
      },
    });
    console.log(`[DELETE CRM QUESTION]: End delete Crm Options`);

    console.log(`[DELETE CRM QUESTION]: Start delete Crm Clusters`);
    await prisma.crmCluster.deleteMany({
      where: {
        crmQuestionId: {
          in: crmQuestionsIds,
        },
      },
    });
    console.log(`[DELETE CRM QUESTION]: End delete Crm Clusters`);

    console.log(`[DELETE CRM QUESTION]: Start delete Crm Questions`);
    await prisma.crmQuestion.deleteMany({
      where: {
        id: {
          in: crmQuestionsIds,
        },
      },
    });
    console.log(`[DELETE CRM QUESTION]: End delete Crm Questions`);
  } catch (error) {
    console.error(`[DELETE CRM QUESTION]: Error deleting CRM Question`, error);
  }
};

export const deleteMediaData = async (date?: number) => {
  try {
    const mediaFlights = await prisma.mediaFlight.findMany({
      where: {
        archiveDate: {
          lt: date
            ? moment.unix(date).toDate()
            : moment().subtract(3, 'months').toDate(),
        },
        status: 3,
      },
      include: {
        linkedCreatives: true,
      },
    });

    const mediaFlightsIds = mediaFlights.map((flight) => flight.id);
    const linkedCreativesIds = mediaFlights.flatMap((flight) =>
      flight.linkedCreatives.map((creative) => creative.id)
    );

    const mc = await connectMedia();
    const db = mc.db('media');
    for (const flight of mediaFlights) {
      console.log(`[DELETE MEDIA]: Start delete Media Report`);
      const collection = await db.collection(`${flight.campaign}`);
      await collection.deleteMany({ Flight: new ObjectId(flight.id) });
      console.log(`[DELETE MEDIA]: End delete Media Report`);
    }

    console.log(`[DELETE MEDIA]: Start delete Media Tags`);
    await prisma.mediaTag.deleteMany({
      where: {
        flightId: {
          in: mediaFlightsIds,
        },
      },
    });
    console.log(`[DELETE MEDIA]: End delete Media Tags`);

    console.log(`[DELETE MEDIA]: Start delete Media Creatives`);
    await prisma.mediaCreative.deleteMany({
      where: {
        id: {
          in: linkedCreativesIds,
        },
      },
    });
    console.log(`[DELETE MEDIA]: End delete Media Creatives`);

    console.log(`[DELETE MEDIA]: Start delete Media Flights`);
    await prisma.mediaFlight.deleteMany({
      where: {
        id: {
          in: mediaFlightsIds,
        },
      },
    });
    console.log(`[DELETE MEDIA]: End delete Media Flights`);
  } catch (error) {
    console.error(`[DELETE MEDIA]: Error deleting media`, error);
  }
};

export const run = async () => {
  try {
    await deleteCodeData();
    await deletePublisherSiteData();
    await deleteResearchData();
    await deleteCrmQuestionData();
    await deleteMediaData();
  } catch (error) {
    console.error(`Error running delete operations`, error);
  }
};
