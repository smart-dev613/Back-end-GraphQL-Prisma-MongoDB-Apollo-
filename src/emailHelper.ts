import mailgun from "mailgun-js";
// import mail from "@sendgrid/mail";
import "./env";
import { User } from "./auth/user.interface";
import { Generator } from "../util/generator";
import { createObjectID } from "../util/createIDs";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


const { PROD_MAILGUN_API = "" } = process.env;


const domain = "synkd.life";
const mg = mailgun({
  domain,
  apiKey: PROD_MAILGUN_API,
  host: 'api.eu.mailgun.net',
  endpoint: '/v2'
});
interface emailData {
  from?: {
    email: string;
    name?: string;
  };
  to: string;
  html?: string;
  template?: string;
  companyLogo?: string;
  // Variables
  vars?: object,
  replyTo?: string;
  subject: string;
  text?: string;
  attachment?: any
}

// interface for customer upload
interface emailDataCrm {
  from?: {
    email: string;
    name?: string;
  };
  to: string;
  bcc: any;
  html?: string;
  template?: string;
  companyLogo?: string;
  // Variables
  vars?: object,
  replyTo?: string;
  subject: string;
  text?: string;
  attachment?: any
}
// email function for customer upload
export const sendEmailCrm = async (emailData: emailDataCrm): Promise<any> => {
  const {
    from: { name = "Synkd", email = "no-reply@synkd.life" },
    to,
    bcc,
    html,
    replyTo,
    subject,
    template,
    companyLogo,
    text = "",
    vars = {},
    attachment = null,
  } = emailData;

  try {
    if(html) {
      return await mg
      .messages()
      .send({
        from: `${name} <${email}>`,
        to,
        bcc,
        companyLogo,
        subject,
        html,
        text,
        "h:Reply-To": replyTo,
        attachment
      });
    }
    else {
      return await mg
        .messages()
        .send({
          from: `${name} <${email}>`,
          to,
          bcc,
          subject,
          companyLogo,
          text,
          "h:X-Mailgun-Variables": JSON.stringify(vars),
          template,
          "h:Reply-To": replyTo,
          attachment
        });
    }
  } catch (err) {
    console.log(err, 'here')
    throw new Error(err);
  }
};
export const sendEmail = async (emailData: emailData): Promise<any> => {
  const {
    from: { name = "Synkd", email = "no-reply@synkd.life" },
    to,
    html,
    replyTo,
    subject,
    template,
    companyLogo,
    text = "",
    vars = {},
    attachment = null,
  } = emailData;

  try {
    if(html) {
      return await mg
      .messages()
      .send({
        from: `${name} <${email}>`,
        to,
        companyLogo,
        subject,
        html,
        text,
        "h:Reply-To": replyTo,
        attachment
      });
    }
    else {
      return await mg
        .messages()
        .send({
          from: `${name} <${email}>`,
          to,
          subject,
          companyLogo,
          text,
          "h:X-Mailgun-Variables": JSON.stringify(vars),
          template,
          "h:Reply-To": replyTo,
          attachment
        });
    }
  } catch (err) {
    console.log(err, 'here')
    throw new Error(err);
  }
};
// sent for topups and subscription payments
export const createBillingEmail = async (company: any, attachment: any, data?: any) => {
const logo = data?.companyLogo?.replace(/([^/]+)$/, (match) => encodeURIComponent(match))
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },
    to: company.billingEmail,
    subject: data?.titlePrefix + 'Your receipt from Synkd',
    template: 'user-purchase',
    attachment: attachment,
    vars: {
      companyLogo: logo ? logo : `https://user-assets.synkd.life/lbi-company-avatars/622b68d0a072010007372129/Synkd%20logo.png`,      
    }
  })
}
export const createPayoutEmail = async (company: any, attachment: any, data?: any) => {
const logo = data?.companyLogo?.replace(/([^/]+)$/, (match) => encodeURIComponent(match))
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },
    to: company.billingEmail,
    subject: data?.titlePrefix + 'Your Payout for Referrals',
    template: 'payout-for-referrals',
    attachment: attachment,
    vars: {
      name : company.name,
      companyLogo: logo ? logo : `https://user-assets.synkd.life/lbi-company-avatars/622b68d0a072010007372129/Synkd%20logo.png`, 
      link : `https://my${process.env.NODE_ENV === "development" ? "my-dev": "my"}.synkd.life/company/${company.id}/billing/info`,
      tar:  data?.tar,
    }
  })
}

