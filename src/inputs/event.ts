import {
  InputType,
  Field,
  registerEnumType,
  ObjectType,
  Int,
  Float,
} from 'type-graphql';

export enum EventVenueType {
  GENERIC = 'GENERIC',
  ROOM = 'ROOM',
  HALL = 'HALL',
  SEAT = 'SEAT',
  TABLE = 'TABLE',
  SLOT = 'SLOT',
  COURT = 'COURT',
  BERTH = 'BERTH',
  THEATRE = 'THEATRE',
  PITCH = 'PITCH',
  ONLINE = 'ONLINE'
}
registerEnumType(EventVenueType, { name: 'EventVenueType' });

export enum EventType {
  PLATFORM_EVENT = 'PLATFORM_EVENT',
  PLATFORM_EVENT_SLOT = 'PLATFORM_EVENT_SLOT',
  PLATFORM_EVENT_PRICING_SLOT = 'PLATFORM_EVENT_PRICING_SLOT',
  CALENDAR_EVENT = 'CALENDAR_EVENT',
  // more PlatformEventType
  REGULAR = 'REGULAR',
  TRADE = 'TRADE',
  RESTAURANT = 'RESTAURANT',
  SALON = 'SALON',
  MEETINGROOMS = 'MEETINGROOMS',
  GATHERING = 'GATHERING',
  EXHIBITION = 'EXHIBITION',
  BIRTHDAY = 'BIRTHDAY',
  MECHANIC = 'MECHANIC',
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  CINEMA = 'CINEMA',
  MUSEUM = 'MUSEUM',
  CONFERENCES = 'CONFERENCES',
  WEDDINGS = 'WEDDINGS',
  TENNIS = 'TENNIS',
  BASKETBALL = 'BASKETBALL',
  FOOTBALL = 'FOOTBALL',
  SQUASH = 'SQUASH',
  GARAGE = 'GARAGE',
  RUGBY = 'RUGBY',
  AFL = 'AFL',
  SPORT = 'SPORT',
  NFL = 'NFL',
  SURGERY = 'SURGERY',
  DENTIST = 'DENTIST',
}
registerEnumType(EventType, { name: 'EventType' });

export enum PlatformEventType {
  REGULAR = 'REGULAR',
  TRADE = 'TRADE',
  RESTAURANT = 'RESTAURANT',
  SALON = 'SALON',
  MEETINGROOMS = 'MEETINGROOMS',
  GATHERING = 'GATHERING',
  EXHIBITION = 'EXHIBITION',
  BIRTHDAY = 'BIRTHDAY',
  MECHANIC = 'MECHANIC',
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  CINEMA = 'CINEMA',
  MUSEUM = 'MUSEUM',
  CONFERENCES = 'CONFERENCES',
  WEDDINGS = 'WEDDINGS',
  TENNIS = 'TENNIS',
  BASKETBALL = 'BASKETBALL',
  FOOTBALL = 'FOOTBALL',
  SQUASH = 'SQUASH',
  GARAGE = 'GARAGE',
  RUGBY = 'RUGBY',
  AFL = 'AFL',
  SPORT = 'SPORT',
  NFL = 'NFL',
  SURGERY = 'SURGERY',
  DENTIST = 'DENTIST',
}
registerEnumType(PlatformEventType, { name: 'PlatformEventType' });

export enum InvitationStatus {
  AWAITING = 'AWAITING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  ARCHIVED = 'ARCHIVED',
}
registerEnumType(InvitationStatus, { name: 'InvitationStatus' });

export enum NotificationStatus {
  READ = 'READ',
  UNREAD = 'UNREAD',
  ARCHIVED = 'ARCHIVED',
}
registerEnumType(NotificationStatus, { name: 'NotificationStatus' });

export enum PlatformEventLanguage {
  ENGLISH = 'ENGLISH',
  CHINESE = 'CHINESE',
  FRENCH = 'FRENCH',
}
registerEnumType(PlatformEventLanguage, { name: 'PlatformEventLanguage' });

