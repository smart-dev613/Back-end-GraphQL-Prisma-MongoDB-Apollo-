import { Mutation, Resolver, Arg } from "type-graphql";
import { PrismaClient, Prisma } from "@prisma/client";
import { json } from "../../helpers";

// Initialize the Prisma Client
const prisma = new PrismaClient();

interface CrmUserWithUserRelation
  extends Prisma.CrmUserGetPayload<{
    include: { user: true };
  }> {}

const removeNulls = <T>(obj: T): T => {
  const isArray = Array.isArray(obj);
  for (const k of Object.keys(obj)) {
    if (obj[k] === null || obj[k] === undefined) {
      delete obj[k];
    } else if (typeof obj[k] === "object") {
      removeNulls(obj[k]);
    }
  }
  return obj;
};

const applyUserDataToCrmUser = async (crmUserID: string) => {
  const crmUser = await prisma.crmUser.findUnique({
    where: { id: crmUserID },
    include: { user: true },
  });

  const user = crmUser?.user;

  if (!user) {
    throw new Error("This CRM user does not have any associated synkd user");
  }

  const {
    email,
    firstName,
    lastName,
    dob,
    gender,
    facebook: personal_facebook,
    instagram: personal_instagram,
    linkedIn: personal_linkedIn,
    twitter: personal_twitter,
    phone,
    qq: personal_qq,
    skype: personal_skype,
    weChat: personal_wechat,
    weibo: personal_weibo,
  } = user;

  const updateInput: Prisma.CrmUserUpdateInput = {
    email,
    firstName,
    lastName,
    dob,
    gender,
    personal_facebook,
    personal_instagram,
    personal_twitter,
    phone,
    personal_qq,
    personal_wechat,
  };

  const filteredUpdateInput = removeNulls(updateInput);

  // Update the CRM user with filtered data
  await prisma.crmUser.update({
    where: { id: crmUserID },
    data: {
      ...filteredUpdateInput,
    },
  });

  console.log(user);

  return {};
};

@Resolver()
export class LegacyCrmResolver {
  @Mutation(() => json)
  async applyUserDataToCrmUser(@Arg("crmUserID") crmUserID: string) {
    return applyUserDataToCrmUser(crmUserID);
  }
}
