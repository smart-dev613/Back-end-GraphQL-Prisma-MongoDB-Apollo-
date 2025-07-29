import { prisma } from "../src/generated/prisma-client"

const init = async() => {
    await prisma.updateManyCompanies({
        data: {
            type: 5
        },
        where: {
            type_not: 5
        }
    })
    console.log('Updated all companies to type 5')
}

init().then(()=> console.log("done"))