export enum PlatformEventMenuPage {
  HOME = 'HOME',
  CALENDAR = 'CALENDAR',
  CONTENT = 'CONTENT',
  CONTENT_CUSTOM = 'CONTENT_CUSTOM',
  COMPANIES = 'COMPANIES',
  ATTENDEES = 'ATTENDEES',
  CONTENT_PRICING = 'CONTENT_PRICING',
  CLUSTER = 'CLUSTER',
}
registerEnumType(PlatformEventMenuPage, { name: 'PlatformEventMenuPage' });

export enum PricingContentType {
  SINGLE = 'SINGLE',
  MULTIPLE = 'MULTIPLE',
}
registerEnumType(PricingContentType, { name: 'PricingContentType' });

export enum EventAttendeeDataPreferenceType {
  PROFILE_PICTURE = 'PROFILE_PICTURE',
  NAME = 'NAME',
  PROFILE = 'PROFILE',
  KEYWORDS = 'KEYWORDS',
  WEBSITE = 'WEBSITE',
  EMAIL = 'EMAIL',
  MOBILE = 'MOBILE',
  GENDER = 'GENDER',
  DATE_OF_BIRTH = 'DATE_OF_BIRTH',
  ADDRESS = 'ADDRESS',
  ZIPCODE = 'ZIPCODE',
  COUNTRY = 'COUNTRY',
  RATING = 'RATING',
}
registerEnumType(EventAttendeeDataPreferenceType, {
  name: 'EventAttendeeDataPreferenceType',
});

export enum EventCompanyDataPreferenceType {
  LOGO = 'LOGO',
  NAME = 'NAME',
  PROFILE = 'PROFILE',
  KEYWORDS = 'KEYWORDS',
  IMAGES = 'IMAGES',
  WEBSITE = 'WEBSITE',
  EMAIL = 'EMAIL',
  LANDLINE = 'LANDLINE',
  CATEGORY = 'CATEGORY',
  ADDRESS = 'ADDRESS',
  ZIPCODE = 'ZIPCODE',
  COUNTRY = 'COUNTRY',
  RATING = 'RATING',
}
registerEnumType(EventCompanyDataPreferenceType, {
  name: 'EventCompanyDataPreferenceType',
});

@InputType()
export class PlatformEventThemeInput {
  @Field({ nullable: true, description: "URL to the event's logo" })
  logoURL?: string;

  @Field({
    nullable: true,
    description: 'The primary hex colour to use on the platform',
  })
  primaryColour?: string;

  @Field({
    nullable: true,
    description: 'The primary hex text colour to use on the platform',
  })
  primaryTextColour?: string;

  @Field({
    nullable: true,
    description: 'The secondary hex colour to use on the platform',
  })
  secondaryColour?: string;
  @Field({
    nullable: true,
    description: 'The secondary calendar hex colour to use on the platform',
  })
  calendarSecondaryColour?: string;
  @Field({
    nullable: true,
    description: 'The primary calendar hex caln colour to use on the platform',
  })
  calendarPrimaryColour?: string;

  @Field({
    nullable: true,
    description: 'The secondary hex text colour to use on the platform',
  })
  secondaryTextColour?: string;
}

@InputType()
export class ContentLinkInput {
  @Field({ description: 'Content link name' })
  name: string;

  @Field({ description: 'Content link' })
  link: string;
}

@InputType()
export class PlatformEventMenuSettings {
  @Field({ nullable: false, description: 'Label shown on the menu' })
  label: string;

  @Field((type) => PlatformEventMenuPage, {
    nullable: false,
    description: 'Menu type',
  })
  type: PlatformEventMenuPage;

  @Field({ nullable: true, description: 'Menu type' })
  parameter?: string;

  @Field({ nullable: true, description: 'Menu link' })
  link?: string;

  @Field({ nullable: true, description: 'Is menu shown' })
  show?: boolean;

  @Field({ nullable: true, description: 'Is menu shown to all' })
  showToAll?: boolean