export const cancelSubEmail = async (data: any) => {
  // TODO: add atchment if needed?
  if (!data.email) {
    throw new Error(
      `cancelSubEmail: email is missing`
    );
  }
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },

    vars: {
      price: data?.price,
      currency: data?.currency,
      firstName: data?.firstName,
      package: data.package,
      nextsubscriptiondate: data.nextBillingCyle
    },

    to: data.email,
    subject: 'Synkd Subscription Cancelled',
    template: 'subscription-cancelled',
  })
}

export const calendarEventBookinEmail = async (data: any) => {
  console.log("calendarEventEmail: ", {
    ...(data?.price && {price: data?.price}),
    firstName: data?.firstName,
    contentName: data?.contentName,
    companyName: data?.companyName,
    description: data?.description,
    eventName: data?.eventName,
    ...(data?.dateTime && {dateTime: data?.dateTime}),
    ...(data?.venue && {venue: data?.venue}),
    eventLogoUrl: data?.eventLogoUrl,
    eventUrl: data?.eventUrl,
    contentImageUrl: data?.contentImageUrl,
    organiser: data?.organiser,
    status: data?.status,
    ...((data?.status === "CREATED" ) && {bookingCreated: true}),
    ...((data?.status === "UPDATED" ) && {bookingUpdated: true}),
    ...((data?.venue || data?.price || data?.dateTime ) && {extraInfo: true}),
    
  })
  // TODO: add atchment if needed?
  if (!data.email) {
    throw new Error(
      `newContentEmail: email is missing`
    );
  }
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },

    vars: {
      ...(data?.price && {price: data?.price}),
      firstName: data?.firstName,
      contentName: data?.contentName,
      description: data?.description,
      companyName: data?.companyName,
      eventName: data?.eventName,
      ...(data?.dateTime && {dateTime: data?.dateTime}),
      ...(data?.venue && {venue: data?.venue}),
      eventLogoUrl: data?.eventLogoUrl,
      eventUrl: data?.eventUrl,
      contentImageUrl: data?.contentImageUrl,
      organiser: data?.organiser,
      status: data?.status,
      ...((data?.status === "CREATED" ) && {bookingCreated: true}),
      ...((data?.status === "UPDATED" ) && {bookingUpdated: true}),
      ...((data?.venue || data?.price || data?.dateTime ) && {extraInfo: true}),
      
    },

    to: data.email,
    subject: `${data?.contentName} for ${data?.companyName}`  || 'Synkd updates',
    template: 'events- ',
  })
}

export const newContentEmail = async (data: any) => {
  console.log("newContentEmail: ", data)
  // TODO: add atchment if needed?
  if (!data.email) {
    throw new Error(
      `newContentEmail: email is missing`
    );
  }
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },

    vars: {
      ...(data?.price && {price: data?.price}),
      firstName: data?.firstName,
      contentName: data?.contentName,
      description: data?.description,
      companyName: data?.companyName,
      eventName: data?.eventName,
      ...(data?.dateTime && {dateTime: data?.dateTime}),
      ...(data?.venue && {venue: data?.venue}),
      eventLogoUrl: data?.eventLogoUrl,
      eventUrl: data?.eventUrl,
      contentImageUrl: data?.contentImageUrl,
      organiser: data?.organiser,
      status: data?.status,
      ...((data?.status === "CREATED" ) && {createdContent: true}),
      ...((data?.status === "UPDATED" ) && {updatedContent: true}),
      ...((data?.venue || data?.price || data?.dateTime ) && {extraInfo: true}),
      
    },

    to: data.email,
    subject: `${data?.contentName} for ${data?.companyName}`  || 'Synkd updates',
    template: 'events-content',
  })
}

export const contentUpdateEmail = async (data: any) => {
  // TODO: add atchment if needed?
  if (!data.email) {
    throw new Error(
      `contentUpdateEmail: email is missing`
    );
  }
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },

    vars: {
      price: data?.price,
      firstName: data?.firstName,
      contentName: data?.contentName,
      companyName: data?.companyName,
      eventName: data?.eventName,
      dateTime: data?.dateTime,
      venue: data?.venue,
      eventUrl: data?.eventUrl,
      eventLogoUrl: data?.eventLogoUrl,
      contentImageUrl: data?.contentImageUrl,
      organiser: data?.organiser
    },

    to: data.email,
    subject: `${data?.contentName} for ${data?.companyName}` || 'Synkd updates',
    template: 'events-content-updated',
  })
}

