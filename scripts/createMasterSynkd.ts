import 'reflect-metadata'
import { prisma } from '../src/generated/prisma-client';
import { SignupInput } from '../src/inputs/auth'
import {adminSignup} from '../src/resolvers/resolver'

var signupInput: SignupInput = {
    overrideCompanyID: 11,
    overrideType: 10,
    firstName: "Synkd",
    lastName: "Support",
    email: "support@synkd.life",
    companyName: "Synkd",
    country: "UK",
    phone: "+447383428151",
    password: "INSERT_PASSWORD",
    canDoRotationalTags: true,
    overrideLimit: 99999
};

// Before running this script, go to src/resolver.ts and modify the _id field to 11 and type to 10 in createLegacyCompany function data
export const runScript = async (masterPass: string = "SynkdLifeM") => {
    signupInput.password = masterPass;
    await adminSignup(signupInput)

    await prisma.updateUser({data:{emailVerified: true, phoneVerified: true, companyLimit: signupInput.overrideLimit}, where:{email: signupInput.email}})
}