  @Field({ nullable: true, description: 'Is menu public' })
  isPublic?: boolean;

  @Field({ nullable: true, description: 'Is menu for admin only' })
  adminOnly?: boolean;

  @Field((type) => [String], {
    nullable: true,
    description: 'Is menu visible to user',
  })
  userVisible?: string[];

  @Field((type) => [String], {
    nullable: true,
    description: 'Is user an admin',
  })
  userAdmin?: string[];
}

@InputType()
export class CreateEventInput {
  @Field({ description: 'Name of the event' })
  name: string;

  @Field({ nullable: true, description: 'Public description of the event' })
  description?: string;

  @Field((type) => EventType, { description: 'The type of Event this is' })
  eventType: EventType;

  @Field({ nullable: true, description: 'Datetime this event will start' })
  startAt?: Date;

  @Field({ nullable: true, description: 'Datetime this event will end' })
  endAt?: Date;

  @Field((type) => PlatformEventType, {
    nullable: true,
    description:
      'If this is a platform event, this is what type of platform event it is',
  })
  platformEventType?: PlatformEventType;

  @Field({ nullable: true, description: 'Platform event theme, if any' })
  platformEventTheme?: PlatformEventThemeInput;

  @Field({ nullable: true, description: 'Event location' })
  location?: string;

  @Field({ nullable: true, description: 'Event slug' })
  slug?: string;

  @Field({ nullable: true, description: 'Coordinates of the event' })
  geo?: string;

  @Field({
    nullable: true,
    description: 'venueID - only in case of platformEventSlot',
  })
  venueID?: string;

  @Field({
    nullable: true,
    description: 'eventID - only in case of platformEventPricingSlot',
  })
  eventID?: string;

  @Field({
    nullable: true,
    description: 'cartID - only in case of platformEventPricingSlot',
  })
  cartID?: string;

  @Field({
    nullable: true,
    description: 'contentID - only in case of platformEventPricingSlot',
  })
  contentID?: string;

  @Field({
    nullable: true,
    description: 'pricingID - only in case of platformEventPricingSlot',
  })
  pricingID?: string;

  @Field((type) => [String!]!, {
    nullable: true,
    description: 'ivitee companyMembershipIDs (if known)',
  })
  invitees?: string[];

  @Field((type) => Int, {
    nullable: true,
    description: 'Number of spaces to create by default',
  })
  spaces?: number;

  @Field((type) => Int, {
    nullable: true,
    description: 'Number of slots in each space by default',
  })
  slots?: number;

  @Field({ nullable: true, description: 'Event timezone' })
  timezone?: string;

  @Field({ nullable: true, description: 'Event timezone location' })
  timezoneLocation?: string;

  @Field((type) => PlatformEventLanguage, {
    nullable: true,
    description: 'Event language',
  })
  language?: PlatformEventLanguage;

  @Field((type) => PlatformEventMenuSettings, {
    nullable: true,
    description: 'Event Menus',
  })
  menus?: PlatformEventMenuSettings;

  @Field((type) => [PlatformEventMenuPage], {
    nullable: true,
    description: 'Event Menus',
  })
  menusOrder?: PlatformEventMenuPage[];
}
@InputType()
export class UpdateEventInput {
  @Field({ description: 'ID of the event' })
  id: string;

  @Field((type) => EventType, { description: 'The type of Event this is' })
  eventType: EventType;

  @Field({ nullable: true, description: 'Name of the event' })
  name?: string;

  @Field({ nullable: true, description: 'Name of the event' })
  name_check?: boolean;

  @Field({ nullable: true, description: 'Public description of the event' })
  description?: string;

  @Field({ nullable: true, description: 'Public description of the event' })
  description_check?: boolean;

  @Field({ nullable: true, description: 'Datetime this event will start' })
  startAt?: Date;

  @Field({ nullable: true, description: 'Datetime this event will end' })
  endAt?: Date;

  @Field({ nullable: true, description: 'Platform event theme, if any' })
  platformEventTheme?: PlatformEventThemeInput;

