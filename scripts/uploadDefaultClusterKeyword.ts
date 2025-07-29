import { FileHelper } from "../src/helpers/FileHelper";
import { DefaultKeyWordInterface } from "../src/types/DefaultKeyWordInterface";
import { KeywordType, Language, Prisma, PrismaClient } from "@prisma/client";
import { createObjectID } from "../util/createIDs";
import { UploadClusterKeywordHelper } from "../src/helpers/UploadClusterKeywordHelper";
import { keywordCategoryInterface } from "../src/types/KeywordInterface";
import { v4 as uuidv4} from 'uuid';

const prisma = new PrismaClient();

/**
 * This script uploads default cluster
 */
export class UploadDefaultCluster extends UploadClusterKeywordHelper {
  
  async execute(filePath: string) {
    const fileHelper = new FileHelper();
    const ext = FileHelper.getFileExtension(filePath);
    let defaultKeyWords: DefaultKeyWordInterface[];
    switch (ext) {
      case "csv":
        defaultKeyWords = await fileHelper.readCSVFile<
          DefaultKeyWordInterface[]
        >(filePath);
        break;
      default:
        break;
    }
    if (!defaultKeyWords?.length) {
      console.log("[ERROR] No data");
      process.exit(1);
    }

    const falsy = ['null', undefined, '', 0, null, 'undefined'];
    const headers = Object.keys(defaultKeyWords[0]).map((header) => {
      return header.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    });
    let clusterData: keywordCategoryInterface[] = headers
      .map((header) => {
        const { id } = createObjectID();
        const keyWordCategory: keywordCategoryInterface = {
            id,
            type: KeywordType.DEFAULT,
            displayName: header,
            description: header,
            slug: this.generateSlug(header),
            langugage: Language.ENGLISH,
            keyword: []
          }
       
        defaultKeyWords.forEach((row, index) => {
          const value = `${row[header]}`
          const slug = `${this.generateSlug(value)}_${uuidv4()}`
          if(header == keyWordCategory.displayName && !falsy.includes(value)){
            keyWordCategory.keyword.push({
              id: createObjectID().id,
              displayName: value,
              slug
            });
          }
        })

        return keyWordCategory;
      }).filter((category) => category.keyword.length );

    //StartTransaction
    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.deleteClusterKeywords( KeywordType.DEFAULT);
        await this.createClusterKeyword(clusterData);
      },
      { maxWait: 5000, timeout: 60000 }
    );
  }
}

const uploadDefaultCluster = new UploadDefaultCluster();
uploadDefaultCluster
  .execute("scripts/upload/EnglishDefaultClustersKeywords.csv")
  .then(() =>
    console.log("[uploadDefaultcluster]: [DONE]: Default Cluster uploaded")
  )
  .catch((e) => console.log("[uploadDefaultCluster]: [ERROR]: ", e));
