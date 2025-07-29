// 400
import { Resolver, Query, Mutation, Arg, Ctx, Authorized } from 'type-graphql';
import { json } from '../helpers';
import { hasPermission } from '../helpers/permissionsHelper';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { Context } from '../auth/context.interface';
import { createObjectID } from '../../util/createIDs';
import { addEmailDomain, verifyEmailDomain } from '../emailHelper';
import {
  CreateResearchAnswerInput,
  CreateResearchInput,
  CreateResearchQuestionInput,
  UpdateResearchAnswerInput,
  UpdateResearchInput,
  UpdateResearchQuestionInput,
} from '../inputs/research';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';

@Resolver()
export class researchResolver {
  @Authorized()
  @Query((returns) => json)
  async myResearch(@Ctx() ctx: Context) {
    const research = await prisma.research.findMany();

    return research;
  }

  @Query((returns) => json)
  async getResearch(@Arg('id') id: string, @Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_research',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const research = await prisma.research.findUnique({
      where: {
        id: id, // Assuming 'id' is the unique identifier for the record
      },
    });

    return research;
  }

  @Query((returns) => json)
  async getResearchByCanvasId(
    @Arg('canvasId') canvasId: string,
    @Ctx() ctx: Context
  ) {
    try {
      const research = await prisma.research.findMany({
        where: {
          canvasId: canvasId,
        },
        select: {
          id: true,
          name: true,
          language: true,
          status: true,
          canvasId: true,
          questions: {
            select: {
              id: true,
            },
          },
        },
      });

      return research;
    } catch (error) {
      console.log('error', error);
    }
    // Permissions check
    // let perm = await hasPermission('marketing_research', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    // if (!perm) return {error: 'NO_PERMISSION'}
  }

  @Authorized()
  @Mutation((returns) => json)
  async createResearch(
    @Arg('data') data: CreateResearchInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_research',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let researchQuestions = data.questions.map((q) => {
      let answers = q?.answers.map((a) => {
        const { id } = createObjectID();

        return {
          id,
          answer: a?.answer,
          shortCaption: a?.shortCaption,
          order: a?.order,
          goToQuestion: {
            connect: { id: a?.goToQuestionId },
          },
          isCorrect: a?.isCorrect,
        };
      });

      const { id } = createObjectID();

      return {
        id,
        active: q?.active,
        answerRequired: q?.answerRequired,
        goToQuestion: q.goToQuestionId
          ? {
              connect: { id: q?.goToQuestionId },
            }
          : undefined,
        order: q?.order,
        question: q?.question,
        randomiseAnswers: q?.randomiseAnswers,
        shortCaption: q?.shortCaption,
        textAreaHeight: q?.textAreaHeight,
        type: q?.type,
        answers: {
          create: answers,
        },
      };
    });

    const { id } = createObjectID();
    try {
      const temp = await prisma.research.create({
        data: {
          id,
          name: data.name,
          language: data.language,
          status: data.status,
          canvasId: data.canvasId,
          campaign:  data.campaign,
          questions: {
            create: researchQuestions,
          },
          createdAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          language: true,
          status: true,
          canvasId: true,
          questions: {
            select: {
              id: true,
            },
          },
        },
      });

      return temp;
    } catch (error) {
      console.log('error', error);
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateResearch(
    @Arg('data') data: UpdateResearchInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_research',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let questionsToConnect = data.questions.map((q) => {
      return { id: q };
    });

    return await prisma.research.update({
      where: {
        id: data.researchId,
      },
      data: {
        name: data.name,
        language: data.language,
        status: data.status,
        campaign: data.campaign ,
        questions: {
          connect: questionsToConnect, // Make sure questionsToConnect is an array of question IDs
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async createResearchQuestion(
    @Arg('data') data: CreateResearchQuestionInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_research',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let answers = data.answers.map((a) => {
      return {
        answer: a?.answer,
        shortCaption: a?.shortCaption,
        order: a?.order,
        goToQuestion: {
          connect: { id: a?.goToQuestionId },
        },
        isCorrect: a?.isCorrect,
      };
    });

    return await prisma.researchQuestion.create({
      data: {
        id: createObjectID().id, // Ensure this method is correctly defined to return appropriate IDs
        active: data.active,
        answerRequired: data.answerRequired,
        goToQuestion: data.goToQuestionId
          ? {
              connect: { id: data.goToQuestionId }, // Use `id` instead of `id` if your model uses `id`
            }
          : undefined, // Connect only if goToQuestionId exists
        order: data.order,
        question: data.question,
        randomiseAnswers: data.randomiseAnswers,
        shortCaption: data.shortCaption,
        textAreaHeight: data.textAreaHeight,
        type: data.type,
        answers: {
          create: answers, // Ensure answers is an array of answer objects
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateResearchQuestion(
    @Arg('data') data: UpdateResearchQuestionInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_research',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let answersToConnect = data.answers.map((a) => {
      return { id: a };
    });

    return await prisma.researchQuestion.update({
      where: {
        id: data.questionId, // Use `id` if your model uses `id` instead of `id`
      },
      data: {
        active: data.active,
        answerRequired: data.answerRequired,
        goToQuestion: data.goToQuestionId
          ? {
              connect: { id: data.goToQuestionId }, // Use `id` instead of `id`
            }
          : undefined, // Connect only if goToQuestionId exists
        order: data.order,
        question: data.question,
        randomiseAnswers: data.randomiseAnswers,
        shortCaption: data.shortCaption,
        textAreaHeight: data.textAreaHeight,
        type: data.type,
        answers: {
          connect: answersToConnect, // Ensure answersToConnect is an array of answer IDs
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async createResearchAnswer(
    @Arg('data') data: CreateResearchAnswerInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_research',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };
    try {
      const { id } = createObjectID();
      return await prisma.researchAnswer.create({
        data: {
          id, // Use 'id' if your model has 'id' as the primary key
          answer: data.answer,
          shortCaption: data.shortCaption,
          order: data.order,
          goToQuestion: data.goToQuestionId
            ? {
                connect: { id: data.goToQuestionId }, // Use 'id' instead of 'id'
              }
            : undefined, // Only connect if goToQuestionId exists
          isCorrect: data.isCorrect,
        },
      });
    } catch (error) {
      console.log('error', error);
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateResearchAnswer(
    @Arg('data') data: UpdateResearchAnswerInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_research',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };
    return await prisma.researchAnswer.update({
      where: {
        id: data.answerId, // Use 'id' if your model has 'id' as the primary key
      },
      data: {
        answer: data.answer,
        shortCaption: data.shortCaption,
        order: data.order,
        goToQuestion: data.goToQuestionId
          ? {
              connect: { id: data.goToQuestionId }, // Use 'id' instead of 'id'
            }
          : undefined, // Only connect if goToQuestionId exists
        isCorrect: data.isCorrect,
      },
    });
  }
}
