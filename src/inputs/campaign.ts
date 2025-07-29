import { Field, InputType } from "type-graphql"
import {IsOptional} from 'class-validator'

@InputType()
export class CreateCampaignInput {
    @Field()
    name: string

    @Field()
    advertiser: string

    @Field()
    brand: string
    
    @Field()
    status: number

    @Field()
    client: string

    @Field()
    currency: string

    @Field()
    budget: number

}

@InputType()
export class UpdateCampaignInput {
    @Field()
    id: string

    @Field()
    name: string

    @Field()
    advertiser: string
    
    @Field()
    brand: string

    @Field()
    status: number

    @Field()
    client: string

    @Field()
    currency: string
    
    @Field()
    budget: number
}


@InputType()
export class ArchiveOrRestoreCampaignInput {
    @Field()
    id: string
}

@InputType()
export class CreateBrandInput {
    @Field({description: "The advertiser is the company who is creating the brand for the purposes of advertising with it."})
    advertiserId: string

    @Field({description: "The client is the company who manages the brand (for example, 'Conde Nast' for Vogue)"})
    clientId: string

    @Field({description: "Name of the brand, such as 'Vogue'"})
    name: string
}