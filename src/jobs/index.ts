import Agenda, { Job, JobAttributesData } from 'agenda'
import { allDefinitions } from './definations';

const mongoConnectionString = `${process.env.DB_MONGO}`;

 export const agenda = new Agenda({ 
        db: { 
          address: mongoConnectionString, 
          collection: 'agenda_tasks', 
        },
        processEvery: "6 hours",  // updated to daily instead of every minute
        maxConcurrency: 20,
    });

 // listen for the ready or error event.
agenda.on('ready', () => console.log("Agenda started!"))
      .on('error', (err, job) => console.log("Agenda connection error!", err))
      .on('fail:send-subscription-renewal-reminder-mail', (err, job) => console.log(`failed to send subscription renewal reminder mail: ${err.message}`))
      
// define all agenda jobs
allDefinitions(agenda);

agenda.start();

// logs all registered jobs 
console.log({ jobs: agenda._definitions });