export const contentUpdateBasicEmail = async (data: any) => {
  // TODO: add atchment if needed?
  if (!data.email) {
    throw new Error(
      `contentUpdateEmail: email is missing`
    );
  }
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },

    vars: {
      price: data?.price,
      firstName: data?.firstName,
      contentName: data?.contentName,
      companyName: data?.companyName,
      eventName: data?.eventName,
      dateTime: data?.dateTime,
      venue: data?.venue,
      eventUrl: data?.eventUrl,
      eventLogo: data?.eventLogo,
      contentImageUrl: data?.contentImageUrl,
      organiser: data?.organiser
    },

    to: data.email,
    subject: `${data?.contentName} for ${data?.companyName}` || 'Synkd updates',
    template: 'events-content-updated',
  })
}

export const newContentBasicEmail = async (data: any) => {
  // TODO: add atchment if needed?
  if (!data.email) {
    throw new Error(
      `newContentEmail: email is missing`
    );
  }
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },

    vars: {
      firstName: data?.firstName,
      contentName: data?.contentName,
      companyName: data?.companyName,
      eventName: data?.eventName,
      dateTime: data?.dateTime,
      venue: data?.venue,
      eventLogo: data?.eventLogo,
      contentImageUrl: data?.contentImageUrl,
      organiser: data?.organiser
    },

    to: data.email,
    subject: `${data?.contentName} for ${data?.companyName}`  || 'Synkd updates',
    template: 'events-content-created',
  })
}

export const newContentWithPriceEmail = async (data: any) => {
  // TODO: add atchment if needed?
  if (!data.email) {
    throw new Error(
      `newContentEmail: email is missing`
    );
  }
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },

    vars: {
      price: data?.price,
      firstName: data?.firstName,
      contentName: data?.contentName,
      companyName: data?.companyName,
      eventName: data?.eventName,
      dateTime: data?.dateTime,
      venue: data?.venue,
      eventLogo: data?.eventLogo,
      contentImageUrl: data?.contentImageUrl,
      organiser: data?.organiser
    },

    to: data.email,
    subject: `${data?.contentName} for ${data?.companyName}`  || 'Synkd updates',
    template: 'events-content-created',
  })
}

export const newContentWithEmployeeEmail = async (data: any) => {
  // TODO: add atchment if needed?
  if (!data.email) {
    throw new Error(
      `newContentEmail: email is missing`
    );
  }
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },

    vars: {
      price: data?.price,
      firstName: data?.firstName,
      contentName: data?.contentName,
      companyName: data?.companyName,
      eventName: data?.eventName,
      dateTime: data?.dateTime,
      venue: data?.venue,
      eventLogo: data?.eventLogo,
      contentImageUrl: data?.contentImageUrl,
      organiser: data?.organiser
    },

    to: data.email,
    subject: `${data?.contentName} for ${data?.companyName}`  || 'Synkd updates',
    template: 'events-content-created-with-emp',
  })
}

export const contentUpdateWithEmployeeEmail = async (data: any) => {
  // TODO: add atchment if needed?
  if (!data.email) {
    throw new Error(
      `newContentEmail: email is missing`
    );
  }
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },

    vars: {
      price: data?.price,
      firstName: data?.firstName,
      contentName: data?.contentName,
      companyName: data?.companyName,
      eventName: data?.eventName,
      dateTime: data?.dateTime,
      venue: data?.venue,
      eventLogo: data?.eventLogo,
      contentImageUrl: data?.contentImageUrl,
      organiser: data?.organiser
    },

    to: data.email,
    subject: `${data?.contentName} for ${data?.companyName}`  || 'Synkd updates',
    template: 'events-content-updated-with-emp',
  })
}


