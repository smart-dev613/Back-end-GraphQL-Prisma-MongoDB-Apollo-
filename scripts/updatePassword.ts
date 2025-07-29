import bcrypt from "bcryptjs"
import { Generator } from "../util/generator"
import { prisma } from "../src/generated/prisma-client"

const init = async() => {
    const passwordToSet = Generator.generateString(12)

    const user = await prisma.user({id: '60227758d7a153001ab2a5bf'})
    if (!user) throw new Error(`User does not exist`)

    const password = bcrypt.hashSync(passwordToSet, 12)

    console.log(`Setting ${user.id}'s password to:\n${passwordToSet}`)
    return await prisma.updateUser({
        where: { id: user.id },
        data: {
            password
        }
    })
}

init().then(()=> console.log("done"))