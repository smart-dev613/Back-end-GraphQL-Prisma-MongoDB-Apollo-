import { KeywordType, PrismaClient } from "@prisma/client";
import { keywordCategoryInterface } from "../types/KeywordInterface";
import { FileHelper } from "./FileHelper";
const prisma = new PrismaClient();

export abstract class UploadClusterKeywordHelper {
  generateSlug(input: string) {
    return input
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_]/g, "") // Remove all non-alphanumeric and non-underscore characters
      .replace(/_+/g, "_") // Replace multiple underscores with a single one
      .replace(/^_+|_+$/g, "") // Trim underscores from the start and end
      .toLowerCase();
  }

  abstract execute(filePath: string);

  uniqueSlug(
    keywordCategories: keywordCategoryInterface[]
  ): keywordCategoryInterface[] {
    keywordCategories = keywordCategories.filter(
      (item, index, self) =>
        index ===
        self.findIndex((t) => t.keyword[0].slug === item.keyword[0].slug)
    );

    return keywordCategories;
  }

  async createClusterKeyword(
    keywordCategories: keywordCategoryInterface[]
  ) {
    const promise = keywordCategories.map(
      async (keywordCategory: keywordCategoryInterface) => {
        return await prisma.keywordCategory.create({
          data: {
            id: keywordCategory.id,
            type: keywordCategory.type,
            displayName: keywordCategory.displayName,
            slug: keywordCategory.slug,
            description: keywordCategory.description,
            language: keywordCategory.langugage,
            keywords: {
              create: keywordCategory.keyword.map((word) => {
                return {
                  id: word.id,
                  slug: word.slug,
                  displayName: word.displayName,
                };
              }),
            },
          },
        });
      }
    );

    await Promise.all(promise);
  }

  async deleteClusterKeywords(
    clusterType: KeywordType
  ) {
    await prisma.keywordCategory.deleteMany({
      where: {
        type: clusterType,
      },
    });
  }

  async getClusterKeywordData<T = any>(
    filePath: string
  ): Promise<T[]> {
    const ext = FileHelper.getFileExtension(filePath);

    const fileHelper = new FileHelper();
    let keywordCategory: T[];
    switch (ext) {
      case "csv":
        keywordCategory = await fileHelper.readCSVFile(filePath);
        break;
      default:
        break;
    }
    if (!keywordCategory) {
      console.log("[DATA] No data");
      process.exit(1);
    }

    return keywordCategory;
  }
}
