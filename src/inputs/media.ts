import { Field, InputType } from "type-graphql";

@InputType()
export class AddMediaVerticalPublisherInput {
    @Field()
    vertical: string

    @Field()
    publisherSiteId: string
}

@InputType()
export class ConvertionInput {
    @Field()
    symbol: string

    @Field()
    value: number
}