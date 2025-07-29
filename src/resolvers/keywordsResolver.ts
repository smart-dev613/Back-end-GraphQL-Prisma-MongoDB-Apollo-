import { PrismaClient, Prisma, Language, KeywordType } from '@prisma/client';
const prisma = new PrismaClient();
import { 
  Resolver, 
  Query, 
  Mutation, 
  Arg, 
  InputType, 
  Field, 
  ObjectType,
  registerEnumType
} from 'type-graphql'

import { json } from '../helpers';
import { StringNullableChain } from 'lodash';

// Add an enum for language if it's not already defined
// enum Language {
//   ENGLISH = 'ENGLISH',
//   SPANISH = 'SPANISH',
//   FRENCH = 'FRENCH',
//   // Add other language options as needed
// }

// Register the enum with GraphQL
registerEnumType(Language, {
  name: 'Language',
  description: 'Available languages',
});

registerEnumType(KeywordType, {
  name: 'KeywordType',
  description: 'Keyword Type',
});


@InputType()
export class KeywordCategoryInput {
    @Field()
    slug!: string

    @Field(type => [String])
    keywords!: string[]
}


@InputType()
export class ProfileKeywordInput {
    @Field(type => String)
    slug!: string

    @Field(type => String)
    displayName!: string

    @Field(type => String, { nullable: true })
    description?: string

    @Field(type => Language, { nullable: true })
    language?: Language

    @Field(type => KeywordType, { nullable: true })
    type?: KeywordType

    @Field(type => [KeywordInput])
    keywords!: KeywordInput[]
}

@InputType()
export class KeywordInput {
    @Field(type => String, { nullable: true})
    id?: string

    @Field(type => String)
    slug!: string

    @Field(type => String)
    displayName!: string
}

@InputType()
export class KeywordUpdateInput {
  @Field(type => String, { nullable: true })
  slug?: string

  @Field(type => String)
  displayName!: string

  @Field(type => String)
  id!: string
}

@InputType()
export class updateKeywordInput {

    @Field()
    categoryId: string

    @Field(type => String, {nullable: true})
    slug?: string
    
    @Field(type => String)
    displayName: string

    @Field(type => String)
    id: string

    // @Field(type => KeywordInput)
    // keyword: KeywordInput

}

@InputType()
export class UpdateKeywordCategoryInput {
    @Field(type => String)
    id!: string

    @Field(type => [KeywordUpdateInput])
    keyword!: KeywordUpdateInput[]

    @Field(type => String)
    slug!: string

    @Field(type => String)
    description!: string

    @Field(type => String)
    displayName!: string
}

@ObjectType()
export class ProfileKeyword {
    @Field(type => String)
    id!: string

    @Field(type => String)
    slug!: string

    @Field(type => String)
    displayName!: string

    @Field(type => String, { nullable: true })
    description?: string | null

    @Field(type => Language, { nullable: true })
    language?: Language | null

    @Field(type => KeywordType, { nullable: true })
    type?: KeywordType | null

    @Field(type => [KeywordsProfileKeyword])
    keywordsProfileKeyword!: KeywordsProfileKeyword[]
}

@ObjectType()
export class Keyword {
    @Field(type => String)
    id!: string

    @Field(type => String)
    slug!: string

    @Field(type => String)
    displayName!: string
}

@ObjectType()
export class KeywordsProfileKeyword {
    @Field(type => String)
    id!: string

    @Field(type => String)
    profileKeywordId!: string

    @Field(type => String)
    keywordId!: string

    @Field(type => Keyword)
    keyword!: Keyword
}

@InputType()
export class CategoryKeyword { 
    @Field(type => String)
    id!: string

    @Field(type => String)
    displayName: string

}

@InputType()
export class SyncCategoryKeywordsByIdInput { 
    @Field((type) => String)
    categoryId!: string

    @Field((type) => CategoryKeyword)
    keywords!: CategoryKeyword[]

}



@Resolver()
export class KeywordsResolver {
    // Helper function to clean and standardize column names
    cleanKeyword(keyword: string) {
        return keyword
            .replace("Fav.", "Fav")
            .replace(/[^a-zA-Z0-9]/g, "_")
            .replace(/^_+|_+$/g, "") // Trim leading/trailing underscores
            .replace(/__+/g, "_") // replace double underscores
            .toLowerCase() // Convert to lowercase
            .trim();
    }

    @Query((returns) => [ProfileKeyword], 
           { description: "List all profile keywords" })
    async getAllProfileKeywords() {
        return await prisma.keywordCategory.findMany({
            include: {
                keywords: true
            }
        });
    }

    async getAllKeywordClusters(){
        const keywordClusters = await prisma.crmCluster.findMany({
            where: { clusterType: "KEYWORDS"},
            include: {
                users: true,
                subClusters: true,
            }
        })

        return keywordClusters;

    }

    @Query(returns => json, {description: "list all keyword categories and associated keywords"})
    async getAllKeywordCategories() {
        let keywordCategories = await prisma.keywordCategory.findMany({
            include:{
                keywords: true,
            }
        })
        return keywordCategories
    }


