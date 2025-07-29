import { Field, InputType, registerEnumType } from "type-graphql"

/**********/

export enum AccessTypesEnum {
    NO_ACCESS = 0,
    VIEW_ONLY = 1,
    VIEW_AND_EDIT = 2,
    EDIT_AND_ARCHIVE = 3
}

registerEnumType(AccessTypesEnum, {name: "AccessTypesEnum"})

export enum ChannelScopesEnum {
    CAMPAIGN = "CAMPAIGN",
    CLUSTER = "CLUSTER",
    FLIGHT = "FLIGHT",
    CODE = "CODE",
    MAILING = "MAILING",
    RESEARCH = "RESEARCH",
    STUDIO = "STUDIO"
}

registerEnumType(ChannelScopesEnum, {name: "ChannelScopesEnum"})

export enum RelationshipPermissionsType {
    CAMPAIGN = "CAMPAIGN"
}

registerEnumType(RelationshipPermissionsType, {name: "RelationshipPermissionsType"})

@InputType()
export class PermissionsObject {
    /**
     * Products
     */
    @Field(type => AccessTypesEnum, {nullable: true})
    community?: AccessTypesEnum // community.synkd.life

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing?: AccessTypesEnum // marketing.synkd.life

    @Field(type => AccessTypesEnum, {nullable: true})
    events?: AccessTypesEnum

    /**
     * MSL
     */
    @Field(type => AccessTypesEnum, {nullable: true})
    msl_companyProfile?: AccessTypesEnum // company profile page

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_companyEmployees?: AccessTypesEnum // company employee (HR) page

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_companyPermissions?: AccessTypesEnum // company permissions page

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_companyRelationships?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_companyRelationshipsEmployees?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_employeeProfile?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_employeeMeetings?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_companyBilling?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_companyBillingCards?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_companyBillingWithdraw?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    msl_companyBillingTransactions?: AccessTypesEnum

    /**
     * Marketing
     */
    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_campaigns?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_media?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_mediaSubmitApproval?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_mediaApproveFlight?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_mediaPauseFlight?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_codes?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_codesTargeting?: AccessTypesEnum
    
    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_customers?: AccessTypesEnum
    
    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_customersUpload?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_customersClusters?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_customersRules?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_mailing?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_events?: AccessTypesEnum
    
    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_strategy?: AccessTypesEnum
    
    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_research?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_studio?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_studioOpenProject?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_reporting?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_admin?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_adminSites?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_adminBrands?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_adminZones?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_adminPublisherProfile?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_adminClientRates?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_adminDeliveries?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_adminPackages?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_adminTransactions?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    marketing_adminTopups?: AccessTypesEnum

    /**
     * Events
     */
    @Field(type => AccessTypesEnum, {nullable: true})
    events_admin?: AccessTypesEnum

    /**
     * Community
     */
    @Field(type => AccessTypesEnum, {nullable: true})
    community_marketplace?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    community_boards?: AccessTypesEnum

    /**
     * Studio
     */
    @Field(type => AccessTypesEnum, {nullable: true})
    studio_publish?: AccessTypesEnum

    @Field(type => AccessTypesEnum, {nullable: true})
    studio_marketplace?: AccessTypesEnum
}

@InputType()
export class SetEmployeePermissionsInput {
    @Field()
    employeeId: string
    
    @Field()
    permissions: PermissionsObject
}

@InputType()
export class SetGroupPermissionsInput {
    @Field()
    groupId: string
    
    @Field()
    permissions: PermissionsObject
}

@InputType()
export class SetChannelPermissionInput {
    @Field()
    employeeId: string

    @Field(type => ChannelScopesEnum)
    scope: ChannelScopesEnum

    @Field({nullable: true})
    campaignId: string
    
    @Field({nullable: true})
    clusterId?: string

    @Field({nullable: true})
    itemId?: string

    @Field()
    access: boolean
}

@InputType()
export class GetRelationshipPermissionInput {
    @Field()
    companyId: string

    @Field()
    relationshipId: string
}

@InputType()
export class CreateRelationshipPermissionInput {
    @Field()
    companyId: string

    @Field()
    relationshipId: string

    @Field(type => RelationshipPermissionsType)
    type: RelationshipPermissionsType

    @Field()
    campaignId: string
}

@InputType()
export class DeleteRelationshipPermissionInput {
    @Field()
    companyId: string

    @Field()
    relationshipPermissionId: string
}