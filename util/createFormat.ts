// @author: Rishabh Jindal
// @description: Util to create a media_format
// @dependencies: fenix-library submodule

import { readFileSync } from "fs"
import { prisma, MediaFormatCreateInput } from "../src/generated/prisma-client"
import { createObjectID } from "./createIDs"


interface CreateFormatInput {
    formatName: string,

    // should default to 0.0.1
    version?: string,
}

// creates a media_format
export const createFormat = async ({formatName, version = "0.0.1"}: CreateFormatInput) => {

    // try to find the format in the fenix-library directory
    const executeCode: string = readFileSync(__dirname + `/../fenix-library/src/format/${formatName}/index.js`).toString()

    const {id, _id} = createObjectID()

    const mediaFormatInput: MediaFormatCreateInput = {
        id, _id: id, format: formatName, formatID: _id, version, executeCode
    }

    await prisma.createMediaFormat(mediaFormatInput)

    // TODO: link any publisher-specific version to the publisher

}