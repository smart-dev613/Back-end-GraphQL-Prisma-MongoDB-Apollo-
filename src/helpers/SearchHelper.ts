import { PrismaClient } from "@prisma/client";
interface Filter {
  and?: Filter[];
  or?: Filter[];
  [key: string]: any;
}
export class SearchHelper {
  prisma: PrismaClient;
  constructor(readonly collection: string) {
    this.prisma = new PrismaClient();
  }

  async search<T>(filters: Filter): Promise<T[]> {
    const filterOptions = this.buildFilters(filters);
    console.log("[fileter-options]: ", JSON.stringify(filterOptions));
    return await this.prisma[this.collection].findMany({
        where: filterOptions
    }) as T[]
  }

  private buildFilters(filters: Filter) {
    const filterConditions: any = {};

    if (filters.and) {
      filterConditions.AND = filters.and.map((condition: any) =>
        this.buildFilters(condition)
      );
    }

    if (filters.or) {
      filterConditions.OR = filters.or.map((condition: any) =>
        this.buildFilters(condition)
      );
    }

    Object.keys(filters).forEach((key) => {
      if (key !== "and" && key !== "or") {
        const fieldValue = filters[key];

        if (key.includes(".")) {
          const keys = key.split(".");
          let currentFilter = filterConditions;

          keys.forEach((nestedKey, index) => {
            if (index === keys.length - 1) {
              currentFilter[nestedKey] = fieldValue;
            } else {
              currentFilter[nestedKey] = currentFilter[nestedKey] || {};
              currentFilter = currentFilter[nestedKey];
            }
          });
        } else {
          filterConditions[key] = fieldValue;
        }
      }
    });

    return filterConditions;
  }
}
