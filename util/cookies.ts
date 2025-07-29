import { Context } from "../src/auth/context.interface";
import {CookieOptions} from "express"

interface setCookiesData {
  name: string;
  value: string;
  options: CookieOptions
}

// setCookies - takes the provided cookies and adds them to the response headers
export const setCookies = (ctx: Context, cookies: setCookiesData[]) => {
  for (let cookie of cookies) {
    const { name, value, options } = cookie;
    ctx.res.cookie(name, value, options );
  }
  return true;
};

export const createCookieOptions = (ctx: Context): CookieOptions => {
  const development = process.env.NODE_ENV === "development";
  const origin = ctx.req.get("ORIGIN")
  if (development && origin.match(/^(https?:\/\/localhost.*)$/)) {
    return {
      domain: "localhost"
    }
  } else if (origin.match(/^(https?:\/\/(?:.+\.)?inspired-mobile\.com(?::\d{1,5})?)$/)) {
    return {
      domain: `.inspired-mobile.com`,
      secure: true,
    }
  } else {
  return {
    domain: `.synkd.life`,
    secure: true,
    sameSite: "none"
  }
}
}
