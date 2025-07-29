import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { createInitialPermsForUserGroup } from "../src/helpers/permissionsHelper";
import { createAllUserGroups } from '../util/legacySeed/seedUserGroup'
import { limiter } from "./readExcel";

const init = async() => {
    const groups = await prisma.userGroup.findMany(); // Assuming userGroups was renamed to userGroup
    groups.forEach(async group => {
        console.log(`Processing group ${group.id}`)
        await limiter.schedule(() => createInitialPermsForUserGroup(group.id))
    })
}

init().then(()=> console.log("done"))