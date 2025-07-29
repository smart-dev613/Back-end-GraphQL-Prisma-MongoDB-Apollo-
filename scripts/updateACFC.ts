import "reflect-metadata";
import { prisma } from "../src/generated/prisma-client"
import { createObjectID } from "../util/createIDs";
const updateClusterForCompanies = async() => {
    // const company = await prisma.company({id: "628b0ee87c827d0007379660"}) //ahmed company
    // const company = await prisma.company({id: "622b75e1a072010007372b4f"}) //cheroo staging company
    // const company = await prisma.company({id: "6231fde1a07201000737b097"}) //pratick staging company
    const company = await prisma.company({id: "622b75e1fbb910001ac8a840"}) //Imagine MY staging company

    console.log("---------------------------------------------------")
    console.log("---------------------------------------------------")
    console.log("---------------------------------------------------")
    console.log("now find the created all users cluster")

   const acs: any = await prisma.crmClusters({
     where: {
      company: {
          id: company.id
      },
      status_not: 'ARCHIVED',
      name: 'All Customers',
      clusterType: 'CUSTOMERS'
  }
})
console.log("---------------------------------------------------")
console.log("---------------------------------------------------")

     console.log("found ACFC cluster")
     let crmUsers = await prisma.crmUsers({where: {associatedCompany: {id: company.id}}})
      let crmUsersToConnect = crmUsers.map(u => { return { id: u.id } })
      console.log("---------------------------------------------------")
      console.log("---------------------------------------------------")
      console.log("now updating all customers for..", company.name , "with", crmUsers.length, "users")
      await prisma.updateCrmCluster({
        where: { id: acs[0].id },
          data: {
            users: {connect : crmUsersToConnect}
          }
      }) 

}

updateClusterForCompanies().then(()=> console.log("done updating cluter with customers" ))