import "reflect-metadata";
import { prisma } from "../src/generated/prisma-client"

const init = async() => {
    const crmUsers: any = await prisma.crmUsers().$fragment(
        `
            {
                id
                firstName
                lastName
                dob
                phone
                gender
                email
                user {
                    firstName
                    lastName
                    dob
                    phone
                    gender
                    email
                }
            }
        `
    )

    for (let crmU of crmUsers) {
        // console.log(crmU)
        if (crmU.hasOwnProperty('user')) {
            try {
                let changes = {
                    firstName: crmU['firstName'] || crmU['user']['firstName'],
                    lastName: crmU['lastName'] || crmU['user']['lastName'],
                    dob: crmU['dob'] || crmU['user']['dob'],
                    phone: crmU['phone'] || crmU['user']['phone'],
                    gender: crmU['gender'] || crmU['user']['gender'],
                    email: crmU['email'] || crmU['user']['email']
                }
                
                console.log(`Filling CrmUser uploaded data with User data for CrmUser ${crmU['id']}`)
                await prisma.updateCrmUser({
                    data: {
                        ...changes
                    }, where: {
                        id: crmU['id']
                    }
                })
            } catch (e) {
                console.log(`Skipping user ${JSON.stringify(crmU)}. Problem: ${e.message}`)
            }
        }
    }
}

init().then(()=> console.log("done"))