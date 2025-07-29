// 900
import { Resolver, Query, Mutation, Arg, Ctx, Authorized } from 'type-graphql';
import { json } from '../helpers';
import {
  checkIfUserIsInCompany,
  checkIfUserIsSynkd,
  hasPermission,
} from '../helpers/permissionsHelper';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { Context } from '../auth/context.interface';
import {
  SetMarketingPreferenceInput,
  GetUserMarketingPreferencesInput,
  GetUserDataForCompanyInput,
  GetUsersDataForCompanyInput,
  SetupNewCompanyDomainInput,
  SetupNewCompanyEmailDomainInput,
  VerifyCompanyEmailDomainInput,
  ArchiveCompanyEmailDomainInput,
  GetVerticalsFilterInput,
  archiveEmailSMSBatchInput,
  MarketingPreferencesObject,
} from '../inputs/marketing';
import { createObjectID } from '../../util/createIDs';
import {
  addEmailDomain,
  getEmailDomain,
  getEmailDomains,
  removeEmailDomain,
  verifyEmailDomain,
} from '../emailHelper';
import { PERMISSION_ACCESS_TYPES } from '../constants/perms';
import { onMarketingPermissionUpdate } from './cluster/versioning';
import { db } from '../helpers/mongoHelper';
import { ObjectId } from 'mongodb';

@Resolver()
export class marketingResolver {
  /**
   * --------------------------------
   * Marketing Preferences
   * --------------------------------
   */

