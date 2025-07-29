import { KeywordType, Language } from "@prisma/client";

export interface keywordCategoryInterface { 
    id: string;
    slug: string;
    displayName: string;
    description: string;
    langugage: Language;
    type: KeywordType;
    keyword: KeywordInterface[];

}
export interface KeywordInterface { 
    id: string;
    slug: string;
    displayName: string;
    keywordCategoryId?: string;
    keywordCategory?: keywordCategoryInterface;
}