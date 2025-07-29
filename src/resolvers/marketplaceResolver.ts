// 600
import { Resolver, Query, Mutation, Arg, Ctx, Authorized } from 'type-graphql';
import { json, format2digit } from '../helpers';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { Context } from '../auth/context.interface';
import {
  CreateArticleInput,
  CreateCommentInput,
  CreatePreviewInput,
  UpdateArticleInput,
} from '../inputs/marketplace';
import { sendEmail } from '../emailHelper';
import { PaymentStatus } from './../inputs/marketplace';
import {
  hasPermission,
  isSynkdSupportUser,
} from '../helpers/permissionsHelper';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';

@Resolver()
export class marketplaceResolver {
  @Authorized()
  @Query((returns) => json)
  async getAllMarketplaceArticles(@Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.marketplaceArticle.findMany({
      select: {
        id: true,
        title: true,
        imageAddress: true,
        price: true,
        currency: true,
        description: true,
        keywords: true,
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        pagePreviews: {
          select: {
            imageAddress: true,
            isDesktopSize: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async createMarketplaceArticle(
    @Arg('data') data: CreateArticleInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.marketplaceArticle.create({
      data: {
        title: data.title,
        imageAddress: data.imageAddress,
        price: data.price,
        currency: data.currency,
        description: data.description,
        keywords: data.keywords || '', // Ensure it's an empty string if undefined
        postedBy: { connect: { id: ctx.user.id } }, // Assuming postedBy is a relation
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateMarketplaceArticle(
    @Arg('data') data: UpdateArticleInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let article = await prisma.marketplaceArticle.findUnique({
      where: {
        id: data.articleId, // Assuming 'id' is the unique identifier for the article
      },
    });

    if (!article) throw new Error('Article does not exist');

    const isAdmin = await isSynkdSupportUser(ctx.user);
    if (!isAdmin) {
      const { postedBy: createdUser } =
        await prisma.marketplaceArticle.findUnique({
          where: {
            id: data.articleId,
          },
          select: {
            postedBy: true,
          },
        });

      if (createdUser.id !== ctx.user.id)
        throw new Error('Article does not belong to current user');
    }

    return await prisma.marketplaceArticle.update({
      data: {
        title: data.title,
        imageAddress: data.imageAddress,
        price: data.price,
        currency: data.currency,
        description: data.description,
        keywords: data.keywords || '',
      },
      where: {
        id: data.articleId, // Assuming 'id' is the unique identifier for the article
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async deleteMarketplaceArticle(
    @Arg('articleId') articleId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    let article = await prisma.marketplaceArticle.findUnique({
      where: {
        id: articleId, // Use the correct unique identifier
      },
    });

    if (!article) throw new Error('Article does not exist');

    const isAdmin = await isSynkdSupportUser(ctx.user);
    if (!isAdmin) {
      const { postedBy: createdUser } =
        await prisma.marketplaceArticle.findUnique({
          where: {
            id: articleId, // Use the correct unique identifier
          },
          select: {
            postedBy: true, // Select the relation
          },
        });

      if (createdUser.id !== ctx.user.id)
        throw new Error('Article does not belong to current user');
    }

    return await prisma.marketplaceArticle.delete({
      where: {
        id: articleId, // Use the correct unique identifier
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async getCommentsForMarketplaceArticle(
    @Arg('articleId') articleId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.marketplaceComment.findMany({
      where: {
        article: {
          id: articleId,
        },
      },
      select: {
        id: true,
        text: true,
        rateNumber: true,
        likedBy: {
          select: { id: true },
        },
        dislikedBy: {
          select: { id: true },
        },
        reportedBy: {
          select: { id: true },
        },
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async createMarketplaceComment(
    @Arg('data') data: CreateCommentInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.marketplaceComment.create({
      data: {
        text: data.text,
        rateNumber: data.rateNumber,
        article: { connect: { id: data.articleId } }, // Ensure 'id' is the correct field for the article
        postedBy: { connect: { id: ctx.user.id } }, // Ensure 'id' is the correct field for the user
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async addMarketplaceCommentLikeOrDislike(
    @Arg('commentId') commentId: string,
    @Arg('isLike') isLike: boolean,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    // Check if comment exists
    const comment = await prisma.marketplaceComment.findUnique({
      where: {
        id: commentId,
      },
    });

    if (!comment) throw new Error('Comment does not exist');

    // get list of likers & dislikers

    const { likedBy: likers } = await prisma.marketplaceComment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        likedBy: true, // Include the likedBy relation
      },
    });
    const { dislikedBy: dislikers } =
      await prisma.marketplaceComment.findUnique({
        where: {
          id: commentId,
        },
        select: {
          dislikedBy: true, // Include the likedBy relation
        },
      });

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
      return await prisma.marketplaceComment.update({
        where: {
          id: commentId,
        },
        data: changesObject, // The object containing the fields to update
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
        return await prisma.marketplaceComment.update({
          where: {
            id: commentId, // Use 'id' to match the Prisma model field
          },
          data: changesObject, // The object containing the fields to update
        });
      } // end of if (changesObject)
    } // end of else

    // else return with no change
    return comment;
    //console.log('return with no change')
  }

  @Authorized()
  @Mutation((returns) => json)
  async addMarketplaceCommentReport(
    @Arg('commentId') commentId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const comment = await prisma.marketplaceComment.findUnique({
      where: {
        id: commentId, // Use 'id' instead of 'id' if that is the correct field in your schema
      },
    });

    if (!comment) throw new Error('Comment does not exist');

    const commentWithReporters = await prisma.marketplaceComment.findUnique({
      where: {
        id: commentId, // Assuming id in your database maps to id in the Prisma model
      },
      include: {
        reportedBy: true, // Fetch the entire reportedBy relation, with all fields
      },
    });

    // You can then access reporters like this:
    const reporters = commentWithReporters?.reportedBy;

    const isReportedBefore =
      reporters.filter((reporter) => reporter.id === ctx.user.id).length > 0;

    if (isReportedBefore) {
      return { ...comment, message: 'You had reported this comment before' };
    } else {
      const reportResult = await prisma.marketplaceComment.update({
        where: {
          id: commentId, // Use the correct field as per your schema
        },
        data: {
          reportedBy: {
            connect: { id: ctx.user.id }, // Ensure this matches your user model's identifier
          },
        },
      });

      const commentWithArticle = await prisma.marketplaceComment.findUnique({
        where: {
          id: commentId, // Assuming `id` in the database maps to `id` in the Prisma model
        },
        include: {
          article: true, // Fetch the entire `article` relation
        },
      });

      // Access the article like this:
      const article = commentWithArticle?.article;

      const adminEmail = process.env.ADMIN_EMAIL || 'IbrahimZauroh@gmail.com';
      const emailResult = await sendEmail({
        from: {
          name: 'Synkd',
          email: 'no-reply@synkd.life',
        },
        to: adminEmail,
        subject: `A comment is reported by ${ctx.user.firstName} ${ctx.user.lastName}`,
        /*template: 'employee-invitation-non-lbi-user',
        vars: {
          'var_name': data,
        },*/
        html: `
        Dear admin
        <br/>
        A comment is reported as a bad comment by this user
        <br/>
        ${ctx.user.firstName} ${ctx.user.lastName} (${ctx.user.email})
        <br/>
        Other info :
        <br/>
        Comment Text : ${comment.text}
        <br/>
        Comment ID: ${commentId}
        <br/>
        Article ID: ${article.id}
        <br/>
        Article Title: ${article.title}
        <br/>
        Please check this comment ASAP and delete it if needed.
        <br/>
        Regards
        <br/>
        <strong>Synkd</strong>
        `,
      });

      return { ...reportResult, emailResult };
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async createMarketplaceArticlePreview(
    @Arg('data') data: CreatePreviewInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.marketplaceArticlePagePreview.create({
      data: {
        imageAddress: data.imageAddress,
        isDesktopSize: data.isDesktopSize,
        article: {
          connect: {
            id: data.articleId, // Ensure this matches your article model's identifier
          },
        },
        // If you need to connect the user who posted it, uncomment this line
        // postedBy: { connect: { id: ctx.user.id } },
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async getMarketpalceCart(@Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    /*const article = await prisma.marketplaceArticle({ id: articleId })
    if (!article) throw new Error('Article does not exist')*/

    const cart = await prisma.marketplaceCart.findMany({
      where: {
        postedByUser: {
          id: ctx.user.id,
        },
      },
      orderBy: {
        createdAt: 'desc', // Use 'desc' for descending order
      },
      take: 1, // Use 'take' to limit the results to the last one
      include: {
        // Use 'include' to fetch related data
        items: {
          select: {
            id: true,
            title: true,
            itemCount: true,
            price: true,
            currency: true,
            tax: true,
            createdAt: true,
          },
        },
        postedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        postedByCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (cart) {
      return cart;
    } else {
      throw new Error('No items in cart');
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async addMarketpalceArticleToCart(
    @Arg('articleId') articleId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const article = await prisma.marketplaceArticle.findUnique({
      where: {
        id: articleId,
      },
    });

    if (!article) throw new Error('Article does not exist');

    const cart = await prisma.marketplaceCart.findMany({
      where: {
        postedByUser: {
          id: ctx.user.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1, // Limits the results to 1
    });

    let cartOperation: any;
    if (cart && cart.length > 0) {
      // Check if the current article was added before
      const similarCartItems = await prisma.marketplaceCartItem.findMany({
        where: {
          cart: {
            id: cart[0].id, // Assuming `id` is mapped to `id` in Prisma
          },
          article: {
            id: articleId, // Assuming `id` is mapped to `id` in Prisma
          },
        },
      });

      // Exit the process if there is similar article in cart
      if (similarCartItems.length > 0) return similarCartItems[0];

      cartOperation = { connect: { id: cart[0].id } };
    } else {
      cartOperation = {
        create: {
          postedByUser: { connect: { id: ctx.user.id } },
          postedByCompany: { connect: { id: ctx.company.id } },
          status: PaymentStatus.UNPAID,
          subtotal: article.price,
          taxTotal: article.price * 0.2,
          totalPrice: article.price * 1.2,
          currency: article.currency,
        },
      };
    }

    const cartItem = await prisma.marketplaceCartItem.create({
      data: {
        article: { connect: { id: articleId } }, // Assuming `id` is mapped to `id`
        title: article.title,
        itemCount: 1,
        price: article.price,
        currency: article.currency,
        tax: format2digit(article.price * 0.2),
        cart: { connect: { id: cartOperation.id } }, // Connect the cart using the appropriate ID field
      },
    });

    // Update Cart price & tax, after inserting new cart_item
    if (cart && cart.length > 0) {
      const updateCartPrices = await prisma.marketplaceCart.update({
        where: {
          id: cart[0].id,
        },
        data: {
          subtotal: format2digit(cart[0].subtotal + article.price),
          taxTotal: format2digit((cart[0].subtotal + article.price) * 0.2),
          totalPrice: format2digit((cart[0].subtotal + article.price) * 1.2),
        },
      });
    }

    return cartItem;
  }

  @Authorized()
  @Mutation((returns) => json)
  async removeCartItemFromCart(
    @Arg('cartItemId') cartItemId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const cartItem = await prisma.marketplaceCartItem.findUnique({
      where: {
        id: cartItemId, // Ensure that this matches the primary key field in your Prisma model
      },
    });

    if (!cartItem) throw new Error('Cart Item does not exist');

    const cartItemWithCart = await prisma.marketplaceCartItem.findUnique({
      where: {
        id: cartItemId, // Assuming `id` in the database maps to `id` in the Prisma model
      },
      include: {
        cart: true, // Fetch the entire `cart` relation
      },
    });

    // Access the cart like this:
    const cart = cartItemWithCart?.cart;

    const result = await prisma.marketplaceCartItem.delete({
      where: {
        id: cartItemId, // Ensure this matches your Prisma model's unique identifier
      },
    });

    // Update Cart price & tax, after deleteing the cart_item
    const updateCartPrices = await prisma.marketplaceCart.update({
      where: {
        id: cart.id, // Use 'id' instead of 'id' if your schema defines it that way
      },
      data: {
        subtotal: format2digit(cart.subtotal - cartItem.price),
        taxTotal: format2digit((cart.subtotal - cartItem.price) * 0.2),
        totalPrice: format2digit((cart.subtotal - cartItem.price) * 1.2),
      },
    });

    return result;
  }

  @Authorized()
  @Mutation((returns) => json)
  async removeMarketpalceArticleFromCart(
    @Arg('articleId') articleId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'community_marketplace',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const article = await prisma.marketplaceArticle.findUnique({
      where: {
        id: articleId, // Use 'id' instead of 'id' if your schema defines it that way
      },
    });

    if (!article) throw new Error('Article does not exist');

    const cart = await prisma.marketplaceCart.findMany({
      where: {
        postedByUser: {
          id: ctx.user.id,
        },
      },
      orderBy: {
        createdAt: 'desc', // Use an object for orderBy
      },
      take: 1, // Get the last cart
    });

    if (!cart) throw new Error('Cart does not exist');

    const cartItem = await prisma.marketplaceCartItem.findMany({
      where: {
        cart: {
          id: cart[0].id, // Use "id" for the field name in the latest Prisma
        },
        article: {
          id: articleId, // Use "id" for the field name in the latest Prisma
        },
      },
    });

    if (!cartItem) throw new Error('Cart Item does not exist');

    const result = await prisma.marketplaceCartItem.delete({
      where: {
        id: cartItem[0].id, // Use "id" for the field name in the latest Prisma
      },
    });

    // Update Cart price & tax, after deleteing the cart_item
    const updateCartPrices = await prisma.marketplaceCart.update({
      where: {
        id: cart[0].id, // Use "id" for the field name in the latest Prisma
      },
      data: {
        subtotal: format2digit(cart[0].subtotal - article.price),
        taxTotal: format2digit((cart[0].subtotal - article.price) * 0.2),
        totalPrice: format2digit((cart[0].subtotal - article.price) * 1.2),
      },
    });

    return result;
  }
}
