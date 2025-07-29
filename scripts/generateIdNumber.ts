import { PrismaClient } from '@prisma/client';
const prisma: any = new PrismaClient();
import { createObjectID } from '../util/createIDs';

import axios from 'axios';
import moment from 'moment';
import { hashCode } from '../util/hashCode';

export const generateIdNumber = async () => {
  try {
    // const medias = await prisma.mediaFlights();
    // for (let idx = 0; idx < medias.length; idx++) {
    //   console.log(`[Update ID][MEDIA]: Start ${medias[idx].id}`)
    //   await prisma.updateMediaFlight({
    //     where: {
    //       id: medias[idx].id
    //     },
    //     data: {
    //       id_number: hashCode(medias[idx].id)
    //     }
    //   })
    //   console.log(`[Update ID][MEDIA]: End ${medias[idx].id}`)
    // }

    const codes = await prisma.codes();
    for (let idx = 0; idx < codes.length; idx++) {
      console.log(`[Update ID][CODES]: Start ${codes[idx].id}`);
      await prisma.updateCode({
        where: {
          id: codes[idx].id,
        },
        data: {
          id_number: hashCode(codes[idx].id),
        },
      });
      console.log(`[Update ID][CODES]: End ${codes[idx].id}`);
    }

    // const mailBatches = await prisma.mailBatches();
    // for (let idx = 0; idx < mailBatches.length; idx++) {
    //   console.log(`[Update ID][MAILInG]: Start ${mailBatches[idx].id}`)
    //   await prisma.updateMailBatch({
    //     where: {
    //       id: mailBatches[idx].id
    //     },
    //     data: {
    //       id_number: hashCode(mailBatches[idx].id)
    //     }
    //   })
    //   console.log(`[Update ID][MAILING]: End ${mailBatches[idx].id}`)
    // }

    const platformEvents = await prisma.platformEvents();
    for (let idx = 0; idx < platformEvents.length; idx++) {
      console.log(`[Update ID][EVENT]: Start ${platformEvents[idx].id}`);
      await prisma.updatePlatformEvent({
        where: {
          id: platformEvents[idx].id,
        },
        data: {
          id_number: hashCode(platformEvents[idx].id),
        },
      });
      console.log(`[Update ID][EVENT]: End ${platformEvents[idx].id}`);
    }

    const crmQuestions = await prisma.crmQuestions();
    for (let idx = 0; idx < crmQuestions.length; idx++) {
      console.log(`[Update ID][STRATEGY]: Start ${crmQuestions[idx].id}`);
      await prisma.updateCrmQuestion({
        where: {
          id: crmQuestions[idx].id,
        },
        data: {
          id_number: hashCode(crmQuestions[idx].id),
        },
      });
      console.log(`[Update ID][STRATEGY]: End ${crmQuestions[idx].id}`);
    }
  } catch (error) {
    console.log(error);
    // throw error;
  }
};

const run = () => generateIdNumber();

run();