  @Authorized()
  @Query((returns) => json)
  async myMarketingPreferences(@Ctx() ctx: Context) {
    return await prisma.userMarketingPreference.findMany({
      where: { user: { id: ctx.user.id } },
      select: {
        id: true,
        preferences: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async getUserMarketingPreferencesForCompany(
    @Arg('data') data: GetUserMarketingPreferencesInput,
    @Ctx() ctx: Context
  ) {
    let prefs: any = await prisma.userMarketingPreference.findMany({
      where: {
        user: { id: data.userID },
        company: { id: data.companyID },
      },
      select: {
        id: true,
        preferences: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (prefs.length === 0) return {};

    return prefs[0];
  }

  @Authorized()
  @Mutation((returns) => json)
  async setMarketingPreferences(
    @Arg('data') data: SetMarketingPreferenceInput,
    @Ctx() ctx: Context
  ) {
    let currentPrefsForCompany: any =
      await prisma.userMarketingPreference.findMany({
        where: {
          company: {
            id: data.companyID,
          },
          user: {
            id: ctx.user.id,
          },
        },
      });

    currentPrefsForCompany =
      currentPrefsForCompany.length > 0 ? currentPrefsForCompany[0] : null;

    let ids = createObjectID().id.toString();
    let prefs: any = data.preferences;
    if (currentPrefsForCompany) {
      let shareCompanyData = [].concat(
        currentPrefsForCompany.preferences.shareCompanyData || [],
        data.preferences.shareCompanyData || []
      );

      shareCompanyData = Object.values(
        shareCompanyData.reduce((acc: any, curr: any) => {
          acc[curr.id] = {
            ...(curr.id in acc ? acc[curr.id] : {}),
            ...curr,
          };
          return acc;
        }, {})
      );

      prefs = {
        ...currentPrefsForCompany.preferences,
        ...data.preferences,
        shareCompanyData,
      };
    }

    const newPrefs = await prisma.userMarketingPreference.upsert({
      where: {
        id: currentPrefsForCompany ? currentPrefsForCompany.id : ids,
      },
      create: {
        id: ids,
        user: { connect: { id: ctx.user.id } },
        company: { connect: { id: data.companyID } },
        preferences: prefs,
      },
      update: {
        preferences: prefs,
      },
    });

    // can also chain this asyncronously
    onMarketingPermissionUpdate(data.preferences, ctx.user.id, data.companyID);

    return newPrefs;
  }

  @Query((returns) => json)
  async getUsersDataForCompany(
    @Arg('data') data: GetUsersDataForCompanyInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_customers',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const results = [];

    for (let idx = 0; idx < data.crmUserIDs.length; idx++) {
      try {
        results.push(
          await this.getUserDataForCompany(
            { crmUserID: data.crmUserIDs[idx] },
            ctx
          )
        );
      } catch (error) {
        if (error.message.includes('Cannot return null for non-nullable type'))
          continue;
        throw error;
      }
    }

    return results;
  }

  @Query((returns) => json)
  async getAllCrmUsers(@Ctx() ctx: Context) {
    let perm = await hasPermission(
      'marketing_customers',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };
    const companyID = ctx.company.id;
    let crmUsers = await prisma.crmUser.findMany({
      where: {
        associatedCompany: {
          id: new ObjectId(companyID).toString(),
        },
      },
    });
  return crmUsers
  }

  @Query((returns) => json)
  async getCrmUser(@Arg('crmUserID') crmUserID: string, @Ctx() ctx: Context) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_customers',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };
    return prisma.crmUser.findUnique({
      where: { 
      id: new ObjectId(crmUserID).toString() 
      }
    })  
  }

  @Query((returns) => json)
  async getUserDataForCompany(data: GetUserDataForCompanyInput, ctx: Context) {
    // Permissions check
    const perm = await hasPermission(
      'marketing_customers',
      PERMISSION_ACCESS_TYPES.view_only,
      ctx.companyMembership.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const crmUser = await prisma.crmUser.findUnique({
      where: { id: data.crmUserID },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        dob: true,
        address: {
          select: {
            country: true,
            postcode: true,
            town: true,
            address: true,
          },
        },
        associatedCompany: {
          select: { id: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            dob: true,
            gender: true,
            address: {
              select: {
                country: true,
                postcode: true,
                town: true,
                address: true,
              },
            },
            profiles: {
              select: {
                locale: true,
                bio: true,
                keywords: true,
              },
            },
            companies: {
              select: {
                id: true,
                email: true,
                jobTitle: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                    address: {
                      select: {
                        country: true,
                        postcode: true,
                        town: true,
                        address: true,
                      },
                    },
                    profiles: {
                      select: {
                        locale: true,
                        bio: true,
                        keywords: true,
                      },
                    },
                    category: true,
                    email: true,
                    url: true,
                  },
                },
              },
            },
          },
        },
        personal_facebook: true,
        personal_instagram: true,
        personal_twitter: true,
        personal_wechat: true,
        personal_qq: true,
        personal_personal_id: true,
        personal_notes: true,
        personal_notes_follow_up_date: true,
        em_job_type: true,
        em_department: true,
        em_email: true,
        em_phone: true,
        em_notes: true,
        em_notes_follow_up_date: true,
        cm_name: true,
        cm_email: true,
        cm_website: true,
        cm_phone: true,
        cm_regnum: true,
        cm_sales_tax: true,
        cm_address: true,
        cm_city: true,
        cm_zipcode: true,
        cm_country: true,
        cm_category: true,
        cm_notes: true,
        cm_notes_follow_up_date: true,
      },
    });

    if (!crmUser) throw new Error(`No such CRM user exists`);

    const company = await checkIfUserIsInCompany(
      ctx.user.id,
      crmUser.associatedCompany.id
    );
    if (!company) throw new Error(`User is not part of this company`);

    const { associatedCompany: crmUserCompany } =
      await prisma.crmUser.findUnique({
        where: { id: crmUser.id },
        include: {
          associatedCompany: true,
        },
      });

    if (crmUserCompany.id !== company.id)
      throw new Error(`CRM user is not associated with this company`);

    const userPrefs = await prisma.userMarketingPreference.findMany({
      where: {
        userId: crmUser.user?.id,
        companyId: company.id,
      },
    });
// IZA com back to
    const dataToReturn: any = {
      id: crmUser.id,
      firstName: crmUser.firstName,
      lastName: crmUser.lastName,
      email: crmUser.email,
      phone: crmUser.phone,
      gender: crmUser.gender,
      address: crmUser.address,
      personal_facebook: crmUser.personal_facebook,
      personal_instagram: crmUser.personal_instagram,
      personal_twitter: crmUser.personal_twitter,
      personal_wechat: crmUser.personal_wechat,
      personal_qq: crmUser.personal_qq,
      personal_personal_id: crmUser.personal_personal_id,
      personal_notes: crmUser.personal_notes,
      em_job_type: crmUser.em_job_type,
      em_department: crmUser.em_department,
      em_email: crmUser.em_email,
      em_phone: crmUser.em_phone,
      em_notes: crmUser.em_notes,
      cm_name: crmUser.cm_name,
      cm_email: crmUser.cm_email,
      cm_website: crmUser.cm_website,
      cm_phone: crmUser.cm_phone,
      cm_regnum: crmUser.cm_regnum,
      cm_sales_tax: crmUser.cm_sales_tax,
      cm_address: crmUser.cm_address,
      cm_city: crmUser.cm_city,
      cm_zipcode: crmUser.cm_zipcode,
      cm_country: crmUser.cm_country,
      cm_category: crmUser.cm_category,
      cm_notes: crmUser.cm_notes,
      user: { companies: [] },
    };

    if (userPrefs.length > 0) {
      const prefs: any = userPrefs[0].preferences;

      if (prefs?.sharePersonalEmail) {
        dataToReturn.user.email = crmUser.user?.email;
      }
      if (prefs?.sharePersonalPhone) {
        dataToReturn.user.phone = crmUser.user?.phone;
      }
      if (prefs?.shareDateOfBirth) {
        dataToReturn.user.dob = crmUser.user?.dob;
      }
      if (prefs?.shareGender) {
        dataToReturn.user.gender = crmUser.user?.gender;
      }

      if (prefs?.shareCompanyData?.length > 0) {
        for (const compPrefs of prefs.shareCompanyData) {
          if (compPrefs.id) {
            const matchedCompany = crmUser.user?.companies?.find(
              (c) => c.company.id === compPrefs.id
            );
            const companyData = matchedCompany && {
              company: {
                name: matchedCompany.company.name,
                address: matchedCompany.company.address,
                profiles: matchedCompany.company.profiles,
                email: matchedCompany.company.email,
                url: matchedCompany.company.url,
                category: matchedCompany.company.category,
              },
            };
            dataToReturn.user.companies.push(companyData);
          }
        }
      }
    }

    return dataToReturn;
  }

  /**
   * --------------------------------
   * Domains
   * --------------------------------
   */
  @Authorized()
  @Query((returns) => json)
  async domainsForCompany(
    @Arg('companyId') companyId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'msl_companyProfile',
      PERMISSION_ACCESS_TYPES.view_only,
      null,
      ctx.user.id,
      companyId
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const company = await checkIfUserIsInCompany(ctx.user.id, companyId, true);
    if (company === null) throw new Error(`User is not part of this company`);

    return await prisma.companyDomain.findMany({
      where: {
        company: {
          id: companyId,
        },
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async setupNewCompanyDomain(
    @Arg('data') data: SetupNewCompanyDomainInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'msl_companyProfile',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      data.companyId
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    let checkForExistingDomain = await prisma.companyDomain.findMany({
      where: {
        domain: data.domain,
      },
    });

    if (checkForExistingDomain.length > 0)
      throw new Error('Domain is already setup on another company');

    let newDomain = await prisma.companyDomain.create({
      data: {
        company: { connect: { id: data.companyId } }, // Connects to the existing company by ID
        domain: data.domain,
        verified: false, // Set verified to false by default
      },
    });

    // TODO: setup and return records for user to add to their domain's DNS

    return newDomain;
  }

  /**
   * --------------------------------
   * Email Domains
   * --------------------------------
   */
  @Authorized()
  @Query((returns) => json)
  async emailDomainsForCompany(
    @Arg('companyId') companyId: string,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'msl_companyProfile',
      PERMISSION_ACCESS_TYPES.view_only,
      null,
      ctx.user.id,
      companyId
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const company = await checkIfUserIsInCompany(ctx.user.id, companyId, true);
    if (company === null) throw new Error(`User is not part of this company`);

    return await prisma.companyEmailDomain.findMany({
      where: {
        companyId: new ObjectId(companyId).toString() // Filters by the company ID
      },
    });
  }

  @Authorized()
  @Mutation((returns) => json)
  async setupNewCompanyEmailDomain(
    @Arg('data') data: SetupNewCompanyEmailDomainInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'msl_companyProfile',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      data.companyId
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    let checkForExistingDomain = await prisma.companyEmailDomain.findMany({
      where: {
        domain: data.domain, // Filters by the specified domain
      },
    });

    if (checkForExistingDomain.length > 0)
      throw new Error('Email domain is already setup on another company');

    // Security check: Ensure that the domain isn't already on our Mailgun account
    // (this could be someone trying to hijack one of our domains)
    let existingDomain = null;
    try {
      existingDomain = await getEmailDomain(data.domain);
    } catch (err) {
      // We're looking for a 404 here. A 404 means the email domain doesn't exist in our account.
      if (err.statusCode !== 404) {
        throw new Error('Problem contacting email provider. Please try again.');
      }
      // If there is a 404, we just continue with the existingDomain variable being null
    }

    if (existingDomain !== null) {
      throw new Error(`Email domain already exists. Please contact Synkd.`);
    }

    // Setup the domain on Mailgun
    let mailgun = await addEmailDomain(data.domain);

    let newEmailDomain = await prisma.companyEmailDomain.create({
      data: {
        company: { connect: { id: data.companyId } },
        domain: data.domain,
      },
    });

    return {
      data: newEmailDomain,
      receive_dns: mailgun.receiving_dns_records,
      sending_dns: mailgun.sending_dns_records,
    };
  }

  @Authorized()
  @Mutation((returns) => json)
  async verifyCompanyEmailDomain(
    @Arg('data') data: VerifyCompanyEmailDomainInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'msl_companyProfile',
      PERMISSION_ACCESS_TYPES.view_and_edit,
      null,
      ctx.user.id,
      data.companyId
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    let existingDomain = await prisma.companyEmailDomain.findUnique({
      where: {
        id: new ObjectId(data.domainId).toString(), // Assuming 'id' is the primary key in your CompanyEmailDomain model
      },
    });

    if (!existingDomain) throw new Error('Email domain does not exist');
    let existingDomainCompany = await prisma.companyEmailDomain.findUnique({
      where: {
        id: new ObjectId(existingDomain.id).toString(), // Assuming 'id' is the primary key in your CompanyEmailDomain model
      }
    });

    if (existingDomainCompany.companyId !== company.id)
      throw new Error('Email domain is not associated with this company');

    // Verify the domain via Mailgun
    let mailgun = await verifyEmailDomain(existingDomain.domain);

    // Update our database record
    if (
      mailgun.domain.state === 'verified' ||
      mailgun.domain.state === 'active'
    ) {
      existingDomain = await prisma.companyEmailDomain.update({
        where: {
          id: new ObjectId(existingDomain.id).toString(),
        },
        data: {
          status: 'VERIFIED',
        },
      });
    }

    return {
      data: existingDomain,
      receive_dns: mailgun.receiving_dns_records,
      sending_dns: mailgun.sending_dns_records,
    };
  }

  @Authorized()
  @Mutation((returns) => json)
  async archiveCompanyEmailDomain(
    @Arg('data') data: ArchiveCompanyEmailDomainInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'msl_companyProfile',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      null,
      ctx.user.id,
      data.companyId
    );
    if (!perm) return { error: 'NO_PERMISSION' };

    const company = await checkIfUserIsInCompany(ctx.user.id, data.companyId);
    if (company === null) throw new Error(`User is not part of this company`);

    let existingDomain = await prisma.companyEmailDomain.findUnique({
      where: {
        id: data.domainId, // Assuming 'id' is the primary key in your CompanyEmailDomain model
      },
    });

    if (!existingDomain) throw new Error('Email domain does not exist');

    let existingDomainCompany = await prisma.companyEmailDomain.findUnique({
      where: {
        id: new ObjectId(existingDomain.id).toString(), // Assuming 'id' is the primary key in your CompanyEmailDomain model
      }
    });

    if (existingDomainCompany.companyId !== company.id)
      throw new Error('Email domain is not associated with this company');

    if (existingDomain.status === 'ARCHIVED')
      throw new Error('Domain is already archived');

    // Attempt to remove the email domain from Mailgun if possible
    await removeEmailDomain(existingDomain.domain);

    return await prisma.companyEmailDomain.update({
      where: {
        id: new ObjectId(existingDomain.id).toString(), // Use the ID of the existing domain for the update
      },
      data: {
        status: 'ARCHIVED', // Set the status to 'ARCHIVED'
      },
    });
  }

  /**
   * --------------------------------
   * Email & SMS
   * --------------------------------
   */
  @Authorized()
  @Mutation((returns) => json)
  async archiveRestoreEmailSMSBatch(
    @Arg('data') data: archiveEmailSMSBatchInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await hasPermission(
      'marketing_mailing',
      PERMISSION_ACCESS_TYPES.edit_and_archive,
      null,
      ctx.user.id,
      ctx.company.id
    );
    if (!perm) return { error: 'NO_PERMISSION' };
    const company = await checkIfUserIsInCompany(ctx.user.id, ctx.company.id);
    if (company === null) throw new Error(`User is not part of this company`);

    let batch = await prisma.mailBatch.findUnique({
      where: {
        id: data.id, // Use the ID of the batch to find it
      },
    });

    if (!batch) throw new Error('Email/SMS Batch does not exist');

    const batch_status = {
      DRAFT: 1,
      SENT: 3,
      ARCHIVED: 4,
    };

    return await prisma.mailBatch.update({
      where: {
        id: batch.id, // Specify the ID of the batch to update
      },
      data: {
        status: batch.status === 4 ? batch_status.DRAFT : batch_status.ARCHIVED, // Set the new status based on the current status
      },
    });
  }

  /**
   * --------------------------------
   * Campaign
   * --------------------------------
   */
  @Authorized()
  @Query((returns) => json)
  async getCampaignBudget(
    @Arg('campaignId') campaignId: string,
    @Ctx() ctx: Context
  ) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        id: campaignId,
      },
    });

    if (campaigns?.length) {
      let campaign = campaigns[0];

      const historyUsage = await prisma.billingLedger.findMany({
        where: {
          companyId: ctx.company.id,
          type: {
            in: ['USAGE'],
          },
          campaign: campaignId,
        },
      });

      const services = await prisma.marketingTopupService.findMany({
        select: {
          name: true,
          title: true,
          pricing: {
            select: {
              currency: true,
              amount: true,
              price: true,
            },
          },
        },
      });

      let needConvertion = false;

      let usedBudgetService = historyUsage.reduce((acc: any, curr: any) => {
        const serviceSelected = services.find(
          (item: any) => item.name === curr.service
        );
        let amount = 0;
        if (serviceSelected) {
          const pricing: any = serviceSelected.pricing;
          let price = pricing.find(
            (item: any) => item.currency === campaign.currency
          );
          if (!price) {
            price = pricing.find((item: any) => item.currency === 'GBP');
            needConvertion = true;
          }
          amount = (price.price / price.amount / 100) * curr.amount;
        }

        if (curr.service in acc) {
          acc[curr.service] += Math.abs(amount);
        } else {
          acc[curr.service] = Math.abs(amount);
        }
        return acc;
      }, {});

      let usedBudget =
        historyUsage.reduce((acc, curr) => {
          const serviceSelected = services.find(
            (item: any) => item.name === curr.service
          );
          let amount = 0;
          if (serviceSelected) {
            const pricing: any = serviceSelected.pricing;
            let price = pricing.find(
              (item: any) => item.currency === campaign.currency
            );
            if (!price) {
              price = pricing.find((item: any) => item.currency === 'GBP');
              needConvertion = true;
            }
            amount = (price.price / price.amount) * curr.amount;
          }
          return acc + amount;
        }, 0) * -1;

      const baseCurrency = 'GBP';
      const targetCurrency = campaign.currency;
      if (needConvertion && baseCurrency !== targetCurrency) {
        let directs = await prisma.currencyTables.findMany({
          where: {
            baseCurrency: baseCurrency,
            targetCurrency: targetCurrency,
          },
        });

        if (directs.length) {
          usedBudget = usedBudget * +directs[directs.length - 1].currentRate;
        } else {
          let directs = await prisma.currencyTables.findMany({
            where: {
              targetCurrency: baseCurrency,
              baseCurrency: targetCurrency,
            },
          });

          if (directs.length) {
            usedBudget = usedBudget / +directs[directs.length - 1].currentRate;
          }
        }
      }

      return {
        campaign,
        // mediaFlights,
        campaignBudget: campaign.budget,
        // usedBudget: mediaFlightBudget,
        usedBudget,
        usedBudgetService,
        historyUsage,
        services,
      };
    }

    return false;
  }

  @Authorized()
  @Query((returns) => json)
  async getFilteredPublisherSite(
    @Arg('data') data: GetVerticalsFilterInput,
    @Ctx() ctx: Context
  ) {
    // Permissions check
    let perm = await checkIfUserIsSynkd(ctx.user.id);
    if (!perm) return { error: 'NO_PERMISSION' };

    const { country, vertical, company, device, id } = data;

    const filter: any = {
      studio_not: true,
    };

    if (
      !country?.length &&
      !vertical?.length &&
      !company?.length &&
      !device?.length &&
      !id?.length
    )
      return [];

    if (country?.length) {
      filter.publisherCountry_in = country;
    }
    if (company?.length) {
      filter._company_in = company;
    }
    if (vertical?.length) {
      filter.vertical_in = vertical;
    }
    if (id?.length) {
      filter._id_in = id;
    }
    if (device?.length) {
      filter.Devices = {};
      if (device.includes('smartphone')) {
        filter.Devices.mobile = true;
      }
      if (device.includes('desktop')) {
        filter.Devices.desktop = true;
      }
      if (device.includes('tablet')) {
        filter.Devices.tablet = true;
      }
    }

    console.log(filter);

    const result = await prisma.publisherSite.findMany({
      where: filter,
      select: {
        id: true,
        company: true,
        name: true,
        zones: true,
        publisherCountry: true,
        countries: true,
        displayInSiteList: true,
        status: true,
        vertical: true,
        Devices: {
          select: {
            desktop: true,
            mobile: true,
            tablet: true,
          },
        },
      },
    });

    console.log('here');

    for (let val of result) {
      let selectedComp: any = await prisma.company.findMany({
        where: {
          id: val.company,
        },
        select: {
          id: true,
          name: true,
        },
      });

      selectedComp = selectedComp.length ? selectedComp[0] : null;

      val.company = selectedComp;
    }

    return result;
  }

  @Authorized()
  @Query((returns) => json)
  async getPublisherSiteFormatRates(
    @Arg('publisherSiteId') publisherSiteId: string,
    @Ctx() ctx: Context
  ) {
    return await prisma.mediaRates.findMany({
      where: {
        publisherSite: {
          id: publisherSiteId,
        },
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async getPublisherSiteList(@Ctx() ctx: Context) {
    return await prisma.publisherSite.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async getAllCompaniesForSynkd(@Ctx() ctx: Context) {
    // Permissions check
    let perm = await checkIfUserIsSynkd(ctx.user.id);
    if (!perm) return { error: 'NO_PERMISSION' };

    return await prisma.company.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }
}
