import { prisma } from "../src/generated/prisma-client"
import {createUserGroup} from './createUsers'
import { UserGroupNameEnum } from '../util/interfaces/user'
import { CompanyUniqueValues } from "../util/interfaces/company"
import {limiter} from './readExcel'

const createUserGroups = async (company: CompanyUniqueValues) => {
    let userGroups = await prisma.userGroups({where:{company:{id: company.id}}})
    // If usergroups don't exist for this company
    if (userGroups.length < 4){
        //TODO only Create missing user groups
        // Right now creates all user groups
        for (let value of Object.values(UserGroupNameEnum)){
            const companyUserGroup = await createUserGroup({id: company.id, _id: company._id}, {name: value})
            userGroups.push(companyUserGroup)
        }
    }
}
const createGroupForCompanies = async() => {
    const companies = await prisma.companies()

    companies.forEach(async company=> {
        await limiter.schedule(() => createUserGroups(company));
    })
    
}

// createGroupForCompanies().then(()=> console.log("done"))