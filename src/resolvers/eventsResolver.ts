// 4700
import { Resolver, Query, Mutation, Arg, Ctx, Authorized } from "type-graphql";
import slugify from "slugify";
import { json, generateQrCode } from "../helpers";
import {
  CreateEventInput,
  EventType,
  EventIdentifierInput,
  CreatePlatformEventVenueInput,
  GetEventInput,
  UpdateEventInput,
  CreateEventInvitationInput,
  ResendEventInvitationInput,
  EventInvitationResponseInput,
  ClearNotificationInput,
  GetEventAttendanceInput,
  CreatePlatformEventContentInput,
  UpdatePlatformEventContentInput,
  GetEventContentsInput,
  UpdateEventSubCluster,
  GetEventSubCluster,
  DeletePlatformEventContentInput,
  InvitationStatus,
  NotificationStatus,
  PlatformEventMenuPage,
  BookScheduleForCartItemInput,
  CreatePlatformEventContentPricingInput,
  UpdatePlatformEventContentPricingInput,
  DeletePlatformEventContentPricingInput,
  GetEventContentsPricingInput,
  GetEventContentPricingInput,
  AddContentToCartInput,
  GetEventCartItemInput,
  GetEventCartItemScheduledByEmployeeInput,
  DeleteEventCartItemInput,
  CartStatus,
  UpdateCartItemQuantityInput,
  CheckoutEventCartItemInput,
  GetEventTransactionHistoryInput,
  SendContentNotification,
  CreateNewEventSubClusterInput,
  CreateNewEventClusterInput,
  UpdateEventCustomCluster,
  EventRequestInvitationInput,
  ResponseRequestInvitationInput,
  EventAttendeeTransactionInput,
  ArchiveRestoreEventInput,
  DeletePlatformEventVenueInput,
  NotificationInput,
  UpdatePlatformEventVenueInput,
} from "../inputs/event";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { Context } from "../auth/context.interface";
import { createObjectID } from "../../util/createIDs";
import {
  checkIfUserIsInCompany,
  hasPermission,
} from "../helpers/permissionsHelper";
import { removeObjectNulls } from "../../util/cleanup";
import { sendEmail, sendWelcomeEmail } from "../emailHelper";
import { ObjectId } from "mongodb";
import moment from "moment";
import { adminSignup } from "./resolver";
import { PAGE_MAPPING } from "../constants/menus";
import { Generator } from "../../util/generator";
import { stripe } from "../billing/stripe";
import Stripe from "stripe";
import { PERMISSION_ACCESS_TYPES } from "../constants/perms";
import {
  createOrGetCrmUser,
  createPlatformEventClusters,
} from "./clusterResolver";
import { redeemCouponById } from "./billingResolver";
import { PromoValueUnit } from "../inputs/billing";
import { hashCode } from "../../util/hashCode";
import { connectMedia } from "../helpers/mongoHelper";
import { plainToClass } from "class-transformer";

const { eventInvitation: PrismaEventInvitation } = prisma;

interface EventInvitation {
  eventType: EventType;
  email?: string;
  companyMembershipID?: string;
  eventID: string;
}

interface GenericEvent {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  startAt?: Date;
  endAt?: Date;
  name?: string;
  description?: string;
  location?: string;
  geo?: string;
  notes?: string;
  timezone?: string;
  timezoneLocation?: string;
  slug?: string;
}

export const _actuallySendEventInvitation = async (
  eventType: EventType,
  eventDetails: any,
  targetCompMem: any,
  invitation: any
) => {
  switch (eventType) {
    case EventType.PLATFORM_EVENT:
      const eventPrefix =
        process.env.NODE_ENV == "development"
          ? `https://events-dev.synkd.life`
          : "https://events.synkd.life";

      const eventLink = `${eventPrefix}/${eventDetails.slug}?invitationID=${invitation?.id}`;

      let toEmail = invitation?.invitationEmail
        ? invitation?.invitationEmail
        : targetCompMem?.email;

      if (!toEmail) {
        // No email address for the companyMembership itself, use the email for the user
        toEmail = targetCompMem.user?.email;
      }

      await sendEmail({
        from: { name: "Synkd", email: "no-reply@synkd.life" },
        to: toEmail,
        template: "events-invited",
        vars: { eventName: eventDetails.name, eventLink },
        subject: `Invitation to ${eventDetails.name}`,
      });
      break;
    case EventType.PLATFORM_EVENT_SLOT:
      // TODO send email
      break;
    default:
      // TODO send email
      break;
  }
};

export const addPlatformEventMember = async (
  event: any,
  user: any,
  profile?: any,
  role?: string
) => {
  const membershipExist = await prisma.platformEventMember.findMany({
    where: {
      platformEventId: event?.id,
      user: { id: user?.id },
    },
  });

  if (!profile) {
    try {
      const companyProfile = await prisma.companyMembership.findFirst({
        where: { user: { id: user?.id } },
      });
      profile = companyProfile[0];
      console.log("addPlatformEventMember->companyProfile: ", companyProfile);
    } catch (error) {
      console.error("error getting user companyProfile: ", error.message);
    }
  }

  if (!membershipExist?.length) {
    try {
      const id = createObjectID().id;

      const eventMembership = await prisma.platformEventMember.create({
        data: {
          id: id,
          platformEvent: {
            connect: {
              id: event?.id,
            },
          },
          ...(profile?.id && {
            // Conditionally connect if profile?.id exists
            profile: { connect: { id: profile?.id } },
          }),
          user: { connect: { id: user.id } },
          role: role || "USER",
          status: "ACTIVE",
        },
      });
    } catch (error) {
      console.error("error creating PlatformEventMember: ", error.message);
    }
  }
};

export const sendEventInvitation = async (data: EventInvitation) => {
  let companyMembership = null;

  // Check for existing companyMembership entry

  if (data.companyMembershipID) {
    console.log(
      "sendEventInvitation->data.companyMembershipID: ",
      data.companyMembershipID
    );
    let companyMembership = await prisma.companyMembership.findUnique({
      where: { id: data.companyMembershipID },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            currency: true,
            address: {
              select: {
                town: true,
                country: true,
                address: true,
                postcode: true,
              },
            },
            logoURL: true,
            email: true,
            url: true,
            vatNum: true,
            regNum: true,
            info: true,
            profiles: {
              select: {
                locale: true,
                bio: true,
                keywords: true,
              },
            },
            category: true,
            business_type: true,
            representativeContact: {
              select: {
                id: true,
                email: true,
              },
            },
            billingDefaultType: true,
            landline: true,
          },
        },
      },
    });
    // Employee is archived
    if (companyMembership?.status === "ARCHIVED") companyMembership = null;
  }

  // If companyMembership is still null by this point, try the email
  if (data.email && !companyMembership) {
    // NOTE you'll have to make sure the email is unique in companyMemberships
    const companyMembershipByMembershipEmail =
      await prisma.companyMembership.findMany({
        where: {
          email: data.email,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              currency: true,
              address: {
                select: {
                  town: true,
                  country: true,
                  address: true,
                  postcode: true,
                },
              },
              logoURL: true,
              email: true,
              url: true,
              vatNum: true,
              regNum: true,
              info: true,
              profiles: {
                select: {
                  locale: true,
                  bio: true,
                  keywords: true,
                },
              },
              category: true,
              business_type: true,
              representativeContact: {
                select: {
                  id: true,
                  email: true,
                },
              },
              billingDefaultType: true,
              landline: true,
            },
          },
        },
      });

    if (companyMembershipByMembershipEmail.length > 0) {
      // Positive result for Employee by email
      companyMembership = companyMembershipByMembershipEmail[0];
    } else {
      const companyMembershipByUserEmail =
        await prisma.companyMembership.findMany({
          where: {
            user: {
              email: data.email,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                email: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
                currency: true,
                address: {
                  select: {
                    town: true,
                    country: true,
                    address: true,
                    postcode: true,
                  },
                },
                logoURL: true,
                email: true,
                url: true,
                vatNum: true,
                regNum: true,
                info: true,
                profiles: {
                  select: {
                    locale: true,
                    bio: true,
                    keywords: true,
                  },
                },
                category: true,
                business_type: true,
                representativeContact: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
                billingDefaultType: true,
                landline: true,
              },
            },
          },
        });

      if (companyMembershipByUserEmail.length > 0) {
        // First Employee profile for User with this email
        companyMembership = companyMembershipByUserEmail[0];
      }
    }
  }

  // Employee is archived
  if (companyMembership && companyMembership.status === "ARCHIVED")
    companyMembership = null;

  // If companyMembership is still null by this point, create a new Synkd user
  // if (!companyMembership) {
  //   console.log(
  //     `[sendEventInvitation] Creating new user for email: ${data.email}`
  //   );
  //   // if (!data.email)
  //   //   throw new Error(
  //   //     `Can't create new user for an invitee without a valid email address`
  //   //   );
  //   // const newUser = await adminSignup({
  //   //   firstName: "New",
  //   //   lastName: "User",
  //   //   email: data.email,
  //   // });
  //   // if (newUser !== null) {
  //   //   // User created successfully
  //   //   let newUserMemberships = await prisma.companyMembership.findMany({
  //   //     where: {
  //   //       user: {
  //   //         id: newUser.id,
  //   //       },
  //   //     },
  //   //     include: {
  //   //       user: {
  //   //         select: {
  //   //           id: true,
  //   //           firstName: true,
  //   //           lastName: true,
  //   //           avatar: true,
  //   //           email: true,
  //   //         },
  //   //       },
  //   //       company: {
  //   //         select: {
  //   //           id: true,
  //   //           name: true,
  //   //           currency: true,
  //   //           address: {
  //   //             select: {
  //   //               town: true,
  //   //               country: true,
  //   //               address: true,
  //   //               postcode: true,
  //   //             },
  //   //           },
  //   //           logoURL: true,
  //   //           email: true,
  //   //           url: true,
  //   //           vatNum: true,
  //   //           regNum: true,
  //   //           info: true,
  //   //           profiles: {
  //   //             select: {
  //   //               locale: true,
  //   //               bio: true,
  //   //               keywords: true,
  //   //             },
  //   //           },
  //   //           category: true,
  //   //           business_type: true,
  //   //           representativeContact: {
  //   //             select: {
  //   //               id: true,
  //   //               email: true,
  //   //             },
  //   //           },
  //   //           billingDefaultType: true,
  //   //           landline: true,
  //   //         },
  //   //       },
  //   //     },
  //   //   });

  //   //   if (newUserMemberships.length > 0) {
  //   //     companyMembership = newUserMemberships[0];
  //   //   } else {
  //   //     throw new Error(
  //   //       `Created new user for ${data.email} (${newUser.id}) but could not subsequently find a CompanyMembership for this user to invite to the event`
  //   //     );
  //   //   }
  //   } else {
  //     throw new Error(
  //       `No valid companyMembership found for invitee with email ${data.email} and companyMembershipID ${data.companyMembershipID} and could not create new user`
  //     );
  //   }
  // }

  let eventData = {};
  let eventDetails: GenericEvent | any = {};
  let organiser: any;

  switch (data.eventType) {
    case EventType.PLATFORM_EVENT:
      eventData = { platformEvent: { connect: { id: data.eventID } } };

      eventDetails = await prisma.platformEvent.findUnique({
        where: {
          id: data.eventID,
        },
        include: {
          organiser: true, // Include the organiser relation
        },
      });

      organiser = eventDetails?.organiser;

      break;

    case EventType.PLATFORM_EVENT_SLOT:
      eventData = { platformEventSlot: { connect: { id: data.eventID } } };

      eventDetails = await prisma.platformEventSlot.findUnique({
        where: {
          id: data.eventID,
        },
        include: {
          organiser: true, // Include the organiser relation
        },
      });

      organiser = eventDetails?.organiser;


      // Access the organiser from the eventSlot
      organiser = organiser?.organiser;
      break;

    default:
      eventData = { calendarEvent: { connect: { id: data.eventID } } };
      eventDetails = await prisma.calendarEvent.findUnique({
        where: {
          id: data.eventID,
        },
        include: {
          organiser: true, // Include the organiser relation
        },
      });

      organiser = eventDetails?.organiser;

      organiser = organiser.organiser;

      break;
  }

  // console.log('companyMembership', companyMembership)
  // console.log('organiser', organiser)
  // If the invitee is the same as the organiser, do not allow the request to go through
  // if (companyMembership?.id === organiser?.id) {
  //   throw new Error(`Cannot send an invite to yourself`);
  // }

  // console.log('event details', eventDetails)

  let invitation = await prisma.eventInvitation.findFirst({
    where: {
      invitationEmail: data?.email,
      eventType: data?.eventType,
      platformEventId: data?.eventID,
    },
  });

  if (!invitation) {
    invitation = await prisma.eventInvitation.create({
      data: {
        id: createObjectID().id,
        lastInviteSent: new Date(),
        eventType: data.eventType,
        invitationEmail: data?.email,
        ...eventData,
        ...(companyMembership?.id && {
          invitee: {
            connect: {
              id: companyMembership?.id,
            },
          },
        }),
      },
    });
  }

  console.log("sendEventInvitation->invitation: ", invitation);

  await _actuallySendEventInvitation(
    data.eventType,
    eventDetails,
    companyMembership,
    invitation
  );
  if(!invitation){
    return ;
  }
  return invitation;
};

