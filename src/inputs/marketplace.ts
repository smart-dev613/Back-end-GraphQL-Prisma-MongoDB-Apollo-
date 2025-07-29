import { Field, InputType, registerEnumType } from "type-graphql";

@InputType()
export class CreateArticleInput {
  @Field()
  title: string

  @Field()
  imageAddress: string

  @Field()
  price: number

  @Field()
  currency: string

  @Field()
  description: string

  @Field()
  keywords: string
}

@InputType()
export class UpdateArticleInput {
  @Field()
  articleId: string

  @Field()
  title: string

  @Field()
  imageAddress: string

  @Field()
  price: number

  @Field()
  currency: string

  @Field()
  description: string

  @Field()
  keywords: string
}

@InputType()
export class CreateCommentInput {
  @Field()
  text: string

  @Field()
  rateNumber: number

  @Field()
  articleId: string
}

@InputType()
export class CreatePreviewInput {
  @Field()
  imageAddress: string

  @Field()
  articleId: string

  @Field()
  isDesktopSize: boolean
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  FAILED = 'FAILED',
  PAID = 'PAID'
}
registerEnumType(PaymentStatus, {name:"PaymentStatus"})
