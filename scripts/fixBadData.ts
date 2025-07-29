import "reflect-metadata"
const MongoClient = require('mongodb').MongoClient
import { prisma } from "../src/generated/prisma-client"
import { createObjectID } from "../util/createIDs"
import { ObjectId } from 'mongodb'
import { format } from "libphonenumber-js"
import Bottleneck from "bottleneck"
import { createInitialPermsForUserGroup } from "../src/helpers/permissionsHelper"

export const limiter = new Bottleneck({
    maxConcurrent: 400,
    minTime: 50,
})

// uncomment for staging
// const mongoUrl = 'mongodb://root:sa95knwz11@mongomain-mongodb:27017/synkd-trial101?authSource=admin'

// uncommment for live
const mongoUrl = 'mongodb://root:3auf00rybo@mongomain-mongodb:27017/synkd-trial101?authSource=admin'

const performFieldUpdates = async (coll, objId, fieldsToSet) => {
    // Now, if any fields need to be set, set them now
    if (Object.keys(fieldsToSet).length > 0) {
        console.log(`[db] Performing update op on ${objId} with $set: ${JSON.stringify(fieldsToSet)}`)
        if (Object.keys(fieldsToSet).length === 0) {
            console.log(`[warn] Danger! We were about to perform an empty update op on (${objId}) which would have caused problems. Skipping.`)
        } else {
            await coll.updateOne({ _id: objId }, { $set: fieldsToSet })
        }
    }
    return true
}

/**
 * Fixes publisher tag issues.
 * Added on 14/10/21 by [Jayden Bailey](github.com/jayktaylor)
 */
const fixPublisherTags = async (db) => {
    console.log(`[fixPublisherTags] Fixing issues with publisher_tag entries...`)
    let coll = db.collection('publisher_tag')

    console.log(`[fixPublisherTags] Fixing wrong mobile device type ('mobile' -> 'smartphone')...`)
    await coll.updateMany({ Device: 'mobile' }, { $set: { Device: 'smartphone' } })
}

/**
 * Fixes empty marketing preferences for users by adding required defaults.
 * Added on 3/9/21 by [Jayden Bailey](github.com/jayktaylor)
 */
const fixEmptyMarketingPreferences = async () => {
    console.log(`[fixEmptyMarketingPreferences] Fixing empty marketing preferences. This may take some time.`)
    let defaultPrefs = {
        seeAds: true
    }
    let marketingPrefs = await prisma.userMarketingPreferences()
    let totalFixed = 0
    for (let mp of marketingPrefs) {
        if (mp.preferences && Object.keys(mp.preferences).length === 0) {
            // Preferences is empty, add defaults
            console.log(`[fixEmptyMarketingPreferences] ${mp.id} has empty prefs... adding defaults...`)
            await prisma.updateUserMarketingPreference({
                data: {
                    preferences: defaultPrefs
                },
                where: {
                    id: mp.id
                }
            })
            totalFixed += 1
            continue
        }

        let toAdd = {}
        // Check if all of the default keys exist, and if not add them
        for (let k of Object.keys(defaultPrefs)) {
            if (!mp.preferences.hasOwnProperty(k)) {
                toAdd[k] = defaultPrefs[k]
            }
        }
        let numToAdd = Object.keys(toAdd).length
        if (numToAdd > 0) {
            console.log(`[fixEmptyMarketingPreferences] ${mp.id} is missing ${numToAdd} default keys... adding...`)
            await prisma.updateUserMarketingPreference({
                data: {
                    preferences: {
                        ...mp.preferences,
                        ...toAdd
                    }
                },
                where: {
                    id: mp.id
                }
            })
            totalFixed += 1
        }
    }
    console.log(`[fixEmptyMarketingPreferences] ${totalFixed} fixed in total`)
}

/**
 * Fixes bad data for media rates.
 * Added on 19/7/21 by [Jayden Bailey](github.com/jayktaylor)
 */
const fixMediaRatesData = async (db) => {
    console.log(`[fixMediaRatesData] Fixing incorrect country codes for media rates...`)
    let coll = db.collection('media_rates')
    await coll.updateMany({ Country: 'UK' }, { $set: { Country: 'GB' } })
    // await coll.deleteMany({ Country: null })
    console.log(`[fixMediaRatesData] Fixing incorrect device 'mobile' -> 'smartphone'`)
    // await coll.updateMany({ Device: 'mobile' }, { $set: { Device: 'smartphone' } })
}

/**
 * Fixes bad data for campaigns.
 * Added on 15/7/21 by [Jayden Bailey](github.com/jayktaylor)
 */
