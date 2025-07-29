import { registerEnumType } from 'type-graphql';

type Int = number;
export interface CompanyUniqueValues {
  id?: string;
  name?: string;
}

export interface CompanyUniqueValuesMust {
  id: string;
  name: string;
}
