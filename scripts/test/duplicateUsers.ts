import { prisma, Company, User } from "../../src/generated/prisma-client";
import Bottleneck from "bottleneck";
import { writeFileSync, readFileSync } from "fs";
import sleep from "sleep-promise";

export const limiter = new Bottleneck({
  maxConcurrent: 400,
  minTime: 50
});

/**
 * Find duplicate company names
 */

const duplicatePairs = [];
const foundIds = [];

const findDuplicateForUser = async (user: User) => {
if(user.phone!=""){
    const count = await prisma.users({ where: { phone: user.phone } });
    let duplicateIds = count.map((obj)=>obj.id);
    if (count.length > 1) {
      for(let i=0;i<duplicateIds.length;i++){
          let index = foundIds.findIndex((obj)=>{
              return(obj === duplicateIds[i]);
          });
          if(index===-1){
              duplicatePairs.push(count);
              foundIds.push(...count.map(obj=>obj.id))
          }
      }
    }
} 

};
const findAllDuplicates = async () => {
  const allUsers = await prisma.users();
  allUsers.forEach(async user => {
    await limiter.schedule(() => findDuplicateForUser(user));
  });
};

const execute = async () => {
  await findAllDuplicates();
  limiter.once("idle", () => {
    writeFileSync("duplicates.json", JSON.stringify(duplicatePairs));
  });
  await sleep(2000);
};


execute()
// addMissingIDs();