const fixCampaignData = async (db) => {
    console.log(`[fixCampaignData] Fixing incorrect NaN types in media_flights...`)
    let coll = db.collection('media_flights')

    let types = ['Campaign', 'FrequencyCap', 'FrequencyLength']

    for (let t of types) {
        console.log(`[fixCampaignData] Updating NaN or string types for ${t} in media_flights...`)
        await coll.updateMany({
            $or : [ { t : NaN }, { $and : [ { t : { $not : { $type : 16 } } }, { t : { $exists : true } }, { t : { $ne : null } } ] } ]
        }, { $set: { t: null } }) // update if NaN or string
    }

    console.log(`[fixCampaignData] Fixing incorrect types for 'Global' in media_flights...`)
    await coll.updateMany({ TargetCountry: "" }, { $set: { TargetCountry: null } })
    await coll.updateMany({ TargetCountry: 'Global' }, { $set: { TargetCountry: null } })

    console.log(`[fixCampaignData] Fixing incorrect device type 'mobile' -> 'smartphone' in media_flights...`)
    await coll.updateMany({ Device: 'mobile'}, { $set: { Device: 'smartphone' } })

    console.log(`[fixCampaignData] Fixing incorrect types for City field in media_flights...`)
    
    let incorrectCityDocs = await coll.find({ $or : [ { "City" : { $not : { $type : 4 } } }, { $and : [ { "City" : { $type : 4 } }, { "City" : /.*.*/i } ] } ] })
    for (let c of await incorrectCityDocs.toArray()) {            
        let fieldsToSet = {}

        if (c.City === null) {
            fieldsToSet['City'] = []
        } else if (typeof c.City === 'string') {
            if (c.City === 'All' || c.City === 'Global' || c.City === '') {
                fieldsToSet['City'] = []
            } else {
                fieldsToSet['City'] = [c.City]
            }
        } else {
            fieldsToSet['City'] = []
        }

        await performFieldUpdates(coll, c._id, fieldsToSet)
    }

    console.log(`[fixCampaignData] Fixing incorrect types for OS field in media_flights...`)

    let incorrectOSDocs = await coll.find({ $or : [ { "OS" : { $not : { $type : 4 } } }, { $and : [ { "OS" : { $type : 4 } }, { "OS" : /.*.*/i } ] } ] })
    for (let c of await incorrectOSDocs.toArray()) {            
        let fieldsToSet = {}

        if (c.OS === null) {
            fieldsToSet['OS'] = []
        } else if (typeof c.OS === 'string') {
            if (c.OS === '') {
                fieldsToSet['OS'] = []
            } else {
                fieldsToSet['OS'] = [c.OS]
            }
        } else {
            fieldsToSet['OS'] = []
        }

        await performFieldUpdates(coll, c._id, fieldsToSet)
    }

    console.log(`[fixCampaignData] Fixing bad data in gender field in media_flights...`)

    await coll.updateMany({ gender: null }, { $set: { gender: [] } })
    await coll.updateMany({ gender: "" }, { $set: { gender: [] } })

    console.log(`[fixCampaignData] Fixing bad age fields in media_flights...`)

    await coll.updateMany({ maxAge: 0 }, { $set: { maxAge: 999 } })
}

/**
 * Fixes bad data in user profile fields.
 * Added on 13/7/21 by [Jayden Bailey](github.com/jayktaylor)
 */
const fixUserProfileFields = async (db) => {
    console.log('[fixUserProfileFields] Checking and updating incorrect data...')

    let coll = db.collection('user')

    let genderUpdates = {
        'undefined': null,
        'Prefer Not to Say': null,
        'Male': 'MALE',
        'Female': 'FEMALE'
    }

    for (const [k, v] of Object.entries(genderUpdates)) {
        console.log(`[fixUserProfileFields] Updating all instances of gender '${k}' to '${v}'`)
        await coll.updateMany({ gender: k }, { $set: { gender: v } })
    }
}

/**
 * Remove old data that is no longer required.
 * Added on 2/6/21 by [Jayden Bailey](github.com/jaydenkieran)
 */
