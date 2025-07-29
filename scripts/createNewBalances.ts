import 'reflect-metadata';
import { prisma } from "../src/generated/prisma-client";
import { legacyGetBalancesFn } from "../src/resolvers/billingResolver";


export const runScript = async (data, ctx) => {

const oldBalances =  await legacyGetBalancesFn(data, ctx);
  const topupBalanceData = oldBalances.topupBalance;
  const subscriptionBalanceData = oldBalances.subscriptionBalance;

  // get the topups services dynamically
  const topupServices = Object.keys(topupBalanceData).map((service) => ({
    // id: new ObjectId(),
    type: service,
    balance: topupBalanceData[service],
   
  }));

  // get the subscription services dynamically
  const subscriptionServices = Object.keys(subscriptionBalanceData).map((service) => ({
    // id: new ObjectId(),
    type: service,
    balance: subscriptionBalanceData[service],
  }));
  
   // const existingCompanyTopup = await prisma.balances({
   // where: {
   //   companyId: data.companyId,
   //   balanceType: "TOPUP",
   //  }
   // })
   // if (existingCompanyTopup.length > 0 ){

   //   console.log('Subscription balance already exists:', existingCompanyTopup);

   // } else {
  try { 
    // // Create the balances for topups and subscriptions
     await prisma.createBalance({
      companyId: data.companyId,
      company_Id: data.company_Id,
      balanceType: "TOPUP",
      services: {
        create: topupServices,
      },
    });
    console.log("topup", topupServices)
  } catch(error) {
  
    console.error("Error adding topup balancs:", error);
  }
    // }
    // const existingCompanySubscription = await prisma.balances({
    //   where: {
    //     companyId: data.companyId,
    //     balanceType: "SUBSCRIPTION",
    //    }
    //   })
    //   if (existingCompanySubscription.length > 0 ){    
    //     console.log('Subscription balance already exists:', existingCompanyTopup);    
    // } else {
    try {
       await prisma.createBalance({
        companyId: data.companyId,
        company_Id: data.company_Id,
        balanceType: "SUBSCRIPTION",
        services: {
          create: subscriptionServices.length ? subscriptionServices : topupServices ,
        },
      });
      console.log("subs",subscriptionServices )
      } catch(error) {
      console.error("Error adding subs balancs:", error);
     } 
// }

}

  const data = {
  // companyId: '622b68d0a072010007372129',
  // company_Id: 11
  companyId: '6231fde1a07201000737b097',
  company_Id: 2035
  // companyId: '623aefa9a07201000737c530',
  // company_Id: 2043
  }
  
  const ctx = {
  user : {
  // id: '623aefa92e4093001a236b71',
  id: '6231fde1cb648c001aaf1e35',
  }
  }
  
  runScript(data, ctx).then(() => console.log("Added proper balances now"))
  .catch((error) => console.error("Error adding proper balancs:", error));