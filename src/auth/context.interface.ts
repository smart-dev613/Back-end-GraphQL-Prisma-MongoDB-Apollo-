import { User } from './user.interface';
import express from 'express';
import { company, CompanyMembership } from '@prisma/client';

export interface Context {
  user?: User;
  company?: company;
  companyMembership?: CompanyMembership;
  req?: express.Request;
  res?: express.Response;
}
