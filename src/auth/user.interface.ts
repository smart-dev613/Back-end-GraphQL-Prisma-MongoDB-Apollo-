export interface User {
  id: string;
  company?: {
    id?: string;
    name?: string;
  };
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: string[];
  // Session token
  token?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  phone?: string;
  synkdDataSellAllowed?: boolean;
  synkdDataSellAllowedDate?: string;
  userProfileLockedUntil?: string;

  selectedCompanyMembership?: CompanyMembership;
  otherMemberships?: [CompanyMembership];
  isChild?: boolean;
}

export interface CompanyMembership {
  id?: string;
  company?: Company;
  role?: string;
}

export interface Company {
  id?: string;
  name?: string;
}
