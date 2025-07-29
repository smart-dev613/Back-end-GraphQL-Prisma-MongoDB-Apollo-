import { createObjectID } from './createIDs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { Generator } from './generator';

interface createUserSessionInput {
  id: string;
  company: {
    id: string;
  };
  ipAddress: string;
  userAgent: string;
}

export const generateLegacySessionToken = async (
  data: createUserSessionInput
) => {
  return await prisma.userSession.create({
    data: {
      id: createObjectID().id,
      SessionID: Generator.generateString(32),
      company: { connect: { id: data.company.id } },
      user: { connect: { id: data.id } },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
};

export const generateCookieUserDetails = (data) => {
  return {
    ...data,
    avatar: null,
  };
};
