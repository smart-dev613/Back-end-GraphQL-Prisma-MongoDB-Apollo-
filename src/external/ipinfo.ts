import axios from 'axios'

/**
 * Uses our external ipinfo service to get info about an IP
 * @param ipAddress 
 */

export const getIPInfo = async (ipAddress: string) => {
    // TODO: store the service address in env
    const ipServiceBase = 'http://ipinfo-synkdneo'
    const ipServicePath = '/geoip/' + ipAddress

    const fullPath = ipServiceBase + ipServicePath

    try {
        const res = await axios.get(fullPath)
        return res.data
    } catch(e) {
        console.log("getIPInfo error: ",e.response)
        return null
    }
}