@Resolver()
export class eventsResolver {
  @Mutation((returns) => json)
  async createEvent(@Arg("data") data: CreateEventInput, @Ctx() ctx: Context) {
    let event = null;
    console.log("input", data);
    const {
      name,
      description,
      startAt,
      endAt,
      geo,
      location,
      platformEventType,
      platformEventTheme,
      invitees, // this is user id, not company membership as it's supposed to, so have to querybuserid when checking company membership
      slug,
      venueID,
      cartID,
      contentID,
      pricingID,
      eventID,
      spaces,
      slots,
      language,
      timezone,
      timezoneLocation,
    } = data;
    switch (data.eventType) {
      case EventType.PLATFORM_EVENT:
        // Permissions check
        // let perm = await hasPermission(
        //   "events",
        //   PERMISSION_ACCESS_TYPES.view_and_edit,
        //   ctx.companyMembership?.id,
        //   ctx.user.id,
        //   ctx.company.id
        // );
        // if (!perm) return { error: "NO_PERMISSION" };

        const idObject = createObjectID();

        let slugText = slug ? slug : slugify(name);
        let existingSlug = await prisma.platformEvent.findMany({
          where: {
            slug: slugText,
          },
        });

        while (existingSlug.length) {
          const slugTextToken = slugText.split("--000");
          if (slugTextToken.length > 1) {
            slugText = `${slugTextToken[0]}--000${+slugTextToken[1] + 1}`;
          } else {
            slugText = `${slugText}--000${existingSlug.length}`;
          }
          existingSlug = await prisma.platformEvent.findMany({
            where: {
              slug: slugText,
            },
          });
        }

        event = await prisma.platformEvent.create({
          data: {
            id: idObject.id,
            id_number: hashCode(idObject.id),
            name,
            description,
            startAt: startAt || new Date(),
            endAt: endAt || new Date(),
            slug: slugText, // creates a slug if none present
            organiser: { connect: { id: ctx.companyMembership.id } },
            geo,
            location,
            platformEventType,
            language,
            timezone,
            timezoneLocation,
            theme: { ...(platformEventTheme as any) },
            menus: {
              //@ts-ignore
              create: [...PAGE_MAPPING[platformEventType]],
            },
            menusOrder: {
              set: [
                PlatformEventMenuPage.HOME,
                PlatformEventMenuPage.CALENDAR,
                PlatformEventMenuPage.COMPANIES,
                PlatformEventMenuPage.CONTENT,
                PlatformEventMenuPage.ATTENDEES,
              ],
            },
          },
          include: {
            organiser: {
              include: {
                company: true,
              },
            },
          },
        });

        await addPlatformEventMember(
          event,
          ctx.user,
          ctx.companyMembership,
          "MASTER_ADMIN"
        );

        try {
          //creating default online space for the event
          await prisma.platformEventVenue.create({
            data: {
              id: createObjectID().id,
              name: `Online`,
              type: "GENERIC",
              maxAttendees: 1000,
              platformEvent: { connect: { id: event.id } },
            },
          });
        } catch (err) {
          // We don't want an error here to hold up the whole function
          console.error(err);
        }

        if (spaces && spaces !== 0) {
          // Create some default spaces
          let defaultSlots = slots ? slots : 2;
          for (var i = 0; i < spaces; i++) {
            try {
              await prisma.platformEventVenue.create({
                data: {
                  id: createObjectID().id,
                  name: `Space ${i + 1}`,
                  maxAttendees: defaultSlots,
                  platformEvent: { connect: { id: event.id } },
                },
              });
            } catch (err) {
              // We don't want an error here to hold up the whole function
              console.error(err);
            }
          }
        }

        await createPlatformEventClusters(event);

        // Add EventInvitation for the user who organised the event, just to make life easier
        await prisma.eventInvitation.create({
          data: {
            id: createObjectID().id,
            invitee: { connect: { id: ctx.companyMembership.id } },
            lastInviteSent: new Date(),
            eventType: data.eventType,
            platformEvent: { connect: { id: event.id } },
            invitationStatus: "ACCEPTED",
          },
        });

        return event;
      case EventType.PLATFORM_EVENT_SLOT:
        // Check if venue id is present
        if (!venueID) {
          throw new Error("No venueID present");
        }

        let eventSlot = await prisma.platformEventSlot.create({
          data: {
            id: createObjectID().id,
            name,
            description,
            startAt,
            endAt,
            organiser: { connect: { id: ctx.companyMembership.id } },
            geo,
            location,
            venue: { connect: { id: venueID } },
          },
        });

        console.log("createEvent->eventSlot: ", eventSlot);

        if (invitees) {
          for (let invitee of invitees) {
            // TODO: maybe queue this?
            console.log(
              `Sending event invitation for ${eventID} to invitee ${invitee}`
            );

            await sendEventInvitation({
              companyMembershipID: invitee,
              eventID: eventSlot?.id,
              eventType: EventType.PLATFORM_EVENT_SLOT,
            });
          }
        }

        const invitation = {
          data: {
            id: createObjectID().id,
            invitee: { connect: { id: ctx.companyMembership.id } },
            lastInviteSent: new Date(),
            eventType: data.eventType,
            platformEvent: { connect: { id: eventID } },
            platformEventSlot: { connect: { id: eventSlot.id } },
            invitationStatus: "AWAITING",
          },
        };
        console.log("createEvent->invitation: ", invitation);

        await prisma.eventInvitation.create(invitation);
        if(!event){
          return {msg: "Success"}
        }
        return event;

      case EventType.PLATFORM_EVENT_PRICING_SLOT:
        if (!eventID && !cartID && !(contentID && pricingID))
          throw new Error("No cartID or contentID and pricingID present");

        let eventSlotPricing;

        if (contentID && pricingID) {
          const allEvent: any = await prisma.platformEvent.findUnique({
            where: { id: eventID },
            select: {
              id: true,
              contents: {
                select: {
                  id: true,
                  name: true,
                  body: true,
                  imageURL: true,
                  linkURL: true,
                  keywords: true,
                  createdAt: true,
                  updatedAt: true,
                  images: true,
                  links: {
                    select: {
                      name: true,
                      link: true,
                    },
                  },
                  pricing: {
                    select: {
                      id: true,
                      employee: {
                        select: {
                          id: true,
                          email: true,
                          avatar: true,
                          user: {
                            select: {
                              id: true,
                              email: true,
                              avatar: true,
                              firstName: true,
                              lastName: true,
                            },
                          },
                        },
                      },
                      currency: true,
                      price: true,
                      duration: true,
                      slots: true,
                      tax: true,
                      remaining_slots: true,
                      booked_slots: true,
                      availability_weeks: true,
                      availability_hours: true,
                      show_rating: true,
                    },
                  },
                  startDate: true,
                  endDate: true,
                  isCartAvailable: true,
                  isScheduleAvailable: true,
                  isPricingAvailable: true,
                  isVenueChecked: true,
                  selectedVenue: true,
                  isConstraintAvailable: true,
                  pricingType: true,
                  pricingMaster: {
                    select: {
                      id: true,
                      currency: true,
                      price: true,
                      duration: true,
                      slots: true,
                      tax: true,
                      remaining_slots: true,
                      booked_slots: true,
                      availability_weeks: true,
                      availability_hours: true,
                    },
                  },
                  subContentType: true,
                },
              },
            },
          });

          console.log("allevent", allEvent);
          const content = allEvent.contents.find(
            (item) => item.id === contentID
          );

          if (!content) throw new Error("Content not found");
          let pricing;
          if (pricingID) {
            pricing = await prisma.platformEventContentPricing.findUnique({
              where: { id: pricingID },
            });

            console.log("give me pricing", pricing); // remaining slots &  slots = null here
          }
          let dayName = moment(startAt).format("dddd").toLowerCase();
          if (content.isConstraintAvailable) {
            if (
              pricing.availability_weeks &&
              pricing.availability_weeks.length > 0 &&
              !(pricing.availability_weeks || []).includes(dayName)
            ) {
              throw new Error("No slot available on this day");
            }
            if (pricing.availability_hours.length === 2) {
              const [startTime, endTime] = pricing.availability_hours;
              let selectedDate = moment(startAt).format("YYYY-MM-DD");
              let contentStartDate =
                content.startDate &&
                moment(content.startDate).format("YYYY-MM-DD");
              let contentEndDate =
                content.startDate &&
                moment(content.endDate).format("YYYY-MM-DD");
              if (contentStartDate && contentEndDate) {
                let pricingStartAt = moment(
                  `${contentStartDate} ${startTime}`,
                  "YYYY-MM-DD HH:mm a"
                );
                let pricingEndAt = moment(
                  `${contentEndDate} ${endTime}`,
                  "YYYY-MM-DD HH:mm a"
                );

                console.log("my content:", content);

                if (
                  !moment(startAt).isBetween(pricingStartAt, pricingEndAt) ||
                  !moment(endAt).isBetween(pricingStartAt, pricingEndAt)
                ) {
                  throw new Error("No slot available for this time");
                }
              }
            }

            if ((pricing.bookded_slots !== null && pricing.slots !== null)  && pricing.booked_slots + 1 > pricing.slots) {
              // changed sign to less than for testing
              console.log("my pricinh", pricing);
              throw new Error("Slot already full");
            }
          }
          console.log("QR", "QR code");
          let key = Generator.generateString(18);
          let url = `https://my.synkd.life/relreq/${key}`;
          let dataUrl = await generateQrCode(url);
          
          eventSlotPricing = await prisma.platformEventCart.create({
            data: {
              id: new ObjectId().toString(),
              type: "content",
              item: contentID,
              startAt,
              endAt,
              event: { connect: { id: eventID } },
              pricing: { connect: { id: pricingID } },
              user: { connect: { id: ctx.user.id } },
              status: CartStatus.PENDING,
              qrcodeKey: key,
              quantity: 1,
              qrcodeImage: dataUrl,
            },
          });
        }

        await prisma.eventInvitation.create({
          data: {
            id: createObjectID().id,
            invitee: { connect: { id: ctx.companyMembership.id } },
            lastInviteSent: new Date(),
            eventType: data.eventType,
            platformEvent: { connect: { id: eventID } },
            platformEventPricingSlot: { connect: { id: eventSlotPricing.id } },
            invitationStatus: "AWAITING",
          },
        });
        if (!eventSlotPricing) {
          return {msg: "success"}
        }
        return eventSlotPricing;
      default:
        event = await prisma.calendarEvent.create({
          data: {
            id: createObjectID().id,
            name,
            description,
            startAt,
            endAt,
            organiser: { connect: { id: ctx.companyMembership.id } },
            geo,
            location,
          },
        });

        if (!event) {
          return {msg: "success"}
        }
        return event;
        




    }
  }

  /**
   * Returns all platform events that the user is either attending or has created
   */
  @Authorized()
  @Query((returns) => json)
  async myPlatformEventsAll(@Ctx() ctx: Context) {
    const platormEvents = await this.myPlatformEvents(ctx);
    const attendedEvents = await this.myAttendedPlatformEvents(ctx);

    let events = [
      ...platormEvents,
      ...attendedEvents.filter((item: any) =>
        platormEvents.every((ev: any) => ev.id !== item.id)
      ),
    ];

    return events;
  }

  /**
   * Returns only the platform events that the company has created
   */
  @Authorized()
  @Query((returns) => json)
  async getEventsForCompany(@Ctx() ctx: Context) {
    const currentCompany = ctx.company.id;
    const select = {
      id: true,
      name: true,
      name_check: true,
      slug: true,
      description: true,
      description_check: true,
      startAt: true,
      endAt: true,
      id_number: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      platformEventType: true,
      theme: {
        select: {
          logoURL: true,
          primaryColour: true,
          primaryTextColour: true,
          secondaryColour: true,
          secondaryTextColour: true,
          calendarPrimaryColour: true,
          calendarSecondaryColour: true,
        },
      },
      organiser: {
        select: {
          id: true,
          status: true,
          role: true,
          email: true,
          avatar: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true,
            },
          },
          profiles: {
            select: {
              locale: true,
              bio: true,
              keywords: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              currency: true,
              address: {
                select: {
                  town: true,
                  country: true,
                  address: true,
                  postcode: true,
                },
              },
              logoURL: true,
              email: true,
              url: true,
              vatNum: true,
              regNum: true,
              info: true,
              profiles: {
                select: {
                  locale: true,
                  bio: true,
                  keywords: true,
                },
              },
              category: true,
              business_type: true,
              representativeContact: {
                select: {
                  id: true,
                  email: true,
                },
              },
              billingDefaultType: true,
              landline: true,
            },
          },
        },
      },
      menus: {
        include: {
          userRelations: true, // Ensure 'userRelations' exists in PlatformEventMenus
        },
      },
      attendees: {
        select: {
          id: true,
          invitationStatus: true,
          invitee: {
            select: {
              id: true,
            },
          },
        },
      },
      language: true,
      location: true,
      location_check: true,
      timezone: true,
      timezone_check: true,
      timezoneLocation: true,
      qr_code_url: true,
      qr_code_url_check: true,
      privacy: true,
      privacy_check: true,
      legal: true,
      legal_check: true,
      contact_us: true,
      contact_us_check: true,
      your_data: true,
      your_data_check: true,
      header_image: true,
      header_image_check: true,
      left_image: true,
      left_image_check: true,
      right_image: true,
      right_image_check: true,
      attendee_preferences: true,
      company_preferences: true,

