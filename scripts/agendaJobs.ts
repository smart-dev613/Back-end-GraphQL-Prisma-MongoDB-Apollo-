import { agenda } from '../src/jobs';

agenda.on('ready', async () => {

const data = {
    price: 75,
    currency: 'GBP',
    subscriptionId: 'sub_1OtxXNCx8GDBKZpPu0VWmZFB',
    email: 'haruna.rabiu@outlook.com',
    firstName: 'Synkd',
    package: 'Small',
    nextBillingCyle: 'April 14, 2024',
    reminderDate: '2024-03-13T20:13:00.000Z'
}

const result = await agenda.schedule(data.reminderDate, "send-subscription-renewal-reminder-mail", data);
const jobs =  await agenda.jobs({"data.subscriptionId":"sub_1OtuTtCx8GDBKZpPOvJ6UG1w"})
console.log(jobs)
})