  @Field({ nullable: true, description: 'Event location' })
  location?: string;

  @Field({ nullable: true, description: 'Event location' })
  location_check?: boolean;
  @Field({ nullable: true, description: 'Logo check' })
  logo_image_check?: boolean;

  @Field({ nullable: true, description: 'Event slug' })
  slug?: string;

  @Field({ nullable: true, description: 'Coordinates of the event' })
  geo?: string;

  @Field({ nullable: true, description: 'venueID - only in case of platformEventSlot'})
  venueID?: string;

  @Field((type) => Int, { nullable: true, description: 'duration of each slot'})
  slotDurationMins?: number;

  @Field((type) => [String!]!, { nullable: true, description: 'invitee companyMembershipIDs (if known)'})
  invitees?: string[];

  @Field({ nullable: true, description: 'Event timezone' })
  timezone?: string;

  @Field({ nullable: true, description: 'Event timezone' })
  timezone_check?: boolean;

  @Field({ nullable: true, description: 'Event timezone location' })
  timezoneLocation?: string;

  @Field((type) => PlatformEventLanguage, {
    nullable: true,
    description: 'Event language',
  })
  language?: PlatformEventLanguage;

  @Field((type) => [PlatformEventMenuSettings], {
    nullable: true,
    description: 'Event Menus',
  })
  menus?: PlatformEventMenuSettings[];

  @Field((type) => [PlatformEventMenuPage], {
    nullable: true,
    description: 'Event Menus',
  })
  menusOrder?: PlatformEventMenuPage[];

  @Field({ nullable: true, description: '' })
  qr_code_url?: string;

  @Field({ nullable: true, description: '' })
  qr_code_url_check?: boolean;

  @Field({ nullable: true, description: '' })
  privacy?: string;

  @Field({ nullable: true, description: '' })
  privacy_check?: boolean;

  @Field({ nullable: true, description: '' })
  legal?: string;

  @Field({ nullable: true, description: '' })
  legal_check?: boolean;

  @Field({ nullable: true, description: '' })
  contact_us?: string;

  @Field({ nullable: true, description: '' })
  contact_us_check?: boolean;

  @Field({ nullable: true, description: '' })
  your_data?: string;

  @Field({ nullable: true, description: '' })
  your_data_check?: boolean;

  @Field({ nullable: true, description: '' })
  header_image?: string;

  @Field({ nullable: true, description: '' })
  header_image_check?: boolean;

  @Field({ nullable: true, description: '' })
  left_image?: string;

  @Field({ nullable: true, description: '' })
  left_image_check?: boolean;

  @Field({ nullable: true, description: '' })
  right_image?: string;

  @Field({ nullable: true, description: '' })
  right_image_check?: boolean;

  @Field((type) => [EventAttendeeDataPreferenceType], {
    nullable: true,
    description: '',
  })
  attendee_preferences?: EventAttendeeDataPreferenceType[];

  @Field((type) => [EventCompanyDataPreferenceType], {
    nullable: true,
    description: '',
  })
  company_preferences?: EventCompanyDataPreferenceType[];
}

@InputType()
export class GetEventAttendanceInput {
  @Field({ nullable: true })
  companyMembershipID?: string;

  @Field((type) => EventType, { description: 'The type of Event this is' })
  eventType: EventType;

  @Field()
  eventID: string;
}

@InputType({
  description:
    'Invite people to this event either by email or by their companyMembershipID',
})
export class CreateEventInvitationInput {
  @Field({ description: 'ID of the event' })
  eventID: string;

  @Field((type) => EventType, { description: 'The type of Event this is' })
  eventType: EventType;

  @Field((type) => [String!]!, {
    nullable: true,
    description: 'The emails of the members to be invited',
  })
  inviteeEmails?: string[];

  @Field((type) => [String!]!, {
    nullable: true,
    description: 'The emails of the attendees to be invited',
  })
  inviteeCompanyMembershipIDs?: string[];
}

@InputType()
export class ResendEventInvitationInput {
  @Field()
  eventInvitationID: string;

