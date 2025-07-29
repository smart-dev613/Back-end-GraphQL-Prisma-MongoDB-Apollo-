import "reflect-metadata";
import { prisma } from "../src/generated/prisma-client"
import { createObjectID } from "../util/createIDs";
const createClusterForCompanies = async() => {
    // const company = await prisma.company({id: "628b0ee87c827d0007379660"}) //ahmed company
    // const company = await prisma.company({id: "622b75e1a072010007372b4f"}) //cheroo staging company
    // const company = await prisma.company({id: "6231fde1a07201000737b097"}) //pratick staging company
    const company = await prisma.company({id: "622b693fa072010007372396"}) //Imagine MY staging company

    console.log("---------------------------------------------------")
    console.log("---------------------------------------------------")
    console.log("---------------------------------------------------")
    console.log("create new customer cluster for....", company.name)

  const ids = createObjectID()
    await prisma.createCrmCluster({
        ...ids,
        name: 'All Customers',
        description: `All Crm Customers of ${company.name}`,
        clusterType: 'CUSTOMERS',
        company: {
            connect: {
              id: company.id
            }
          }
      })
      console.log("---------------------------------------------------")
      console.log("---------------------------------------------------")
      console.log("created all customers cluster for..", company.name)
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

     console.log("found all uers")
      let crmUsers = await prisma.crmUsers({where: {associatedCompany: {id: company.id}}})
      let crmUsersToConnect = crmUsers.map(u => { return { id: u.id } })
      console.log("---------------------------------------------------")
      console.log("---------------------------------------------------")
      console.log("now updating all customers for..", company.name , "with users", crmUsers)
      await prisma.updateCrmCluster({
        where: { id: acs[0].id },
          data: {
            users: {connect : crmUsersToConnect}
          }
      }) 

}

createClusterForCompanies().then(()=> console.log("done creating all customer cluster.. and updating with customers" ))