// sent to customer for event purchase
export const createEventCustomerEmail = async (email: any, attachment: any, data?:any) => {
  const logo = data?.companyLogo?.replace(/([^/]+)$/, (match) => encodeURIComponent(match))
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },
    to: email,
    subject: data?.titlePrefix + `Thanks for your Purchase: ${data?.contentName} / ${data?.organiser}/ ${data?.invoiceID}`,
    template: 'user-purchase-event',
    attachment: attachment,
    vars: {
      companyLogo: logo ? logo : `https://user-assets.synkd.life/lbi-company-avatars/622b68d0a072010007372129/Synkd%20logo.png`,      
      invoiceID: data?.invoiceID,
      contentName: data?.contentName,
      eventName: data?.eventName,
      organiser: data?.organiser
    }
  })
}
// sent to event organiser for event purchase
export const createEventEmail = async (email: any, attachment: any, data?:any) => {
  const logo = data?.companyLogo?.replace(/([^/]+)$/, (match) => encodeURIComponent(match))
  return await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life'
    },
    companyLogo: logo ? logo : `https://user-assets.synkd.life/lbi-company-avatars/622b68d0a072010007372129/Synkd%20logo.png`, 
    to: email,
    subject: data?.titlePrefix + (data?.recieving.includes('synkdfees') ? 'Synkd Fees' : data?.recieving.includes('synkdpayout') ? 'Synkd Payout' : 'New Purchase') + 
         `: ${data?.contentName} / ${data?.buyer} / ${data?.invoiceID}`,    
    template: 'new-event-purchase',
    attachment: attachment,
    vars: {
      companyLogo: logo ? logo : `https://user-assets.synkd.life/lbi-company-avatars/622b68d0a072010007372129/Synkd%20logo.png`,      
      invoiceID: data?.invoiceID,
      contentName: data?.contentName,
      eventName: data?.eventName,
      organiser: data?.organiser,
      buyer: data?.buyer,
    }
  })
}

export const createEmailChallenge = async (user: User) => {
  if (!user.email) {
    throw new Error(
      `This user ${user.id} does not have an email associated`
    );
  }
  const code = Generator.generateNumber(6).toString();
  // record in db
  await prisma.loginChallenge.create({
    data: {
      id: createObjectID().id,
      code,
      challengeType: 'EMAIL',
      user: { connect: { id: user.id } },
    },
  });
  // send email
  await sendEmail(
   {
     from: {
       name: "Synkd",
       email: "no-reply@synkd.life",
     },
     to: user.email,
     subject: "Email Verification - Synkd",
     template: "verify-email",
     vars: {
       "verify-code": code,
       "first-name": user.firstName,
       "last-name": user.lastName,
     }
   }
  );
};

export const verifyUserEmail = async (userId: string, code: string) => {
  const loginChallenge = await prisma.loginChallenge.findMany({
    where: {
      userId,
      challengeType: 'EMAIL',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  })
  if (loginChallenge.length == 0) {
    throw new Error("No login challenge found for this user");
  }
  let user = null;
  // If the code matches
  if (loginChallenge[0].code === code) {
    user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });  }
  return user;
};

export const createInvite = async (user: User,welcome=true) => {
  console.log(`[createInvite] Creating an invite for user ${user.id}`)
  if (!user.email) {
    throw new Error(
      `This user ${user.id} does not have an email associated`
    );
  }
  const token = Generator.generateString(32);
  // record in db
  await prisma.loginChallenge.create({
    data: {
      id: createObjectID().id,
      code: token,
      status: 'UNUSED',
      user: { connect: { id: user.id } },
      challengeType: 'INVITE',
    },
  });
  const subject = welcome ? ("Welcome - You are invited") : ("Set New Password");
  // send email
  await sendEmail(
   {
     from: {
       name: "Synkd",
       email: "no-reply@synkd.life",
     },
     to: user.email,
     subject: subject,
     template: welcome ? "events-invited" : "msl-password-change-request",
     vars: {
       "sender-name": `${user.firstName} ${user.lastName}`,
       "sender-company": "Synkd",
       "invite-url": `https://${process.env.NODE_ENV === "development" ? "my-dev": "my"}.synkd.life/invite/?auth=${token}`,
     }
   }
  );
};

