import { Field, InputType } from 'type-graphql';

@InputType()
export class CompanyMarketingPreferencesObject {
  @Field()
  id: string;

  @Field({ nullable: true })
  companyAddress?: boolean;
  @Field({ nullable: true })
  companyProfiles?: boolean;
  @Field({ nullable: true })
  companyEmail?: boolean;
  @Field({ nullable: true })
  companyURL?: boolean;
  @Field({ nullable: true })
  companyCategory?: boolean;

  @Field({ nullable: true })
  employeeEmail?: boolean;
  @Field({ nullable: true })
  employeeProfiles?: boolean;
  @Field({ nullable: true })
  employeeJobTitle?: boolean;
}

@InputType()
export class EmailSubscriptionPreference {
  @Field()
  email: string;

  // At present this is a global prefence for all communications. We could extend it by splitting into separate prefernces, e.g. marketing, events, critical etc
  @Field()
  receiveAllEmails: boolean;
}

@InputType()
export class MarketingPreferencesObject {
  @Field({ nullable: true })
  receiveEmails?: boolean;
  @Field({ nullable: true })
  receiveSMS?: boolean;
  @Field({ nullable: true })
  seeAds?: boolean;

  // personal profile
  @Field({ nullable: true })
  sharePersonalEmail?: boolean;
  @Field({ nullable: true })
  sharePersonalPhone?: boolean;
  @Field({ nullable: true })
  shareDateOfBirth?: boolean;
  @Field({ nullable: true })
  shareGender?: boolean;
  @Field({ nullable: true })
  shareCity?: boolean;
  @Field({ nullable: true })
  shareCountry?: boolean;
  @Field({ nullable: true })
  sharePersonalProfile?: boolean;

  @Field((type) => [CompanyMarketingPreferencesObject], { nullable: true })
  shareCompanyData?: CompanyMarketingPreferencesObject[];

  // This can be extended further, see the type above
  @Field((type) => [EmailSubscriptionPreference], {
    nullable: true,
    description:
      'Email subscription preference. In case the user wants to opt out of receiving emails, they should set receiveAllEmails to false',
  })
  emailSubscriptionPreferences?: EmailSubscriptionPreference[];

  // employee profile
  @Field({ nullable: true })
  shareEmployeeKeywords?: boolean;
  @Field({ nullable: true })
  shareJobTitle?: boolean;

  // company profile
  @Field({ nullable: true })
  shareCompanyEmail?: boolean;
  @Field({ nullable: true })
  shareCompanyPhone?: boolean;
  @Field({ nullable: true })
  shareCompanyAddress?: boolean;
  @Field({ nullable: true })
  shareCompanyCategory?: boolean;
  @Field({ nullable: true })
  shareCompanyProfile?: boolean;
  @Field({ nullable: true })
  shareCompanyWebsite?: boolean;
}

@InputType()
export class SetMarketingPreferenceInput {
  @Field()
  companyID: string;

  @Field((type) => MarketingPreferencesObject)
  preferences: MarketingPreferencesObject;
}

@InputType()
export class GetUserMarketingPreferencesInput {
  @Field()
  companyID: string;

  @Field()
  userID: string;
}

@InputType()
export class GetUserDataForCompanyInput {
  @Field()
  crmUserID: string;
}

@InputType()
export class GetUsersDataForCompanyInput {
  @Field((type) => [String])
  crmUserIDs: string[];
}

@InputType()
export class SetupNewCompanyDomainInput {
  @Field()
  companyId: string;

  @Field()
  domain: string;
}

@InputType()
export class SetupNewCompanyEmailDomainInput {
  @Field()
  companyId: string;

  @Field()
  domain: string;
}

@InputType()
export class VerifyCompanyEmailDomainInput {
  @Field()
  companyId: string;

  @Field()
  domainId: string;
}

@InputType()
export class ArchiveCompanyEmailDomainInput {
  @Field()
  companyId: string;

  @Field()
  domainId: string;
}

@InputType()
export class archiveEmailSMSBatchInput {
  // @Field()
  // _id: string

  @Field()
  id: string;

  // @Field()
  // id_number: number

  // @Field()
  // ServiceType: string

  // @Field()
  // companyId: string
}
@InputType()
export class GetVerticalsFilterInput {
  @Field((type) => [String], { nullable: true })
  id?: string[];

  @Field((type) => [String], { nullable: true })
  vertical?: string[];

  @Field((type) => [String], { nullable: true })
  company?: string[];

  @Field((type) => [String], { nullable: true })
  device?: string[];

  @Field((type) => [String], { nullable: true })
  country?: string[];
}
