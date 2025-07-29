import { verify, sign } from "jsonwebtoken";
import { User, CompanyMembership } from "./user.interface";

export const decodeUser = (JWTtoken: string | null) => {

  try { 
  const user = <any>
    verify(JWTtoken, process.env.JWT_KEY)
  
  return user;
  }catch (e){
    return null
  }
};

export const decodeMembership = (JWTtoken: string | null) => {

  try { 
  const membership = <CompanyMembership | null>
    verify(JWTtoken, process.env.JWT_FE_KEY)
  
  return membership;
  }catch (e){
    return null
  }
};

export const encodeUser = (user: any) => {
  const token: string = sign(
    user,
    process.env.JWT_KEY
  );
  return token;
};

export const encodeMembership = (selectedCompanyMembership: CompanyMembership) => {
  const token: string = sign(
    selectedCompanyMembership,
    process.env.JWT_FE_KEY
  );
  return token;
};