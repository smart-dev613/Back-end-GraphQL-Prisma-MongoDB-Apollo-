import { UserGender } from '@prisma/client';
import { IsEmail, Matches } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateFamilyRelationshipInput {
  @IsEmail()
  @Field()
  userEmail: string;

  @Field({ nullable: true })
  userPhone: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field({ nullable: true })
  child?: boolean;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  password?: string;

  @Field({ nullable: true })
  // @Matches('password')
  confirmPassword?: string;

  @Field({ nullable: true })
  familyRelationship?: string;

  @Field({ nullable: true })
  DOB?: Date;

  @Field({ nullable: true })
  selectedGender?: UserGender;
}

@InputType()
export class GetUsersInput {
  @Field()
  userID: string;
}
@InputType()
export class AddUserToFamilyRelationshipInput {
  @Field()
  RelationshipID: string;

  @Field()
  userId: string;

  @Field()
  userMembershipId: string;

  @Field()
  type: string;
}

@InputType()
export class FamilyRelationshipByUsersInput {
  @Field()
  requesterId: string;

  @Field()
  recipientId: string;
}

@InputType()
export class relationshipTypeUpdateInput {
  @Field()
  relid: string;

  @Field()
  type: string;
}