export const verifyInviteToken = async (userId: string, code: string) => {
  const loginChallenge = await prisma.loginChallenge.findMany({
    where: {
      userId,
      challengeType: 'INVITE',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  });

  if (loginChallenge.length == 0) {
    throw new Error("No login challenge found for this user");
  }
  let user = null;
  // If the code matches
  if (loginChallenge[0].code === code) {
    user = await prisma.user.update({
      where: { id: userId },
      data: { inviteUsed: true, emailVerified: true },
    })  }
  return user;
};

export const resendAnInvite = async (token:String, user: User, welcome=true) => {
  if (!user.email) {
    throw new Error(
      `This user ${user.id} does not have an email associated`
    );
  }
  // send email
  await sendEmail(
   {
     from: {
       name: "Synkd",
       email: "no-reply@synkd.life",
     },
     to: user.email,
     subject: welcome ? "Welcome - You are invited" : "Set New Password",
     template: welcome ? "invite" : "msl-password-change-request",
     vars: {
       "sender-name": `${user.firstName} ${user.lastName}`,
       "sender-company": "Synkd",
       "invite-url": `https://${process.env.NODE_ENV === "development" ? "my-dev": "my"}.synkd.life/invite/?auth=${token}`,
     }
   }
  );
};
export const passwordUpdateSuccess = async (user: User) => {
  if (!user.email) {
    throw new Error(
      `This user ${user.id} does not have an email associated`
    );
  }
  // send email
  await sendEmail(
   {
     from: {
       name: "Synkd",
       email: "no-reply@synkd.life",
     },
     to: user.email,
     subject: "Password Change Confirmed",
     template: "msl-password-change-confirmation",
     vars: {
       location: 'website' // TODO: This should actually be the physical location of the user
     }
   }
  );
};
export const createEmployeeInvite = async (user: User,newLBIAccount=true) => {
  console.log('createInvite')
  if (!user.email) {
    throw new Error(
      `This user ${user.id} does not have an email associated`
    );
  }
  const subject = "Welcome - You are invited";
  // send email
  await sendEmail(
   {
     from: {
       name: "Synkd",
       email: "no-reply@synkd.life",
     },
     to: user.email,
     subject: subject,
     template: newLBIAccount ? "employee-invitation-non-lbi-user" : "events-invited"
   }
  );
};

export const sendWelcomeEmail = async (user: User) => {
  console.log('createInvite')
  if (!user.email) {
    throw new Error(
      `This user ${user.id} does not have an email associated`
    );
  }
  const subject = `Welcome - ${[user.firstName, user.lastName].filter(Boolean).join(' ')}`;
  console.log(subject)
  // send email
  await sendEmail(
   {
     from: {
       name: "Synkd",
       email: "no-reply@synkd.life",
     },
     to: user.email,
     subject: subject,
     vars: {
      "firstName": `${user.firstName}`,
      "link": `https://${process.env.NODE_ENV === "development" ? "my-dev": "my"}.synkd.life/`,
     },
     template: 'new-msl-account'
   }
  );
};

export const sendSubscriptionRenewalEmail = async (info: any) => {
  console.log('createInvite')
  if (!info.email) {
    throw new Error(
      `email is missing`
    );
  }
  const subject = `Synkd Renewals`;
  console.log(subject)
  // send email
  await sendEmail(
   {
     from: {
       name: "Synkd",
       email: "no-reply@synkd.life",
     },
     to: info.email,
     subject: subject,
     vars: {
      price: info?.price,
      currency: info?.currency,
      firstName: info?.firstName,
      package: info.package,
      nextsubscriptiondate: info.nextBillingCyle
    },
     template:'package-subscription-renewed'
     
   }
  );
};

export const sendSubscriptionRenewalReminderEmail = async (info: any) => {
  console.log('createInvite')
  if (!info.email) {
    throw new Error(
      `email is missing`
    );
  }
  const subject = `Synkd Renewals`;
  console.log(subject)
  // send email
  await sendEmail(
   {
     from: {
       name: "Synkd",
       email: "no-reply@synkd.life",
     },
     to: info.email,
     subject: subject,
     vars: {
      price: info?.price,
      currency: info?.currency,
      firstName: info?.firstName,
      package: info.package,
      nextsubscriptiondate: info.nextBillingCyle
    },
     template: 'renew-subscription-reminder'
     
   }
  );
};


export const getEmailDomains = async () => {
  return await mg.get('/domains',null )
}

export const getEmailDomain = async (domain: string) => {
  return await mg.get(`/domains/${domain}`,null)
}

export const addEmailDomain = async (domain: string) => {
  return await mg.post('/domains', {
    name: domain
  })
}

export const verifyEmailDomain = async (domain: string) => {
  return await mg.put(`/domains/${domain}/verify`, {})
}

export const removeEmailDomain = async (domain: string) => {
  return await mg.delete(`/domains/${domain}`, {})
}

/**
 * Helper function for converting a file Buffer into a Mailgun Attachment object
 * for use with sending to their API
 */
export const convertBufferToMailgunAttachment = async (file: Buffer, filename: string) => {
  return new mg.Attachment({data: file, filename: filename})
}

