import { KeywordType, Language, Prisma, PrismaClient } from "@prisma/client";
import { FileHelper } from "../src/helpers/FileHelper";
import { CompanyClusterKeywordInterface } from "../src/types/CompanyClusterKeywordInterface";
import { createObjectID } from "../util/createIDs";
import { UploadClusterKeywordHelper } from "../src/helpers/UploadClusterKeywordHelper";
import { keywordCategoryInterface } from "../src/types/KeywordInterface";
import _ from "lodash";
import { v4 as uuid4} from 'uuid';

const prisma = new PrismaClient();

export class UploadCompanyClusterKeyword extends UploadClusterKeywordHelper {
  async execute(filePath: string) {
    const ext = FileHelper.getFileExtension(filePath);

    const fileHelper = new FileHelper();
    let companyKeyword: CompanyClusterKeywordInterface[];
    switch (ext) {
      case "csv":
        companyKeyword = await fileHelper.readCSVFile(filePath);
        break;
      default:
        break;
    }
    if (!companyKeyword) {
      console.log("[DATA] No data");
      process.exit(1);
    }

    const falsy = ["null", undefined, "", 0, null, "undefined"];
    const headers = Object.keys(companyKeyword[0]).map((header) => {
      return header.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    });
   
    const clusterData: keywordCategoryInterface[] = headers
      .map((header, index) => {
        const { id } = createObjectID();
        const keyWordCategory: keywordCategoryInterface = {
          id,
          type: KeywordType.COMPANY,
          displayName: header,
          description: header,
          slug: `${this.generateSlug(header)}_${uuid4()}`,
          langugage: Language.ENGLISH,
          keyword: [],
        };

        companyKeyword.forEach((row, index) => {
          const value = `${row[header]}`;
          const slug = `${this.generateSlug(value)}_${uuid4()}`;
          if (header == keyWordCategory.displayName && !falsy.includes(value)) {
            
            keyWordCategory.keyword.push({
              id: createObjectID().id,
              displayName: value,
              slug
            });
          }
        });

        return keyWordCategory;
      })
      .filter((category) => category.keyword.length);

      

    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.deleteClusterKeywords(KeywordType.COMPANY);
        await this.createClusterKeyword(this.uniqueSlug(clusterData));
      },
      { maxWait: 5000, timeout: 40000 }
    );
  }
}

const companyCluster = new UploadCompanyClusterKeyword();
companyCluster
  .execute("scripts/upload/EnglishCompanyClustersKeywords.csv")
  .then(() => console.log("[uploadCompanyCluster]: [DONE] "))
  .catch((e) => console.log("[uploadCompanyCluster]: [ERROR] ", e));
