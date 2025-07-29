import {createClient} from 'redis';

export const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        connectTimeout: 50000,
    },
});

redisClient.connect().then(() => {console.log("Redis connected")}).catch((err) => {console.log("Redis Error: ", err)})