    // @ts-ignore
    @Query(returns => json, {description: "list all keyword clusters"})
    async getKeywordClusters() {
        return this.getAllKeywordClusters()
    }

    @Query(returns => json, {description: "return a particular keyword category and its associated keywords"})
    async getKeywordCategories(@Arg("slug") slug: string){

        let keywordCategories = await prisma.keywordCategory.findMany()
        console.log("allKeywordCategories: ", keywordCategories)
        return keywordCategories
    }


    @Query(returns =>  ProfileKeyword, { description: "Get a specific profile keyword by slug" })
    async getProfileKeywordBySlug(@Arg("slug") slug: string) {
        const profileKeyword = await prisma.keywordCategory.findUnique({
            where: { slug },
            include: {
                keywords: true
            }
        });

        if (!profileKeyword) {
            throw new Error(`Profile Keyword with slug ${slug} not found`);
        }

        return profileKeyword;
    }
    
    @Mutation(returns => ProfileKeyword, { description: "Create a new profile keyword with associated keywords" })
    async createProfileKeyword(@Arg("data", type=> ProfileKeywordInput ) data: Prisma.KeywordCategoryCreateInput) {
        // Start a transaction to ensure atomic creation
        // return await prisma.$transaction(async (prisma) => {
            // Create the ProfileKeyword
            const profileKeyword = await prisma.keywordCategory.create({
                data: {
                    slug: this.cleanKeyword(data.slug),
                    displayName: data.displayName,
                    description: data.description,
                    language: data.language as any,
                    type: data.type as any
                }
            });

            // Create associated keywords
            // const keywordCreations = data?.keywords.map(async (keywordData) => {
            //     // First, create or find the keyword
            //     const keyword = await prisma.keywords.upsert({
            //         where: { 
            //             id: this.cleanKeyword(keywordData.slug) 
            //         },
            //         update: {
            //             displayName: keywordData.displayName
            //         },
            //         create: {
            //             slug: this.cleanKeyword(keywordData.slug),
            //             displayName: keywordData.displayName
            //         }
            //     });

            //     // Then create the junction table entry
            //     return prisma.keywordsProfileKeyword.create({
            //         data: {
            //             profileKeywordId: profileKeyword.id,
            //             keywordId: keyword.id
            //         }
            //     });
            // });

            // // Wait for all keyword associations to be created
            // await Promise.all(keywordCreations);

            // Return the created ProfileKeyword with its associations
            return prisma.keywordCategory.findUnique({
                where: { id: profileKeyword.id },
                include: {
                    keywords: true
                }
            });
        // });
    }

    @Mutation(returns => ProfileKeyword, 
              { description: "Update an existing profile keyword" })
    async updateProfileKeyword(@Arg("data", type=> ProfileKeywordInput ) data: any) {
        return await prisma.$transaction(async (prisma) => {
            // Update the existing profile keyword
            const updatedProfileKeyword = await prisma.keywordCategory.update({
                where: { id: data.profileKeywordId },
                data: {
                    slug: this.cleanKeyword(data.slug),
                    displayName: data.displayName
                }
            });

            // If a specific keyword is being updated
            if (data.keywordId) {
                // Update the associated keyword
                await prisma.keyword.update({
                    where: { id: data.keywordId },
                    data: {
                        slug: this.cleanKeyword(data.slug),
                        displayName: data.displayName
                    }
                });
            }

            return updatedProfileKeyword;
        });
    }

    // @Mutation(returns => json, {description: "return updated keywords"})
    // async updateKeyword(@Arg("data") data: updateKeywordInput,){

    //     const category: any = await prisma.profileKeyword({ id: data?.categoryId }).$fragment(`
    //             id
    //             slug
    //             displayName
    //             keywords {
    //                 id
    //                 slug
    //                 displayName
    //             }
    //         `)
    //     //const keyword = (category?.keywords ?? []).map(keyword => keyword?.id === data?.keyword?.id)
    //     const updateKeywords: any = [
    //         ...category.keywords,
    //         {
    //             id: data?.id,
    //             slug: this.cleanKeyword(data?.displayName),
    //             displayName: data?.displayName
    //         }
    //     ]

    //   console.log("updateKeyword: ", data, updateKeywords)
    //    let result =  await prisma.updateProfileKeyword({
    //         data: { keywords: { create: updateKeywords }},
    //         where: { id: data?.categoryId }
    //     })

    //     return result
        
    // }

    @Mutation(returns => Keyword, { description: "Update an existing keyword" })
    async updateKeyword(
        @Arg("data") data: updateKeywordInput,
    ) {

        console.log("updateKeyword->data: ", data)

        const newSlug = this.cleanKeyword(data.displayName);

        console.log("Attempting to update Keyword:", { id: data.id, displayName: data.displayName, slug: newSlug });

        try {

            const updatedKeyword = await prisma.keyword.update({
                where: {
                    id: data.id,
                },
                data: {
                    displayName: data.displayName,
                    slug: newSlug,
                },
            });

            console.log("Successfully updated keyword:", updatedKeyword);
            return updatedKeyword;

        } catch (error: any) {

            console.error("Error updating keyword: ", error);
            throw new Error("Failed to update keyword.");
        }
    }

