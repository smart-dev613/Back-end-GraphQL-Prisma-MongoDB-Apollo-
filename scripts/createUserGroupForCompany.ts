import "reflect-metadata";
import { prisma } from "../src/generated/prisma-client"
import { createAllUserGroups } from '../util/legacySeed/seedUserGroup'

const createGroupForCompanies = async() => {
    const company = await prisma.company({id: "5f4d9e77e1d42d000735c200"})

    await createAllUserGroups({
        _id: company._id,
        id: company.id,
        name: company.name
    })
}

createGroupForCompanies().then(()=> console.log("done"))