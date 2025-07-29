// 740
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
  CreateSupportQuestionInput,
  EditQuestionInput,
  CreateReplyInput,
  EditReplyInput,
  ApproveReplyInput,
  CommunityNotificationType,
} from '../inputs/community';

import { sendEmail } from '../emailHelper';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';
import { saveNotificationForAllUsers } from '../helpers/notificationHelper';

@Resolver()
export class supportResolver {
  // ================== Question =====================

  @Query((returns) => json)
  async getAllSupportQuestions(@Ctx() ctx: Context) {
    // It's a public api, no need for authentication or permission check
    /*// Permissions check
    let perm = await hasPermission('community_boards', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    if (!perm) return {error: 'NO_PERMISSION'}*/

    return await prisma.supportQuestion.findMany({
      orderBy: {
        order: 'asc',
      },
      select: {
        id: true,
        updatedAt: true,
        createdAt: true,
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
  async getSingleSupportQuestion(
    @Arg('questionId') questionId: string,
    @Ctx() ctx: Context
  ) {
    /* // Permissions check
    const perm = await hasPermission('community_boards', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    if (!perm) return {error: 'NO_PERMISSION'}*/

    const supportQuestion = await prisma.supportQuestion.findUnique({
      where: {
        id: questionId,
      },
      select: {
        updatedAt: true,
        id: true,
        createdAt: true,
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

    if (!supportQuestion) throw new Error('Question does not exist');
    else return supportQuestion;
  }

  @Authorized()
  @Mutation((returns) => json)
  async createSupportQuestion(
    @Arg('data') data: CreateSupportQuestionInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const allQuestions = await prisma.supportQuestion.findMany({
      orderBy: {
        order: 'desc',
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

    const createResult = await prisma.supportQuestion.create({
      data: {
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

    await saveNotificationForAllUsers(
      CommunityNotificationType.NEW_SUPPORT_QUESTION,
      'New Support Question: ' + createResult.title,
      createResult.id
    );

    return createResult;
  }

  @Authorized()
  @Mutation((returns) => json)
  async editSupportQuestion(
    @Arg('data') data: EditQuestionInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let supportQuestion = await prisma.supportQuestion.findUnique({
      where: {
        id: data.questionId,
      },
    });

    if (!supportQuestion) throw new Error('Question does not exist');

    const isAdmin = await isSynkdSupportUser(ctx.user);
    if (!isAdmin) {
      let createdUser = await prisma.supportQuestion
        .findUnique({
          where: { id: supportQuestion.id },
        })
        .postedBy();
      if (createdUser.id !== ctx.user.id)
        throw new Error('Question does not belong to current user');
    }

    return await prisma.supportQuestion.update({
      where: {
        id: supportQuestion.id,
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
  async reorderSupportQuestion(
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

    const currentQuestion = await prisma.supportQuestion.findUnique({
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
      const upperQuestion = await prisma.supportQuestion.findMany({
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
      const lowerQuestion = await prisma.supportQuestion.findMany({
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
    const upperUpdateResult = await prisma.supportQuestion.update({
      data: {
        order: lowerOrder,
      },
      where: {
        id: upperQuestionId,
      },
    });

    const lowerUpdateResult = await prisma.supportQuestion.update({
      data: {
        order: upperOrder,
      },
      where: {
        id: lowerQuestionId,
      },
    });

    return upperUpdateResult;
  } // end of reorder function

  @Authorized()
  @Mutation((returns) => json)
  async deleteSupportQuestion(
    @Arg('questionId') questionId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let supportQuestion = await prisma.supportQuestion.findUnique({
      where: { id: questionId },
    });

    if (!supportQuestion) throw new Error('Question does not exist');
    // If is a Synkd user can delete the question, else if is the author of question can delete it
    const isAdmin = await isSynkdSupportUser(ctx.user);
    if (!isAdmin) {
      let createdUser = (
        await prisma.supportQuestion.findUnique({
          where: { id: supportQuestion.id },
          include: {
            postedBy: true,
          },
        })
      ).postedBy;
      if (createdUser.id !== ctx.user.id)
        throw new Error('Question does not belong to current user');
    }

    // Delete replies of the question, before deleting the question
    const questionWithReplies = await prisma.supportQuestion.findUnique({
      where: { id: questionId },
      include: { replies: true },
    });

    if (questionWithReplies && questionWithReplies.replies) {
      for (let i = 0; i < questionWithReplies.replies.length; i++) {
        await this.deleteSupportReply(questionWithReplies.replies[i].id, ctx);
      }
    }

    return await prisma.supportQuestion.delete({
      where: { id: supportQuestion.id },
    });
  }

  //@Authorized()
  @Mutation((returns) => json)
  async addSupportQuestionView(
    @Arg('questionId') questionId: string,
    @Ctx() ctx: Context
  ) {
    // It's a public api, no need for authentication or permission check
    /*// Permissions check
    let perm = await hasPermission('community_boards', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    if (!perm) return {error: 'NO_PERMISSION'}*/
    let supportQuestion = await prisma.supportQuestion.findUnique({
      where: { id: questionId },
    });

    return await prisma.supportQuestion.update({
      where: {
        id: supportQuestion.id,
      },
      data: {
        views: {
          increment: 1, // Increment the views by 1
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async addSupportQuestionLike(
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

    let supportQuestion = await prisma.supportQuestion.findUnique({
      where: { id: questionId },
    });
    let { likedBy: currentLikedBy } = await prisma.supportQuestion.findUnique({
      where: { id: questionId },
      include: { likedBy: true },
    });

    return await prisma.supportQuestion.update({
      where: {
        id: supportQuestion.id,
      },
      data: {
        likedBy: {
          connect: [
            ...currentLikedBy.map((user) => ({ id: user.id })),
            { id: ctx.user.id },
          ],
        },
      },
    });
  }

  // ================== Reply =====================
  @Authorized()
  @Mutation((returns) => json)
  async createSupportReply(
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

    const createResult = await prisma.supportReply.create({
      data: {
        status: data.status,
        postedBy: { connect: { id: ctx.user.id } },
        answer: data.answer,
        question: { connect: { id: data.questionId } },
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
                              ${ctx.user.firstName} ${ctx.user.lastName} (${ctx.user.email})
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Posted At: 
                              </span>
                              ${createResult.createdAt}
                          </p>
                          
                          <p>
                              <span style="font-weight: bold">
                                  Link: 
                              </span>
                              <a style="background: #ac75ab; color: white; padding: .2em 1em; border-radius: 5px;" href='https://community-dev.synkd.life/question/s/${data.questionId}' target='_blank'>
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
      subject: `A new Pending support reply is created`,
      html: emailHtml,
    });

    return { ...createResult, emailResult };
  }

  @Authorized()
  @Mutation((returns) => json)
  async editSupportReply(
    @Arg('data') data: EditReplyInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let supportReply = await prisma.supportReply.findUnique({
      where: { id: data.replyId },
    });

    if (!supportReply) throw new Error('Reply does not exist');

    let { postedBy: createdUser } = await prisma.supportReply.findUnique({
      where: { id: data.replyId },
      include: {
        postedBy: true,
      },
    });

    if (createdUser.id !== ctx.user.id)
      throw new Error('Reply does not belong to current user');
    return await prisma.supportReply.update({
      where: { id: supportReply.id },
      data: {
        answer: data.answer,
        hyperlink: data.hyperlink,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async deleteSupportReply(
    @Arg('replyId') replyId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_boards',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let supportReply = await prisma.supportReply.findUnique({
      where: {
        id: replyId,
      },
    });

    if (!supportReply) throw new Error('Reply does not exist');

    // If is a Synkd user can delete the question, else if is the author of question can delete it
    const isAdmin = await isSynkdSupportUser(ctx.user);
    if (!isAdmin) {
      let { postedBy: createdUser } = await prisma.supportReply.findUnique({
        where: { id: replyId },
        include: {
          postedBy: true,
        },
      });
      if (createdUser.id !== ctx.user.id)
        throw new Error('Reply does not belong to current user');
    }

    return await prisma.supportReply.delete({
      where: {
        id: replyId,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async approveSupportReply(
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

    const reply = await prisma.supportReply.findUnique({
      where: {
        id: data.replyId,
      },
    });

    if (!reply) throw new Error('Reply does not exist');

    const result = await prisma.supportReply.update({
      data: {
        status: data.isSuccessful ? 'Approved' : 'Rejected',
        // Uncomment if needed: statusDescription: data.description,
      },
      where: {
        id: data.replyId,
      },
    });

    const { postedBy: replyOwner, question: replyQuestion } =
      await prisma.supportReply.findUnique({
        where: { id: data.replyId },
        include: {
          postedBy: true,
          question: true,
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
                              ${reply.createdAt}
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
      html: emailHtml,
    });
    //console.log(emailResult);

    return { ...result, emailResult: emailResult };
  }

  @Query((returns) => json)
  async getRepliesForSupportQuestion(
    @Arg('questionId') questionId: string,
    @Ctx() ctx: Context
  ) {
    // It's a public api, no need for authentication or permission check
    /*// Permissions check
    let perm = await hasPermission('community_boards', PERMISSION_ACCESS_TYPES.view_only, ctx.companyMembership.id)
    if (!perm) return {error: 'NO_PERMISSION'}*/

    return await prisma.supportReply.findMany({
      where: {
        question: {
          id: questionId,
        },
      },
      select: {
        updatedAt: true,
        id: true,
        createdAt: true,
        status: true,
        answer: true,
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
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async addSupportReplyLikeOrDislike(
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
    const reply = await prisma.supportReply.findUnique({
      where: {
        id: replyId,
      },
    });

    if (!reply) throw new Error('Reply does not exist');

    // get list of likers & dislikers
    const { likedBy: likers, dislikedBy: dislikers } =
      await prisma.supportReply.findUnique({
        where: { id: replyId },
        include: {
          likedBy: true,
          dislikedBy: true,
        },
      });

    const currentUserId = ctx.user.id;

    // check if current user was in likers or dislikers, from the past
    const isInLikeList =
      likers.filter((like) => like.id === currentUserId).length > 0;
    const isInDislikeList =
      dislikers.filter((dislike) => dislike.id === currentUserId).length > 0;
    if (!isInLikeList && !isInDislikeList) {
      const changesObject = isLike
        ? { likedBy: { connect: { id: currentUserId } } }
        : { dislikedBy: { connect: { id: currentUserId } } };

      // apply in database (using prisma)
      //console.log('change object simple=', changesObject)
      return await prisma.supportReply.update({
        data: changesObject,
        where: {
          id: replyId,
        },
      });
    } else {
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
        return await prisma.supportReply.update({
          data: changesObject,
          where: {
            id: replyId,
          },
        });
      } // end of if (changesObject)
    } // end of else

    return reply;
  }
}
