import { InputType, Field, registerEnumType, Int } from 'type-graphql';
import { IsPhoneNumber, IsEmail, Max } from 'class-validator';
import { CreateGenericAddressInput } from './company';
import { UserGender } from '@prisma/client';

@InputType()
export class SignupInput {
  @Field()
  firstName: string;
  @Field()
  lastName: string;

  // Allow user to sign up without password
  @Field({ description: 'brypted password', nullable: true })
  password?: string;

  @IsEmail()
  @Field()
  email: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  companyName?: string;

  @Field({ nullable: true })
  relationshipCreatorCurrency?: string;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  jobTitle?: string;

  @Field({ nullable: true })
  gender?: UserGender;

  @Field({ nullable: true })
  dob?: Date;

  @Field({ nullable: true })
  address?: CreateGenericAddressInput;

  @Field({ nullable: true, description: 'Used for CRM - stringified JSON' })
  otherData?: string;

  @Field({ nullable: true })
  isChild?: boolean;

  // A non-exposed field _id for internal functions to override _id of the company (e.g. in case of creating a company with a specific _id, Synkd 11)
  overrideCompanyID?: string;

  // Override for company type
  overrideType?: number;

  // Override for company type
  canDoRotationalTags?: boolean;

  // Override for company type
  overrideLimit?: number;
}

export enum VerificationType {
  PHONE,
  EMAIL,
}

registerEnumType(VerificationType, { name: 'VerificationType' });

@InputType()
export class UserVerification {
  @Field()
  userID: string;

  @Field((type) => VerificationType)
  verificationType: VerificationType;

  @Field()
  sendCode: boolean = false;

  @Field()
  verificationCode: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  password: string;
}

@InputType()
export class UpdateUserEmailInput {
  @Field({ nullable: true })
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  challengeId?: string;

  @Field({ nullable: true })
  code?: string;
}

@InputType()
export class UpdateUserPhoneInput {
  @Field({ nullable: true })
  phone: string;

  @Field({ nullable: true })
  challengeId?: string;

  @Field({ nullable: true })
  code?: string;
}

@InputType()
export class UpdateCompanyLimit {
  @Field({ nullable: true })
  userID: string;

  @Field({ nullable: true })
  email: string;

  @Field((type) => Int)
  companyLimit: number;
}
@InputType()
export class UserEmailInput {
  @Field({ nullable: true })
  @IsEmail()
  email: string;
  
  @Field({ nullable: true })
  phone: string;
}
