import { sendSubscriptionRenewalReminderMail } from "../handler";

export const mailDefinitions = (agenda) => {
   agenda.define("send-subscription-renewal-reminder-mail", sendSubscriptionRenewalReminderMail);

}