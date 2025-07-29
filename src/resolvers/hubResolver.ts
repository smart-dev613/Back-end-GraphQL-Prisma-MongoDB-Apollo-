// 1100
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
  CreateQuestionInput,
  EditQuestionInput,
  CreateReplyInput,
  EditReplyInput,
  ApproveQuestionInput,
  ApproveReplyInput,
  CommunityNotificationType,
} from '../inputs/community';
import { sendEmail } from '../emailHelper';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';
import { convertToUKDate } from '../helpers/dateHelper';
import { saveNotificationForAllUsers } from '../helpers/notificationHelper';

@Resolver()
export class hubResolver {
  // ================== Question =====================

  @Authorized()
  @Query((returns) => json)
  async myHubQuestions(@Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.communityQuestion.findMany({
      where: {
        postedBy: {
          id: ctx.user.id,
        },
      },
    });
  }

  @Query((returns) => json)
  async getAllHubQuestions(@Ctx() ctx: Context) {
    // It's a public api, no need for authentication or permission check
    /*// Permissions check
    let perm = await hasPermission('community_boards', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    if (!perm) return {error: 'NO_PERMISSION'}*/

    return await prisma.communityQuestion.findMany({
      orderBy: {
        order: 'asc', // 'order_ASC' is changed to the object format
      },
      select: {
        updatedAt: true,
        id: true,
        createdAt: true,
        status: true,
        statusDescription: true,
        views: true,
        topic: true,
        title: true,
        keywords: true,
        returningAnswer: true,
        hyperlink: true,
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  //@Authorized()
  @Query((returns) => json)
  async getSingleHubQuestion(
    @Arg('questionId') questionId: string,
    @Ctx() ctx: Context
  ) {
    /* // Permissions check
    const perm = await hasPermission('community_boards', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    if (!perm) return {error: 'NO_PERMISSION'}*/

    const comQuestion = await prisma.communityQuestion.findUnique({
      where: {
        id: questionId, // Using `where` clause to find the specific question
      },
      select: {
        updatedAt: true,
        id: true,
        createdAt: true,
        status: true,
        statusDescription: true,
        views: true,
        topic: true,
        title: true,
        keywords: true,
        returningAnswer: true,
        hyperlink: true,
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!comQuestion) throw new Error('Question does not exist');
    else return comQuestion;
  }

  @Authorized()
  @Mutation((returns) => json)
  async createHubQuestion(
    @Arg('data') data: CreateQuestionInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const allQuestions = await prisma.communityQuestion.findMany({
      orderBy: {
        order: 'desc', // Use 'desc' for descending order
      },
    });

    let i = 0;
    while (i < allQuestions.length && allQuestions[i].order === undefined) {
      i++;
    }
    let maxOrderNumber = 0;
    if (i < allQuestions.length) {
      const lastQuestion = allQuestions[i];
      maxOrderNumber = lastQuestion.order;
    }

    const createResult = await prisma.communityQuestion.create({
      data: {
        status: data.status,
        postedBy: { connect: { id: ctx.user.id } },
        views: 0,
        topic: data.topic,
        title: data.title,
        keywords: data.keywords,
        returningAnswer: data.returningAnswer,
        order: maxOrderNumber + 1,
        hyperlink: data.hyperlink,
      },
    });

    const emailHtml = `<body dir="auto">
    <div bgcolor="#f3f4ef" marginwidth="0" marginheight="0" style="font-family:Roboto,Helvetica,Arial,sans-serif">
      <table width="100%" height="100%" style="border:0" cellpadding="0" cellspacing="0">
        <tbody>
          <tr>
            <td align="center" valign="top" bgcolor="#f3f4ef" style="padding-left:20px;padding-right:20px;background:#e6e6e6">
              <div style="font-size:20px">
                <br>
              </div>
              <table border="0" bgcolor="#ffffff" style="color:#888;line-height:23px;text-align:left;font-size:15px;background:#ffffff;border:0;border-radius:4px;"
                width="600" cellpadding="0" cellspacing="0">
                <tbody>
                  <tr>
                    <td style="padding:2em 2.5em 2.4em 2em">
                      <a href="https://www.synkd.life/">
                        <img src="https://builds.byinspired.com/Mailgun/Images/Synkd_logo.png" alt="Synkd_Logo" align="right" width="125" height="39"
                          border="0" />
                      </a>
                      <br/>
                      <hr style="border-top-color:#eecbee;opacity:0.4;border-top-style:solid;padding:0;border-width:1px 0 0">
                      <br/> 
                          <p style="font-weight: bold">
                              A new question is created in the community
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Title: 
                              </span>
                              ${data.title}
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Posted By: 
                              </span>
                              ${ctx.user.firstName} ${ctx.user.lastName} (${
      ctx.user.email
    })
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Topic: 
                              </span>
                              ${data.topic}
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Keywords: 
                              </span>
                              ${data.keywords}
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Answer: 
                              </span>
                              ${data.returningAnswer}
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Posted At: 
                              </span>
                              ${convertToUKDate(createResult.createdAt)}
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Link: 
                              </span>
                              <a style="background: #ac75ab; color: white; padding: .2em 1em; border-radius: 5px;" href='https://community-dev.synkd.life/question/h/${
                                createResult.id
                              }' target='_blank'>
                                  Link to question
                              </a>
                          </p>

                         <p style="font-weight: bold">
                             This question is in PENDING status, Please check it, then approve or reject it.
                         </p>
  
                    </td>
                  </tr>
                </tbody>
              </table>
              <br />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>`;

    const adminEmail = process.env.ADMIN_EMAIL || 'IbrahimZauroh@gmail.com';
    const emailResult = await sendEmail({
      from: {
        name: 'Synkd',
        email: 'no-reply@synkd.life',
      },
      to: adminEmail,
      subject: `A new Pending question is created with this title: ${data.title}`,
      /*template: 'community-new-question',
      vars: {
        'TITLE': data.title,
        'POSTED_BY': `${ctx.user.firstName} ${ctx.user.lastName} (${ctx.user.email})`,
        'TOPIC': data.topic,
        'KEYWORDS': data.keywords,
        'ANSWER': data.returningAnswer,
        'POSTED_AT': convertToUKDate(createResult.createdAt),
        'LINK': `https://community-dev.synkd.life/question/h/${createResult.id}`,
      },*/
      html: emailHtml,
    });

    await saveNotificationForAllUsers(
      CommunityNotificationType.NEW_HUB_QUESTION,
      'New Hub Question: ' + createResult.title,
      createResult.id
    );

    return { ...createResult, emailResult };
  }

  @Authorized()
  @Mutation((returns) => json)
  async editHubQuestion(
    @Arg('data') data: EditQuestionInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    const perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );

    if (!perm) return { error: 'NO_PERMISSION' };

    // Fetch the community question with the postedBy relation
    const comQuestion = await prisma.communityQuestion.findUnique({
      where: {
        id: data.questionId,
      },
      include: {
        postedBy: true, // Include postedBy relation to check ownership
      },
    });

    if (!comQuestion) throw new Error('Question does not exist');

    const isAdmin = await isSynkdSupportUser(ctx.user);

    // If not admin, check if the current user is the creator of the question
    if (!isAdmin && comQuestion.postedBy.id !== ctx.user.id) {
      throw new Error('Question does not belong to current user');
    }

    // Update the community question
    return await prisma.communityQuestion.update({
      where: {
        id: comQuestion.id, // Ensure to use the correct field for the identifier
      },
      data: {
        title: data.title,
        topic: data.topic,
        keywords: data.keywords,
        returningAnswer: data.returningAnswer,
        hyperlink: data.hyperlink,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async reorderHubQuestion(
    @Arg('questionId') questionId: string,
    @Arg('moveUp') moveUp: boolean,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const currentQuestion = await prisma.communityQuestion.findUnique({
      where: {
        id: questionId,
      },
    });

    const currentOrder = currentQuestion.order;

    let upperOrder: any, lowerOrder: any;
    let upperQuestionId: any, lowerQuestionId: any;

    if (moveUp) {
      lowerOrder = currentOrder;
      lowerQuestionId = questionId;

      // Find upper Question
      upperOrder = currentOrder - 1;
      const upperQuestion = await prisma.communityQuestion.findMany({
        where: {
          order: upperOrder,
        },
      });

      if (upperQuestion.length === 0) {
        return {
          message: "It's the 1st item, there isn't any upper order",
        };
      } else upperQuestionId = upperQuestion[0].id;
    }
    //}
    else {
      // else Not moveUp = moveDown
      upperOrder = currentOrder;
      upperQuestionId = questionId;

      // Find lower question
      lowerOrder = currentOrder + 1;
      const lowerQuestion = await prisma.communityQuestion.findMany({
        where: {
          order: lowerOrder,
        },
      });

      if (lowerQuestion.length === 0) {
        return {
          message: "It's the last item, there isn't any lower order",
        };
      }
      lowerQuestionId = lowerQuestion[0].id;
      //}
    }

    // switch upper & lower questions
    const upperUpdateResult = await prisma.communityQuestion.update({
      where: {
        id: upperQuestionId,
      },
      data: {
        order: lowerOrder,
      },
    });

    const lowerUpdateResult = await prisma.communityQuestion.update({
      where: {
        id: lowerQuestionId,
      },
      data: {
        order: upperOrder,
      },
    });

    return upperUpdateResult;
  } // end of reorder function

  @Authorized()
  @Mutation((returns) => json)
  async deleteHubQuestion(
    @Arg('questionId') questionId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    const perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );

    if (!perm) return { error: 'NO_PERMISSION' };

    const comQuestion = await prisma.communityQuestion.findUnique({
      where: {
        id: questionId,
      },
    });

    if (!comQuestion) throw new Error('Question does not exist');

    // Check if user is an admin or the creator of the question
    const isAdmin = await isSynkdSupportUser(ctx.user);
    if (!isAdmin) {
      // Fetch the community question along with the postedBy relation
      const comQuestionWithPostedBy = await prisma.communityQuestion.findUnique(
        {
          where: {
            id: comQuestion.id,
          },
          include: {
            postedBy: true, // This includes the postedBy relation
          },
        }
      );

      if (!comQuestionWithPostedBy) {
        throw new Error('Question does not exist');
      }

      // Check if the current user is the creator of the question
      if (comQuestionWithPostedBy.postedBy.id !== ctx.user.id) {
        throw new Error('Question does not belong to current user');
      }
    }

    const questionWithReplies = await prisma.communityQuestion.findUnique({
      where: {
        id: questionId,
      },
      include: {
        replies: true, // Include the related replies
      },
    });

    const replies = questionWithReplies.replies;

    for (let reply of replies) {
      await this.deleteHubReply(reply.id, ctx);
    }

    // Delete the question
    return await prisma.communityQuestion.delete({
      where: {
        id: comQuestion.id,
      },
    });
  }

  //@Authorized()
  @Mutation((returns) => json)
  async addHubQuestionView(
    @Arg('questionId') questionId: string,
    @Ctx() ctx: Context
  ) {
    // It's a public api, no need for authentication or permission check
    /*// Permissions check
    let perm = await hasPermission('community_boards', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    if (!perm) return {error: 'NO_PERMISSION'}*/

    let comQuestion = await prisma.communityQuestion.findUnique({
      where: {
        id: questionId, // Use 'id' instead of 'id'
      },
    });

    return await prisma.communityQuestion.update({
      data: {
        views: comQuestion.views + 1,
      },
      where: {
        id: comQuestion.id, // Use 'id' instead of 'id'
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async addHubQuestionLike(
    @Arg('questionId') questionId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let comQuestion = await prisma.communityQuestion.findUnique({
      where: {
        id: questionId, // Use 'id' instead of 'id'
      },
    });

    let currentLikedByUser = await prisma.communityQuestion.findUnique({
      where: {
        id: questionId, // Use the correct identifier for your model
      },
      include: {
        likedBy: true, // Include the likedBy relation
      },
    });
    let currentLikedBy = currentLikedByUser.likedBy;

    return await prisma.communityQuestion.update({
      data: {
        likedBy: {
          connect: [
            ...currentLikedBy.map((user) => ({ id: user.id })),
            { id: ctx.user.id },
          ],
        },
      },
      where: {
        id: comQuestion.id, // Use 'id' instead of 'id'
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async approveHubQustion(
    @Arg('data') data: ApproveQuestionInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const question = await prisma.communityQuestion.findUnique({
      where: {
        id: data.questionId, // Change id to id
      },
    });

    if (!question) throw new Error('Question does not exist');

    const result = await prisma.communityQuestion.update({
      data: {
        status: data.isSuccessful ? 'Approved' : 'Rejected',
        statusDescription: data.description,
        topic: data.topic,
      },
      where: {
        id: data.questionId, // Change id to id
      },
    });

    const questionOwnerPostedBy = await prisma.communityQuestion.findUnique({
      where: {
        id: data.questionId, // Ensure you're using the correct identifier
      },
      include: {
        postedBy: true, // Include the postedBy relation
      },
    });

    const questionOwner = questionOwnerPostedBy.postedBy;

    const approveResult = data.isSuccessful ? 'approved' : 'rejected';
    const emailResult = await sendEmail({
      from: {
        name: 'Synkd',
        email: 'no-reply@synkd.life',
      },
      to: questionOwner.email,
      subject: `Hello ${questionOwner.firstName}, your question is ${approveResult}`,
      template: 'community-question-check-result',
      vars: {
        firstName: questionOwner.firstName,
        approveResult: approveResult,
        reason: data.description,
        title: question.title,
        topic: question.topic,
        keywords: question.keywords,
        answer: question.returningAnswer,
        postedAt: convertToUKDate(question.createdAt),
      },
    });
    //console.log(emailResult);

    return { ...result, emailResult: emailResult };
  }

  // ================== Reply =====================
  @Authorized()
  @Mutation((returns) => json)
  async createHubReply(
    @Arg('data') data: CreateReplyInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const createResult = await prisma.communityReply.create({
      data: {
        status: data.status,
        postedBy: { connect: { id: ctx.user.id } },
        answer: data.answer,
        question: { connect: { id: data.questionId } }, // Change id to id
        hyperlink: data.hyperlink,
      },
    });

    const emailHtml = `<body dir="auto">
    <div bgcolor="#f3f4ef" marginwidth="0" marginheight="0" style="font-family:Roboto,Helvetica,Arial,sans-serif">
      <table width="100%" height="100%" style="border:0" cellpadding="0" cellspacing="0">
        <tbody>
          <tr>
            <td align="center" valign="top" bgcolor="#f3f4ef" style="padding-left:20px;padding-right:20px;background:#e6e6e6">
              <div style="font-size:20px">
                <br>
              </div>
              <table border="0" bgcolor="#ffffff" style="color:#888;line-height:23px;text-align:left;font-size:15px;background:#ffffff;border:0;border-radius:4px;"
                width="600" cellpadding="0" cellspacing="0">
                <tbody>
                  <tr>
                    <td style="padding:2em 2.5em 2.4em 2em">
                      <a href="https://www.synkd.life/">
                        <img src="https://builds.byinspired.com/Mailgun/Images/Synkd_logo.png" alt="Synkd_Logo" align="right" width="125" height="39"
                          border="0" />
                      </a>
                      <br/>
                      <hr style="border-top-color:#eecbee;opacity:0.4;border-top-style:solid;padding:0;border-width:1px 0 0">
                      <br/> 
                          <p style="font-weight: bold">
                              A new reply to a question is created in the community
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Reply Text: 
                              </span>
                              ${data.answer}
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Posted By: 
                              </span>
                              ${ctx.user.firstName} ${ctx.user.lastName} (${
      ctx.user.email
    })
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Posted At: 
                              </span>
                              ${convertToUKDate(createResult.createdAt)}
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Link: 
                              </span>
                              <a style="background: #ac75ab; color: white; padding: .2em 1em; border-radius: 5px;" href='https://community-dev.synkd.life/question/h/${
                                data.questionId
                              }' target='_blank'>
                                  Link to question
                              </a>
                          </p>

                         <p style="font-weight: bold">
                             This reply is in PENDING status, Please check it, then approve or reject it.
                         </p>
  
                    </td>
                  </tr>
                </tbody>
              </table>
              <br />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>`;

    const adminEmail = process.env.ADMIN_EMAIL || 'IbrahimZauroh@gmail.com';
    const emailResult = await sendEmail({
      from: {
        name: 'Synkd',
        email: 'no-reply@synkd.life',
      },
      to: adminEmail,
      subject: `A new Pending hub reply is created`,
      html: emailHtml,
    });

    return { ...createResult, emailResult };
  }

  @Authorized()
  @Mutation((returns) => json)
  async editHubReply(@Arg('data') data: EditReplyInput, @Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let comReply = await prisma.communityReply.findUnique({
      where: {
        id: data.replyId, // Use 'id' instead of 'id'
      },
    });

    if (!comReply) throw new Error('Reply does not exist');

    const createdUserPosted = await prisma.communityReply.findUnique({
      where: {
        id: data.replyId, // Use the correct identifier field
      },
      include: {
        postedBy: true, // Include the postedBy relation
      },
    });

    let createdUser = createdUserPosted.postedBy;

    if (createdUser.id !== ctx.user.id)
      throw new Error('Reply does not belong to current user');

    return await prisma.communityReply.update({
      data: {
        answer: data.answer,
        hyperlink: data.hyperlink,
      },
      where: {
        id: comReply.id, // Use 'id' instead of 'id'
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async deleteHubReply(@Arg('replyId') replyId: string, @Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let comReply = await prisma.communityReply.findUnique({
      where: {
        id: replyId, // Use 'id' instead of 'id'
      },
    });

    if (!comReply) throw new Error('Reply does not exist');

    // If is a Synkd user can delete the question, else if is the author of question can delete it
    const isAdmin = await isSynkdSupportUser(ctx.user);
    if (!isAdmin) {
      const createdUserPosted = await prisma.communityReply.findUnique({
        where: {
          id: replyId, // Ensure you use the correct identifier
        },
        include: {
          postedBy: true, // Include the postedBy relation
        },
      });

      let createdUser = createdUserPosted.postedBy;
      if (createdUser.id !== ctx.user.id)
        throw new Error('Reply does not belong to current user');
    }

    // Delete rates of the reply, before deleting the reply
    const replyRates = await prisma.communityReply.findMany({
      where: {
        id: replyId, // Use 'id' instead of 'id'
      },
      include: {
        rates: true, // Include the rates related to the reply
      },
    });

    for (let i = 0; i < replyRates.length; i++) {
      const rateDeleteResult = await prisma.communityReplyRate.delete({
        where: {
          id: replyRates[i].id, // Use 'id' instead of 'id'
        },
      });
    }
    return await prisma.communityReply.delete({
      where: {
        id: replyId,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async approveHubReply(
    @Arg('data') data: ApproveReplyInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const reply = await prisma.communityReply.findUnique({
      where: {
        id: data.replyId, // Use 'id' instead of 'id'
      },
    });

    if (!reply) throw new Error('Reply does not exist');

    const result = await prisma.communityReply.update({
      data: {
        status: data.isSuccessful ? 'Approved' : 'Rejected',
        // statusDescription: data.description, // Uncomment if needed
      },
      where: {
        id: data.replyId, // Use 'id' instead of 'id'
      },
    });

    const { postedBy: replyOwner } = await prisma.communityReply.findUnique({
      where: {
        id: data.replyId, // Use 'id' instead of 'id'
      },
      include: {
        postedBy: true, // Include the postedBy relation directly
      },
    });
    const { question: replyQuestion } = await prisma.communityReply.findUnique({
      where: {
        id: data.replyId, // Use 'id' instead of 'id'
      },
      include: {
        question: true, // Include the related question
      },
    });
    const approveResult = data.isSuccessful ? 'approved' : 'rejected';

    const emailHtml = `<body dir="auto">
    <div bgcolor="#f3f4ef" marginwidth="0" marginheight="0" style="font-family:Roboto,Helvetica,Arial,sans-serif">
      <table width="100%" height="100%" style="border:0" cellpadding="0" cellspacing="0">
        <tbody>
          <tr>
            <td align="center" valign="top" bgcolor="#f3f4ef" style="padding-left:20px;padding-right:20px;background:#e6e6e6">
              <div style="font-size:20px">
                <br>
              </div>
              <table border="0" bgcolor="#ffffff" style="color:#888;line-height:23px;text-align:left;font-size:15px;background:#ffffff;border:0;border-radius:4px;"
                width="600" cellpadding="0" cellspacing="0">
                <tbody>
                  <tr>
                    <td style="padding:2em 2.5em 2.4em 2em">
                      <a href="https://www.synkd.life/">
                        <img src="https://builds.byinspired.com/Mailgun/Images/Synkd_logo.png" alt="Synkd_Logo" align="right" width="125" height="39"
                          border="0" />
                      </a>
                      <br/>
                      <hr style="border-top-color:#eecbee;opacity:0.4;border-top-style:solid;padding:0;border-width:1px 0 0">
                      <br/>
                          <p>Dear ${replyOwner.firstName},</p>
                          <p style="font-weight: bold">Your reply is ${approveResult}</p>
  
                          <p style="font-weight: bold">Reply info:</p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Answer: 
                              </span>
                              ${reply.answer}
                          </p>
  
                          <p>
                              <span style="font-weight: bold">
                                  Posted At: 
                              </span>
                              ${convertToUKDate(reply.createdAt)}
                          </p>

                          
                        <p style="font-weight: bold">Question info:</p>
                        
                        <p>
                            <span style="font-weight: bold">
                                Title:
                            </span>
                            ${replyQuestion.title}
                        </p>

                          <p>
                              Please <a style="background: #ac75ab; color: white; padding: .2em 1em; border-radius: 5px;" href="https://my.synkd.life/login">Login</a>
                              to find out more. 
                          </p>
                          <p>Regards</p>
                         
                    </td>
                  </tr>
                </tbody>
              </table>
              <br />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>`;

    const emailResult = await sendEmail({
      from: {
        name: 'Synkd',
        email: 'no-reply@synkd.life',
      },
      to: replyOwner.email,
      subject: `Hello ${replyOwner.firstName}, your reply is ${approveResult}`,
      /*template: 'community-reply-check-result',
      vars: {
        'firstName': replyOwner.firstName,
        'approveResult': approveResult,
        'answer': reply.answer,
        'postedAt': convertToUKDate(reply.createdAt),
      },*/
      html: emailHtml,
    });
    //console.log(emailResult);

    return { ...result, emailResult: emailResult };
  }

  @Query((returns) => json)
  async getRepliesForHubQuestion(
    @Arg('questionId') questionId: string,
    @Ctx() ctx: Context
  ) {
    // It's a public api, no need for authentication or permission check
    /*// Permissions check
    let perm = await hasPermission('community_boards', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    if (!perm) return {error: 'NO_PERMISSION'}*/

    return await prisma.communityReply.findMany({
      where: {
        question: {
          id: questionId, // Use 'id' instead of 'id' for primary key reference
        },
      },
      include: {
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        likedBy: {
          select: {
            id: true,
          },
        },
        dislikedBy: {
          select: {
            id: true,
          },
        },
        reportedBy: {
          select: {
            id: true,
          },
        },
        rates: {
          select: {
            postedBy: {
              select: {
                id: true,
              },
            },
            rate: true,
          },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async addHubReplyLikeOrDislike(
    @Arg('replyId') replyId: string,
    @Arg('isLike') isLike: boolean,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    // Check if reply exists
    const reply = await prisma.communityReply.findUnique({
      where: {
        id: replyId, // Assuming id is the unique identifier for the community reply
      },
    });

    if (!reply) throw new Error('Reply does not exist');

    // get list of likers & dislikers
    const { likedBy: likers } = await prisma.communityReply.findUnique({
      where: {
        id: replyId, // Assuming id is the unique identifier for the community reply
      },
      select: {
        likedBy: true, // Fetch the 'likedBy' relation
      },
    });

    const { dislikedBy: dislikers } = await prisma.communityReply.findUnique({
      where: {
        id: replyId, // Assuming id is the unique identifier
      },
      select: {
        dislikedBy: true, // Fetch the 'dislikedBy' field (assuming it's a relation)
      },
    });

    //console.log('likers=', likers)
    //console.log('dislikers=', dislikers)

    const currentUserId = ctx.user.id;

    // check if current user was in likers or dislikers, from the past
    const isInLikeList =
      likers.filter((like) => like.id === currentUserId).length > 0;
    const isInDislikeList =
      dislikers.filter((dislike) => dislike.id === currentUserId).length > 0;
    //console.log('is in like list = ', isInLikeList)
    //console.log('is in dislike list = ', isInDislikeList)

    // if user has no history of like or dislike in this reply
    if (!isInLikeList && !isInDislikeList) {
      const changesObject = isLike
        ? { likedBy: { connect: { id: currentUserId } } }
        : { dislikedBy: { connect: { id: currentUserId } } };

      // apply in database (using prisma)
      //console.log('change object simple=', changesObject)
      return await prisma.communityReply.update({
        data: changesObject, // Object containing the updates
        where: {
          id: replyId, // The unique identifier (assuming id is your unique field)
        },
      });
    } else {
      // else if current user has history on liking or disliking the reply
      let changesObject = null;

      if (isLike && isInDislikeList) {
        changesObject = {
          likedBy: { connect: { id: currentUserId } },
          dislikedBy: { disconnect: { id: currentUserId } },
        };
      }

      if (!isLike && isInLikeList) {
        changesObject = {
          likedBy: { disconnect: { id: currentUserId } },
          dislikedBy: { connect: { id: currentUserId } },
        };
      }

      if (changesObject) {
        //console.log('change object complex=', changesObject)
        return await prisma.communityReply.update({
          data: changesObject, // The object containing the changes to be made
          where: {
            id: replyId, // Ensure id is the correct identifier, or change it to `id` if necessary
          },
        });
      } // end of if (changesObject)
    } // end of else

    // else return with no change
    return reply;
    //console.log('return with no change')
  }

  @Authorized()
  @Mutation((returns) => json)
  async addHubReplyReport(
    @Arg('replyId') replyId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const reply = await prisma.communityReply.findUnique({
      where: {
        id: replyId, // Make sure you're using the correct field name (e.g., `id` or `id`).
      },
    });

    if (!reply) throw new Error('Reply does not exist');

    // const reporters = await prisma.communityReply
    const reportersReport = await prisma.communityReply.findUnique({
      where: {
        id: replyId, // Ensure you're using the correct unique identifier
      },
      include: {
        reportedBy: true, // Include the 'reportedBy' relation
      },
    });
    let reporters = reportersReport.reportedBy;

    const isReportedBefore =
      reporters.filter((reporter) => reporter.id === ctx.user.id).length > 0;

    if (isReportedBefore) {
      return { ...reply, message: 'You had reported this reply before' };
    } else {
      const reportResult = await prisma.communityReply.update({
        data: {
          reportedBy: { connect: { id: ctx.user.id } }, // Connecting the user to 'reportedBy'
        },
        where: {
          id: replyId, // The unique ID of the reply
        },
      });

      const question = await prisma.communityReply
        .findUnique({
          where: {
            id: replyId, // The unique ID of the reply
          },
        })
        .question();

      const emailHtml = `<body dir="auto">
      <div bgcolor="#f3f4ef" marginwidth="0" marginheight="0" style="font-family:Roboto,Helvetica,Arial,sans-serif">
        <table width="100%" height="100%" style="border:0" cellpadding="0" cellspacing="0">
          <tbody>
            <tr>
              <td align="center" valign="top" bgcolor="#f3f4ef" style="padding-left:20px;padding-right:20px;background:#e6e6e6">
                <div style="font-size:20px">
                  <br>
                </div>
                <table border="0" bgcolor="#ffffff" style="color:#888;line-height:23px;text-align:left;font-size:15px;background:#ffffff;border:0;border-radius:4px;"
                  width="600" cellpadding="0" cellspacing="0">
                  <tbody>
                    <tr>
                      <td style="padding:2em 2.5em 2.4em 2em">
                        <a href="https://www.synkd.life/">
                          <img src="https://builds.byinspired.com/Mailgun/Images/Synkd_logo.png" alt="Synkd_Logo" align="right" width="125" height="39"
                            border="0" />
                        </a>
                        <br/>
                        <hr style="border-top-color:#eecbee;opacity:0.4;border-top-style:solid;padding:0;border-width:1px 0 0">
                        <br/> 
                            <p style="font-weight: bold">
                                A reply is reported by a user in the community
                            </p>
                            
                            <p>
                                <span style="font-weight: bold">
                                    Reporter:
                                </span>
                                ${ctx.user.firstName} ${ctx.user.lastName} (${
        ctx.user.email
      })
                            </p>
                            
                            <p style="font-weight: bold">
                                Reply info :
                            </p>
                            
                            <p>
                                <span style="font-weight: bold">
                                    Question:
                                </span>
                                ${question.title}
                            </p>
                            
                            <p>
                                <span style="font-weight: bold">
                                    Reply Answer:
                                </span>
                                ${reply.answer}
                            </p>
                            
                            <p>
                                <span style="font-weight: bold">
                                    Posted At: 
                                </span>
                                ${convertToUKDate(reply.createdAt)}
                            </p>
    
                            <p>
                                <span style="font-weight: bold">
                                    Link:
                                </span>
                                <a style="background: #ac75ab; color: white; padding: .2em 1em; border-radius: 5px;" href='https://community-dev.synkd.life/question/h/${
                                  question.id
                                }' target='_blank'>
                                    Link to question
                                </a>
                            </p>
    
                            <p>
                                Please check this reply as soon as possible and delete it if needed.
                            </p>
    
                      </td>
                    </tr>
                  </tbody>
                </table>
                <br />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </body>`;

      const adminEmail = process.env.ADMIN_EMAIL || 'IbrahimZauroh@gmail.com';
      const emailResult = await sendEmail({
        from: {
          name: 'Synkd',
          email: 'no-reply@synkd.life',
        },
        to: adminEmail,
        subject: `A reply is reported by ${ctx.user.firstName} ${ctx.user.lastName}`,
        /*template: 'community-reply-report',
        vars: {
          'reporterName': `${ctx.user.firstName} ${ctx.user.lastName}`,
          'ReporterEmail': ctx.user.email,
          'question': question.title,
          'reply': reply.answer,
          'postedAt': convertToUKDate(reply.createdAt),
          'link': `https://community-dev.synkd.life/question/${question.id}`,
        },*/
        html: emailHtml,
      });

      return { ...reportResult, emailResult };
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async addHubReplyRate(
    @Arg('replyId') replyId: string,
    @Arg('rateNumber') rateNumber: number,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    // Check if reply exist or not?
    const reply = await prisma.communityReply.findUnique({
      where: {
        id: replyId, // The reply ID to filter the specific reply
      },
    });

    if (!reply) throw new Error('Reply does not exist');

    // Check if user rates on this reply before, if yes return the previous rate
    const rate = await prisma.communityReplyRate.findMany({
      where: {
        reply: {
          id: replyId, // The reply ID to filter the rates
        },
        postedBy: {
          id: ctx.user.id, // The user ID to filter the rates by who posted it
        },
      },
    });

    if (rate.length > 0) return rate;

    return await prisma.communityReplyRate.create({
      data: {
        rate: rateNumber, // The rating value being assigned
        reply: {
          connect: { id: replyId }, // Connecting to the existing reply by its ID
        },
        postedBy: {
          connect: { id: ctx.user.id }, // Connecting to the user posting the rate
        },
      },
    });
  }
}
