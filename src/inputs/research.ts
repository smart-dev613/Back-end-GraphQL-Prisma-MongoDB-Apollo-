import { Field, InputType, registerEnumType } from "type-graphql";

export enum ResearchStatus {
    DRAFT = "DRAFT",
    LIVE = "LIVE",
    ARCHIVED = "ARCHIVED",
}
registerEnumType(ResearchStatus, {name:"ResearchStatus"})

@InputType()
export class CreateResearchInput {
    @Field()
    campaign: string

    @Field()
    language: string
    
    @Field()
    name: string

    @Field()
    status: number // ResearchStatus

    @Field()
    canvasId:string

    @Field(type => [CreateResearchQuestionInput])
    questions?: CreateResearchQuestionInput[]
}

@InputType()
export class UpdateResearchInput {
    @Field()
    researchId: string
    
    @Field()
    canvasId: string

    @Field()
    campaign: string

    @Field()
    language: string
    
    @Field()
    name: string

    @Field()
    status: number // ResearchStatus

    @Field(type => [String])
    questions?: string[]
}

@InputType()
export class CreateResearchQuestionInput {
    @Field()
    active: boolean

    @Field()
    answerRequired: boolean

    @Field({nullable: true})
    goToQuestionId: string

    @Field()
    order: number

    @Field()
    question: string

    @Field()
    randomiseAnswers: boolean

    @Field()
    shortCaption: string

    @Field()
    textAreaHeight: number

    @Field()
    type: string

    @Field(type => [CreateResearchAnswerInput])
    answers?: CreateResearchAnswerInput[]
}

@InputType()
export class UpdateResearchQuestionInput {
    @Field({nullable: true})
    questionId: string

    @Field({nullable: true})
    canvasId: string

    @Field()
    active: boolean

    @Field()
    answerRequired: boolean

    @Field()
    goToQuestionId: string

    @Field()
    order: number

    @Field()
    question: string

    @Field()
    randomiseAnswers: boolean

    @Field()
    shortCaption: string

    @Field()
    textAreaHeight: number

    @Field()
    type: string

    @Field(type => [String])
    answers?: string[]
}

@InputType()
export class CreateResearchAnswerInput {
    @Field()
    answer: string

    @Field()
    shortCaption: string

    @Field()
    order: number

    @Field({nullable: true})
    goToQuestionId: string

    @Field()
    isCorrect: boolean
}

@InputType()
export class UpdateResearchAnswerInput {
    @Field({nullable: true})
    answerId: string

    @Field({nullable: true})
    canvasId: string

    @Field()
    answer: string

    @Field()
    shortCaption: string

    @Field()
    order: number

    @Field()
    goToQuestionId: string

    @Field()
    isCorrect: boolean
}