const removeOldData = async (db) => {
    console.log('[removeOldData] Checking and removing old data...')

    let rmvDate = new Date()
    rmvDate.setMonth(rmvDate.getMonth() - 6) // 6 months before current date
    let sixMonthsSecs = 60 * 60 * 24 * 182 // 6 months ish

    // // Remove old legacy_studio_token entries
    // let lst = db.collection('legacy_studio_token')
    // let lstFieldName = 'TimeGenerated'
    // let lstRes = await lst.deleteMany({ [lstFieldName]: { $lte: rmvDate } })
    // console.log(`[removeOldData] Removed ${lstRes.deletedCount} documents from 'legacy_studio_token'...`)
    // let lstidxs = await lst.indexes()
    // let lstttlindx = lstidxs.find((i) => { return i.name === lstFieldName })
    // if (!lstttlindx) {
    //     console.log(`[removeOldData] Creating TTL index for 'legacy_studio_token'`)
    //     await lst.createIndex({TimeGenerated: 1}, {name: lstFieldName, expireAfterSeconds: sixMonthsSecs})
    // }

    // // Remove old password_reset_token entries
    // let prt = db.collection('password_reset_token')
    // let prtRes = await prt.deleteMany({ TimeGenerated: { $lte: rmvDate } })
    // console.log(`[removeOldData] Removed ${prtRes.deletedCount} documents from 'password_reset_token'...`)
    // let prtidxs = await prt.indexes()
    // let prtttlindx = lstidxs.find((i) => { return i.name === lstFieldName })
    // if (!prtttlindx) {
    //     console.log(`[removeOldData] Creating TTL index for 'password_reset_token'`)
    //     await prt.createIndex({TimeGenerated: 1}, {name: lstFieldName, expireAfterSeconds: sixMonthsSecs})
    // }

    // // Remove old crm_selected entries
    // let crms = db.collection('crm_selected')
    // let crmsRes = await crms.deleteMany({ TimeGenerated: { $lte: rmvDate } })
    // console.log(`[removeOldData] Removed ${crmsRes.deletedCount} documents from 'crm_selected'...`)

    // // Remove old crm_selected entries
    // let us = db.collection('user_sessions')
    // let usRes = await us.deleteMany({ TimeGenerated: { $lte: rmvDate } })
    // console.log(`[removeOldData] Removed ${usRes.deletedCount} documents from 'user_sessions'...`)
}

/**
 * Updates the name of any legacy formats used in the media_rates collection to their new name.
 * Added on 2/6/21 by [Jayden Bailey](github.com/jaydenkieran)
 */
const updateRateLegacyFormats = async (db) => {
    console.log('[updateRateLegacyFormats] Checking and updating legacy format names in media_rates...')
    let coll = db.collection('media_rates')

    let formatChanges = {
        'in-content': 'Standard',
        'super optic': 'Super Optic',
        'video-canvas': 'Video Canvas'
    }

    for (const [k, v] of Object.entries(formatChanges)) {
        console.log(`[updateRateLegacyFormats] Updating all instances of '${k}' to '${v}'`)
        await coll.updateMany({ Format: k }, { $set: { Format: v } })
    }
}

/**
 * Adds any missing "id" fields to collections, as required by Prisma.
 * Added on 1/6/21 by [Jayden Bailey](github.com/jaydenkieran)
 */
const addMissingIds = async (db) => {
    console.log(`[addMissingIds] Adding missing 'id' fields...`)
    let collections = [
        'campaign',
        'media_flights',
        'code',
        'mail_batch',
        'research',
        'publisher_site'
    ]

    for (let c of collections) {
        console.log(`[addMissingIds] Checking collection ${c}...`)
        let coll = db.collection(c)
        let allDocs = await coll.find({})

        for (let c of await allDocs.toArray()) {            
            let fieldsToSet = {}
    
            if (!c.hasOwnProperty('id') || c.id === null) {
                let {id} = createObjectID()
                fieldsToSet['id'] = new ObjectId(id)
                console.log(`[addMissingIds] No id field for ${c._id}... will add one: ${id}...`)
            }
    
            await performFieldUpdates(coll, c._id, fieldsToSet)
        }
    }
}

/**
 * Adds any missing indexes for media to ensure fast tag speed and low CPU utilization.
 * Added on 1/6/21 by [Jayden Bailey](github.com/jaydenkieran)
 */
const addMissingMediaIndexes = async (db) => {
    console.log(`[addMissingMediaIndexes] Checking for missing media indexes...`)
    let colls = await db.listCollections().toArray()

    // This is the 'master' list of indexes that all media collections should have.
    let indexesList = {
        'General': {
            key: {
                Created: -1,
                Creative: -1,
                Events: -1,
                Fingerprint: -1,
                Flight: -1,
                IP: -1,
                SessionID: -1,
                Tag: -1,
                URL: -1,
                _id: -1
            },
        },
        'Session': {
            key: {
                SessionID: -1
            }
        },
        'Retargeting': {
            key: {
                Creative: -1,
                Fingerprint: 1
            }
        },
        'Fraud': {
            key: {
                IP: 1,
                Events: 1,
                Created: -1
            }
        },
        'TagCount': {
            key: {
                Tag: -1
            }
        }
    }

    for (let c of colls) {
        let col = db.collection(c.name)
        let idxs = await col.indexes()

        let indexesToCreate = []

        for (const [k, v] of Object.entries(indexesList)) {
            let tryFind = idxs.find((i) => { return i.name === k })
            if (!tryFind) {
                // Can't find index, add it to list of indexes to create
                indexesToCreate.push({
                    ...v,
                    name: k,
                    background: true
                })
            }
        }

        if (indexesToCreate.length > 0) {
            console.log(`[addMissingMediaIndexes] Creating ${indexesToCreate.length} indexes on collection ${c.name}...`)
            await col.createIndexes(indexesToCreate)
        }
    }
}

