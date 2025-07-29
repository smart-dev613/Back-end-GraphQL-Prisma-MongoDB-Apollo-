import { InputType, Field, registerEnumType, Int } from "type-graphql";
import { IsOptional } from "class-validator";
import { UserGenderEnum, UserGroupNameEnum } from "../../util/interfaces/user";
import { KeywordInput } from "../resolvers/keywordsResolver";
export enum BillingDefaultType {
  DEBIT_CARD = "DEBIT_CARD",
  BANK_ACCOUNT = "BANK_ACCOUNT",
}
registerEnumType(BillingDefaultType, { name: "BillingDefaultType" });

export enum CalendarStatus {
  ARCHIVED = "ARCHIVED",
  ACTIVE = "ACTIVE",
}
registerEnumType(CalendarStatus, { name: "CalendarStatus" });

export enum CompanyRole {
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
  USER = "USER",
  MASTER_ADMIN = "MASTER_ADMIN",
}
registerEnumType(CompanyRole, { name: "CompanyRole" });

@InputType()
export class CreateGenericAddressInput {
  @Field({ nullable: true })
  @IsOptional()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  town?: string;

  @Field({ nullable: true })
  @IsOptional()
  city?: string;
  
  @Field({nullable: true})
  @IsOptional()
  state?: string

  @Field({ nullable: true })
  @IsOptional()
  country?: string;

  @Field({ nullable: true })
  @IsOptional()
  postcode?: string;
}
@InputType()
export class UpdateGenericAddressInput {
  @Field({ nullable: true })
  @IsOptional()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  town?: string;

  @Field({ nullable: true })
  @IsOptional()
  country?: string;

  @Field({ nullable: true })
  @IsOptional()
  postcode?: string;
}

// @InputType()
// export class KeywordInput {
//     @Field({nullable: true})
//     @IsOptional()
//     id: string

//     @Field({nullable: true})
//     @IsOptional()
//     slug: string

//     @Field(type => String, {nullable: true})
//     @IsOptional()
//     displayName: string[]
// }

@InputType()
export class CompanyProfileInput {
    @Field({nullable: true})
    @IsOptional()
    id?: string
    
    @Field()
    locale: string

    @Field(type => String, {nullable: true})
    @IsOptional()
    keywords?: string[]

    @Field(type => KeywordInput, {nullable: true})
    @IsOptional()
    clusterKeywords?: KeywordInput[]

    @Field({nullable: true})
    @IsOptional()
    bio?: string

    @Field(type => String, {nullable: true})
    @IsOptional()
    categorisedKeywords?: string[]
}

@InputType()
export class CreateBankAccountInput {
  @Field({ nullable: true })
  @IsOptional()
  id?: string;

  @Field()
  account_holder_name: string;

  @Field()
  account_holder_type: string;

  @Field({ nullable: true })
  @IsOptional()
  routing_number: string;

  @Field({ nullable: true })
  @IsOptional()
  sort_bsb_number: string;

  @Field()
  account_number: string;

  @Field({ nullable: true })
  @IsOptional()
  iban: string;

  @Field({ nullable: true })
  @IsOptional()
  country: string;

  @Field({ nullable: true })
  @IsOptional()
  currency: string;

  // @Field()
  // counterparty_id : string

  // @Field()
  // counterparty_account_id :  string
}

@InputType()
export class CreateCompanyInput {
  @Field()
  name: string;

  @Field()
  type: number;

  @Field({ nullable: true })
  @IsOptional()
  url: string;

  @Field({ nullable: true })
  @IsOptional()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  companyaddress?: CreateGenericAddressInput;

  @Field({ nullable: true })
  @IsOptional()
  regNumber: string;

  @Field({ nullable: true })
  @IsOptional()
  taxNumber: string;
}

@InputType()
export class UpdateCompanyInput {
  @Field()
  name?: string;

  @Field()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  logoURL?: string;

  @Field({ nullable: true })
  @IsOptional()
  url?: string;

  @Field({ nullable: true })
  @IsOptional()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  address?: CreateGenericAddressInput;

  @Field({ nullable: true })
  @IsOptional()
  info?: string;

  @Field({ nullable: true })
  @IsOptional()
  regNum?: string;

  @Field({ nullable: true })
  @IsOptional()
  vatNum?: string;

  @Field((type) => CompanyProfileInput, { nullable: true })
  @IsOptional()
  profiles: CompanyProfileInput[];

  @Field((type) => CreateBankAccountInput, { nullable: true })
  @IsOptional()
  bankAccount: CreateBankAccountInput;

