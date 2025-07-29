import "reflect-metadata"
const MongoClient = require('mongodb').MongoClient
import { prisma } from "../src/generated/prisma-client"

import { createOrGetCrmUser } from '../src/resolvers/clusterResolver'

const mongoUrl = 'mongodb://root:sa95knwz11@mongomain-mongodb:27017/synkd-trial101?authSource=admin'
// const mongoUrl = 'mongodb://root:3auf00rybo@mongomain-mongodb:27017/synkd-trial101?authSource=admin'

const init = async() => {
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true })
    if (!client) {
        console.log("Can't connect")
        return
    }
    console.log('Connected to Mongo')

    const db = client.db('synkd-trial101')
    const collection = db.collection('CrmCluster')

    let allClusters = await collection.find({})

    for (let c of await allClusters.toArray()) {
        let newUsers = []

        if (c.users) {
            for (let userId of c.users) {
                console.log('user id', userId)
                try {
                    let crmUser = await createOrGetCrmUser(c.company, {id: userId})
                    newUsers.push(crmUser)
                } catch (e) {
                    console.log(`Problem converting user ${userId} to CrmUser: ${e.message}`)
                    // Problem, but lets just ignore it
                    continue
                }
            }

            // Update CRM cluster with new users
            await prisma.updateCrmCluster({
                data: {
                    users: {connect: newUsers.map(crmUser => { return {id: crmUser.id }})}
                },
                where: {
                    id: c.id
                }
            })
            console.log(`Updated CrmCluster ${c.id}`)
        }
    }
}

init().then(()=> console.log("done"))