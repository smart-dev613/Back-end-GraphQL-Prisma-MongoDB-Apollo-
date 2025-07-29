import { Field, InputType } from 'type-graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class CreateStudioProjectInput {
  @Field()
  campaign: string;

  @Field()
  title: string;

  @Field()
  type: number;

  @Field({ nullable: true })
  content: string;

  @Field({ nullable: true })
  html: string;

  @Field({ nullable: true })
  comments: string;

  @Field({ nullable: true })
  size: string;

  @Field({ nullable: true })
  crossDeviceURL: string;

  @Field({ nullable: true })
  smartphoneProjectID: string;

  @Field({ nullable: true })
  tabletProjectID: string;

  @Field({ nullable: true })
  desktopProjectID: string;
}
@InputType()
export class UpdateStudioProjectInput {
  @Field()
  campaign: string;

  @Field()
  title: string;

  @Field()
  type: string;

  @Field({ nullable: true })
  content: string;

  @Field({ nullable: true })
  html: string;

  @Field({ nullable: true })
  comments: string;

  @Field({ nullable: true })
  size: string;

  @Field({ nullable: true })
  crossDeviceURL: string;

  @Field({ nullable: true })
  smartphoneProjectID: string;

  @Field({ nullable: true })
  tabletProjectID: string;

  @Field({ nullable: true })
  desktopProjectID: string;
}

@InputType()
export class CreateStudioTemplateInput {
    @Field()
    name: string
    
    @Field(type => String, {nullable: true})
    variation: string
    
    @Field()
    projectId: string
    
    
    @Field(type => String, {nullable: true})
    price?: string
    
    @Field(type => String, {nullable: true})
    projectType?: string
    
    @Field(type => String, {nullable: true})
    campaign?: string
    
    @Field(type => String, {nullable: true})
    format?: string
    
    @Field(type => String, {nullable: true})
    assets?: string
     
    @Field(type => String, {nullable: true})
    size?: string    

    @Field({nullable: true})
    isPublished?: boolean

    @Field({nullable: true})
    description: string

    @Field()
    content: string
    

    @Field(type => String, {nullable: true})
    keywords?: string[]
    
    @Field(type => String, {nullable: true})
    thumbnails?: string[]
    
    @Field(type => String, {nullable: true})
    html?: string[]
}


@InputType()
export class UpdateStudioTemplateInput {
    @Field()
    id: string
    
    @Field()
    name: string
    
    @Field(type => String, {nullable: true})
    thumbnails?: string[]

    
    @Field(type => String, {nullable: true})
    price?: string
    
    @Field(type => String, {nullable: true})
    projectType?: string
    
    @Field(type => String, {nullable: true})
    campaign?: string
    
    @Field(type => String, {nullable: true})
    format?: string
    
    @Field(type => String, {nullable: true})
    assets?: string
     
    @Field(type => String, {nullable: true})
    size?: string    

    @Field({nullable: true})
    isPublished?: boolean

    @Field({nullable: true})
    description: string

    @Field()
    content: string

    @Field(type => String, {nullable: true})
    keywords?: string[]
    
    @Field(type => String, {nullable: true})
    html?: string[]
    
    @Field(type => String, {nullable: true})
    variation?: string
}

@InputType()
export class StudioProjectForCampaignInput {
  @Field({ nullable: true })
  campaignId: string;

  @Field({ nullable: true })
  legacyCampaignId: string;
}