  @Field({ nullable: true })
  @IsOptional()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  landline?: string;

  @Field({ nullable: true })
  @IsOptional()
  currency?: string;

  @Field({ nullable: true })
  @IsOptional()
  business_type?: string;

  @Field({ nullable: true })
  @IsOptional()
  representativeContact?: string;

  @Field((type) => BillingDefaultType, { nullable: true })
  @IsOptional()
  billingDefaultType?: BillingDefaultType;

  @Field({ description: "The company IP Address", nullable: true })
  ipAddress?: string;
}
@InputType()
export class UpdateCompanyAccessToMarketingInput {
  @Field((type) => [String])
  companyMembershipIds: string[];
}

@InputType()
export class AddEmployeeInput {
  @Field()
  companyID: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field({ description: "Personal email of the user if available" })
  personalEmail: string;

  @Field()
  corporateEmail: string;

  @Field({
    nullable: true,
    description: "Personal phone of the user. Mandatory",
  })
  phone: string;

  @Field({ nullable: true, description: "work phone of the user if available" })
  workPhone: string;

  @Field((type) => UserGroupNameEnum)
  role: UserGroupNameEnum;

  @Field({ nullable: true })
  @IsOptional()
  gender: string;

  @Field({ nullable: true })
  @IsOptional()
  jobTitle: string;

  @Field({ nullable: true })
  @IsOptional()
  department: string;

  @Field({ nullable: true })
  @IsOptional()
  salaryRange: string;

  @Field({ nullable: true })
  @IsOptional()
  startDate: Date;
}

@InputType()
export class ArchiveEmployeeInput {
  @Field()
  employeeID: string;
}

@InputType()
export class GetEmployeeInput {
  @Field()
  employeeID: string;
}

@InputType()
export class UpdateUserProfileInput {
    
    @Field({nullable:true})
    @IsOptional()
    userId: string

    @Field({nullable:true})
    @IsOptional()
    firstName: string
    
    @Field({nullable:true})
    @IsOptional()
    lastName: string
    
    @Field({nullable:true})
    @IsOptional()
    dob: Date

    @Field({nullable:true})
    @IsOptional()
    gender: UserGenderEnum
  
    @Field({nullable:true})
    @IsOptional()
    avatar: string

    @Field({nullable:true})
    @IsOptional()
    createdAt: string

    @Field({ nullable: true })
    @IsOptional()
    address?: CreateGenericAddressInput

    @Field({nullable:true})
    @IsOptional()
    facebook: string

    @Field({nullable:true})
    @IsOptional()
    instagram: string

    @Field({nullable:true})
    @IsOptional()
    linkedIn: string

    @Field({nullable:true})
    @IsOptional()
    qq: string

    @Field({nullable:true})
    @IsOptional()
    skype: string

    @Field({nullable:true})
    @IsOptional()
    twitter: string

    @Field({nullable:true})
    @IsOptional()
    weChat: string

    @Field({nullable:true})
    @IsOptional()
    weibo: string

    @Field({nullable:true})
    @IsOptional()
    socialLine: string

    @Field({nullable: true})
    @IsOptional()
    passportNumber: string

    @Field({nullable: true})
    @IsOptional()
    nationalSecurityNumber: string

    @Field({nullable: true})
    @IsOptional()
    deliveryAddress?: CreateGenericAddressInput

    @Field({nullable: true})
    @IsOptional()
    secondaryProfilePic?: string

    @Field(type => CompanyProfileInput, { nullable: true })
    @IsOptional()
    profiles?: CompanyProfileInput[]
        
    @Field({nullable: true})
    walkthroughStep?: number
    
    @Field({nullable: true})
    doNotShowWalkthrough?: boolean
}


@InputType()
export class updateUserWalkthroughInput {
  @Field({ nullable: true })
  walkthroughStep?: number;

  @Field({ nullable: true })
  doNotShowWalkthrough?: boolean;
}

@InputType()
export class UpdateChildProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  userId: string;

  @Field({ nullable: true })
  @IsOptional()
  firstName: string;

  @Field({ nullable: true })
  @IsOptional()
  lastName: string;

  @Field({ nullable: true })
  @IsOptional()
  dob: Date;

  @Field({ nullable: true })
  @IsOptional()
  gender: UserGenderEnum;

  @Field({ nullable: true })
  @IsOptional()
  avatar: string;

  @Field({ nullable: true })
  @IsOptional()
  phone: string;

  @Field((type) => CompanyProfileInput, { nullable: true })
  @IsOptional()
  profiles?: CompanyProfileInput[];
}