    @Mutation(() => [Keyword], { description: 'Synchronize keywords within a KeywordCategory by ID' })
    async syncCategoryKeywordsById(
      @Arg('data') data: SyncCategoryKeywordsByIdInput,
    ): Promise<Keyword[]> {
      const { categoryId, keywords: newKeywordsData } = data;
  
      console.log('syncCategoryKeywordsById->data: ', data);
  
      try {
        const keywordCategory = await prisma.keywordCategory.findUnique({
          where: { id: categoryId },
          include: { keywords: true },
        });
  
        if (!keywordCategory) {
          throw new Error(`KeywordCategory with ID '${categoryId}' not found.`);
        }
  
        const existingKeywords = keywordCategory.keywords;
        const existingKeywordIds = new Set(existingKeywords.map((kw) => kw.id));
        const newKeywordIdMap = new Map(
          newKeywordsData.filter((kw) => kw.id).map((kw) => [kw.id, kw.displayName])
        );
  
        const keywordsToCreate: { displayName: string; slug: string; keywordCategoryId: string }[] = [];
        const keywordsToUpdate: { id: string; displayName: string; slug: string }[] = [];
        const keywordsToDelete: string[] = [];
  
        // Identify keywords to update and create
        for (const newKeywordData of newKeywordsData) {
          const newSlug = this.cleanKeyword(newKeywordData.displayName);
  
          if (newKeywordData.id && existingKeywordIds.has(newKeywordData.id)) {
            // Existing keyword, check if displayName needs updating
            const existingKeyword = existingKeywords.find(kw => kw.id === newKeywordData.id);
            if (existingKeyword && existingKeyword.displayName !== newKeywordData.displayName) {
              keywordsToUpdate.push({ id: newKeywordData.id, displayName: newKeywordData.displayName, slug: newSlug });
            }
          } else if (!newKeywordData.id) {
            // New keyword
            keywordsToCreate.push({
              displayName: newKeywordData.displayName,
              slug: newSlug,
              keywordCategoryId: categoryId,
            });
          }
        }
  
        // Identify keywords to delete
        for (const existingKeyword of existingKeywords) {
          if (!newKeywordIdMap.has(existingKeyword.id)) {
            keywordsToDelete.push(existingKeyword.id);
          }
        }
        const keywordMap = keywordsToUpdate.map((w) => { 
            return prisma.keyword.update({
                where: { id: w.id },
                data: { displayName: w.displayName, slug: w.slug}
            })
        })
        const [createdResults, updatedResults, deletedResults] = await prisma.$transaction([
          prisma.keyword.createMany({ data: keywordsToCreate }),
          ...keywordMap,
          prisma.keyword.deleteMany({
            where: {
              id: { in: keywordsToDelete },
              keywordCategoryId: categoryId,
            },
          }),
        ]);
  
        // Fetch the updated list of keywords for the category
        const updatedCategory = await prisma.keywordCategory.findUnique({
          where: { id: categoryId },
          include: { keywords: true },
        });
  
        return updatedCategory?.keywords || [];
      } catch (error: any) {
        console.error('Error synchronizing keywords in category:', error);
        throw new Error(`Failed to synchronize keywords for category ID '${categoryId}'.`);
      }
    }


    
    // @Mutation(returns => ProfileKeyword, 
    //           { description: "Add a keyword to a profile keyword" })
    // async addKeywordToProfileKeyword(
    //     @Arg("profileKeywordId", type => String) profileKeywordId: string, 
    //     @Arg("keywordData", type => String) keywordData: any
    // ) {
    //     return await prisma.$transaction(async (prisma) => {
    //         // First, ensure the profile keyword exists
    //         const profileKeyword = await prisma.keywordCategory.findUnique({
    //             where: { id: profileKeywordId }
    //         });

    //         if (!profileKeyword) {
    //             throw new Error(`Profile Keyword with ID ${profileKeywordId} not found`);
    //         }

    //         // Create or find the keyword
    //         const keyword = await prisma.keyword.upsert({
    //             where: { 
    //                 id: this.cleanKeyword(keywordData.slug) 
    //             },
    //             update: {
    //                 displayName: keywordData.displayName
    //             },
    //             create: {
    //                 slug: this.cleanKeyword(keywordData.slug),
    //                 displayName: keywordData.displayName
    //             }
    //         });

    //         // Create the junction table entry
    //         await prisma.keywordsProfileKeyword.create({
    //             data: {
    //                 profileKeywordId: profileKeywordId,
    //                 keywordId: keyword.id
    //             }
    //         });

    //         // Return the updated profile keyword
    //         return prisma.keywordCategory.findUnique({
    //             where: { id: profileKeywordId },
    //             include: {
    //                 keywords: true
    //             }
    //         });
    //     });
    // }
}