  @Field((type) => EventType, { description: 'The type of Event this is' })
  eventType: EventType;
}

@InputType({
  description:
    'Invite people to this event either by email or by their companyMembershipID',
})
export class EventInvitationResponseInput {
  @Field({ description: 'ID of the invitation' })
  invitationID: string;

  @Field({ nullable: true, description: 'Type of the invitation' })
  type: string;

  @Field((type) => InvitationStatus, {
    nullable: true,
    description: 'Status of the invitation',
  })
  invitationStatus?: InvitationStatus;

  @Field((type) => NotificationStatus, {
    nullable: true,
    description: 'Status of the invitation notification',
  })
  notificationStatus?: NotificationStatus;

  @Field({ nullable: true })
  cartId?: string;
}

@InputType({ description: 'Input for Notification' })
export class NotificationInput {
  @Field({ description: 'ID of the notification' })
  notificationID: string;

  @Field({ description: 'Type of the notification' })
  type: string;

  @Field((type) => InvitationStatus, {
    nullable: true,
    description: 'Status of the invitation',
  })
  invitationStatus?: InvitationStatus;

  @Field((type) => NotificationStatus, {
    nullable: true,
    description: 'Status of the notification',
  })
  notificationStatus?: NotificationStatus;
}

@InputType({ description: 'Clear notification by ID' })
export class ClearNotificationInput {
  @Field((type) => [NotificationInput], {
    description: 'Group of the notification',
  })
  notifications: [NotificationInput];
  @Field((type) => NotificationStatus, {
    nullable: true,
    description: 'Status of the invitation notification',
  })
  notificationStatus?: NotificationStatus;
}

@InputType()
export class EventIdentifierInput {
  @Field({ description: 'ID of the event' })
  id: string;

  @Field((type) => EventType, { description: 'The type of Event this is' })
  eventType: EventType;
}

@InputType()
export class DeleteEventInvitationInput {
  @Field({ description: 'ID of the event invitation to be deleted' })
  id: string;
}

@InputType()
export class CreatePlatformEventVenueInput {
  @Field()
  platformEventID: string;

  @Field()
  name: string;

  @Field((type) => Int, {
    description: 'The maximum number of people/seats this venue can hold',
  })
  maxAttendees: number;

  @Field((type) => EventVenueType)
  type: EventVenueType;

  @Field()
  link: string;
}

@InputType()
export class UpdatePlatformEventVenueInput {
  @Field({ description: 'ID of the paltform event venue to be deleted' })
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field((type) => Int, {
    nullable: true,
    description: 'The maximum number of people/seats this venue can hold',
  })
  maxAttendees?: number;

  @Field((type) => EventVenueType)
  type: EventVenueType;

  @Field()
  link: string;
}

@InputType()
export class DeletePlatformEventVenueInput {
  @Field({ description: 'ID of the paltform event venue to be deleted' })
  id: string;
}

@InputType()
export class CreatePricingInput {
  @Field({ nullable: true })
  id?: string;

  @Field((type) => Float, { nullable: true })
  price?: number;

  @Field({ nullable: true })
  currency?: string;

  @Field((type) => Int, { nullable: true })
  slots?: number;

  @Field({ nullable: true })
  duration?: number;

  @Field((type) => Int, { nullable: true })
  tax?: number;

  @Field((type) => [String], { nullable: true })
  employee?: string[];

  @Field((type) => [String], { nullable: true })
  availability_weeks?: string[];

  @Field((type) => [String], { nullable: true })
  availability_hours?: string[];
}

@InputType()
export class CreatePricingEmployeeInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  pricingId: string;

  @Field((type) => Float)
  price: number;

  @Field({ nullable: true })
  show_rating?: boolean;
}

@InputType()
export class CreatePlatformEventContentInput {
  @Field()
  eventId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  body: string;

  @Field({ nullable: true })
  imageURL: string;

  @Field({ nullable: true })
  linkURL: string;

  @Field((type) => String, { nullable: true })
  keywords: string[];

