import { sendSubscriptionRenewalReminderEmail } from '../emailHelper'


export const sendSubscriptionRenewalReminderMail=  async (job, done) => {
    const { data } = job.attrs;
    await sendSubscriptionRenewalReminderEmail(data)
    console.log("sendSubscriptionRenewalReminderMail: ", data)
    done();
}