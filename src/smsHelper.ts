import axios from 'axios';
import { Generator } from '../util/generator';
import { createObjectID } from '../util/createIDs';
import { PrismaClient } from '@prisma/client';
import { User } from './auth/user.interface';
import messagebird from 'messagebird';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import alibaba from '@alicloud/pop-core';

const prisma = new PrismaClient();

const alibabaClient = new alibaba({
  accessKeyId: process.env.ALIBABA_SMS_ACCESS_KEY,
  accessKeySecret: process.env.ALIBABA_SMS_ACCESS_SECRET,
  endpoint: 'https://sms-intl.ap-southeast-1.aliyuncs.com',
  apiVersion: '2018-05-01',
});

// sendSMS is a helper function to send out SMS
export const sendSMS = async (
  to: string,
  from: string,
  body: string,
  chinaTemplate: string = null,
  chinaTemplateParams: object = {},
  additionalAliParams: object = {}
) => {
  const number = parsePhoneNumberFromString(to);
  if (!number) throw new Error('Invalid phone number to send SMS');

  const excludeCountrySender = ['ID', 'IN', 'AE', 'TH', 'PK', 'SA'];
  if (excludeCountrySender.includes(number.country)) {
    from = '';
  }

  const toChina = number.country === 'CN';
  to = number.format('E.164');

  if (process.env.ALIBABA_SMS_ACCESS_KEY) {
    const aliParams = {
      RegionId: 'ap-southeast-1',
      To: to.replace(/\+/g, ''),
      From: from,
      ...additionalAliParams,
    };

    if (toChina) {
      if (!chinaTemplate) {
        throw new Error(
          'Cannot send SMS to China without an Alicloud template'
        );
      }

      aliParams['TemplateCode'] = chinaTemplate;
      aliParams['TemplateParam'] = JSON.stringify(chinaTemplateParams);

      try {
        const req = await alibabaClient.request(
          'SendMessageWithTemplate',
          aliParams,
          { method: 'POST' }
        );
        console.log(
          `[sendSMS](CN) SMS to ${to}. Response: ${JSON.stringify(req)}`
        );
        return req;
      } catch (err) {
        throw new Error(err);
      }
    } else {
      aliParams['Message'] = body;

      try {
        console.log('aliparams', aliParams);
        const req = await alibabaClient.request(
          'SendMessageToGlobe',
          aliParams,
          { method: 'POST' }
        );
        console.log(`[sendSMS] SMS to ${to}. Response: ${JSON.stringify(req)}`);
        return req;
      } catch (err) {
        throw new Error(err);
      }
    }
  } else if (process.env.MESSAGEBIRD_LIVE_KEY) {
    const params = {
      originator: from,
      recipients: [to.replace(/\+/g, '')],
      body: body,
    };
    const mb = messagebird(process.env.MESSAGEBIRD_LIVE_KEY);
    mb.messages.create(params, (err, response) => {
      if (err) {
        console.log(err);
        throw err;
      }
      return response;
    });
  } else {
    const form = {
      apiKey: process.env.TL_APIKEY,
      message: encodeURIComponent(body),
      sender: from,
      numbers: to.replace(/\+/g, ''),
    };
    try {
      const req = await axios.post(
        `https://api.txtlocal.com/send/?apiKey=${process.env.TL_APIKEY}&sender=${from}&numbers=${form.numbers}&message=${form.message}`
      );
      if (req.data.status === 'success') return req.data;
      else {
        console.log(req.data);
        throw new Error('Could not send the sms');
      }
    } catch (err) {
      throw new Error(err);
    }
  }
};

export const createPhoneChallenge = async (user: User) => {
  if (!user.isChild && !user.phone) {
    throw new Error(
      `This user ${user.id} does not have a phone number associated`
    );
  }
  if (!user.isChild){
  const code = Generator.generateNumber(6).toString();
  await prisma.loginChallenge.create({
    data: {
      id: createObjectID().id,
      code,
      challengeType: 'PHONE',
      user: { connect: { id: user.id } },
    },
  });
  await sendSMS(
    user.phone,
    'Synkd',
    `Synkd Code: ${code}`,
    'SMS_10845376',
    { code },
    { Type: 'NOTIFY' }
  );
}
};

export const verifyUserPhone = async (userId: string, code: string) => {
  const loginChallenge = await prisma.loginChallenge.findMany({
    where: { userId, challengeType: 'PHONE' },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  if (loginChallenge.length === 0) {
    throw new Error('No login challenge found for this user');
  }

  let user = null;
  if (loginChallenge[0].code === code) {
    user = await prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });
  }
  return user;
};
