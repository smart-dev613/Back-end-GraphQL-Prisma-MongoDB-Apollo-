// 400
import { Resolver, Query, Mutation, Arg, Ctx, Authorized } from 'type-graphql';
import { Context } from '../auth/context.interface';
// import { prisma, MediaVerticalPublishersWhereInput } from "../generated/prisma-client";
import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();
import { json } from '../helpers';
import { checkIfUserIsSynkd } from '../helpers/permissionsHelper';
import {
  AddMediaVerticalPublisherInput,
  ConvertionInput,
} from '../inputs/media';

import moment from 'moment';
import { GetVerticalsFilterInput } from '../inputs/marketing';

@Resolver()
export class mediaResolver {
  @Authorized()
  @Query((returns) => json)
  async getMediaVerticalPublishers(
    @Arg('vertical', { nullable: true }) vertical: string,
    @Ctx() ctx: Context
  ) {
    // let opts = { where: {} as Prisma.MediaVerticalPublisherWhereInput };
    let opts: Prisma.MediaVerticalPublishersWhereInput = {};
    if (vertical) {
      opts.vertical = {
        in: vertical.split(','),
      };
    }

    let res = await prisma.mediaVerticalPublishers.findMany({
      where: opts, // Assuming `opts` is defined and contains the filtering conditions
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        vertical: true,
        publisherSite: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res;
  }

  @Authorized()
  @Query((returns) => json)
  async getMediaVerticalPublishersFiltered(
    @Arg('data') data: GetVerticalsFilterInput,
    @Ctx() ctx: Context
  ) {
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
      filter.id_in = id;
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

    const result: any = await prisma.publisherSite.findMany({
      where: filter,
      select: {
        vertical: true,
      },
    });

    const allVerticals: string[] = Array.from(
      new Set(result.map((item) => item.vertical))
    );

    let opts = { where: null as Prisma.MediaVerticalPublishersWhereInput };

    if (vertical) {
      opts.where = {
        vertical: { in: allVerticals },
      };
    }

    let res = await prisma.mediaVerticalPublishers.findMany({
      where: opts.where, // Assuming `opts.where` is defined as a filter
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        vertical: true,
        publisherSite: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res;
  }

  @Authorized('synkd')
  @Mutation((returns) => json)
  async addMediaVerticalPublisher(
    @Arg('data') data: AddMediaVerticalPublisherInput,
    @Ctx() ctx: Context
  ) {
    // Make sure there's not already this exact DB entry
    let existing = await prisma.mediaVerticalPublishers.findMany({
      where: {
        vertical: data.vertical,
        publisherSite: { id: data.publisherSiteId }, // Use `id` instead of `id`
      },
    });

    if (existing.length > 0) throw new Error('Already exists');

    let newVerticalPub = await prisma.mediaVerticalPublishers.create({
      data: {
        vertical: data.vertical,
        publisherSite: {
          connect: { id: data.publisherSiteId }, // Make sure `id` is the correct field
        },
      },
    });

    return newVerticalPub;
  }

  // ``````Rahul help```````
  // @Authorized('synkd')
  // @Mutation((returns) => json)
  // async addMediaVerticalPublisherFiltered(
  //   @Arg('data') data: GetVerticalsFilterInput,
  //   @Ctx() ctx: Context
  // ) {
  //   const { country, vertical, company, device, id } = data;

  //   const filter: any = {
  //     studio_not: true,
  //   };

  //   if (
  //     !country?.length &&
  //     !vertical?.length &&
  //     !company?.length &&
  //     !device?.length &&
  //     !id?.length
  //   )
  //     return [];

  //   if (country?.length) {
  //     filter.publisherCountry_in = country;
  //   }
  //   if (company?.length) {
  //     filter._company_in = company;
  //   }
  //   if (vertical?.length) {
  //     filter.vertical_in = vertical;
  //   }
  //   if (id?.length) {
  //     filter.id_in = id;
  //   }
  //   if (device?.length) {
  //     filter.Devices = {};
  //     if (device.includes('smartphone')) {
  //       filter.Devices.mobile = true;
  //     }
  //     if (device.includes('desktop')) {
  //       filter.Devices.desktop = true;
  //     }
  //     if (device.includes('tablet')) {
  //       filter.Devices.tablet = true;
  //       return await prisma.mediaVerticalPublishers.delete({
  //         where: {
  //           id: {
  //             in: id,
  //           }
  //         },
  //       });
  //     }
  //   }

  //   const result = await prisma.publisherSite.findMany({
  //     where: filter, // Ensure 'filter' is correctly defined
  //     select: {
  //       id: true,
  //       vertical: true,
  //     },
  //   });

  //   for (const res of result) {
  //     // Make sure there's not already this exact DB entry
  //     let existing = await prisma.mediaVerticalPublishers.findMany({
  //       where: {
  //         vertical: res.vertical,
  //         publisherSite: { id: res.id }, // Ensure 'id' is the correct field for publisherSite
  //       },
  //     });

  //     if (existing.length > 0) {
  //       console.log('Already exists');
  //       continue;
  //     }

  //     await prisma.mediaVerticalPublishers.create({
  //       data: {
  //         vertical, // Assuming `vertical` is a string value
  //         publisherSite: {
  //           connect: { id: publisherSiteId }, // Assuming `id` is the correct field to connect
  //         },
  //       },
  //     });
  //   }
  //   return true;
  // }

  @Authorized('synkd')
  @Mutation((returns) => json)
  async deleteMediaVerticalPublisher(
    @Arg('id') entryId: string,
    @Ctx() ctx: Context
  ) {
    return await prisma.mediaVerticalPublishers.delete({
      where: {
        id: entryId, // Use 'id' instead of 'id'
      },
    });
  }

  @Authorized('synkd')
  @Mutation((returns) => json)
  async deleteMediaVerticalPublisherFiltered(
    @Arg('data') data: GetVerticalsFilterInput,
    @Ctx() ctx: Context
  ) {
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
      filter.id_in = id;
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

    const result: any = await prisma.publisherSite.findMany({
      where: filter,
      select: {
        id: true,
        vertical: true, // Remove id, Prisma uses 'id'
      },
    });

    await prisma.mediaVerticalPublishers.deleteMany({
      where: {
        publisherSite: {
          id: {
            in: result.map((item: any) => item.id),
          },
        },
      },
    });

    return true;
  }

  @Authorized('synkd')
  @Mutation((returns) => json)
  async deleteMediaVerticalPublisherBySiteId(
    @Arg('vertical') vertical: string,
    @Arg('publisherSiteId') siteId: string,
    @Ctx() ctx: Context
  ) {
    return await prisma.mediaVerticalPublishers.deleteMany({
      where: {
        publisherSite: {
          id: siteId,
        },
        vertical: vertical,
      },
    });
  }

  @Authorized('synkd')
  @Mutation((returns) => json)
  async addSiteToSiteList(@Arg('id') pubSiteId: string, @Ctx() ctx: Context) {
    return await prisma.publisherSite.update({
      data: {
        displayInSiteList: true,
      },
      where: {
        id: pubSiteId,
      },
    });
  }

  @Authorized('synkd')
  @Mutation((returns) => json)
  async addSiteToSiteListFiltered(
    @Arg('data') data: GetVerticalsFilterInput,
    @Ctx() ctx: Context
  ) {
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
      filter.id_in = id;
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
    const result: any = await prisma.publisherSite.findMany({
      where: filter,
      select: {
        id: true,
      },
    });

    return await prisma.publisherSite.updateMany({
      data: { displayInSiteList: true },
      where: {
        id: {
          in: result.map((item: any) => item.id),
        },
      },
    });
  }

  @Authorized('synkd')
  @Mutation((returns) => json)
  async deleteSiteFromSiteList(
    @Arg('id') pubSiteId: string,
    @Ctx() ctx: Context
  ) {
    return await prisma.publisherSite.update({
      data: { displayInSiteList: true },
      where: { id: pubSiteId },
    });
  }

  @Authorized('synkd')
  @Mutation((returns) => json)
  async deleteSiteFromSiteListFiltered(
    @Arg('data') data: GetVerticalsFilterInput,
    @Ctx() ctx: Context
  ) {
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
      filter.id_in = id;
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
    const result = await prisma.publisherSite.findMany({
      where: filter,
      select: {
        id: true,
      },
    });

    return await prisma.publisherSite.updateMany({
      data: { displayInSiteList: false },
      where: {
        id: { in: result.map((item: any) => item.id) },
      },
    });
  }

  @Authorized()
  @Query((returns) => json)
  async convertByCurrencyRate(
    @Arg('data') data: ConvertionInput,
    @Ctx() ctx: Context
  ) {
    const { symbol, value } = data;

    const [baseCurrency, targetCurrency] = symbol.split('/');

    if (baseCurrency === targetCurrency) return value;

    let directs = await prisma.currencyTable.findMany({
      where: {
        baseCurrency,
        targetCurrency,
      },
    });

    if (directs.length) {
      return value * +directs[directs.length - 1].currentRate;
    } else {
      directs = await prisma.currencyTable.findMany({
        where: {
          targetCurrency: baseCurrency,
          baseCurrency: targetCurrency,
        },
      });

      if (directs.length) {
        return value / +directs[directs.length - 1].currentRate;
      }
    }
    return false;
  }

  @Authorized()
  @Query((returns) => json)
  async getCurrentRate(@Ctx() ctx: Context) {
    let res = await prisma.currencyTable.findMany({
      where: {
        createdAt: {
          gt: moment().startOf('day').toDate(),
          lt: moment().endOf('day').toDate(),
        },
      },
    });

    if (res.length === 0) {
      res = await prisma.currencyTable.findMany({
        where: {
          createdAt: {
            gt: moment().subtract(1, 'days').startOf('day').toDate(),
            lt: moment().startOf('day').toDate(),
          },
        },
      });
    }
    return res;
  }
}
