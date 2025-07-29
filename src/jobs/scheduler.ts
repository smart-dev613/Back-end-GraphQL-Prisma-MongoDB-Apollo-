import { agenda } from "./index";

export const schedule = {

  sendSubscriptionRenewalReminderMail: async (data) => {
    
    const result = await agenda.schedule(data.reminderDate, "send-subscription-renewal-reminder-mail", data);
   
  },

  cancelSubscriptionRenewalReminderMail: async (data) => {
    console.log("cancelling subscription Email reminder: ", data.subscriptionId)
    agenda.on('ready', async () => {
      const jobs = await agenda.jobs({ "data.subscriptionId": data.subscriptionId})
      jobs.map(job => {
        console.log("Cancelled job:  ", job)
        job.remove()
      })
      
    })
    
  }
}