      menusOrder: true,
      maximumAttendees: true,
    };

    let events: any = await prisma.platformEvent.findMany({
      where: {
        organiser: {
          company: {
            id: currentCompany,
          },
        },
      },
      select,
    });
    return events;
  }

  /**
   * Returns only the platform events that the user is attending
   */
  @Authorized()
  @Query((returns) => json)
  async myAttendedPlatformEvents(@Ctx() ctx: Context) {
    let invitations: any = await prisma.eventInvitation.findMany({
      where: {
        invitee: {
          user: {
            id: ctx.user.id,
          },
        },
        eventType: "PLATFORM_EVENT",
        invitationStatus: "ACCEPTED",
      },
      include: {
        platformEvent: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            startAt: true,
            endAt: true,
            name: true,
            name_check: true,
            description: true,
            description_check: true,
            location: true,
            location_check: true,
            geo: true,
            notes: true,
            status: true,
            slug: true,
            slotDurationMins: true,
            platformEventType: true,
            timezone: true,
            timezone_check: true,
            timezoneLocation: true,
            qr_code_url: true,
            qr_code_url_check: true,
            privacy: true,
            privacy_check: true,
            legal: true,
            legal_check: true,
            contact_us: true,
            contact_us_check: true,
            your_data: true,
            your_data_check: true,
            header_image: true,
            header_image_check: true,
            left_image: true,
            left_image_check: true,
            right_image: true,
            right_image_check: true,
            maximumAttendees: true,
            organiser: {
              select: {
                id: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            attendees: {
              select: {
                id: true,
                invitationEmail: true,
                invitationStatus: true,
                invitee: true,
              },
            },
            theme: {
              select: {
                logoURL: true,
                primaryColour: true,
                primaryTextColour: true,
                secondaryColour: true,
                secondaryTextColour: true,
              },
            },
            venues: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                name: true,
                type: true,
                link: true,
                maxAttendees: true,
              },
            },
            contents: {
              select: {
                id: true,
                name: true,
                body: true,
                imageURL: true,
                linkURL: true,
                keywords: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    let platformEvents = [];
    for (let inv of invitations) {
      platformEvents.push(inv["platformEvent"]);
    }
    return platformEvents;
  }

  /**
   * Returns only the platform events that the user has created
   */
  @Authorized()
  @Query((returns) => json)
  async myPlatformEvents(@Ctx() ctx: Context) {
    const user = await prisma.user.findUnique({
      where: {
        id: ctx.user.id,
      },
      include: {
        companies: {
          select: {
            company: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const companyIds = user?.companies.map((item) => item?.company?.id);

    const events = await prisma.platformEvent.findMany({
      where: {
        organiser: {
          company: {
            id: {
              in: companyIds,
            },
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        startAt: true,
        endAt: true,
        name: true,
        name_check: true,
        description: true,
        description_check: true,
        location: true,
        location_check: true,
        geo: true,
        notes: true,
        status: true,
        slug: true,
        slotDurationMins: true,
        platformEventType: true,
        timezone: true,
        timezone_check: true,
        timezoneLocation: true,
        qr_code_url: true,
        qr_code_url_check: true,
        privacy: true,
        privacy_check: true,
        legal: true,
        legal_check: true,
        contact_us: true,
        contact_us_check: true,
        your_data: true,
        your_data_check: true,
        header_image: true,
        header_image_check: true,
        left_image: true,
        left_image_check: true,
        right_image: true,
        right_image_check: true,
        maximumAttendees: true,
        organiser: {
          select: {
            id: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attendees: {
          select: {
            id: true,
            invitationEmail: true,
            invitationStatus: true,
            invitee: true,
          },
        },
        theme: {
          select: {
            logoURL: true,
            primaryColour: true,
            primaryTextColour: true,
            secondaryColour: true,
            secondaryTextColour: true,
          },
        },
        venues: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            name: true,
            type: true,
            link: true,
            maxAttendees: true,
          },
        },
        contents: {
          select: {
            id: true,
            name: true,
            body: true,
            imageURL: true,
            linkURL: true,
            keywords: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return events;
  }

  @Mutation((returns) => json)
  async updateEvent(@Arg("data") data: UpdateEventInput, @Ctx() ctx: Context) {
    let event = null;

    const {
      id,
      name,
      name_check,
      description,
      description_check,
      startAt,
      endAt,
      slug,
      geo,
      location,
      eventType,
      location_check,
      platformEventTheme,
      slotDurationMins,
      venueID,
      language,
      timezone,
      timezone_check,
      timezoneLocation,
      qr_code_url,
      qr_code_url_check,
      privacy,
      privacy_check,
      legal,
      legal_check,
      contact_us,
      contact_us_check,
      your_data,
      your_data_check,
      header_image,
      header_image_check,
      left_image,
      left_image_check,
      right_image,
      right_image_check,
      menus,
      attendee_preferences,
      company_preferences,
      ...otherProp
    } = data;

    switch (data.eventType) {
      case EventType.PLATFORM_EVENT: {
        // Permissions check
        // let perm = await hasPermission('events', PERMISSION_ACCESS_TYPES.view_and_edit, ctx.companyMembership.id)
        const eventOrganiser: any = await prisma.platformEvent.findUnique({
          where: { id }, // Ensure 'id' is defined with the appropriate event ID
          select: {
            organiser: {
              select: {
                company: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });

        let perm = await hasPermission(
          "events",
          PERMISSION_ACCESS_TYPES.view_and_edit,
          null,
          ctx.user.id,
          eventOrganiser?.organiser?.company?.id
        );

        if (!perm) return { error: "NO_PERMISSION" };

        const filtered = {
          name,
          name_check,
          description,
          description_check,
          startAt,
          endAt,
          slug,
          geo,
          location,
          location_check,
          language,
          timezone,
          timezone_check,
          timezoneLocation,
          qr_code_url,
          qr_code_url_check,
          privacy,
          privacy_check,
          legal,
          legal_check,
          contact_us,
          contact_us_check,
          your_data,
          your_data_check,
          header_image,
          header_image_check,
          left_image,
          left_image_check,
          right_image,
          right_image_check,
        };

        removeObjectNulls(filtered);

        if (platformEventTheme) {
          filtered["theme"] = { update: { ...platformEventTheme } };
        }

        // if (menus) {
        //   filtered["menus"] = {
        //     data: menus.map((item: any) => {
        //       // Ensure we're connecting at least one user to userAdmin and userVisible
        //       return {
        //         ...item,
        //         userVisible: item.userVisible && item.userVisible.length > 0
        //           ? {
        //               connect: item.userVisible.map((us: any) => ({ id: us })),
        //             }
        //           : { connect: [] }, // Ensure it's never null or undefined

        //         userAdmin: item.userAdmin && item.userAdmin.length > 0
        //           ? {
        //               connect: item.userAdmin.map((us: any) => ({ id: us })),
        //             }
        //           : { connect: [] }, // Ensure it's never null or undefined
        //       };
        //     }),
        //   };
        // }

        if (attendee_preferences) {
          filtered["attendee_preferences"] = { set: attendee_preferences };
        }

        if (company_preferences) {
          filtered["company_preferences"] = { set: company_preferences };
        }

        if (menus && menus.length > 0) {
          try {
            // Delete existing menu-user relations
            await prisma.platformEventMenuUser.deleteMany({
              where: { platformEventMenu: { platformEventId: id } },
            });

            // Delete existing menus
            await prisma.platformEventMenus.deleteMany({
              where: { platformEventId: id },
            });

            // Create new menus
            const createdMenus = await prisma.platformEventMenus.createMany({
              data: menus.map((menu) => ({
                adminOnly: menu.adminOnly ?? false,
                label: menu.label,
                link: menu.link,
                parameter: menu.parameter,
                show: menu.show ?? true,
                showToAll: menu.showToAll,
                isPublic: menu.isPublic,
                type: menu.type,
                platformEventId: id,
              })),
            });

            // Fetch newly created menus to get their IDs
            const newlyCreatedMenus = await prisma.platformEventMenus.findMany({
              where: { platformEventId: id },
            });

            // Establish relations via PlatformEventMenuUser
            const relationsToCreate = newlyCreatedMenus.flatMap((menu) => {
              const matchingMenu = menus.find((m) => m.label === menu.label); // Match by label or another unique field
              if (!matchingMenu) return []; // Skip if no matching menu is found

              // Combine userAdmin and userVisible into a single set of users
              const allUsers = Array.from(
                new Set([
                  ...(matchingMenu.userAdmin || []),
                  ...(matchingMenu.userVisible || []),
                ])
              );

              return allUsers.map((userId) => ({
                platformEventMenuId: menu.id,
                userId,
                isAdmin: (matchingMenu.userAdmin || []).includes(userId),
                isVisible: (matchingMenu.userVisible || []).includes(userId),
              }));
            });

            // Create the new relations in bulk
            if (relationsToCreate.length > 0) {
              await prisma.platformEventMenuUser.createMany({
                data: relationsToCreate,
              });
            }
          } catch (error) {
            console.error("Error updating menus and relations:", error.message);
            throw error; // Re-throw the error for further handling if needed
          }
        }

        event = await prisma.platformEvent.update({
          where: { id }, // Make sure 'id' is defined with the appropriate event ID
          data: {
            ...filtered, // Spread the properties from 'filtered' into the update data
          },
          include: {
            menus: {
              include: {
                userRelations: true,
              },
            },
          },
        });

        // Transform the result to include userAdmin and userVisible fields
        const transformedEvent = {
          ...event,
          menus: event.menus.map((menu) => {
            const userAdmin = menu.userRelations
              .filter((relation) => relation.isAdmin)
              .map((relation) => ({ id: relation.userId }));

            const userVisible = menu.userRelations
              .filter((relation) => relation.isVisible)
              .map((relation) => ({ id: relation.userId }));

            return {
              ...menu,
              userAdmin,
              userVisible,
              userRelations: undefined, // Remove the raw userRelations field
            };
          }),
        };

        return transformedEvent;
      }

      case EventType.PLATFORM_EVENT_SLOT: {
        // Check if venue id is present
        const filtered = {
          name,
          slug,
          description,
          startAt,
          endAt,
          geo,
          location,
        };
        removeObjectNulls(filtered);
        if (venueID) {
          filtered["venue"] = { connect: { id: venueID } };
        }
        event = await prisma.platformEvent.update({
          where: { id }, // Make sure 'id' is defined with the appropriate event ID
          data: {
            platformEventType: eventType,
            ...filtered,
          }, // Spread the properties from 'filtered' into the update data
        });
        return event;
      }

      default:
        const filtered = {
          name,
          slug,
          description,
          startAt,
          endAt,
          geo,
          location,
        };
        removeObjectNulls(filtered);
        event = await prisma.platformEvent.update({
          where: { id }, // Ensure 'id' contains the appropriate calendar event ID
          data: {
            platformEventType: eventType,
            ...filtered,
          }, // Spread the properties from 'filtered' into the update data
        });

        return event;
    }
  }

  @Mutation((returns) => json)
  async archiveEvent(
    @Ctx() ctx: Context,
    @Arg("id") eventId: string,
    @Arg("archived") archived: boolean
  ) {
    // Permissions check
    let perm = await hasPermission(
      "events",
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    return await prisma.platformEvent.update({
      where: {
        id: eventId, // Ensure 'eventId' contains the correct ID of the platform event
      },
      data: {
        status: archived ? "ARCHIVED" : "DRAFT", // Update the status based on the 'archived' variable
        archiveDate: new Date(), // Set the archive date to the current date
      },
    });
  }

  @Mutation((returns) => json)
  async publishEvent(
    @Arg("data") data: EventIdentifierInput,
    @Ctx() ctx: Context
  ) {
    switch (data.eventType) {
      case EventType.PLATFORM_EVENT:
        // Permissions check
        let perm = await hasPermission(
          "events",
          PERMISSION_ACCESS_TYPES.view_and_edit,
          ctx.companyMembership.id
        );
        if (!perm) return { error: "NO_PERMISSION" };

        return await prisma.platformEvent.update({
          where: {
            id: data.id, // Ensure 'data.id' contains the correct ID of the platform event
          },
          data: {
            status: "LIVE", // Set the status to "LIVE"
          },
        });

      default:
        throw new Error("Not applicable for this event type");
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async createPlatformEventVenue(
    @Arg("data") data: CreatePlatformEventVenueInput,
    @Ctx() ctx: Context
  ) {
    const { name, maxAttendees, platformEventID, type, link } = data;

    // Permissions check
    let perm = await hasPermission(
      "events_admin",
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    console.log("CreatePlatformEventVenue->data: ", data);

    return await prisma.platformEventVenue.create({
      data: {
        id: createObjectID().id, // Ensure this function returns the necessary fields
        name,
        maxAttendees,
        type,
        link,
        platformEvent: {
          connect: {
            id: platformEventID, // Connect to the existing platform event by ID
          },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async deletePlatformEventVenue(
    @Arg("data") data: DeletePlatformEventVenueInput,
    @Ctx() ctx: Context
  ) {
    const { id: venueID } = data;
    // Permissions check
    let perm = await hasPermission(
      "events_admin",
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    // return await prisma.deletePlatformEventVenue({id: venueID})
    return await prisma.platformEventVenue.update({
      where: {
        id: venueID, // Specify the ID of the venue you want to update
      },
      data: {
        status: "ARCHIVED", // Update the status field
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async updatePlatformEventVenue(
    @Arg("data") data: UpdatePlatformEventVenueInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      "events_admin",
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    const { id, name, maxAttendees, type, link } = data;
    const filtered = { name, maxAttendees, type, link };
    removeObjectNulls(filtered);
    return await prisma.platformEventVenue.update({
      where: {
        id, // Specify the ID of the venue you want to update
      },
      data: {
        ...filtered, // Spread the filtered object for the fields to update
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async createPlatformEventContent(
    @Arg("data") data: CreatePlatformEventContentInput,
    @Ctx() ctx: Context
  ) {
    const {
      eventId,
      name,
      body,
      imageURL,
      linkURL,
      keywords = [],
      images = [],
      links = [],
      isCartAvailable,
      isScheduleAvailable,
      isPricingAvailable,
      isConstraintAvailable,
      isVenueChecked,
      selectedVenue,
      pricingType = "MULTIPLE",
      pricingMaster,
      pricingEmployee = [],
      subContentType = "content",
      startDate,
      endDate,
    } = data;
  
    console.log("createPlatformEventContent called", new Date().toISOString());
  
    const contentId = new ObjectId().toString();
    const pricingMasterId = new ObjectId().toString();
  
    const eventSelected = await prisma.platformEvent.findUnique({
      where: { id: eventId },
      include: {
        organiser: {
          select: {
            id: true,
            company: { select: { stripeAccountId: true } },
          },
        },
        menus: true,
      },
    });
  
    if (!eventSelected) {
      throw new Error("Event not found");
    }
  
    const pass = subContentType !== "content";
    const perm = await hasPermission(
      "events_admin",
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm && !pass) {
      throw new Error("NO_PERMISSION");
    }
  
    const isValidDate = (d: any) => d && !isNaN(new Date(d).getTime());
    const cleanStartDate = isValidDate(startDate) ? new Date(startDate) : undefined;
    const cleanEndDate = isValidDate(endDate) ? new Date(endDate) : undefined;
  
    // Prepare operations
    const operations: any[] = [];
  
    // Step 1: create pricingMaster if needed
    if (pricingMaster?.currency) {
      operations.push(
        prisma.platformEventContentPricing.create({
          data: {
            id: pricingMasterId,
            currency: pricingMaster.currency,
            price: pricingMaster.price ?? null,
            slots: pricingMaster.slots ?? null,
            duration: pricingMaster.duration ?? null,
            tax: pricingMaster.tax ?? null,
            availability_weeks: {
              set: pricingMaster.availability_weeks ?? [],
            },
            availability_hours: {
              set: pricingMaster.availability_hours ?? [],
            },
            employee: {
              connect: [{ id: eventSelected.organiser.id }],
            },
          },
        })
      );
    }
  
    // Step 2: create PlatformEventContents
    operations.push(
      prisma.platformEventContents.create({
        data: {
          id: contentId,
          platformEventId: eventId,
          name,
          body,
          imageURL,
          linkURL,
          subContentType,
          pricingType,
          keywords: { set: keywords },
          images: { set: images },
          isCartAvailable,
          isScheduleAvailable,
          isPricingAvailable,
          isConstraintAvailable,
          isVenueChecked,
          selectedVenue,
          startDate: cleanStartDate,
          endDate: cleanEndDate,
          links: {
            set: links.map((item: any) => ({
              ...item,
              id: new ObjectId().toString(),
            })),
          },
          pricingMasterId: pricingMaster?.currency ? pricingMasterId : undefined,
        },
      })
    );
  
    // Step 3: create pricing entries for employees
    if (pricingEmployee.length > 0 && pricingMaster?.currency) {
      operations.push(
        prisma.platformEventContentPricing.createMany({
          data: pricingEmployee.map((employee: any) => ({
            id: new ObjectId().toString(),
            contentId,
            price: employee.price,
            currency: pricingMaster.currency,
            tax: pricingMaster.tax ?? null,
            duration: pricingMaster.duration ?? 90,
            slots: pricingMaster.slots ?? null,
            availability_weeks: pricingMaster.availability_weeks ?? [],
            availability_hours: pricingMaster.availability_hours ?? [],
            show_rating: employee.show_rating ?? false,
            employeeId: employee.id,
          })),
        })
      );
    }
  
    // Execute all in one safe transaction
    await prisma.$transaction(operations);
  
    console.log("PlatformEventContent created:", contentId, pricingMasterId);
    return { id: contentId, pricingId: pricingMasterId };
  }
  
  
// async createPlatformEventContent(
//   @Arg("data") data: CreatePlatformEventContentInput,
//   @Ctx() ctx: Context
// ) {
//   const {
//     eventId,
//     name,
//     body,
//     imageURL,
//     linkURL,
//     keywords = [],
//     images = [],
//     links = [],
//     isCartAvailable,
//     isScheduleAvailable,
//     isPricingAvailable,
//     isConstraintAvailable,
//     isVenueChecked,
//     selectedVenue,
//     pricingType = "MULTIPLE",
//     pricingMaster,
//     pricingEmployee = [],
//     subContentType = "content",
//     startDate,
//     endDate,
//   } = data;

//   const contentId = new ObjectId().toString();
//   const PricingId = new ObjectId().toString();

//   const eventSelected = await prisma.platformEvent.findUnique({
//     where: { id: eventId },
//     include: {
//       organiser: {
//         select: {
//           id: true,
//           company: {
//             select: {
//               stripeAccountId: true,
//             },
//           },
//         },
//       },
//       menus: true,
//     },
//   });

//   if (!eventSelected) {
//     throw new Error("Event not found");
//   }

//   const menu = eventSelected.menus.find(
//     (item: any) => item.type === subContentType
//   );

//   let pass = false;
//   if (subContentType !== "content") {
//     pass = true;
//   }

//   const perm = await hasPermission(
//     "events_admin",
//     PERMISSION_ACCESS_TYPES.view_and_edit,
//     ctx.companyMembership.id
//   );

//   if (!perm && !pass) {
//     throw new Error("NO_PERMISSION");
//   }

//   // Handle date conversion
//   const isValidDate = (d: any) => d && !isNaN(new Date(d).getTime());
//   const cleanStartDate = isValidDate(startDate) ? new Date(startDate) : undefined;
//   const cleanEndDate = isValidDate(endDate) ? new Date(endDate) : undefined;

//   // Build content input
//   const contentCreateInput: any = {
//     id: contentId,
//     name,
//     body,
//     imageURL,
//     linkURL,
//     subContentType,
//     pricingType,
//     keywords: { set: keywords },
//     images: { set: images },
//     isCartAvailable,
//     isScheduleAvailable,
//     isPricingAvailable,
//     isConstraintAvailable,
//     isVenueChecked,
//     selectedVenue,
//     startDate: cleanStartDate,
//     endDate: cleanEndDate,
//   };

//   if (links.length > 0) {
//     contentCreateInput.links = {
//       set: links.map((item: any) => ({
//         ...item,
//         id: new ObjectId().toString(),
//       })),
//     };
//   }
  
//   if (pricingMaster?.currency) {
//     contentCreateInput.pricingMaster = {
//       create: {
//         id: PricingId,
//         currency: pricingMaster.currency ?? null,
//         price: pricingMaster.price ?? null,
//         slots: pricingMaster.slots ?? null,
//         duration: pricingMaster.duration ?? null,
//         tax: pricingMaster.tax ?? null,
//         availability_weeks: { set: pricingMaster.availability_weeks ?? [] },
//         availability_hours: { set: pricingMaster.availability_hours ?? [] },
//         employee: {
//           connect: [{ id: eventSelected.organiser.id }],
//         },
//       },
//     };
//   }

//   if (pricingEmployee.length > 0 && pricingMaster) {
//     contentCreateInput.pricing = {
//       create: pricingEmployee.map((employee: any) => ({
//         id: new ObjectId().toString(),
//         price: employee.price,
//         currency: pricingMaster.currency,
//         tax: pricingMaster.tax ?? null,
//         employee: {
//           connect: [{ id: employee.id }],
//         },
//         duration: pricingMaster.duration ?? 90,
//         slots: pricingMaster.slots ?? null,
//         availability_weeks: {
//           set: pricingMaster.availability_weeks ?? [],
//         },
//         availability_hours: {
//           set: pricingMaster.availability_hours ?? [],
//         },
//         show_rating: employee.show_rating ?? false,
//       })),
//     };
//   }

//   console.log("saving content:", contentCreateInput);

//   await prisma.platformEvent.update({
//     where: { id: eventId },
//     data: {
//       contents: {
//         create: contentCreateInput,
//       },
//     },
//   });

//   console.log("content created:",contentId, PricingId);
//   return { id: contentId, pricingId: PricingId};
// }

  // async createPlatformEventContent(
  //   @Arg("data") data: CreatePlatformEventContentInput,
  //   @Ctx() ctx: Context
  // ) {
  //   const {
  //     eventId,
  //     name,
  //     body,
  //     imageURL,
  //     linkURL,
  //     keywords,
  //     images,
  //     links,
  //     isCartAvailable,
  //     isScheduleAvailable,
  //     isPricingAvailable,
  //     isConstraintAvailable,
  //     isVenueChecked,
  //     selectedVenue,
  //     pricingType,
  //     pricingMaster,
  //     pricingEmployee,
  //     subContentType,
  //     startDate,
  //     endDate,
  //   } = data;

  //   const contentId = new ObjectId().toString();
  //   const eventSelected: any = await prisma.platformEvent.findUnique({
  //     where: { id: eventId }, // Specify the ID of the event to fetch
  //     include: {
  //       organiser: {
  //         select: {
  //           id: true,
  //           company: {
  //             select: {
  //               stripeAccountId: true,
  //             },
  //           },
  //         },
  //       },
  //       menus: true,
  //     },
  //   });

  //   const menu = eventSelected.menus.find(
  //     (item: any) => item.type === subContentType
  //   );
  //   // const userAdmin = menu ? menu.userAdmin.map((item: any) => item.id) : [];

  //   let pass = false;
  //   if (
  //     subContentType &&
  //     subContentType !== "content"
  //     //userAdmin.includes(ctx.user.id)
  //   ) {
  //     pass = true;
  //   }

  //   // Permissions check
  //   let perm = await hasPermission(
  //     "events_admin",
  //     PERMISSION_ACCESS_TYPES.view_and_edit,
  //     ctx.companyMembership.id
  //   );

  //   if (!perm && !pass) return { error: "NO_PERMISSION" };

  //   // if (eventSelected && !eventSelected?.organiser?.company?.stripeAccountId) {
  //   //   throw new Error("Need to setup Connect Account first");
  //   // }
  //   const isValidDate = (d: any) => {
  //     return d && !isNaN(new Date(d).getTime());
  //   };
    
  //   const cleanStartDate = isValidDate(data.startDate) ? new Date(data.startDate) : undefined;
  //   const cleanEndDate = isValidDate(data.endDate) ? new Date(data.endDate) : undefined;
  //   data.startDate = cleanStartDate;
  //   data.endDate=cleanEndDate;
  //   console.log("need to setup", data, contentId);
  //   await prisma.platformEvent.update({
  //     where: { id: eventId },
  //     data: {
  //       contents: {
  //         create: {
  //           id: contentId,
  //           name,
  //           body,
  //           imageURL,
  //           linkURL,
  //           subContentType: subContentType || "content",
  //           pricingType: pricingType || "MULTIPLE",
  //           keywords: {
  //             set: keywords,
  //           },
  //           pricing: {
  //             create: (pricingEmployee || []).map((employee: any) => ({
  //               id: new ObjectId().toString(),
  //               price: employee.price,
  //               currency: pricingMaster.currency,
  //               tax: pricingMaster.tax || null,
  //               employee: {
  //                 connect: [{ id: employee.id }],
  //               },
  //               duration: pricingMaster.duration || 90,
  //               slots: pricingMaster.slots,
  //               availability_weeks: {
  //                 set: pricingMaster.availability_weeks,
  //               },
  //               availability_hours: {
  //                 set: pricingMaster.availability_hours,
  //               },
  //               show_rating: employee.show_rating,
  //             })),
  //           },
  //           images: {
  //             set: images,
  //           },
  //           links: {
  //             set: links.map((item: any) => ({
  //               ...item,
  //               id: new ObjectId().toString(),
  //             })),
  //           },
  //           pricingMaster: {
  //             create: {
  //               id: new ObjectId().toString(),
  //               currency: pricingMaster.currency || null,
  //               price: pricingMaster.price || null,
  //               slots: pricingMaster.slots || null,
  //               duration: pricingMaster.duration || null,
  //               tax: pricingMaster.tax || null,
  //               availability_weeks: {
  //                 set: pricingMaster.availability_weeks,
  //               },
  //               availability_hours: {
  //                 set: pricingMaster.availability_hours,
  //               },
  //               employee: {
  //                 connect: [{ id: eventSelected.organiser.id }],
  //               },
  //             },
  //           },
  //           startDate,
  //           endDate,
  //           isCartAvailable,
  //           isScheduleAvailable,
  //           isPricingAvailable,
  //           isConstraintAvailable,
  //           isVenueChecked,
  //           selectedVenue,
            
  //         },
  //       },
  //     },
  //   });
  //   console.log("onlypay", contentId)
  //   return {id: contentId}
    
  // }

  @Authorized()
  @Mutation((returns) => json)
  async updatePlatformEventContent(
    @Arg("data") data: UpdatePlatformEventContentInput,
    @Ctx() ctx: Context
  ) {
    const {
      eventId,
      contentId,
      name,
      body,
      imageURL,
      linkURL,
      keywords,
      images,
      links,
      isCartAvailable,
      isScheduleAvailable,
      isPricingAvailable,
      isConstraintAvailable,
      isVenueChecked,
      selectedVenue,
      startDate,
      endDate,
      pricingType,
      pricingMaster,
      pricingEmployee,
      subContentType,
    } = data;

    const currentEvent: any = await prisma.platformEvent.findUnique({
      where: { id: eventId }, // Specify the ID of the event to fetch
      select: {
        // Use select to specify the fields you want to retrieve
        id: true,
        organiser: {
          select: {
            id: true,
            company: {
              select: {
                stripeAccountId: true,
              },
            },
          },
        },
        menus: {
          select: {
            type: true,
          },
        },
        contents: {
          select: {
            id: true,
            pricing: {
              select: {
                id: true,
                employee: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            links: {
              select: {
                id: true,
                name: true,
                link: true,
              },
            },
          },
        },
      },
    });

    const menu = currentEvent.menus.find(
      (item: any) => item.type === subContentType
    );

    //const userAdmin = menu ? menu.userAdmin.map((item: any) => item.id) : [];

    let pass = false;
    if (
      subContentType &&
      subContentType !== "content"
      // userAdmin.includes(ctx.user.id)
    ) {
      pass = true;
    }
    // Permissions check
    let perm = await hasPermission(
      "events_admin",
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm && !pass) return { error: "NO_PERMISSION" };

    // if (currentEvent && !currentEvent?.organiser?.company?.stripeAccountId) {
    //   throw new Error("Need to setup Connect Account first");
    // }

    const existingPricingId = pricingEmployee
      .map((item: any) => item.pricingId)
      .filter(Boolean);

    const currentContent = currentEvent.contents.find(
      (content: any) => content.id === contentId
    );
    const deletedPricing = currentContent.pricing.filter(
      (item: any) => !existingPricingId.includes(item.id)
    );
    const updatePricing = pricingEmployee.filter((item: any) => item.pricingId);
    const newPricing = pricingEmployee.filter((item: any) => !item.pricingId);

    if (deletedPricing.length) {
      // await prisma.deleteManyPlatformEventContentPricings({
      //   id_in: deletedPricing
      // })
      console.log("eventId", eventId);
      for (let idx = 0; idx < deletedPricing.length; idx++) {
        await prisma.platformEvent.update({
          where: { id: eventId }, // Specify the ID of the event to update
          data: {
            contents: {
              update: {
                where: {
                  id: contentId, // Specify the ID of the content to update
                },
                data: {
                  pricing: {
                    delete: {
                      id: deletedPricing[idx].id, // Specify the ID of the pricing to delete
                    },
                  },
                },
              },
            },
          },
        });
      }
    }

    if (links) {
      for (let idx = 0; idx < currentContent.links.length; idx++) {
        // Retrieve the current data to modify the array.
        const currentContent = await prisma.platformEvent.findUnique({
          where: { id: eventId },
          select: {
            contents: {
              select: {
                id: true,
                links: true, // Ensure links are fetched to modify them.
              },
              where: {
                id: contentId,
              },
            },
          },
        });

        // Filter out the link to remove.
        const updatedLinks = currentContent.contents[0].links.filter(
          (link) => link.id !== currentContent.contents[0].links[idx].id
        );

        // Update the content with the modified array.
        await prisma.platformEvent.update({
          where: { id: eventId },
          data: {
            contents: {
              update: {
                where: { id: contentId },
                data: {
                  links: updatedLinks, // Set the new array without the removed item.
                },
              },
            },
          },
        });
      }
    }

    if (updatePricing.length) {
      updatePricing.forEach(async (employee: any) => {
        await prisma.platformEventContentPricing.update({
          where: {
            id: employee.pricingId, // Specify the ID of the pricing record to update
          },
          data: {
            price: employee.price, // Update the price
            currency: pricingMaster.currency, // Update the currency
            employee: {
              connect: [{ id: employee.id }], // Connect the employee by ID
            },
            tax: pricingMaster.tax || null, // Update the tax or set to null
            duration: pricingMaster.duration || 90, // Update the duration with a default value
            slots: pricingMaster.slots, // Update the slots
            availability_weeks: {
              set: pricingMaster.availability_weeks, // Set availability weeks
            },
            availability_hours: {
              set: pricingMaster.availability_hours, // Set availability hours
            },
            show_rating: employee.show_rating, // Update show rating
          },
        });
      });
    }

    let pricingMasterItem = null;
    if (!pricingMaster.id) {
      pricingMasterItem = await prisma.platformEventContentPricing.create({
        data: {
          id: new ObjectId().toString(), // Generate a new ID
          currency: pricingMaster.currency, // Set the currency
          price: pricingMaster.price, // Set the price
          slots: pricingMaster.slots, // Set the number of slots
          tax: pricingMaster.tax || null, // Set tax or null
          duration: pricingMaster.duration, // Set the duration
          availability_weeks: {
            set: pricingMaster.availability_weeks, // Set availability weeks
          },
          availability_hours: {
            set: pricingMaster.availability_hours, // Set availability hours
          },
          employee: {
            connect: [{ id: currentEvent.organiser.id }], // Connect the employee by ID
          },
        },
      });
    } else {
      pricingMasterItem = await prisma.platformEventContentPricing.update({
        where: {
          id: pricingMaster.id, // Specify the ID of the pricing master to update
        },
        data: {
          currency: pricingMaster.currency, // Update the currency
          price: pricingMaster.price, // Update the price
          slots: pricingMaster.slots, // Update the number of slots
          duration: pricingMaster.duration, // Update the duration
          tax: pricingMaster.tax || null, // Update tax or set to null
          availability_weeks: {
            set: pricingMaster.availability_weeks, // Set availability weeks
          },
          availability_hours: {
            set: pricingMaster.availability_hours, // Set availability hours
          },
          employee: {
            connect: [{ id: currentEvent.organiser.id }], // Connect the employee by ID
          },
        },
      });
    }

    return await prisma.platformEvent.update({
      where: { id: eventId },
      data: {
        contents: {
          update: {
            where: {
              id: contentId, // Specify the content ID to update
            },
            data: {
              name,
              body,
              imageURL,
              linkURL,
              subContentType: subContentType || "content", // Default value if not provided
              pricingType: pricingType || "MULTIPLE", // Default pricing type
              keywords: {
                set: keywords, // Set keywords
              },
              images: {
                set: images, // Set images
              },
              links: links.map((item: any) => ({
                ...item,
                id: new ObjectId().toString(), // Generate new ID for links
              })),

              pricing: {
                create: (newPricing || []).map((employee: any) => ({
                  id: new ObjectId().toString(), // Generate new ID for pricing
                  price: employee.price,
                  currency: pricingMaster.currency,
                  employee: {
                    connect: [
                      { id: employee.id }, // Connect to the employee
                    ],
                  },
                  tax: pricingMaster.tax || null, // Set tax or null
                  duration: pricingMaster.duration || 90, // Default duration
                  slots: pricingMaster.slots,
                  availability_weeks: {
                    set: pricingMaster.availability_weeks, // Set availability weeks
                  },
                  availability_hours: {
                    set: pricingMaster.availability_hours, // Set availability hours
                  },
                  show_rating: employee.show_rating, // Set show rating
                })),
              },
              pricingMaster: {
                connect: {
                  id: pricingMasterItem.id, // Connect to the pricing master
                },
              },
              startDate,
              endDate,
              isCartAvailable,
              isScheduleAvailable,
              isPricingAvailable,
              isConstraintAvailable,
              isVenueChecked,
              selectedVenue,
            },
          },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async deletePlatformEventContent(
    @Arg("data") data: DeletePlatformEventContentInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      "events_admin",
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    const { eventId, contentId } = data;
    return await prisma.platformEvent.update({
      where: { id: eventId }, // Specify the event ID to update
      data: {
        contents: {
          delete: { id: contentId }, // Specify the content ID to delete
        },
      },
    });
  }

  @Query((returns) => json)
  async getAllEventContents(
    @Arg("data") data: GetEventContentsInput,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;
    return await prisma.platformEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        contents: {
          select: {
            id: true,
            name: true,
            body: true,
            imageURL: true,
            linkURL: true,
            keywords: true,
            createdAt: true,
            updatedAt: true,
            contentStatus: true,
            images: true,
            links: {
              select: {
                name: true,
                link: true,
              },
            },
            pricing: {
              select: {
                id: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    avatar: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        avatar: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
                slots: true,
                tax: true,
                remaining_slots: true,
                booked_slots: true,
                availability_weeks: true,
                availability_hours: true,
                show_rating: true,
              },
            },
            startDate: true,
            endDate: true,
            isCartAvailable: true,
            isScheduleAvailable: true,
            isPricingAvailable: true,
            isVenueChecked: true,
            selectedVenue: true,
            isConstraintAvailable: true,
            pricingType: true,
            pricingMaster: {
              select: {
                id: true,
                currency: true,
                price: true,
                duration: true,
                slots: true,
                tax: true,
                remaining_slots: true,
                booked_slots: true,
                availability_weeks: true,
                availability_hours: true,
              },
            },
            subContentType: true,
          },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async createPlatformEventContentPricing(
    @Arg("data") data: CreatePlatformEventContentPricingInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      "events_admin",
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );

    if (!perm) return { error: "NO_PERMISSION" };

    const {
      eventId,
      contentId,
      price,
      currency,
      employee,
      duration,
      slots,
      availability_weeks,
      availability_hours,
    } = data;
    const event = await prisma.platformEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        name_check: true,
        slug: true,
        description: true,
        description_check: true,
        startAt: true,
        endAt: true,
        id_number: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        platformEventType: true,
        theme: {
          select: {
            logoURL: true,
            primaryColour: true,
            primaryTextColour: true,
            secondaryColour: true,
            secondaryTextColour: true,
          },
        },
        organiser: {
          select: {
            id: true,
            status: true,
            role: true,
            email: true,
            avatar: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                email: true,
              },
            },
            profiles: {
              select: {
                locale: true,
                bio: true,
                keywords: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
                currency: true,
                address: {
                  select: {
                    town: true,
                    country: true,
                    address: true,
                    postcode: true,
                  },
                },
                logoURL: true,
                email: true,
                url: true,
                vatNum: true,
                regNum: true,
                info: true,
                profiles: {
                  select: {
                    locale: true,
                    bio: true,
                    keywords: true,
                  },
                },
                category: true,
                business_type: true,
                representativeContact: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
                billingDefaultType: true,
                landline: true,
              },
            },
          },
        },
        language: true,
        location: true,
        location_check: true,
        timezone: true,
        timezone_check: true,
        timezoneLocation: true,
        qr_code_url: true,
        qr_code_url_check: true,
        privacy: true,
        privacy_check: true,
        legal: true,
        legal_check: true,
        contact_us: true,
        contact_us_check: true,
        your_data: true,
        your_data_check: true,
        header_image: true,
        header_image_check: true,
        left_image: true,
        left_image_check: true,
        right_image: true,
        right_image_check: true,
        attendee_preferences: true,
        company_preferences: true,
        menusOrder: true,
        maximumAttendees: true,
      },
    });

    const company = await checkIfUserIsInCompany(
      ctx.user.id,
      event.organiser.company.id
    );

    if (company && !company.stripeAccountId) {
      throw new Error("Need to setup Connect Account first");
    }
    return await prisma.platformEvent.update({
      where: { id: eventId },
      data: {
        contents: {
          update: {
            where: { id: contentId },
            data: {
              pricing: {
                create: {
                  id: new ObjectId().toString(), // Generate a new ObjectId
                  price,
                  currency,
                  employee: {
                    connect: employee.map((item: string) => ({ id: item })),
                  },
                  duration,
                  slots,
                  availability_weeks: {
                    set: availability_weeks,
                  },
                  availability_hours: {
                    set: availability_hours,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async updatePlatformEventContentPricing(
    @Arg("data") data: UpdatePlatformEventContentPricingInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      "events_admin",
      PERMISSION_ACCESS_TYPES.view_and_edit,
      ctx.companyMembership.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    const {
      eventId,
      contentId,
      contentPricingId,
      price,
      currency,
      employee,
      duration,
      slots,
      availability_weeks,
      availability_hours,
    } = data;
    return await prisma.platformEventContentPricing.update({
      where: { id: contentPricingId },
      data: {
        price,
        currency,
        employee: {
          connect: employee.map((item: string) => ({ id: item })),
        },
        duration,
        slots,
        availability_weeks: {
          set: availability_weeks,
        },
        availability_hours: {
          set: availability_hours,
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async deletePlatformEventContentPricing(
    @Arg("data") data: DeletePlatformEventContentPricingInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      "events_admin",
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      ctx.companyMembership.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    const { eventId, contentId, contentPricingId } = data;
    return await prisma.platformEvent.update({
      where: { id: eventId },
      data: {
        contents: {
          update: {
            where: { id: contentId },
            data: {
              pricing: {
                delete: {
                  id: contentPricingId,
                },
              },
            },
          },
        },
      },
    });
  }

  @Query((returns) => json)
  async getAllEventContentsPricing(
    @Arg("data") data: GetEventContentsPricingInput,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    return await prisma.platformEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        contents: {
          select: {
            id: true,
            name: true,
            body: true,
            imageURL: true,
            linkURL: true,
            keywords: true,
            createdAt: true,
            updatedAt: true,
            pricing: {
              select: {
                id: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
                slots: true,
                availability_weeks: true,
                availability_hours: true,
              },
            },
          },
        },
      },
    });
  }

  @Query((returns) => json)
  async getEventContentPricing(
    @Arg("data") data: GetEventContentPricingInput,
    @Ctx() ctx: Context
  ) {
    const { eventId, contentId, contentPricingId } = data;

    const eventContents: any = await prisma.platformEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        contents: {
          select: {
            id: true,
            name: true,
            body: true,
            imageURL: true,
            linkURL: true,
            keywords: true,
            createdAt: true,
            updatedAt: true,
            pricing: {
              select: {
                id: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    eventContents.content = eventContents.contents.find(
      (item: any) => item.id === contentId
    );
    if (eventContents.content) {
      eventContents.content.pricing = eventContents.content.pricing.find(
        (item: any) => item.id === contentPricingId
      );
    }

    delete eventContents.contents;

    return eventContents;
  }

  @Query((returns) => json)
  async getEventVenues(@Arg("data") data: GetEventInput, @Ctx() ctx: Context) {
    const { id } = data;

    const venues = await prisma.platformEventVenue.findMany({
      where: {
        platformEvent: { id },
        status: { not: "ARCHIVED" },
      },
    });

    for (let v of venues) {
      const slotsForVenue = await prisma.platformEventSlot.findMany({
        where: {
          venue: { id: v.id },
        },
        select: {
          startAt: true,
          endAt: true,
        },
      });

      v["bookedSlots"] = slotsForVenue;
    }

    return venues;
  }

  @Query((returns) => json)
  async getPlatformEventMembers(
    @Arg("data") data: EventIdentifierInput,
    @Ctx() ctx: Context
  ) {
    const { eventType, id } = data;

    const members = await prisma.platformEventMember.findMany({
      where: { platformEvent: { id } },

      select: {
        id: true,
        platformEvent: true,
        profile: {
          select: {
            company: true,
          },
        },
        role: true,
        status: true,
        user: true,
      },
    });

    return members;
  }

  @Query((returns) => json)
  async getEvent(@Arg("data") data: GetEventInput, @Ctx() ctx: Context) {
    const { id, slug, eventType } = data;

    const select = {
      id: true,
      name: true,
      name_check: true,
      slug: true,
      description: true,
      description_check: true,
      startAt: true,
      endAt: true,
      id_number: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      platformEventType: true,
      theme: {
        select: {
          logoURL: true,
          primaryColour: true,
          primaryTextColour: true,
          secondaryColour: true,
          secondaryTextColour: true,
          calendarPrimaryColour: true,
          calendarSecondaryColour: true,
        },
      },
      organiser: {
        select: {
          id: true,
          status: true,
          role: true,
          email: true,
          avatar: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true,
            },
          },
          profiles: {
            select: {
              locale: true,
              bio: true,
              keywords: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              currency: true,
              address: {
                select: {
                  town: true,
                  country: true,
                  address: true,
                  postcode: true,
                },
              },
              logoURL: true,
              email: true,
              url: true,
              vatNum: true,
              regNum: true,
              info: true,
              profiles: {
                select: {
                  locale: true,
                  bio: true,
                  keywords: true,
                },
              },
              category: true,
              business_type: true,
              representativeContact: {
                select: {
                  id: true,
                  email: true,
                },
              },
              billingDefaultType: true,
              landline: true,
            },
          },
        },
      },
      menus: {
        include: {
          userRelations: true, // Ensure 'userRelations' exists in PlatformEventMenus
        },
      },
      language: true,
      location: true,
      location_check: true,
      timezone: true,
      timezone_check: true,
      timezoneLocation: true,
      qr_code_url: true,
      qr_code_url_check: true,
      privacy: true,
      privacy_check: true,
      legal: true,
      legal_check: true,
      contact_us: true,
      contact_us_check: true,
      your_data: true,
      your_data_check: true,
      header_image: true,
      header_image_check: true,
      left_image: true,
      left_image_check: true,
      right_image: true,
      right_image_check: true,
      attendee_preferences: true,
      company_preferences: true,

      menusOrder: true,
      maximumAttendees: true,
    };

    switch (eventType) {
      case EventType.PLATFORM_EVENT:
        try {
          if (id || slug) {
            const event = await prisma.platformEvent.findUnique({
              where: id ? { id } : { slug },
              select,
            });

            // Transform the result to include userAdmin and userVisible fields
            const transformedEvent = {
              ...event,
              menus: event.menus.map((menu: any) => {
                const userAdmin = menu.userRelations
                  .filter((relation) => relation.isAdmin)
                  .map((relation) => ({ id: relation.userId }));

                const userVisible = menu.userRelations
                  .filter((relation) => relation.isVisible)
                  .map((relation) => ({ id: relation.userId }));

                return {
                  ...menu,
                  userAdmin,
                  userVisible,
                  userRelations: undefined, // Remove the raw userRelations field
                };
              }),
            };

            return transformedEvent;
          }

          throw new Error(
            "Either id or slug must be provided for PLATFORM_EVENT"
          );
        } catch (error) {
          console.log(error.message);
        }

      case EventType.PLATFORM_EVENT_SLOT:
        if (!id) throw new Error("ID is required for PLATFORM_EVENT_SLOT");
        return await prisma.platformEventSlot.findUnique({
          where: { id },
          select,
        });

      default:
        if (!id) throw new Error("ID is required for CALENDAR_EVENT");
        return await prisma.calendarEvent.findUnique({
          where: { id },
          select,
        });
    }
  }

  @Query((returns) => json)
  async getEventAttendees(
    @Arg("data") data: EventIdentifierInput,
    @Ctx() ctx: Context
  ) {
    const { eventType, id } = data;

    const select = {
      attendees: {
        select: {
          id: true,
          invitationStatus: true,
          invitationEmail: true,
          eventType: true,
          updatedAt: true,
          invitee: {
            select: {
              id: true,
              status: true,
              role: true,
              email: true,
              avatar: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  email: true,
                },
              },
              profiles: {
                select: {
                  locale: true,
                  bio: true,
                  keywords: true,
                },
              },
              company: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  address: {
                    select: {
                      town: true,
                      country: true,
                      address: true,
                      postcode: true,
                    },
                  },
                  logoURL: true,
                  email: true,
                  url: true,
                  vatNum: true,
                  regNum: true,
                  info: true,
                  profiles: {
                    select: {
                      locale: true,
                      bio: true,
                      keywords: true,
                    },
                  },
                  category: true,
                  business_type: true,
                  representativeContact: {
                    select: {
                      id: true,
                      email: true,
                    },
                  },
                  billingDefaultType: true,
                  landline: true,
                },
              },
            },
          },
        },
      },
    };

    switch (eventType) {
      case EventType.PLATFORM_EVENT:
        return await prisma.platformEvent.findUnique({
          where: { id },
          select,
        });

      case EventType.PLATFORM_EVENT_SLOT:
        return await prisma.platformEventSlot.findUnique({
          where: { id },
          select,
        });

      default:
        return await prisma.calendarEvent.findUnique({
          where: { id },
          select,
        });
    }
  }

  @Query((returns) => json)
  async getEventCompanies(
    @Arg("data") data: EventIdentifierInput,
    @Ctx() ctx: Context
  ) {
    const { id } = data;

    const eventAttendees = await prisma.platformEvent.findUnique({
      where: { id },
      select: {
        attendees: {
          select: {
            id: true,
            invitationStatus: true,
            eventType: true,
            updatedAt: true,
            invitee: {
              select: {
                id: true,
                status: true,
                role: true,
                email: true,
                avatar: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    email: true,
                  },
                },
                profiles: {
                  select: {
                    locale: true,
                    bio: true,
                    keywords: true,
                  },
                },
                company: {
                  select: {
                    id: true,
                    name: true,
                    currency: true,
                    address: {
                      select: {
                        town: true,
                        country: true,
                        address: true,
                        postcode: true,
                      },
                    },
                    logoURL: true,
                    email: true,
                    url: true,
                    vatNum: true,
                    regNum: true,
                    info: true,
                    profiles: {
                      select: {
                        locale: true,
                        bio: true,
                        keywords: true,
                      },
                    },
                    category: true,
                    business_type: true,
                    representativeContact: {
                      select: {
                        id: true,
                        email: true,
                      },
                    },
                    billingDefaultType: true,
                    landline: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    let companies = [];

    eventAttendees["attendees"].forEach((atd) => {
      if (atd.invitationStatus !== InvitationStatus.ACCEPTED) return;
      let company = atd["invitee"]["company"];

      // Filter through companies to check if the company ID already exists
      if (
        companies.filter((o) => {
          return o["id"] === company["id"];
        }).length === 0
      ) {
        // If not, add the company to the companies array
        companies.push(company);
      }
    });

    return companies;
  }

  @Query((returns) => json)
  async getEventInvitation(@Arg("invitationID") invitationID: string) {
    return await prisma.eventInvitation.findUnique({
      where: {
        id: invitationID,
      },
    });
  }
  y;
  @Query((returns) => json)
  async checkEventAttendance(
    @Arg("data") data: GetEventAttendanceInput,
    @Ctx() ctx: Context
  ) {
    let queryData = {};
    switch (data.eventType) {
      case EventType.PLATFORM_EVENT:
        queryData = { platformEvent: { id: data.eventID } };
        break;
      case EventType.PLATFORM_EVENT_SLOT:
        queryData = { platformEventSlot: { id: data.eventID } };
        break;
      default:
        queryData = { calendarEvent: { id: data.eventID } };
        break;
    }

    if (data.companyMembershipID) {
      // Check attendance for specific membership ID
      return await prisma.eventInvitation.findMany({
        where: {
          invitee: {
            id: data.companyMembershipID,
          },
          ...queryData,
        },
      });
    } else {
      // Check attendance for the user, regardless of which membership
      return await prisma.eventInvitation.findMany({
        where: {
          invitee: {
            user: {
              id: ctx.user.id,
            },
          },
          ...queryData,
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          eventType: true,
          invitationStatus: true,
          lastInviteSent: true,
          invitee: {
            select: {
              id: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }
  }

  @Authorized()
  @Query((returns) => json)
  async getEmployeeCalendar(
    @Arg("companyMembershipIDs", (type) => [String])
    companyMembershipIDs: string[],
    @Ctx() ctx: Context
  ) {
    const calendars = await prisma.companyMembership.findMany({
      where: {
        id: {
          in: companyMembershipIDs,
        },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
          },
        },
        eventInvitations: {
          select: {
            id: true,
            createdAt: true,
            eventType: true,
            invitationStatus: true,
            invitee: {
              select: {
                id: true,
                avatar: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                user: {
                  select: {
                    id: true,
                    avatar: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            calendarEvent: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
              },
            },
            platformEvent: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
              },
            },
            platformEventSlot: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
                description: true,
                organiser: {
                  select: {
                    id: true,
                    company: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                venue: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    link: true,
                    platformEvent: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            platformEventPricingSlot: {
              select: {
                id: true,
                item: true,
                event: {
                  select: {
                    contents: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                pricing: {
                  select: {
                    employee: {
                      select: {
                        id: true,
                        avatar: true,
                        company: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                        user: {
                          select: {
                            id: true,
                            avatar: true,
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                    id: true,
                    currency: true,
                    price: true,
                    duration: true,
                  },
                },
                currentPrice: true,
                currentCurrency: true,
                quantity: true,
                type: true,
                user: {
                  select: {
                    id: true,
                    avatar: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                employeeActionBy: {
                  select: {
                    id: true,
                    avatar: true,
                    company: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        avatar: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                status: true,
                startAt: true,
                endAt: true,
              },
            },
          },
        },
      },
    });

    let contentDict = {};

    for (let cNo in calendars) {
      let c: any = calendars[cNo];
      if (c.user.id !== ctx.user.id) {
        // Calendar data is not for the current logged in user,
        // so limit the data we return here.
        for (let invNo in c.eventInvitations) {
          let invite = c.eventInvitations[invNo];
          if (
            invite.eventType === EventType.PLATFORM_EVENT_SLOT && // Is a platform event slot
            invite.invitationStatus !== InvitationStatus.DECLINED && // And invitation is not declined
            (invite.platformEventSlot?.organiser?.user?.id === ctx.user.id ||
              true) // And organiser is the logged in user
          ) {
            // Return the info
            continue;
          } else if (
            invite.eventType === EventType.PLATFORM_EVENT_PRICING_SLOT && // Is a platform event slot
            invite.invitationStatus !== InvitationStatus.DECLINED && // And invitation is not declined
            invite.platformEventPricingSlot?.user?.id === ctx.user.id // And organiser is the logged in user
          ) {
            // Return the info
            continue;
          } else if (
            invite.eventType !== EventType.PLATFORM_EVENT_SLOT || // Not a platform event slot
            invite.invitationStatus !== InvitationStatus.ACCEPTED // Or the invitation is not ACCEPTED
          ) {
            // We don't care about anything other than accepted meetings
            delete c.eventInvitations[invNo];
          } else {
            // For accepted meetings, we only want to return the start and
            // end date for privacy reasons (other people shouldn't be able
            // to see who someone from a different company is meeting with)
            c.eventInvitations[invNo] = {
              platformEventSlot: {
                startAt: invite.platformEventSlot?.startAt,
                endAt: invite.platformEventSlot?.endAt,
              },
            };
          }
        }
        // Just incase there's any null objects left in eventInvitations...
        c.eventInvitations = c.eventInvitations.filter(function (el) {
          return el != null;
        });
      }

      // Remove unnecessary data from the results, regardless who its for
      delete c.user;
    }

    return calendars;
  }

  @Mutation((returns) => json)
  async respondToInvite(
    @Arg("data") data: EventInvitationResponseInput,
    @Ctx() ctx: Context
  ) {
    const invitation = await prisma.eventInvitation.findUnique({
      where: {
        id: data.invitationID,
      },
    });

    if (!invitation) throw new Error("No invitation found for this ID");

    if (invitation.invitationStatus != InvitationStatus.AWAITING) {
      throw new Error("This inviation has expired or already been accepted");
    }

    // bypass the logic to check whether the inviation belongs to the user
    // justification: the invitation ID is unique and unguessable, and the only way to accept an invite
    // future idea: replace with more secure logic

    // if (!data.cartId) {
    //   const inviteeUser = await prisma.eventInvitation({id: data.invitationID}).invitee().user()
    //   if (inviteeUser?.id !== ctx.user.id) throw new Error('Current user does not have permission to accept this invitation')
    // }

    /* connect the currently logged in user to the event, regardless of who was connected earlier
    we are assuming only one person has the unique invitation ID and they might be using a different
    synkd ID than what the email was originally sent to */

    await prisma.eventInvitation.update({
      data: {
        invitee: {
          connect: {
            id: ctx.companyMembership.id,
          },
        },
      },
      where: {
        id: data.invitationID,
      },
    });

    // TODO: change the user in the original crmCluster

    switch (invitation.eventType) {
      case EventType.PLATFORM_EVENT_SLOT: // meeting invites
        let eventSlot: any = await prisma.eventInvitation.findUnique({
          where: {
            id: data.invitationID,
          },
          include: {
            platformEventSlot: true,
          },
        });
        eventSlot = eventSlot.platformEventSlot;

        // Update platform event slot with the new attendee
        await prisma.platformEventSlot.update({
          where: {
            id: eventSlot.id,
          },
          data: {
            attendees: {
              connect: {
                id: invitation.id,
              },
            },
          },
        });

        break;

      case EventType.PLATFORM_EVENT_PRICING_SLOT: // event
        if (data.invitationStatus === "DECLINED") {
          const { cartId } = data;

          const str = new stripe();

          await str.refund(cartId);
        }
        break;

      case EventType.PLATFORM_EVENT: // event
        if (data.invitationStatus === "ACCEPTED") {
          const eventSelected: any = await prisma.eventInvitation.findUnique({
            where: {
              id: data.invitationID,
            },
            select: {
              platformEvent: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  organiser: {
                    select: {
                      company: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                  cluster: {
                    select: {
                      id: true,
                      name: true,
                      subClusters: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                  customCluster: {
                    select: {
                      id: true,
                      name: true,
                      subClusters: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          const inviteeUser: any = await prisma.eventInvitation.findUnique({
            where: {
              id: data.invitationID,
            },
            select: {
              invitee: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          });

          const { platformEvent } = eventSelected;
          const { invitee } = inviteeUser;

          await addPlatformEventMember(
            platformEvent,
            invitee?.user,
            inviteeUser
          );

          try {
            // Dynamically find the main clusters based on more specific name checks
            //@ts-ignore
            let anualMembershipCluster = platformEvent?.cluster?.find(
              (item: any) =>
                item.name?.toLowerCase()?.includes("annual membership")
            );

            //@ts-ignore
            let membersCluster = platformEvent?.cluster?.find(
              (item: any) =>
                item.name?.toLowerCase()?.includes("membership") &&
                !item.name?.toLowerCase()?.includes("annual")
            );

            //@ts-ignore
            let QRCodeCluster = platformEvent?.cluster?.find((item: any) =>
              item.name?.toLowerCase()?.includes("code")
            );

            // Safely find specific sub-clusters within the found clusters
            let notPaidSubCluster = anualMembershipCluster?.subCluster?.find(
              (item: any) => item.name?.toLowerCase()?.includes("not")
            );

            //@ts-ignore
            let invitedSubCluster = membersCluster?.subCluster?.find(
              (item: any) => item.name?.toLowerCase()?.includes("invited")
            );

            // Assuming you're using Prisma to fetch a user
            const userSelected = await prisma.user.findUnique({
              where: { id: invitee.user.id },
            });

            // Create or retrieve CRM user
            let crmUser = await createOrGetCrmUser(
              platformEvent.organiser.company,
              {
                id: invitee.user.id,
                userData: {
                  firstName: userSelected?.firstName,
                  lastName: userSelected?.lastName,
                  email: userSelected?.email,
                  phone: userSelected?.phone,
                  gender: userSelected?.gender,
                  dob: userSelected?.dob,
                },
              },
              true
            );

            // Perform the update in one go using Prisma's nested update
            await prisma.crmCluster.updateMany({
              where: {
                id: { in: [membersCluster.id, anualMembershipCluster.id] },
              },
              data: {
                userIds: {
                  // Connect users by adding their user ID to the `userIds` array
                  push: crmUser.id,
                },
              },
            });

            // Update crmSubClusters with userIds
            await prisma.crmSubCluster.updateMany({
              where: {
                id: { in: [invitedSubCluster.id, notPaidSubCluster.id] },
              },
              data: {
                userIds: {
                  push: crmUser.id,
                },
              },
            });
          } catch (err) {
            console.log(`Error assigning clusters: `, err.message);
          }
        }
        break;
      case EventType.CALENDAR_EVENT:
        break;
    }

    return await prisma.eventInvitation.update({
      where: {
        id: data.invitationID,
      },
      data: {
        invitationStatus: data.invitationStatus,
        notificationStatus: "READ",
      },
    });
  }

  @Mutation((returns) => json)
  async updateNoticationStatus(
    @Arg("data") data: NotificationInput,
    @Ctx() ctx: Context
  ) {
    // const invitation = await prisma.eventInvitation({id: data.invitationID})

    // if (!invitation) throw new Error('No invitation found for this ID')
    switch (data.type) {
      case "CRM_USER":
        return await prisma.crmUser.update({
          where: {
            id: data.notificationID,
          },
          data: {
            notificationStatus: data.notificationStatus,
          },
        });
      case "CALENDAR_EVENT":
        return await prisma.calendarInvitation.update({
          where: {
            id: data.notificationID,
          },
          data: {
            notificationStatus: data.notificationStatus,
          },
        });
      case "BILLING":
        return await prisma.billingLedger.update({
          where: {
            id: data.notificationID,
          },
          data: {
            notificationStatus: data.notificationStatus,
          },
        });
      default:
        return await prisma.eventInvitation.update({
          where: {
            id: data.notificationID,
          },
          data: {
            notificationStatus: data.notificationStatus,
          },
        });
    }
  }

  @Mutation((returns) => json)
  async updateBulkNotifications(
    @Arg("data") data: ClearNotificationInput,
    @Ctx() ctx: Context
  ) {
    const groupedNotifications = data.notifications.reduce(
      (groups: any, notification: any) => {
        const type = notification.type;

        if (!groups[type]) {
          groups[type] = [];
        }

        groups[type].push(notification.notificationID);

        return groups;
      },
      {} as { [key: string]: any[] }
    );

    let result = [];

    await Object.keys(groupedNotifications).forEach(async (type) => {
      const notificationIDs = groupedNotifications[type];

      switch (type) {
        case "CRM_USER":
          const crm_user = await prisma.crmUser.updateMany({
            where: {
              id: {
                in: notificationIDs, // Correcting the syntax to use 'in'
              },
            },
            data: {
              notificationStatus: data.notificationStatus,
            },
          });

          //result.push({crm_user})

          break;

        case "CALENDAR_EVENT":
          const calendar = await prisma.calendarInvitation.updateMany({
            where: {
              id: {
                in: notificationIDs, // Correcting the syntax to use 'in'
              },
            },
            data: {
              notificationStatus: data.notificationStatus,
            },
          });

          //result.push({calendar})
          break;

        case "BILLING":
          const billing = await prisma.billingLedger.updateMany({
            where: {
              id: {
                in: notificationIDs, // Use 'in' to check against an array
              },
            },
            data: {
              notificationStatus: data.notificationStatus,
            },
          });

          //result.push({billing})
          break;

        default:
          const events = await prisma.eventInvitation.updateMany({
            where: {
              id: {
                in: notificationIDs, // Correctly use 'in' for checking against an array
              },
            },
            data: {
              notificationStatus: data.notificationStatus,
            },
          });

          //result.push({events})

          break;
      }
    });

    console.log("result: ", result);
    return result;
  }

  @Mutation((returns) => json)
  async archiveInvitation(
    @Arg("data") data: EventInvitationResponseInput,
    @Ctx() ctx: Context
  ) {
    const invitation = await prisma.eventInvitation.findUnique({
      where: {
        id: data.invitationID,
      },
    });

    if (!invitation) throw new Error("No invitation found for this ID");

    // if (!data.cartId) {
    //   const inviteeUser = await prisma.eventInvitation({id: data.invitationID}).invitee().user()

    //   if (inviteeUser.id !== ctx.user.id) throw new Error('Current user does not have permission to accept this invitation')
    // }

    return await prisma.eventInvitation.update({
      where: {
        id: data.invitationID,
      },
      data: {
        invitationStatus: data.invitationStatus,
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async getVenueCalendar(
    @Arg("venueIDs", (type) => [String]) venueIDs: string[]
  ) {
    let results = Promise.all(
      venueIDs.map(async (vId) => {
        const slotsForVenue = await prisma.platformEventSlot.findMany({
          where: {
            venue: { id: vId },
          },
          select: {
            startAt: true,
            endAt: true,
          },
        });

        return { id: vId, bookedSlots: slotsForVenue };
      })
    );

    return results;
  }

  @Mutation((returns) => json)
  async createEventInvitation(
    @Arg("data") data: CreateEventInvitationInput,
    @Ctx() ctx: Context
  ) {
    let notSendEmail = [];

    const event: any = await prisma.platformEvent.findUnique({
      where: {
        id: data.eventID,
      },
      select: {
        id: true,
        organiser: {
          select: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        cluster: {
          select: {
            id: true,
          },
        },
        maximumAttendees: true,
        attendees: {
          select: {
            id: true,
            invitationStatus: true,
            invitee: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log("createEventInvitation->event: ", event);
    // const uniqueAttendees = Array.from(new Set(event.attendees.map((item: any) => item.invitee.id)))
    // if (uniqueAttendees.length + 1 > event.maximumAttendees) throw new Error('Maximum attendees caps reached')

    if (data.inviteeEmails && data.inviteeEmails.length > 0) {
      for (let email of data.inviteeEmails) {
        console.log("createEventInvitation->sending Invitation to: ", email);

        try {
          await sendEventInvitation({
            eventID: data.eventID,
            eventType: data.eventType,
            email,
          });

          const userSelected = await prisma.user.findMany({
            where: {
              email: email, // Assuming 'email' is a unique field in your database
            },
          });

          let userData = {};

          if (userSelected.length) {
            userData = {
              firstName: userSelected[0]?.firstName,
              lastName: userSelected[0]?.lastName,
              email: userSelected[0]?.email,
              phone: userSelected[0]?.phone,
              gender: userSelected[0]?.gender,
              address: userSelected[0]?.address,
              dob: userSelected[0]?.dob,
            };
          }
        } catch (error) {
          console.log(error);
          notSendEmail.push(email);
        }
      }
    }

    if (
      data.inviteeCompanyMembershipIDs &&
      data.inviteeCompanyMembershipIDs.length > 0
    ) {
      for (let companyMembershipID of data.inviteeCompanyMembershipIDs) {
        await sendEventInvitation({
          eventID: data.eventID,
          eventType: data.eventType,
          companyMembershipID,
        });
      }
    }

    return {
      notSendEmail,
    };
  }

  @Mutation((returns) => json)
  async EventInvitation(
    @Arg("data") data: ResendEventInvitationInput,
    @Ctx() ctx: Context
  ) {}

  @Mutation((returns) => json)
  async resendEventInvitation(
    @Arg("data") data: ResendEventInvitationInput,
    @Ctx() ctx: Context
  ) {
    const eventInvite = await prisma.eventInvitation.findUnique({
      where: {
        id: data.eventInvitationID,
      },
      select: {
        id: true,
        lastInviteSent: true,
        invitee: {
          select: {
            id: true,
            status: true,
            role: true,
            email: true,
            avatar: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                email: true,
              },
            },
            profiles: {
              select: {
                locale: true,
                bio: true,
                keywords: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
                currency: true,
                address: {
                  select: {
                    town: true,
                    country: true,
                    address: true,
                    postcode: true,
                  },
                },
                logoURL: true,
                email: true,
                url: true,
                vatNum: true,
                regNum: true,
                info: true,
                profiles: {
                  select: {
                    locale: true,
                    bio: true,
                    keywords: true,
                  },
                },
                category: true,
                business_type: true,
                representativeContact: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
                billingDefaultType: true,
                landline: true,
              },
            },
          },
        },
      },
    });

    if (!eventInvite) {
      throw new Error("Event invitation not found");
    }

    // Check if the invite was sent in the last 24 hours
    const isLessThan24Hr = moment(eventInvite.lastInviteSent).isAfter(
      moment().subtract(1, "days")
    );
    if (isLessThan24Hr) {
      throw new Error(
        `You have already resent this invite in the last 24 hours`
      );
    }

    let eventDetails: any;
    switch (data.eventType) {
      case EventType.PLATFORM_EVENT:
      default:
        eventDetails = await prisma.eventInvitation.findUnique({
          where: {
            id: data.eventInvitationID,
          },
          select: {
            platformEvent: {
              select: {
                name: true,
                slug: true,
                organiser: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });
        eventDetails = eventDetails?.platformEvent;
        break;

      case EventType.CALENDAR_EVENT:
        eventDetails = await prisma.eventInvitation.findUnique({
          where: {
            id: data.eventInvitationID,
          },
          include: {
            calendarEvent: {
              select: {
                name: true,
                organiser: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });
        eventDetails = eventDetails?.calendarEvent;
        break;

      case EventType.PLATFORM_EVENT_SLOT:
        eventDetails = await prisma.eventInvitation.findUnique({
          where: {
            id: data.eventInvitationID,
          },
          select: {
            platformEventSlot: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
                event: {
                  select: {
                    name: true,
                    slug: true,
                    organiser: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        eventDetails = eventDetails?.platformEventSlot;
        break;
    }

    if (
      !eventDetails ||
      ctx.companyMembership.id !== eventDetails.organiser.id
    ) {
      throw new Error(`Can't resend invite - no permission`);
    }

    await _actuallySendEventInvitation(
      data.eventType,
      eventDetails,
      eventInvite.invitee,
      eventInvite
    );

    await prisma.eventInvitation.update({
      where: {
        id: eventInvite.id,
      },
      data: {
        lastInviteSent: new Date(),
      },
    });

    return { result: "success" };
  }

  @Authorized()
  @Mutation((returns) => json)
  async addContentToCart(
    @Arg("data") data: AddContentToCartInput,
    @Ctx() ctx: Context
  ) {
    const { eventId, itemId, priceId, type, quantity } = data;
    const pricing = await prisma.platformEventContentPricing.findUnique({
      where: {
        id: priceId,
      },
    });

    // if (pricing.booked_slots + 1 > pricing.slots) {
    //   throw new Error('Slot already full')
    // }

    let key = Generator.generateString(18);
    let url = `https://my.synkd.life/relreq/${key}`;
    let dataUrl = await generateQrCode(url);
    console.log("QR")
    const cartItem = await prisma.platformEventCart.findMany({
      where: {
        item: itemId,
        type,
        event: { id: eventId },
        user: { id: ctx.user.id },
        pricing: { id: priceId },
        status: CartStatus.PENDING,
      },
    });

    if (cartItem.length > 0) {
      const itemSelected = cartItem[0];
      return await prisma.platformEventCart.update({
        where: {
          id: itemSelected.id,
        },
        data: {
          quantity: itemSelected.quantity + 1,
          userCompanyMembership: {
            connect: { id: ctx.companyMembership.id },
          },
        },
      });
    }
    // console.log("This is add to cart", data);
    const result = await prisma.platformEventCart.create({
      data: {
        id: new ObjectId().toString(),
        type,
        item: itemId,
        event: { connect: { id: eventId } },
        pricing: { connect: { id: priceId } },
        user: { connect: { id: ctx.user.id } },
        status: CartStatus.PENDING,
        qrcodeKey: key,
        quantity: quantity || 1,
        qrcodeImage: dataUrl,
        userCompanyMembership: {
          connect: { id: ctx.companyMembership.id },
        },
      },
    });

    if(result){
      return result
    } else {
      return {msg: "success"}
    }
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateCartItemQuantity(
    @Arg("data") data: UpdateCartItemQuantityInput,
    @Ctx() ctx: Context
  ) {
    const { cartId, quantity } = data;

    const cartItem = await prisma.platformEventCart.findUnique({
      where: {
        id: cartId,
      },
    });

    if (cartItem.quantity + quantity <= 0) {
      return await prisma.platformEventCart.delete({
        where: {
          id: cartId,
        },
      });
    }

    return await prisma.platformEventCart.update({
      where: {
        id: cartId,
      },
      data: {
        quantity: cartItem.quantity + quantity,
        userCompanyMembership: {
          connect: { id: ctx.companyMembership.id },
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async bookScheduleForCartItem(
    @Arg("data") data: BookScheduleForCartItemInput,
    @Ctx() ctx: Context
  ) {
    const { cartId, startAt, endAt } = data;

    const cartItem = await prisma.platformEventCart.findUnique({
      where: {
        id: cartId,
      },
    });

    return await prisma.platformEventCart.update({
      where: {
        id: cartId,
      },
      data: {
        startAt,
        endAt,
      },
    });
  }

  @Query((returns) => json)
  async getEventCartItem(
    @Arg("data") data: GetEventCartItemInput,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    const event: any = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        contents: {
          select: {
            id: true,
            name: true,
            body: true,
            imageURL: true,
            linkURL: true,
            keywords: true,
            createdAt: true,
            updatedAt: true,
            pricing: {
              select: {
                id: true,
                tax: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
            pricingMaster: {
              select: {
                id: true,
                tax: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    const cartItems: any = await prisma.platformEventCart.findMany({
      where: {
        event: { id: eventId },
        user: { id: ctx.user?.id },
        status: {
          not: CartStatus.ARCHIVED, // Ensuring archived status is excluded
        },
      },
      select: {
        id: true,
        item: true,
        pricing: {
          select: {
            id: true,
            tax: true,
            employee: {
              select: {
                id: true,
                email: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            currency: true,
            price: true,
            duration: true,
          },
        },
        type: true,
        quantity: true,
        qrcodeKey: true,
        qrcodeImage: true,
        createdAt: true,
        updatedAt: true,
        status: true,
      },
    });

    return cartItems.map((item: any) => {
      const content = event.contents.find(
        (content: any) => content?.id === item.item
      );

      item.item_detail = content;
      return item;
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async deleteEventCartItem(
    @Arg("data") data: DeleteEventCartItemInput,
    @Ctx() ctx: Context
  ) {
    const { cartId } = data;
    return await prisma.platformEventCart.delete({
      where: {
        id: cartId,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async checkoutEventCartItem(
    @Arg("data") data: CheckoutEventCartItemInput,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    const event: any = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        slug: true,
        contents: {
          select: {
            id: true,
            name: true,
          },
        },
        organiser: {
          select: {
            company: {
              select: {
                id: true,
                stripeAccountId: true,
              },
            },
          },
        },
      },
    });

    if (event) {
      const company = event.organiser.company;
      if (company) {
        const cartItems: any = await prisma.platformEventCart.findMany({
          where: {
            event: { id: eventId },
            user: { id: ctx.user.id },
            status: CartStatus.PENDING, // Filters carts with a status of PENDING
          },
          select: {
            id: true,
            item: true,
            pricing: {
              select: {
                id: true,
                tax: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
            type: true,
            quantity: true,
            qrcodeKey: true,
            qrcodeImage: true,
            createdAt: true,
            updatedAt: true,
            status: true,
          },
        });

        const totalAmount = cartItems.reduce(
          (acc: any, curr: any) => acc + curr.pricing.price * curr.quantity,
          0
        );
        const totalAmountTax = cartItems.reduce(
          (acc: any, curr: any) =>
            acc + isNaN(curr.pricing.tax)
              ? 0
              : (curr.pricing.price * curr.quantity * curr.pricing.tax) / 100,
          0
        );
        const items = cartItems.map((item: any) => {
          const content = event.contents.find(
            (content: any) => content.id === item.item
          );
          item.item_detail = content;
          return {
            name: content.name,
            amount: Math.round(
              (item.pricing.price +
                (isNaN(item.pricing.tax)
                  ? 0
                  : (item.pricing.price * item.pricing.tax) / 100)) *
                100
            ),
            currency: item.pricing.currency.toLowerCase(),
            quantity: item.quantity,
          };
        });

        if (items.length > 0) {
          const str = new stripe();

          const session = await str.getCheckoutSession(
            company.stripeAccountId,
            totalAmount,
            totalAmountTax,
            items,
            cartItems.map((item: any) => item.id),
            event.slug
          );

          return session;
        }
      }
    }
    return true;
  }

  @Authorized()
  @Mutation((returns) => json)
  async checkoutEventCartItemWithCard(
    @Arg("data") data: CheckoutEventCartItemInput,
    @Ctx() ctx: Context
  ) {
    const { eventId, cardStripeId } = data;

    const event: any = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        slug: true,
        contents: {
          select: {
            id: true,
            name: true,
          },
        },
        organiser: {
          select: {
            company: {
              select: {
                id: true,
                stripeAccountId: true,
              },
            },
          },
        },
      },
    });

    if (event) {
      const company = event.organiser.company;
      if (company) {
        const cartItems: any = await prisma.platformEventCart.findMany({
          where: {
            event: { id: eventId },
            user: { id: ctx.user.id },
            status: {
              in: [CartStatus.PENDING, CartStatus.PAYMENT_FAILED], // Filters carts with status PENDING or PAYMENT_FAILED
            },
          },
          select: {
            id: true,
            item: true,
            pricing: {
              select: {
                id: true,
                tax: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
            type: true,
            quantity: true,
            qrcodeKey: true,
            qrcodeImage: true,
            createdAt: true,
            updatedAt: true,
            status: true,
          },
        });

        const totalAmount = cartItems.reduce(
          (acc: any, curr: any) => acc + curr.quantity * curr.pricing.price,
          0
        );
        const totalAmountTax = cartItems.reduce(
          (acc: any, curr: any) =>
            acc +
            (isNaN(curr.pricing.tax)
              ? 0
              : (curr.quantity * curr.pricing.price * curr.pricing.tax) / 100),
          0
        );
        const items = cartItems.map((item: any) => {
          const content = event.contents.find(
            (content: any) => content.id === item.item
          );
          item.item_detail = content;
          return {
            name: content.name,
            amount: Math.round(
              (item.pricing.price +
                (isNaN(item.pricing.tax)
                  ? 0
                  : (item.pricing.price * item.pricing.tax) / 100)) *
                100
            ),
            currency: (item.pricing.currency || "gbp").toLowerCase(),
            quantity: item.quantity,
          };
        });

        if (items.length > 0) {
          const str = new stripe();

          const userCompany: any = await prisma.user.findUnique({
            where: {
              id: ctx.user.id,
            },
            select: {
              companies: {
                select: {
                  id: true,
                  company: {
                    select: {
                      id: true,
                      stripeCustomerId: true,
                    },
                  },
                },
              },
            },
          });

          // const session = await str.getCheckoutSession(company.stripeAccountId, totalAmount, totalAmountTax, items, cartItems.map((item: any) => item.id), event.slug);
          const session = await str.checkoutWithPaymentIntent(
            company.stripeAccountId,
            Math.round(totalAmount * 100),
            Math.round(totalAmountTax * 100),
            items,
            cartItems.map((item: any) => item.id),
            cartItems[0].pricing.currency || "gbp",
            userCompany.companies[0].company.stripeCustomerId,
            cardStripeId
          );

          return session;
        }
      }
    }
    return true;
  }

  @Query((returns) => json)
  async getEventCartItemByEmployee(
    @Arg("data") data: GetEventCartItemInput,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    const event: any = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        organiser: {
          select: {
            company: {
              select: {
                members: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        contents: {
          select: {
            id: true,
            name: true,
            body: true,
            imageURL: true,
            linkURL: true,
            keywords: true,
            createdAt: true,
            updatedAt: true,
            pricing: {
              select: {
                id: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    const userMemberships = await prisma.companyMembership.findMany({
      where: {
        user: { id: ctx.user.id },
      },
    });

    const companyMembers = event.organiser.company.members.map(
      (item: any) => item.id
    );
    const selectedMembership = userMemberships.find((member: any) =>
      companyMembers.includes(member.id)
    );
    const cartItems: any = await prisma.platformEventCart.findMany({
      where: {
        event: { id: eventId },
        pricing: {
          employee: {
            some: {
              id: selectedMembership.id,
            },
          },
        },
        status: {
          not: CartStatus.ARCHIVED,
        },
      },
      select: {
        id: true,
        item: true,
        pricing: {
          select: {
            id: true,
            employee: {
              select: {
                id: true,
                email: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            currency: true,
            price: true,
            duration: true,
          },
        },
        type: true,
        quantity: true,
        qrcodeKey: true,
        qrcodeImage: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        startAt: true,
        endAt: true,
      },
    });

    return cartItems.map((item: any) => {
      const content = event.contents.find(
        (content: any) => content.id === item.item
      );
      item.item_detail = content;
      return item;
    });
  }

  @Query((returns) => json)
  async getAllEventCartItem(
    @Arg("data") data: GetEventCartItemInput,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    const event: any = await prisma.platformEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        contents: {
          select: {
            id: true,
            name: true,
            body: true,
            imageURL: true,
            linkURL: true,
            keywords: true,
            createdAt: true,
            updatedAt: true,
            pricing: {
              select: {
                id: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    const cartItems: any = await prisma.platformEventCart.findMany({
      where: {
        event: { id: eventId },
        status: { not: CartStatus.ARCHIVED },
      },
      select: {
        id: true,
        item: true,
        pricing: {
          select: {
            id: true,
            employee: {
              select: {
                id: true,
                email: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            currency: true,
            price: true,
            duration: true,
          },
        },
        type: true,
        quantity: true,
        qrcodeKey: true,
        qrcodeImage: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        startAt: true,
        endAt: true,
      },
    });

    return cartItems.map((item: any) => {
      const content = event.contents.find(
        (content: any) => content.id === item.item
      );
      item.item_detail = content;
      return item;
    });
  }

  @Query((returns) => json)
  async getEventCartItemScheduledByEmployee(
    @Arg("data") data: GetEventCartItemScheduledByEmployeeInput,
    @Ctx() ctx: Context
  ) {
    const { eventId, companyMembershipIDs } = data;

    const event: any = await prisma.platformEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organiser: {
          select: {
            company: {
              select: {
                members: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        contents: {
          select: {
            id: true,
            name: true,
            body: true,
            imageURL: true,
            linkURL: true,
            keywords: true,
            createdAt: true,
            updatedAt: true,
            pricing: {
              select: {
                id: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    const cartItems: any = await prisma.platformEventCart.findMany({
      where: {
        event: { id: eventId },
        pricing: {
          employee: {
            some: {
              id: { in: companyMembershipIDs },
            },
          },
        },
        status: { not: CartStatus.ARCHIVED },
      },
      select: {
        id: true,
        item: true,
        pricing: {
          select: {
            id: true,
            employee: {
              select: {
                id: true,
                email: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            currency: true,
            price: true,
            duration: true,
          },
        },
        type: true,
        quantity: true,
        qrcodeKey: true,
        qrcodeImage: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        startAt: true,
        endAt: true,
      },
    });

    return cartItems.map((item: any) => {
      const content = event.contents.find(
        (content: any) => content.id === item.item
      );
      item.item_detail = content;
      return item;
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async archiveRestoreEvent(
    @Arg("data") data: ArchiveRestoreEventInput,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    const eventSelected = await prisma.platformEvent.findUnique({
      where: { id: eventId },
    });

    if (!eventSelected) throw new Error("Event not found");
    return await prisma.platformEvent.update({
      where: {
        id: eventId,
      },
      data: {
        status: eventSelected.status === "ARCHIVED" ? "LIVE" : "ARCHIVED",
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async acceptCartItem(
    @Arg("data") data: DeleteEventCartItemInput,
    @Ctx() ctx: Context
  ) {
    const { cartId } = data;

    return await prisma.platformEventCart.delete({
      where: {
        id: cartId,
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async sendContentNotification(
    @Arg("data") data: SendContentNotification,
    @Ctx() ctx: Context
  ) {
    const { emails } = data;

    for (let email of emails) {
      await sendEmail({
        from: { name: "Synkd", email: "no-reply@synkd.life" },
        to: email,
        template: "content-broadcast",
        // vars: {eventName: eventDetails.name, eventLink },
        subject: `Content Notification`,
      });
    }
    return true;
  }

  // @Authorized()
  // @Mutation((returns) => json)
  // async createNewEventSubCluster(
  //   @Arg("data") data: CreateNewEventSubClusterInput,
  //   @Ctx() ctx: Context
  // ) {
  //   const { userIds, name, eventId } = data;

  //   const event = await prisma.platformEvent.findUnique({
  //     where: {
  //       id: eventId,
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       description: true,
  //       organiser: {
  //         select: {
  //           company: {
  //             select: {
  //               id: true,
  //               name: true,
  //             },
  //           },
  //         },
  //       },
  //       attendees: {
  //         select: {
  //           id: true,
  //           invitationStatus: true,
  //           invitee: {
  //             select: {
  //               id: true,
  //               user: {
  //                 select: {
  //                   id: true,
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //       cluster: {
  //         select: {
  //           id: true,
  //         },
  //       },
  //     },
  //   });

  //   if (event?.cluster?.id) {
  //     const crmCluster = await prisma.crmCluster.findUnique({
  //       where: {
  //         id: event.cluster.id,
  //       },
  //     });

  //     const { id: subClusterID } = createObjectID();
  //     const crmSubCluster = await prisma.crmSubCluster.create({
  //       data: {
  //         clusterType: "EVENT",
  //         name: `${event.name} (${name})`,
  //         parentCluster: {
  //           connect: {
  //             id: crmCluster.id,
  //           },
  //         },
  //         id: subClusterID,
  //       },
  //     });

  //     for (let userId of userIds) {
  //       const userData = await prisma.user.findUnique({
  //         where: {
  //           id: userId,
  //         },
  //         select: {
  //           firstName: true,
  //           lastName: true,
  //           email: true,
  //           phone: true,
  //           dob: true,
  //         },
  //       });

  //       let crmUser = await createOrGetCrmUser(
  //         event.organiser.company,
  //         { id: userId, userData },
  //         true
  //       );

  //       await prisma.crmSubCluster.update({
  //         where: { id: crmSubCluster.id },
  //         data: {
  //           users: {
  //             connect: {
  //               id: crmUser.id,
  //             },
  //           },
  //         },
  //       });
  //     }

  //     return crmSubCluster;
  //   } else {
  //     throw new Error("No cluster found");
  //   }
  // }

  @Authorized()
  @Mutation((returns) => json)
  async createNewEventCluster(
    @Arg("data") data: CreateNewEventClusterInput,
    @Ctx() ctx: Context
  ) {
    const { userIds, name, eventId, subCluster } = data;

    const event = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        organiser: {
          select: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attendees: {
          select: {
            id: true,
            invitationStatus: true,
            invitee: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const { id } = createObjectID();

    const maximumSelections = 1;
    const minimumSelections = 1;
    const optionsWithID = [];

    // Create subcluster and record the ID in the options
    for (let option of subCluster) {
      optionsWithID.push({
        optionShortText: option,
        optionDescription: option,
        id: createObjectID().id,
      });
    }

    const crmQuestionValue = await prisma.crmQuestion.create({
      data: {
        company: {
          connect: {
            id: event.organiser.company.id,
          },
        },
        id,
        id_number: hashCode(id),
        questionShortText: name,
        questionDescription: name,
        maximumSelections,
        minimumSelections,
        status: "LIVE",
        type: "EVENT",
        options: {
          create: optionsWithID,
        },
      },
    });

    const parentCluster = await prisma.crmCluster.create({
      data: {
        name: name,
        description: name,
        company: {
          connect: {
            id: event.organiser.company.id,
          },
        },
        crmQuestion: {
          connect: {
            id: crmQuestionValue.id,
          },
        },
        clusterType: "AUTOMATED_EVENT",
        id: createObjectID().id,
      },
    });

    for (let option of optionsWithID) {
      const { id: subClusterID } = createObjectID();
      await prisma.crmSubCluster.create({
        data: {
          clusterType: "AUTOMATED_EVENT",
          name: option.optionShortText,
          parentCluster: {
            connect: {
              id: parentCluster.id,
            },
          },
          id: subClusterID,
          crmOption: {
            connect: {
              id: option.id,
            },
          },
        },
      });
    }

    for (let userId of userIds) {
      const userData = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dob: true,
        },
      });
      let crmUser = await createOrGetCrmUser(
        event.organiser.company,
        { id: userId, userData },
        true
      );

      await prisma.crmCluster.update({
        where: { id: parentCluster.id },
        data: {
          users: {
            connect: {
              id: crmUser.id,
            },
          },
        },
      });
    }

    return await prisma.platformEvent.update({
      where: {
        id: eventId,
      },
      data: {
        customCluster: {
          connect: {
            id: parentCluster.id,
          },
        },
      },
    });
  }

  @Query((returns) => json)
  async getAllEventTransactionHistory(
    @Arg("data") data: GetEventTransactionHistoryInput,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;
    return await prisma.platformEventTransaction.findMany({
      where: {
        event: {
          id: eventId,
        },
      },
      orderBy: {
        createdAt: "desc", // Use 'desc' for descending order
      },
      select: {
        id: true,
        event: {
          select: {
            id: true,
          },
        },
        amount: true,
        currency: true,
        status: true,
        carts: {
          select: {
            id: true,
            item: true,
            pricing: {
              select: {
                id: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
            type: true,
            quantity: true,
            qrcodeKey: true,
            qrcodeImage: true,
            xeroId: true,
            paymentIntentId: true,
            createdAt: true,
            updatedAt: true,
            status: true,
            startAt: true,
            endAt: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Returns all platform events that the user is either attending or has created
   */
  @Authorized()
  @Query((returns) => json)
  async getEventSubCluster(
    @Arg("data") data: GetEventSubCluster,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    const eventSelected = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        cluster: {
          select: {
            id: true,
            subClusters: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                name: true,
                description: true,
                clusterType: true,
                users: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return eventSelected?.cluster;
  }

  /**
   * Returns all platform events clusters
   */
  @Authorized()
  @Query((returns) => json)
  async getEventClusters(
    @Arg("data") data: GetEventSubCluster,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    const eventClusters = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        customCluster: {
          select: {
            id: true,
            name: true,
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            subClusters: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                name: true,
                description: true,
                clusterType: true,
                users: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        cluster: {
          select: {
            id: true,
            name: true,
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            subClusters: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                name: true,
                description: true,
                clusterType: true,
                users: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return eventClusters;
  }

  /**
   * Returns all platform events that the user is either attending or has created
   */
  // @Authorized()
  // @Query((returns) => json)
  // async getEventSubCluster(
  //   @Arg("data") data: GetEventSubCluster,
  //   @Ctx() ctx: Context
  // ) {
  //   const { eventId } = data;

  //   const eventSelected = await prisma.platformEvent.findUnique({
  //     where: {
  //       id: eventId,
  //     },
  //     select: {
  //       id: true,
  //       cluster: {
  //         select: {
  //           id: true,
  //           subClusters: {
  //             select: {
  //               id: true,
  //               createdAt: true,
  //               updatedAt: true,
  //               name: true,
  //               description: true,
  //               clusterType: true,
  //               users: {
  //                 select: {
  //                   id: true,
  //                   firstName: true,
  //                   lastName: true,
  //                   email: true,
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   return eventSelected?.cluster?.subClusters;
  // }

  /**
   * Returns all platform events custom clusters
   */
  @Authorized()
  @Query((returns) => json)
  async getEventCustomCluster(
    @Arg("data") data: GetEventSubCluster,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    const eventClusters: any = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        customCluster: {
          select: {
            id: true,
            name: true,
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            subClusters: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                name: true,
                description: true,
                clusterType: true,
                users: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        cluster: {
          select: {
            id: true,
            name: true,
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            subClusters: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                name: true,
                description: true,
                clusterType: true,
                users: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return eventClusters?.customCluster;
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateEventSubCluster(
    @Arg("data") data: UpdateEventSubCluster,
    @Ctx() ctx: Context
  ) {
    const { eventId, crmSubclusterId, users, name } = data;
    const eventSelected = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        name: true,
        organiser: {
          select: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const crmUsers = [];
    for (let userId of users) {
      const userData = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dob: true,
        },
      });

      let crmUser = await createOrGetCrmUser(
        eventSelected.organiser.company,
        { id: userId, userData },
        true
      );

      crmUsers.push(crmUser.id);
    }

    return await prisma.crmSubCluster.update({
      where: {
        id: crmSubclusterId,
      },
      data: {
        name: `${eventSelected.name} (${name})`,
        users: {
          set: crmUsers.map((item: any) => ({ id: item })),
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async updateEventCustomCluster(
    @Arg("data") data: UpdateEventCustomCluster,
    @Ctx() ctx: Context
  ) {
    const { eventId, crmClusterId, users, name } = data;
    const eventSelected = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        name: true,
        organiser: {
          select: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const crmUsers = [];
    for (let userId of users) {
      const userData = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dob: true,
        },
      });

      let crmUser = await createOrGetCrmUser(
        eventSelected.organiser.company,
        { id: userId, userData },
        true
      );

      crmUsers.push(crmUser.id);
    }

    return await prisma.crmCluster.update({
      where: {
        id: crmClusterId,
      },
      data: {
        name: name,
        users: {
          set: crmUsers.map((item: any) => ({ id: item })),
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async requestToJoinEvent(
    @Arg("data") data: EventRequestInvitationInput,
    @Ctx() ctx: Context
  ) {
    const { eventId, user, companyMembership } = data;

    const existing = await prisma.eventRequestInvitation.findMany({
      where: {
        event: {
          id: eventId,
        },
        requester: {
          id: user,
        },
        ...(companyMembership
          ? {
              requesterMembership: {
                id: companyMembership,
              },
            }
          : {}),
      },
    });

    if (existing.length) {
      return existing[0];
    }
    return await prisma.eventRequestInvitation.create({
      data: {
        id: createObjectID().id,
        event: {
          connect: {
            id: eventId,
          },
        },
        requester: {
          connect: {
            id: user,
          },
        },
        ...(companyMembership
          ? {
              requesterMembership: {
                connect: {
                  id: companyMembership,
                },
              },
            }
          : {}),
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async reponseRequestToJoinEvent(
    @Arg("data") data: ResponseRequestInvitationInput,
    @Ctx() ctx: Context
  ) {
    const { requestId, response } = data;
    if (response === InvitationStatus.ACCEPTED) {
      const requestEvent: any = await prisma.eventRequestInvitation.findUnique({
        where: {
          id: requestId,
        },
        select: {
          id: true,
          event: {
            select: {
              id: true,
              organiser: {
                select: {
                  company: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
              cluster: {
                select: {
                  id: true,
                },
              },
            },
          },
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          requesterMembership: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      console.log("reponseRequestToJoinEvent->requestEvent: ", requestEvent);

      await addPlatformEventMember(
        requestEvent?.event,
        requestEvent?.requester,
        requestEvent?.requesterMembership
      );

      try {
        console.log(
          "requestEvent?.event.customCluster: ",
          requestEvent?.event.customCluster
        );
        //const crmUser: any = await createOrGetCrmUser(requestEvent.event.organiser.company, { ...requestEvent.requester, userData: { ...requestEvent.requester } })
        let anualMembershipCluster = requestEvent?.event.customCluster?.find(
          (item: any) => item.name?.toLowerCase()?.includes("annual")
        );
        let notPaidSubCluster = anualMembershipCluster?.subClusters?.find(
          (item: any) => item.name?.toLowerCase()?.includes("not")
        );

        console.log("anualMembershipCluster: ", anualMembershipCluster);

        let acceptedCluster = requestEvent?.event?.customCluster?.find(
          (cluster: any) => !cluster.name?.toLowerCase()?.includes("membership")
        );
        let subCluster = acceptedCluster?.subClusters?.find((item: any) =>
          item.name?.toLowerCase()?.includes("joined")
        );

        console.log("acceptedCluster: ", acceptedCluster);

        if (acceptedCluster) {
          const user = requestEvent?.requester;
          let crmUser = await createOrGetCrmUser(
            requestEvent.event.organiser.company,
            {
              ...user,
              userData: {
                firstName: user?.firstName,
                lastName: user?.lastName,
                email: user?.email,
                phone: user?.phone,
                gender: user?.gender,
                dob: user?.dob,
              },
            },
            true
          );
          await prisma.crmSubCluster.update({
            where: { id: subCluster.id },
            data: {
              users: { connect: { id: crmUser.id } },
            },
          });
          await prisma.crmCluster.update({
            where: { id: acceptedCluster.id },
            data: {
              users: { connect: { id: crmUser.id } },
            },
          });

          await prisma.crmCluster.update({
            where: { id: anualMembershipCluster.id },
            data: {
              users: { connect: { id: crmUser.id } },
            },
          });
          await prisma.crmSubCluster.update({
            where: { id: notPaidSubCluster.id },
            data: {
              users: { connect: { id: crmUser.id } },
            },
          });
        }
      } catch (error) {
        console.log("error assigning cluster: ", error.message);
      }

      return await prisma.eventRequestInvitation.update({
        where: {
          id: requestId,
        },
        data: {
          status: response,
        },
      });
    }
  }

  @Query((returns) => json)
  async getRequestToJoinEventList(
    @Arg("data") data: GetEventSubCluster,
    @Ctx() ctx: Context
  ) {
    const invitations = await prisma.eventRequestInvitation.findMany({
      where: {
        event: {
          id: data.eventId,
        },
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        event: {
          select: {
            id: true,
            organiser: {
              select: {
                company: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            cluster: {
              select: {
                id: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        requesterMembership: {
          select: {
            id: true,
            email: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return invitations;
  }

  async getAllTaxRateByCurrency(currency: string) {
    let rates = await prisma.billingTaxRate.findMany({
      where: {
        currencyCode: currency.toUpperCase(),
      },
    });

    return rates;
  }

  @Authorized()
  @Query((returns) => json)
  async getAttendeeService(
    @Arg("data") data: CheckoutEventCartItemInput,
    @Ctx() ctx: Context
  ) {
    // Check 1: Ensure they're actually in the company
    const { eventId } = data;

    const event = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        name: true,
        maximumAttendees: true,
        organiser: {
          select: {
            id: true,
            company: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const company = await checkIfUserIsInCompany(
      ctx.user.id,
      event.organiser.company.id
    );
    if (company === null) throw new Error(`User is not part of this company`);

    // Permissions check
    let perm = await hasPermission(
      "msl_companyBilling",
      PERMISSION_ACCESS_TYPES.view_only,
      null,
      ctx.user.id,
      company.id
    );
    if (!perm) return { error: "NO_PERMISSION" };

    // Check 2: Ensure the service actually exists
    let services = await prisma.marketingTopupService.findMany({
      where: {
        name: "EVENT_ATTENDEE",
      },
    });

    if (services.length === 0) throw new Error("No service found with this ID");

    const targetCurrency = company.currency;
    const service = services[0];

    let TaxName = "Sales Tax";
    let TaxAmount = 0.0;

    if (company.currency) {
      var lstTax = await this.getAllTaxRateByCurrency(company.currency);
      if (lstTax.length > 0) {
        // Tax rate found for company address
        let tax = lstTax[0];
        TaxAmount = tax.rate / 100;
        TaxName = tax.type;
      } else {
        // No tax rate found
        throw new Error(
          "Could not calculate tax. Company may not have an address associated with them, or is not in a supported country."
        );
      }
    }

    let pricing = null;
    // Check 3: Ensure pricing exists for the company's currency and chosen amount
    // let matchingPricing = service.pricing.map((pr) => {
    //   console.log(pr['currency'],pr['amount'])
    //   return (pr['currency'] === targetCurrency) && (pr['amount'] === data.quantity)
    // })

    for (var i = 0; i < service.pricing.length; i++) {
      if (
        service.pricing[i]["currency"] === targetCurrency &&
        service.pricing[i]["amount"] > (event.maximumAttendees || 20)
      ) {
        pricing = service.pricing[i];
        break;
      }
    }

    if (pricing == null)
      throw new Error(
        `No matching pricing found for service with currency ${targetCurrency}`
      );

    // const pricing = matchingPricing[0]

    return {
      ...pricing,
      name: service.userFriendlyName,
      service,
      company: {
        id: company.id,
        name: company.name,
        taxName: TaxName,
        taxAmount: TaxAmount,
      },
    };
  }

  @Authorized()
  @Mutation((returns) => json)
  async buyAttendees(
    @Arg("data") data: EventAttendeeTransactionInput,
    @Ctx() ctx: Context
  ) {
    // Check 1: Ensure they're actually in the company

    const { eventId } = data;
    const event = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        name: true,
        organiser: {
          select: {
            id: true,
            company: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const company = await checkIfUserIsInCompany(
      ctx.user.id,
      event.organiser.company.id
    );
    if (company === null) throw new Error(`User is not part of this company`);

    // Check 2: Ensure the service actually exists
    let services = await prisma.marketingTopupService.findMany({
      where: {
        name: "EVENT_ATTENDEE",
      },
    });

    if (services.length === 0) throw new Error("No service found with this ID");

    const targetCurrency = company.currency;
    const service = services[0];
    // Check 3: Ensure pricing exists for the company's currency and chosen amount
    let matchingPricing = (service.pricing || ([] as any)).filter((pr) => {
      return (
        pr["currency"] === targetCurrency && pr["amount"] === data.quantity
      );
    });
    if (matchingPricing.length === 0)
      throw new Error(
        `No matching pricing found for service with currency ${targetCurrency} and quantity ${data.quantity}`
      );

    const pricing = matchingPricing[0];

    let taxAmount = null;

    if (company.currency) {
      var lstTax = await this.getAllTaxRateByCurrency(company.currency);
      if (lstTax.length > 0) {
        // Tax rate found for company address
        let tax = lstTax[0];
        taxAmount = tax.rate / 100;
      } else {
        // No tax rate found
        throw new Error(
          "Could not calculate tax. Company may not have an address associated with them, or is not in a supported country."
        );
      }
    }
    let price = pricing["price"];
    let originalPrice = pricing["price"];

    if (data.couponId) {
      await redeemCouponById(data.couponId, ctx, company.id);
      const coupon = await prisma.billingCoupon.findUnique({
        where: {
          id: data.couponId,
        },
      });

      price = Math.round(
        price -
          (coupon.unit === PromoValueUnit.PERCENTAGE
            ? (price * coupon.value) / 100
            : coupon.value)
      );
    }

    let taxExclusive = Math.round(price * taxAmount);
    let totalPrice = Math.round(price + taxExclusive);

    // Create Stripe payment intent
    const str = new stripe();
    const paymentIntent = await str.createPaymentIntent(
      totalPrice,
      company.stripeCustomerId,
      pricing["currency"],
      data.cardStripeId,
      `Add event attendees for ${pricing["amount"]} for event ${event.name}`,
      {
        metadata: {
          type: "event_attendee",
          eventId: eventId,
          serviceId: service.id,
          quantity: pricing["amount"],
          price: originalPrice,
          discount: originalPrice - price,
          discountId: data.couponId,
          taxExclusive: taxExclusive,
          totalPrice: totalPrice,
        },
      }
    );

    await prisma.platformEvent.update({
      where: {
        id: eventId,
      },
      data: {
        maximumAttendees: data.quantity,
      },
    });

    return paymentIntent.client_secret;
  }

  @Authorized()
  @Mutation((returns) => json)
  async checkoutItemCart(
    @Arg("data") data: GetEventCartItemInput,
    @Ctx() ctx: Context
  ) {
    const { eventId } = data;

    const event = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        contents: {
          select: {
            id: true,
            name: true,
            body: true,
            imageURL: true,
            linkURL: true,
            keywords: true,
            createdAt: true,
            updatedAt: true,
            pricing: {
              select: {
                id: true,
                tax: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
            pricingMaster: {
              select: {
                id: true,
                tax: true,
                employee: {
                  select: {
                    id: true,
                    email: true,
                    user: {
                      select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                currency: true,
                price: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    const cartItems = await prisma.platformEventCart.findMany({
      where: {
        event: { id: eventId },
        user: { id: ctx.user.id },
        status: { not: CartStatus.ARCHIVED },
      },
      select: {
        id: true,
        item: true,
        pricing: {
          select: {
            id: true,
            tax: true,
            employee: {
              select: {
                id: true,
                email: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            currency: true,
            price: true,
            duration: true,
          },
        },
        type: true,
        quantity: true,
        qrcodeKey: true,
        qrcodeImage: true,
        createdAt: true,
        updatedAt: true,
        status: true,
      },
    });

    return cartItems.map((item: any) => {
      const content = event.contents.find(
        (content: any) => content.id === item.item
      );
      item.item_detail = content;
      return item;
    });
  }

  // @Query((returns) => json)
  // async customEventEndpoint(@Arg("data") data: GetEventContentsInput, @Ctx() ctx: Context) {
  //   let crmUsers: any = await prisma.crmUsers({
  //     where: {
  //       user: {
  //         id_not: null
  //       },
  //       firstName: null
  //     }
  //   }).$fragment(`{
  //     id
  //     firstName
  //     lastName
  //     user {
  //       id
  //       firstName
  //       lastName
  //     }
  //   }`)

  //   for (let idx = 0; idx < crmUsers.length; idx++) {
  //     await prisma.updateCrmUser({
  //       where: {
  //         id: crmUsers[idx].id
  //       },
  //       data: {
  //         firstName: crmUsers[idx].user.firstName,
  //         lastName: crmUsers[idx].user.lastName,
  //       }
  //     })
  //   }
  //   return crmUsers;
  //   // const { eventId } = data;

  //   // return await prisma.updatePlatformEvent({
  //   //   where: {
  //   //     id: '60bcca3287b4a0001a0e3cde',
  //   //   },
  //   //   data: {
  //   //     attendees: {
  //   //       set: []
  //   //     }
  //   //   }
  //   // })
  //   // const contents: any = await prisma.platformEvents();

  //   // let answer = [];
  //   // for (let content of contents) {
  //   //   const curr = await prisma.platformEvent({ id: content.id }).attendees()
  //   //   if (curr === null || curr === undefined) {
  //   //     answer.push(curr)
  //   //   } else {
  //   //     console.log(curr.length)
  //   //   }
  //   // }

  //   // return answer
  // }

  @Query((returns) => json)
  async getEventNotificationList(
    @Arg("eventId") eventId: string,
    @Ctx() ctx: Context
  ) {
    // Events Invitation
    const event = await prisma.platformEvent.findUnique({
      where: {
        id: eventId,
      },
      include: {
        contents: true,
      },
    });
    const companyMemberships = await prisma.companyMembership.findMany({
      where: {
        userId: ctx.user.id,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
          },
        },
        eventInvitations: {
          select: {
            id: true,
            createdAt: true,
            eventType: true,
            invitationStatus: true,
            notificationStatus: true,
            invitee: {
              select: {
                id: true,
                avatar: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                user: {
                  select: {
                    id: true,
                    avatar: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            calendarEvent: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
              },
            },
            platformEvent: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
                organiser: {
                  select: {
                    id: true,
                    company: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        avatar: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
            platformEventSlot: {
              select: {
                id: true,
                name: true,
                startAt: true,
                endAt: true,
                description: true,
                organiser: {
                  select: {
                    id: true,
                    company: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                venue: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    link: true,
                    platformEvent: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            platformEventPricingSlot: {
              select: {
                id: true,
                item: true,
                event: {
                  select: {
                    id: true,
                    name: true,
                    contents: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    organiser: {
                      select: {
                        company: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                        user: {
                          select: {
                            id: true,
                            avatar: true,
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                  },
                },
                pricing: {
                  select: {
                    employee: {
                      select: {
                        id: true,
                        avatar: true,
                        company: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                        user: {
                          select: {
                            id: true,
                            avatar: true,
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                    id: true,
                    currency: true,
                    price: true,
                    duration: true,
                  },
                },
                currentPrice: true,
                currentCurrency: true,
                quantity: true,
                type: true,
                user: {
                  select: {
                    id: true,
                    avatar: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                employeeActionBy: {
                  select: {
                    id: true,
                    avatar: true,
                    company: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        avatar: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
                status: true,
                startAt: true,
                endAt: true,
              },
            },
          },
        },
      },
    });

    const invitations = [];

    companyMemberships.forEach((mem: any) => {
      mem.eventInvitations.forEach((inv: any) => {
        switch (inv.eventType) {
          case "PLATFORM_EVENT":
            if (inv.platformEvent?.id === eventId) {
              invitations.push({
                id: inv.id,
                name: `Event Invitation to ${inv.platformEvent.name}`,
                description: "",
                start_at: null,
                end_at: null,
                type: inv.eventType,
                status: inv.invitationStatus,
                sender: inv.platformEvent.organiser.company.name,

                // raw: inv,
                created_at: inv.createdAt,
                updated_at: inv.updatedAt,
              });
            }
            break;
          case "PLATFORM_EVENT_SLOT":
            if (inv.platformEventSlot?.venue?.platformEvent?.id === eventId) {
              invitations.push({
                id: inv.id,
                name: inv.platformEventSlot.name,
                description: inv.platformEventSlot.description,
                start_at: inv.platformEventSlot.startAt,
                end_at: inv.platformEventSlot.endAt,
                type: inv.eventType,
                status: inv.invitationStatus,
                sender:
                  [
                    inv.platformEventSlot.organiser.user.firstName,
                    inv.platformEventSlot.organiser.user.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ") || "",

                // raw: inv,
                created_at: inv.createdAt,
                updated_at: inv.updatedAt,
              });
            }
            break;
          case "PLATFORM_EVENT_PRICING_SLOT":
            if (inv.platformEventPricingSlot?.event?.id === eventId) {
              let content = event.contents.find(
                (ctn: any) => ctn?.id === inv.platformEventPricingSlot.item
              );
              invitations.push({
                id: inv.id,
                name: content?.name,
                description: content?.body,
                start_at: inv.platformEventPricingSlot.startAt,
                end_at: inv.platformEventPricingSlot.endAt,
                type: inv.eventType,
                status: inv.invitationStatus,
                sender: "",

                // raw: inv,
                created_at: inv.createdAt,
                updated_at: inv.updatedAt,
              });
            }
            break;
        }
      });
    });

    invitations.sort((a, b) => moment(b.created_at).diff(a.created_at));

    return invitations;
  }

  @Query((returns) => json)
  async customEventEndpoint(
    @Arg("data") data: GetEventContentsInput,
    @Ctx() ctx: Context
  ) {
    const eventDetails = await prisma.platformEvent.findUnique({
      where: {
        id: "61151a48dd23ae001a5e3ebd",
      },
      select: {
        id: true,
        name: true,
        name_check: true,
        slug: true,
        description: true,
        description_check: true,
        startAt: true,
        endAt: true,
        id_number: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        platformEventType: true,
        theme: {
          select: {
            logoURL: true,
            primaryColour: true,
            primaryTextColour: true,
            secondaryColour: true,
            secondaryTextColour: true,
          },
        },
        organiser: {
          select: {
            id: true,
            status: true,
            role: true,
            email: true,
            avatar: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                email: true,
              },
            },
            profiles: {
              select: {
                locale: true,
                bio: true,
                keywords: true,
              },
            },
            company: {
              select: {
                id: true,
                name: true,
                currency: true,
                address: {
                  select: {
                    town: true,
                    country: true,
                    address: true,
                    postcode: true,
                  },
                },
                logoURL: true,
                email: true,
                url: true,
                vatNum: true,
                regNum: true,
                info: true,
                profiles: {
                  select: {
                    locale: true,
                    bio: true,
                    keywords: true,
                  },
                },
                category: true,
                business_type: true,
                representativeContact: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
                billingDefaultType: true,
                landline: true,
              },
            },
          },
        },
        language: true,
        location: true,
        location_check: true,
        timezone: true,
        timezone_check: true,
        timezoneLocation: true,
        qr_code_url: true,
        qr_code_url_check: true,
        privacy: true,
        privacy_check: true,
        legal: true,
        legal_check: true,
        contact_us: true,
        contact_us_check: true,
        your_data: true,
        your_data_check: true,
        header_image: true,
        header_image_check: true,
        left_image: true,
        left_image_check: true,
        right_image: true,
        right_image_check: true,
        attendee_preferences: true,
        company_preferences: true,
        menus: {
          select: {
            label: true,
            type: true,
            parameter: true,
            show: true,
            adminOnly: true,
          },
        },
        menusOrder: true,
        maximumAttendees: true,
        attendees: {
          select: {
            id: true,
            invitationStatus: true,
            eventType: true,
            updatedAt: true,
            invitee: {
              select: {
                id: true,
                status: true,
                role: true,
                email: true,
                avatar: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    email: true,
                  },
                },
                profiles: {
                  select: {
                    locale: true,
                    bio: true,
                    keywords: true,
                  },
                },
                company: {
                  select: {
                    id: true,
                    name: true,
                    currency: true,
                    address: {
                      select: {
                        town: true,
                        country: true,
                        address: true,
                        postcode: true,
                      },
                    },
                    logoURL: true,
                    email: true,
                    url: true,
                    vatNum: true,
                    regNum: true,
                    info: true,
                    profiles: {
                      select: {
                        locale: true,
                        bio: true,
                        keywords: true,
                      },
                    },
                    category: true,
                    business_type: true,
                    representativeContact: {
                      select: {
                        id: true,
                        email: true,
                      },
                    },
                    billingDefaultType: true,
                    landline: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return eventDetails;
  }

  @Query((returns) => json)
  async updateCustomQueries(@Ctx() ctx: Context) {
    return await prisma.companyMembership.findMany({
      where: {
        user: {
          id: "621a1c17fe9465001ab0f6d5",
        },
      },
      take: 1671, // Use `take` instead of `first` for limiting the number of records
      select: {
        id: true,
      },
    });
    /* 
    
    ****************************************************
    return await prisma.updateCompany({
      where: {
        id: '621906e3492ddf0007429586',
      },
      data: {
        // id: 11
        name: 'Synkd',
        members: {
          create: {
            user: {
              connect: {
                id: '621a1c17fe9465001ab0f6d5',
              },
            },
            role: 'SUPER_ADMIN',
          },
        },
      },
    });
    // const mc = await connectMedia()
    // let db = mc.db('media')
    // let collection = await db.collection('21')
    // return await collection.find({
    //   Flight: new ObjectId("5f5efb0bc039ac002ca9e84d")
    // }, { projection: { id: 1, Flight: 1 } }).toArray()

    // return await prisma.campaigns({ where: { id: 21 }}).$fragment(`{
    //   id
    //   archiveDate
    // }`)
    const user = await prisma.users({
      where: { email: 'germanyuser03@gmail.com' },
    });
    await sendWelcomeEmail(user[0]);
    return await prisma.companyMemberships({
      where: {
        id: '618cf509440cfd00072174e3',
      },
    }).$fragment(`{
      id
      role
      status
      email
      phone
      landline
      user{
        id
        id
        firstName
        lastName
        updatedAt
        address {
          country
          postcode
          town
          address
        }
      }
      jobTitle
      email
      phone
      avatar
      department
    }`);
    //@ts-ignore
    return Array.from(
      new Set(
        (await prisma.billingLedgers().$fragment(`{ type }`)).map(
          (item) => item.type
        )
      )
    );
    const publishers: any = await prisma.publisherSites({
      where: {
        publisherCountry_not: null,
      },
    }).$fragment(`{
      publisherCountry
      id
      name
      _company
    }`);

    for (const pub of publishers) {
      if (pub.name.slice(-2) === pub.name.slice(-2).toUpperCase()) {
        await prisma.updatePublisherSite({
          where: {
            id: pub.id,
          },
          data: {
            publisherCountry: pub.name.slice(-2) || pub.publisherCountry,
          },
        });
      }
    }

    return { len: publishers.length, publishers };
    
    ****************************************************
    */
  }
}
