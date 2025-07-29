// 30
import { Arg, Mutation, Query, Resolver } from 'type-graphql';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { json } from '../helpers';

// TODO: implement authorization
@Resolver()
export class ProjectDomainResolver {
  @Query((returns) => json)
  async listAllProjectDomains(projectID: string) {
    return await prisma.projectDomain.findMany({
      where: { projectID: projectID }, // Ensure the field name matches your model
    });
  }

  @Mutation((returns) => json)
  async addNewProjectDomain(
    @Arg('projectID') projectID: string,
    @Arg('domain') domain: string
  ) {
    // TODO: implement checks for unique domain etc
    return await prisma.projectDomain.create({
      data: {
        domain,
        projectID: projectID, // Ensure the field matches your Prisma model
      },
    });
  }

  @Mutation((returns) => json)
  async removeProjectDomain(@Arg('domainID') id: string) {
    return await prisma.projectDomain.delete({
      where: { id },
    });
  }

  @Mutation((returns) => json)
  async updateProjectDomain(
    @Arg('domainID') id: string,
    @Arg('domain') domain: string
  ) {
    return await prisma.projectDomain.update({
      where: { id },
      data: { domain },
    });
  }
}