@InputType()
export class GetEmployeesInput {
  @Field()
  companyID: string;
  
  @Field({ nullable: true})
  @IsOptional()
  employeeID: string;
}
@InputType()
export class GetAllCustomersInput {
  @Field()
  companyID: string;
}

@InputType()
export class GetEmployeesEventInput {
  @Field()
  eventID: string;
}

@InputType()
export class CompanyUniqueInput {
  @Field((type) => Int)
  _id: number;

  @Field()
  id: string;
}

@InputType()
export class SwitchCompanyInput {

  @Field()
  id: string;
  // eventID is optional to allow switching without an event context
  @Field({nullable: true})
  @IsOptional()
  eventID: string;
}
@InputType()
export class UpdateEmployeeInput {
  @Field()
  employeeID: string;

  @Field({ nullable: true })
  @IsOptional()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  jobTitle: string;

  @Field({ nullable: true })
  @IsOptional()
  phone: string;

  @Field((type) => UserGroupNameEnum)
  role: UserGroupNameEnum;

  @Field({ nullable: true })
  @IsOptional()
  avatar: string;

  @Field({ nullable: true })
  @IsOptional()
  department: string;

  @Field({ nullable: true })
  @IsOptional()
  landline: string;

  @Field((type) => CompanyProfileInput, { nullable: true })
  @IsOptional()
  profiles?: CompanyProfileInput[];

  @Field({ nullable: true })
  @IsOptional()
  salaryRange: string;

  @Field({ nullable: true })
  startDate: Date;
}

@InputType()
export class UpdatePasswordInput {
  @Field()
  token: string;

  @Field()
  newPassword: string;
}

@InputType()
export class CreateCompanyRelationshipInput {
  @Field()
  companyEmail: string;

  @Field()
  companyPhone: string;

  @Field()
  primaryCompany: string;

  @Field({ nullable: true })
  companyId?: string;
}

@InputType()
export class ConfirmCompanyRelationshipInput {
  @Field()
  companyRelationshipID: string;

  @Field()
  companyId: string;
}

@InputType()
export class AddUserToCompanyRelationshipInput {
  @Field()
  companyRelationshipID: string;

  @Field()
  companyId: string;

  @Field()
  companyMembershipId: string;
}

@InputType()
export class GetS3POSTUploadTokenInput {
    @Field()
    key: string
    
    @Field({nullable:true})
    @IsOptional()
    eventId: string

    @Field({nullable:true})
    @IsOptional()
    companyId: string

    @Field({nullable: true})
    @IsOptional()
    campaignID?: string
    
    @Field({nullable: true})
    @IsOptional()
    projectID?: string
    
    @Field({nullable: true})
    @IsOptional()
    formatSize?: string
    
    @Field({nullable: true})
    @IsOptional()
    formatName?: string
    
    @Field({nullable: true, description: "The format and size of the image. Example: standard-200x500", defaultValue: "standard"})
    @IsOptional()
    // example: standard-200x500
    formatSizeName?: string
}


@InputType()
export class CalendarInvitationListInput {
  @Field((type) => [String])
  memIds: string[];
}

@InputType()
export class CreateCalendarInvitationInput {
  @Field((type) => [String])
  memIds: string[];

  @Field({ nullable: true, description: "Name of the event" })
  name?: string;

  @Field({ nullable: true, description: "Public description of the event" })
  description?: string;

  @Field({ nullable: true, description: "Datetime this event will start" })
  startAt?: Date;

  @Field({ nullable: true, description: "Datetime this event will end" })
  endAt?: Date;
}

@InputType()
export class EditCalendarInvitationInput {
  @Field()
  invitationId: string;

  @Field((type) => [String])
  memIds: string[];

  @Field({ nullable: true, description: "Name of the event" })
  name?: string;

  @Field({ nullable: true, description: "Public description of the event" })
  description?: string;

  @Field({ nullable: true, description: "Datetime this event will start" })
  startAt?: Date;

  @Field({ nullable: true, description: "Datetime this event will end" })
  endAt?: Date;
}

@InputType()
export class RemoveCalendarInvitationInput {
  @Field()
  invitationId: string;
}

@InputType()
export class UpdateMembershipRole {
  @Field()
  memId: string;

  @Field((type) => CompanyRole)
  role: CompanyRole;
}

@InputType()
export class CheckUserInput {
  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;
}
