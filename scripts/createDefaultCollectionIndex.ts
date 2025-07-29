import { prisma, CollectionIndexCreateInput } from "../src/generated/prisma-client"
import { createObjectID } from "../util/createIDs"

const collectionNames = [
 "media_tag",
 "brand",
 "advertiser",
 "billing_invoice",
 "legacy_studio",
 "campaign",
 "company",
 "user"
]

export const runScript = async () => {
    const collectionIndexes: CollectionIndexCreateInput[] = collectionNames.map(c => <CollectionIndexCreateInput>{...createObjectID(), collection: c, index: 0})
    collectionIndexes.forEach(async c => await prisma.createCollectionIndex(c))

}

// runScript().then(_ => console.log("Done"))