import { registerEnumType } from "type-graphql";

export enum  UserGroupNameEnum {
    SUPER_ADMIN = "Super Admins",
    MASTER_ADMIN = "Master Admins",
    ADMIN = "Admins",
    USER = "Users",
    DEFAULT = "Default"
}

registerEnumType(UserGroupNameEnum, {name: "UserGroupName"})

export enum UserGenderEnum {
    MALE = 'MALE',
    FEMALE = 'FEMALE'
}

registerEnumType(UserGenderEnum, {name: 'UserGender'})