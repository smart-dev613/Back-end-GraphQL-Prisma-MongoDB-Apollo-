import { Field, InputType, registerEnumType } from "type-graphql";

@InputType()
export class CreateQuestionInput {
  @Field()
  status: string

  @Field()
  topic: string

  @Field()
  title: string

  @Field()
  keywords: string

  @Field()
  returningAnswer: string

  @Field({ nullable: true })
  hyperlink?: string
}

@InputType()
export class CreateSupportQuestionInput {
  @Field()
  topic: string

  @Field()
  title: string

  @Field()
  keywords: string

  @Field()
  returningAnswer: string

  @Field({ nullable: true })
  hyperlink?: string
}

@InputType()
export class EditQuestionInput {
  @Field()
  questionId: string

  @Field()
  topic: string

  @Field()
  title: string

  @Field()
  keywords: string

  @Field()
  returningAnswer: string

  @Field({ nullable: true })
  hyperlink?: string
}

@InputType()
export class ApproveQuestionInput {
  @Field()
  questionId: string

  @Field()
  isSuccessful: boolean

  @Field()
  description: string

  @Field()
  topic: string
}

@InputType()
export class ApproveReplyInput {
  @Field()
  replyId: string

  @Field()
  isSuccessful: boolean

  @Field()
  description: string
}

@InputType()
export class CreateReplyInput {
    @Field()
    status: string

    @Field()
    answer: string

    @Field()
    questionId: string

    @Field({ nullable: true })
    hyperlink?: string
}

@InputType()
export class EditReplyInput {
    @Field()
    replyId: string

    @Field()
    answer: string

    @Field({ nullable: true })
    hyperlink?: string
}

@InputType()
export class CreateCategoryInput {
  @Field()
  title: string
}

@InputType()
export class EditCategoryInput {
  @Field()
  categoryId: string

  @Field()
  title: string
}

@InputType()
export class CreateRejectionResultInput {
  @Field()
  title: string

  @Field()
  description: string
}

@InputType()
export class EditRejectionResultInput {
  @Field()
  rejectionResultId: string

  @Field()
  title: string

  @Field()
  description: string
}

export enum CommunityNotificationType {
  NEW_SUPPORT_QUESTION = 'NEW_SUPPORT_QUESTION',
  NEW_SUPPORT_REPLY = 'NEW_SUPPORT_REPLY',
  NEW_HUB_QUESTION = 'NEW_HUB_QUESTION',
  NEW_HUB_REPLY = 'NEW_HUB_REPLY'
}
registerEnumType(CommunityNotificationType, {name:"CommunityNotificationType"})
