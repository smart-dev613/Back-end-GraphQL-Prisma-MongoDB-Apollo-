import Bottleneck from "bottleneck"
import { permanentlyDeleteCompany } from "../src/admin";
import { prisma } from '../src/generated/prisma-client';

export const limiter = new Bottleneck({
    maxConcurrent: 400,
    minTime: 50,
  });

// List of company ids to exclude
const EXCLUDED_PUBLISHERS = [
    '5ecfc5eb25661d003b437559',
    '5ed0189dfbbb2d46c07b3130',
    '5ecfc62e25661d003b438d77',
    '5ecfc69325661d003b43acaf',
    '5ecfc57325661d003b433d85',
    '5ecfc6f425661d003b43c6d7',
    '5ecfc6d325661d003b43be67',
    '5ecfc62e25661d003b438d77',
    '5ecfc55925661d003b432cdb',
    '5ecfc73925661d003b43d7ed',
    '5ecfc55925661d003b432cc9',
    '5ecfc5da25661d003b436e75',
    '5ecfc5d825661d003b436dd3',
    '5ecfc5da25661d003b436e63',
    '5ecfc54625661d003b431eef',
    '5ecfc54625661d003b431f13',
    '5ecfc56f25661d003b433b57',
    '5ecfc57525661d003b433ea5',
    '5ecfc6d625661d003b43bef7',
    '5ecfc6d325661d003b43be55',
    '5ecfc54e25661d003b4324fb',
    '5ecfc53325661d003b430d6d'
]

const init = async () => {
    console.log(`Getting all publishers...`)
    let allPublishers = await prisma.companies({where: {type: 5}})
    console.log(`Detected ${allPublishers.length} publishers (type 5 companies), preparing to delete...`)

    for (let pub of allPublishers) {
        if (EXCLUDED_PUBLISHERS.includes(pub.id.toString())) {
            console.log(`Skipping publisher ${pub.id.toString()} as it is excluded from deletion`)
        } else {
            console.log(`Preparing to delete company ${pub.name} (${pub.id.toString()})`)
            try {
                await permanentlyDeleteCompany(pub.id)
            } catch (err) {
                console.log(`Error deleting company ${pub.id.toString()}: ${err.message}`)
            }
        }
    }

    console.log('Done')
    process.exit()
}

init();