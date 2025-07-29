// 70
import { Arg, Authorized, Mutation, Query, Resolver } from 'type-graphql';
import { permanentlyDeleteCompany, permanentlyDeleteUser } from '../admin';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { json } from '../helpers';
import { UpdateCompanyLimit, UserEmailInput } from '../inputs/auth';

@Resolver()
export class AdminResolver {
  /**
   * WARNING: This method will permanently delete a company and all
   * of the company's data. Do not use unless you absolutely want to
   * delete an entire company.
   * @param id - The ID of the company
   */
  @Authorized('synkd')
  @Mutation((returns) => json)
  async masterDeleteCompany(@Arg('companyId') id: string) {
    const company = await permanentlyDeleteCompany(id);
    return { success: true, company: company };
  }

  /**
   * WARNING: This method will permanently delete a user and remove all
   * associated data. It will also disassociate the user from any company
   * that they are part of, unless they are the only employee, in which
   * case the company will be deleted too.
   * @param id - The ID of the user
   */
  @Authorized('synkd')
  @Mutation((returns) => json)
  async masterDeleteUser(@Arg('userId') id: string) {
    const user = await permanentlyDeleteUser(id);
    return { success: true, company: user };
  }

  @Authorized('synkd')
  @Mutation((returns) => json)
  async updateCompanyLimit(@Arg('data') data: UpdateCompanyLimit) {
    if (!data.userID && !data.email) {
      throw new Error('Please provide either userID or email');
    }

    let userWhere: any;
    if (data.userID) {
      userWhere = { id: data.userID };
    } else {
      userWhere = { email: data.email };
    }

    // Update the user record using the latest Prisma syntax
    await prisma.user.update({
      where: userWhere,
      data: {
        companyLimit: data.companyLimit,
      },
    });

    return { success: true, newLimit: data.companyLimit };
  }

  // @Authorized('synkd')
  @Query((returns) => json)
  async getUserByEmail(@Arg('data') data: UserEmailInput) {
    if (!data.email) {
      throw new Error('Please provide email');
    }

    // Fetch the user by email
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
        isChild: false
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    })
    return { success: true, user };
  }
  
  @Query((returns) => json)
  async getUserByEmailAndPhone(@Arg('data') data: UserEmailInput) {
    if (!data.phone && !data.phone) {
      throw new Error('Please provide email and  phone number');
    }
    // Fetch the user by email
    console.log(data, "user by phone");
    
    const user = await prisma.user.findFirst({
      where: {
        phone: data.phone,
        email: data.email,
        isChild: false,
      },
      select: {
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    console.log(user,"user");
        
    return { success: true, user };
  }
}
