import { KeywordType, Language, Prisma, PrismaClient, user } from "@prisma/client";
import { UploadClusterKeywordHelper } from "../src/helpers/UploadClusterKeywordHelper";
import { EmployeeClusterKeywordInterface } from "../src/types/EmployeeClusterKeywordInterface";
import { keywordCategoryInterface } from "../src/types/KeywordInterface";
import { createObjectID } from "../util/createIDs";
import { v4 as uuidv4 } from "uuid";


export class UploadProfileClusterKeyword extends UploadClusterKeywordHelper {
  async execute(filePath: string) {
    const prisma = new PrismaClient();
    const keywords = await this.getClusterKeywordData<
      EmployeeClusterKeywordInterface[]
    >(filePath);
    const falsy = ["null", undefined, "", 0, null, "undefined"];
    const headers = Object.keys(keywords[0]).map((header) => {
      return header.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    });
    let clusterData: any[] = headers
      .map((header) => {
        const { id } = createObjectID();
        const keyWordCategory: keywordCategoryInterface = {
          id,
          type: KeywordType.SPORTS,
          displayName: header,
          description: header,
          slug: this.generateSlug(header),
          langugage: Language.ENGLISH,
          keyword: [],
        };

        keywords.forEach((row) => {
          const value = `${row[header]}`;
          const slug = `${this.generateSlug(value)}_${uuidv4()}`;
          if (header == keyWordCategory.displayName && !falsy.includes(value)) {
            keyWordCategory.keyword.push({
              id: createObjectID().id,
              displayName: value,
              slug,
            });
          }
        });

        return keyWordCategory;
      })
      .filter((category) => category.keyword.length);

    //StartTransaction
    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.deleteClusterKeywords(KeywordType.SPORTS);
        await this.createClusterKeyword(clusterData);
      },
      { maxWait: 5000, timeout: 60000 }
    );
  }
}

const employeeClusterKeyword = new UploadProfileClusterKeyword();
employeeClusterKeyword
  .execute("scripts/upload/EnglishSportsClustersKeywords.csv")
  .then(() => console.log("[DONE]: ..."))
  .catch((e) => console.log("[ERROR]: ", e));


