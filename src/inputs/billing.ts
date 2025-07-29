import { IsOptional } from "class-validator";
import Stripe from "stripe";
import { Field, InputType, registerEnumType } from "type-graphql";
import { BillingDefaultType, CreateBankAccountInput } from "./company";

export enum PromoValueUnit {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
}
registerEnumType(PromoValueUnit, { name: "PromoValueUnit" });

@InputType()
export class TransactionPaginationInput {
  @Field()
  companyId: string;

  @Field()
  offset?: number;

  @Field()
  limit?: number;
}

@InputType()
export class PaymentCardAddressInput {
  @Field({ nullable: true })
  line1?: string;

  @Field({ nullable: true })
  line2?: string;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  postcode?: string;
}

@InputType()
export class CreatePaymentCardInput {
  @Field({ description: "The company to add this card to" })
  companyID: string;

  @Field({ description: "The name of the card holder" })
  holder: string;

  @Field({ description: "The currency for this card" })
  currency: string;

  @Field({ description: "Billing address for the card" })
  address: PaymentCardAddressInput;

  @Field({ description: "The Stripe payment method ID" })
  paymentMethodId: string;
}

@InputType()
export class UpdateCompanyBillingInfoInput {
  @Field()
  companyId: string;

  @Field()
  email: string;

  @Field()
  phone: string;

  @Field()
  currency: string;

  @Field({ nullable: true })
  masterContactId: string;

  @Field({ nullable: true })
  billingContactId: string;

  @Field((type) => CreateBankAccountInput, { nullable: true })
  @IsOptional()
  bankAccount: CreateBankAccountInput;

  @Field({ nullable: true })
  @IsOptional()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  billingPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  business_type?: string;

  @Field({ nullable: true })
  @IsOptional()
  representativeContact?: string;

  @Field((type) => BillingDefaultType, { nullable: true })
  @IsOptional()
  billingDefaultType?: BillingDefaultType;
}

@InputType()
export class StartTopupTransactionInput {
  @Field()
  companyId: string;

  @Field()
  serviceId: string;

  @Field()
  quantity: number;

  @Field()
  cardStripeId: string;

  @Field({ nullable: true })
  couponId?: string;
}

@InputType()
export class GetMyPricingInfoForServiceInput {
  @Field()
  companyId: string;

  @Field()
  serviceId: string;

  @Field()
  quantity: number;
}

@InputType()
export class CreateCompanySubscriptionInput {
  @Field()
  companyId: string;

  @Field((type) => [String])
  items: string[];

  @Field()
  stripePaymentMethodId: string;

  @Field({ nullable: true })
  coupon?: string;
}

@InputType()
export class GetInternalProductInfoForCompanyInput {
  @Field()
  companyId: string;

  @Field()
  databaseId: string;
}

@InputType()
export class RedeemCouponInput {
  @Field()
  companyId: string;

  @Field()
  promoCode: string;
}

@InputType()
export class GetBalancesInput {
  @Field()
  companyId: string;

  @Field({ nullable: true })
  service?: string;

  @Field({ nullable: true })
  amountRequired?: string;
}
@InputType()
export class GetNewBalancesInput {

    @Field({nullable: true})
    companyId?: string
    
    @Field({nullable: true})
    company_Id?: number

    @Field({nullable: true})
    service?: string

    @Field({nullable: true})
    amountRequired?: string
}
@InputType()
export class CreateConnectAccount {
  @Field({ description: "The company to add this card to" })
  companyID: string;

  @Field({ description: "The company IP Address" })
  ipAddress: string;

  @Field({ description: "The company date input" })
  date: number;
}

@InputType()
export class DelConnectAccount {
  @Field({ description: "The company to add this card to" })
  companyID: string;

  @Field({ description: "The company connect account id" })
  stripeAccountId: string;
}

@InputType()
export class CreateBillingCouponInput {
  @Field()
  name: string;

  @Field((type) => [String], { nullable: true })
  companyID?: string[] | null;
  
  @Field()
  value: number;

  @Field((type) => PromoValueUnit)
  unit: PromoValueUnit;

  @Field()
  promoCode: string;

  @Field()
  oneUsePerCompany: boolean;

  @Field()
  oneUsePerUser: boolean;

  @Field()
  startDate: number;

  @Field({ nullable: true })
  endDate: number;

  @Field({ nullable: true })
  maximumUses: number;
}
