/**
 * The purpose of this script is to update legacy campaigns that have been
 * created from the legacy api-fenix for use in this GraphQL API.
 * 
 * This script will populate the "id" field (not _id, which is an int)
 * with a new ObjectId to reference the campaign by.
 * 
 * It will also populate the fields "__client", "__advertiser", and "__brand"
 * if applicable with the ObjectId of the companies they reference. This
 * is alongside the existing legacy fields Client, Advertiser, Brand
 * (so that the campaigns can continue to function with the old API
 * while we work to migrate them entirely).
 * 
 * @author [Jayden Bailey](https://github.com/jaydenkieran)
 */

import "reflect-metadata"
const MongoClient = require('mongodb').MongoClient
import { prisma } from "../src/generated/prisma-client"
import { createObjectID } from "../util/createIDs"
import {ObjectId} from 'mongodb'

import { createOrGetCrmUser } from '../src/resolvers/clusterResolver'

// const mongoUrl = 'mongodb://root:sa95knwz11@mongomain-mongodb:27017/synkd-trial101?authSource=admin'
const mongoUrl = 'mongodb://root:3auf00rybo@mongomain-mongodb:27017/synkd-trial101?authSource=admin'

const init = async() => {
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true })
    if (!client) {
        console.log("Can't connect")
        return
    }
    console.log('Connected to Mongo')

    const db = client.db('synkd-trial101')
    const collection = db.collection('campaign')

    let allCampaigns = await collection.find({})

    for (let c of await allCampaigns.toArray()) {
        console.log(`Processing campaign ID: ${c._id}`)
        
        // If this campaign does not have a separate "id" (not _id) field,
        // give it one.
        let fieldsToSet = {}

        if (!c.hasOwnProperty('id')) {
            let {id} = createObjectID()
            fieldsToSet['id'] = new ObjectId(id)
            console.log(`No id field for campaign ${c.Name} (${c._id})... will add one: ${id}.`)
        }

        // console.log('c', c)

        // If there is no "new style" __advertiser, try to add it
        if ((!c.hasOwnProperty('__advertiser') || !c['__advertiser']) && c.hasOwnProperty('Advertiser') && typeof c['Advertiser'] === "number") {
            let comps = await prisma.companies({where: {_id: c['Advertiser']}})
            if (comps.length > 0) {
                try {
                    fieldsToSet['__advertiser'] = new ObjectId(comps[0].id)
                    console.log(`No __advertiser field for campaign ${c.Name} (${c._id})... will add one: ${comps[0].id}`)    
                } catch (err) {
                    console.error(`Error setting __advertiser field for campaign ${c.Name} (${c._id}): ${err}`)
                }
            } else {
                // Try and set the advertiser to the client
                comps = await prisma.companies({where: {_id: c['Client']}})
                if (comps.length > 0) {
                    try {
                        fieldsToSet['Advertiser'] = comps[0]._id
                        fieldsToSet['__advertiser'] = new ObjectId(comps[0].id)
                        console.log(`No __advertiser field for campaign ${c.Name} (${c._id})... will add one: ${comps[0].id} (setting advertiser to the same as client)`)    
                    } catch (err) {
                        console.error(`Error setting __advertiser field for campaign ${c._id}: ${err}`)
                    }
                }
            }
        }

        // If there is no "new style" __brand, try to add it
        if ((!c.hasOwnProperty('__brand') || !c['__brand']) && c.hasOwnProperty('Brand') && typeof c['Brand'] === "number") {
            let brands = await prisma.brands({where: {_id: c['Brand']}})
            if (brands.length > 0) {
                try {
                    fieldsToSet['__brand'] = new ObjectId(brands[0].id)
                    console.log(`No __brand field for campaign ${c.Name} (${c._id})... will add one: ${brands[0].id}`)
                } catch (err) {
                    console.error(`Error setting __brand field for campaign ${c.Name} (${c._id}): ${err}`)
                }
            }
        }

        // If there is no "new style" __client, try to add it
        if ((!c.hasOwnProperty('__client') || !c['__client']) && c.hasOwnProperty('Client') && typeof c['Client'] === "number") {
            let comps = await prisma.companies({where: {_id: c['Client']}})
            if (comps.length > 0) {
                try {
                    fieldsToSet['__client'] = new ObjectId(comps[0].id)
                    console.log(`No __client field for campaign ${c.Name} (${c._id})... will add one: ${comps[0].id}`)    
                } catch (err) {
                    console.error(`Error setting __client field for campaign ${c.Name} (${c._id}): ${err}`)
                }
            }
        }

        // if (c.Client !== c.Advertiser) {
        //     fieldsToSet['Client'] = c.Advertiser
        //     fieldsToSet['__client'] = c.__advertiser
        //     console.log(`Setting Client to the same company as the Advertiser (${c.Advertiser})`)
        // }

        // Now, if any fields need to be set, set them now
        if (Object.keys(fieldsToSet).length > 0) {
            console.log(`Performing update op on ${c.Name} (${c._id}) with $set: ${JSON.stringify(fieldsToSet)}`)
            if (Object.keys(fieldsToSet).length === 0) {
                console.log(`Danger! We were about to perform an empty update op on ${c.Name} (${c._id}) which would have caused problems. Skipping.`)
            } else {
                collection.updateOne({_id: c._id}, {$set: fieldsToSet})
            }
        }
    }
}

init().then(()=> console.log("done"))