  @Field((type) => String, { nullable: true })
  subContentType: string;

  @Field((type) => String, { nullable: true })
  images?: string[];

  @Field((type) => ContentLinkInput, { nullable: true })
  links?: ContentLinkInput[];

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field({ nullable: true })
  isCartAvailable?: boolean;

  @Field({ nullable: true })
  isScheduleAvailable?: boolean;

  @Field({ nullable: true })
  isPricingAvailable?: boolean;

  @Field({ nullable: true })
  isConstraintAvailable?: boolean;

  @Field({ nullable: true })
  isVenueChecked?: boolean;

  @Field({ nullable: true })
  selectedVenue?: string;

  @Field((type) => PricingContentType, { nullable: true })
  pricingType?: PricingContentType;

  @Field((type) => CreatePricingInput, { nullable: true })
  pricingMaster?: CreatePricingInput;

  @Field((type) => [CreatePricingEmployeeInput], { nullable: true })
  pricingEmployee?: CreatePricingEmployeeInput[];

  @Field(type => String, {nullable: true})
  userNotificationList?: string[]
}

@InputType()
export class UpdatePlatformEventContentInput {
  @Field()
  contentId: string;

  @Field()
  eventId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  body: string;

  @Field({ nullable: true })
  imageURL: string;

  @Field({ nullable: true })
  linkURL: string;

  @Field((type) => String, { nullable: true })
  keywords: string[];

  @Field((type) => String, { nullable: true })
  subContentType: string;

  @Field((type) => String, { nullable: true })
  images?: string[];

  @Field((type) => ContentLinkInput, { nullable: true })
  links?: ContentLinkInput[];

  @Field({ nullable: true })
  isCartAvailable?: boolean;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field({ nullable: true })
  isScheduleAvailable?: boolean;

  @Field({ nullable: true })
  isPricingAvailable?: boolean;

  @Field({ nullable: true })
  isConstraintAvailable?: boolean;

  @Field({ nullable: true })
  isVenueChecked?: boolean;

  @Field({ nullable: true })
  selectedVenue?: string;

  @Field((type) => PricingContentType, { nullable: true })
  pricingType?: PricingContentType;

  @Field((type) => CreatePricingInput, { nullable: true })
  pricingMaster?: CreatePricingInput;

  @Field((type) => [CreatePricingEmployeeInput], { nullable: true })
  pricingEmployee?: CreatePricingEmployeeInput[];
  
  @Field(type => String, {nullable: true})
  userNotificationList?: string[]
}

@InputType()
export class DeletePlatformEventContentInput {
  @Field()
  eventId: string;

  @Field()
  contentId: string;
}

@InputType()
export class GetEventContentsInput {
  @Field()
  eventId: string;

  @Field({ nullable: true })
  subContentType?: string;
}

@InputType()
export class GetEventTransactionHistoryInput {
  @Field()
  eventId: string;
}

@InputType()
export class GetEventSubCluster {
  @Field()
  eventId: string;
}

@InputType()
export class UpdateEventSubCluster {
  @Field()
  eventId: string;

  @Field()
  crmSubclusterId: string;

  @Field()
  name: string;

  @Field((type) => [String])
  users: string[];
}
@InputType()
export class UpdateEventCustomCluster {
  @Field()
  eventId: string;

  @Field()
  crmClusterId: string;

  @Field()
  name: string;

  @Field((type) => [String])
  users: [string];

  // @Field(type => [String])
  // subCluster: string[]
}

@InputType()
export class SendContentNotification {
  @Field()
  eventId: string;

  @Field()
  contentId: string;

  @Field((type) => [String!])
  emails: string[];
}

@InputType()
export class CreateNewEventClusterInput {
  @Field()
  eventId: string;

  @Field()
  name: string;

  @Field((type) => [String!])
  subCluster: string[];

  @Field((type) => [String!])
  userIds: string[];
}
@InputType()
export class CreateNewEventSubClusterInput {
  @Field()
  eventId: string;

