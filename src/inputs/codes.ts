import { InputType, Field } from 'type-graphql';

@InputType()
export class QRCodeForCampaignInput {
  @Field({ nullable: true })
  campaignId: string;

  @Field({ nullable: true })
  legacyCampaignId: string;
}