/**
 * Fixes any dates in the media_flights database that are a string rather than an actual Date object.
 * Added on 1/6/21 by [Jayden Bailey](github.com/jaydenkieran)
 */
const fixMediaDates = async (db) => {
    console.log(`[fixMediaDates] Checking for missing media_flights Date objects...`)
    let coll = db.collection('media_flights')
    let wrongTypes = await coll.find({ "$or": [{"Start": { $not: { $type: 9 } }}, {"End": { $not: { $type: 9 } }}] })

    for (let f of await wrongTypes.toArray()) {
        let fieldsToSet = {}
        console.log(`[fixMediaDates] Flight ${f._id} has incorrect type for Start or End dates. Fixing.`)
        if (typeof (f.Start) === 'string') {
            fieldsToSet['Start'] = new Date(f.Start)
        }
        if (typeof (f.End) === 'string') {
            fieldsToSet['End'] = new Date(f.End)
        }

        await performFieldUpdates(coll, f._id, fieldsToSet)
    }
}

/**
 * Adds any missing user group roles.
 * Added on 27/7/21 by [Jayden Bailey](github.com/jaydenkieran)
 */
const addMissingUserGroupRoles = async () => {
    console.log(`[addMissingUserGroupRoles] Adding any missing user group roles...`)
    try {
        await prisma.updateManyUserGroups({
            where: {
                name: 'Super Admins'
            },
            data: {
                role: 'SUPER_ADMIN'
            }
        })
        await prisma.updateManyUserGroups({
            where: {
                name: 'Admins'
            },
            data: {
                role: 'ADMIN'
            }
        })
        await prisma.updateManyUserGroups({
            where: {
                name: 'Master Admins'
            },
            data: {
                role: 'MASTER_ADMIN'
            }
        })
        await prisma.updateManyUserGroups({
            where: {
                name: 'User'
            },
            data: {
                role: 'USER'
            }
        })
        await prisma.updateManyUserGroups({
            where: {
                name: 'Users'
            },
            data: {
                role: 'USER'
            }
        })
        await prisma.updateManyUserGroups({
            where: {
                name: 'Default'
            },
            data: {
                role: 'DEFAULT'
            }
        })
    } catch (err) {
        console.error('Problem adding missing user group roles. Error is:', err)
    }
}

/**
 * Adds any missing user group permissions to existing companies.
 * Added on 23/6/21 by [Jayden Bailey](github.com/jaydenkieran)
 */
const addMissingUserGroupPermissions = async (db) => {
    console.log(`[addMissingUserGroupPermissions] Checking for missing user group permissions. This may take a while...`)
    try {
        const groups: any = await prisma.userGroups().$fragment(`{
            id
            permissions {
                _id
            }
        }`)
    
        groups.forEach(async group => {
            if (!group.permissions) {
                await limiter.schedule(() => createInitialPermsForUserGroup(group.id))
            }
        })    
    } catch (err) {
        console.error('Problem adding missing user group permissions. Error is:', err)
    }
}

const init = async () => {
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true })
    if (!client) {
        console.log("Can't connect")
        return
    }
    console.log('Connected to Mongo...')

    const db = client.db('synkd-trial101')
    const mediaDb = client.db('media')

    console.log('Performing fixes for bad data in our database...')

    /**
     * All patch functions go under this line
     */
    // await fixMediaDates(db)
    // await addMissingIds(db)
    // await updateRateLegacyFormats(db)
    // await removeOldData(db)
    // await addMissingMediaIndexes(mediaDb)
    // await fixCampaignData(db)
    await fixMediaRatesData(db)
    // await fixUserProfileFields(db)
    // await fixPublisherTags(db)
    // await fixEmptyMarketingPreferences()
    // await addMissingUserGroupRoles()
    // await addMissingUserGroupPermissions(db)
}

init().then(() => {
    console.log('Finished applying fixes. Exiting...')
    process.exit(0)
})