  @Field()
  name: string;

  @Field((type) => [String!])
  userIds: string[];
}

@InputType()
export class GetEventInput {
  @Field({ nullable: true, description: 'ID of the event' }) 
  id?: string;

  @Field({ nullable: true, description: 'Slug of the event' })
  slug?: string;

  @Field((type) => EventType, { description: 'The type of Event this is' })
  eventType: EventType;
}

@InputType()
export class CreatePlatformEventContentPricingInput {
  @Field()
  eventId: string;

  @Field()
  contentId: string;

  @Field()
  price: number;

  @Field()
  currency: string;

  @Field()
  slots: number;

  @Field()
  duration: number;

  @Field((type) => [String])
  employee: string[];

  @Field((type) => [String])
  availability_weeks: string[];

  @Field((type) => [String])
  availability_hours: string[];
}

@InputType()
export class UpdatePlatformEventContentPricingInput {
  @Field()
  eventId: string;

  @Field()
  contentId: string;

  @Field()
  contentPricingId: string;

  @Field()
  price: number;

  @Field()
  currency: string;

  @Field()
  duration: number;

  @Field()
  slots: number;

  @Field((type) => [String])
  employee: string[];

  @Field((type) => [String])
  availability_weeks: string[];

  @Field((type) => [String])
  availability_hours: string[];
}

@InputType()
export class DeletePlatformEventContentPricingInput {
  @Field()
  eventId: string;

  @Field()
  contentId: string;

  @Field()
  contentPricingId: string;
}

@InputType()
export class GetEventContentsPricingInput {
  @Field()
  eventId: string;
}

@InputType()
export class GetEventContentPricingInput {
  @Field()
  eventId: string;

  @Field()
  contentId: string;

  @Field()
  contentPricingId: string;
}

export enum CartStatus {
  PENDING = 'PENDING',
  PAYMENT_VERIFICATION = 'PAYMENT_VERIFICATION',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
  COMPLETE = 'COMPLETE',
  ARCHIVED = 'ARCHIVED',
}
registerEnumType(CartStatus, { name: 'CartStatus' });

@InputType()
export class AddContentToCartInput {
  @Field()
  eventId: string;

  @Field()
  itemId: string;

  @Field()
  priceId: string;

  @Field()
  type: string;

  @Field({ nullable: true })
  quantity: number;
}

@InputType()
export class GetEventCartItemInput {
  @Field()
  eventId: string;
}

@InputType()
export class GetEventCartItemScheduledByEmployeeInput {
  @Field()
  eventId: string;

  @Field((type) => [String!]!, {
    nullable: true,
    description: 'ivitee companyMembershipIDs (if known)',
  })
  companyMembershipIDs: string[];
}

@InputType()
export class DeleteEventCartItemInput {
  @Field()
  cartId: string;
}

@InputType()
export class UpdateCartItemQuantityInput {
  @Field()
  cartId: string;

  @Field()
  quantity: number;
}

@InputType()
export class BookScheduleForCartItemInput {
  @Field()
  cartId: string;

  @Field()
  startAt: Date;

  @Field()
  endAt: Date;
}

@InputType()
export class ArchiveRestoreEventInput {
  @Field()
  eventId: string;
}

@InputType()
export class CheckoutEventCartItemInput {
  @Field()
  eventId: string;

  @Field({ nullable: true })
  cardStripeId?: string;
  
  @Field({ nullable: true })
  couponId?: string;
}

@InputType()
export class EventRequestInvitationInput {
  @Field()
  eventId: string;

  @Field()
  user: string;

  @Field({ nullable: true })
  companyMembership?: string;
}

@InputType()
export class ResponseRequestInvitationInput {
  @Field()
  requestId: string;

  @Field((type) => InvitationStatus)
  response: InvitationStatus;
}

@InputType()
export class EventAttendeeTransactionInput {
  @Field()
  eventId: string;

  @Field()
  quantity: number;

  @Field()
  cardStripeId: string;

  @Field({ nullable: true })
  couponId?: string;
}
