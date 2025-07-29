import "reflect-metadata"
import { prisma } from "../src/generated/prisma-client"

import { PERMISSION_ACCESS_TYPES, PERMISSION_KEYS } from '../src/constants/perms'

/**
 * Resets all of the user group permissions to their defaults
 * Added by [Jayden Bailey] on 28/7/21
 */
const init = async () => {
    let allPermissionsWithGroups = await prisma.permissionsNews({
        where: {
            group: {
                id_not: null
            }
        }
    }).$fragment(`
        {
            _id
            group {
                id
                name
                role
            }
        }
    `)

    // @ts-ignore
    for (let p of allPermissionsWithGroups) {
        let permsToSet = {}
        let role = p.group.role

        for (let [p, v] of Object.entries(PERMISSION_KEYS)) {
            switch (role) {
                case 'MASTER_ADMIN':
                    permsToSet[p] = v.defaults.master_admin
                    break
                case 'SUPER_ADMIN':
                    permsToSet[p] = v.defaults.super_admin
                    break
                case 'ADMIN':
                    permsToSet[p] = v.defaults.admin
                    break
                default:
                    permsToSet[p] = v.defaults.user
                    break
            }
        }

        console.log(`Resetting perms for user group ${p.group.id}`)
        await prisma.updatePermissionsNew({
            where: {
                _id: p._id
            },
            data: {
                permissions: permsToSet
            }
        })
    }
    // console.log('all perms', allPermissionsWithGroups)
    console.log('')
}

init().then(() => {
    console.log('Finished. Exiting...')
    process.exit(0)
})