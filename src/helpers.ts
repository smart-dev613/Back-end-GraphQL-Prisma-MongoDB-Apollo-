import { PrismaClient } from '@prisma/client';
import { GraphQLScalarType } from 'graphql';
const prisma = new PrismaClient();

var QRCode = require('qrcode');

export const json = new GraphQLScalarType({
  name: 'JSON',
  description: 'Any json object',

  serialize(value: any) {
    return value; // value sent to the client
  },
});

export enum paymentStatus {
  'PROCESSING' = 'PROCESSING',
  'COMPLETE' = 'COMPLETE',
  'FAILED' = 'FAILED',
}

export const generateQrCode = async (urlToEncode: string) => {
  let url = await QRCode.toDataURL(urlToEncode);
  return url;
};

export const format2digit = (number) => {
  return Math.round(number * 100) / 100;
};
