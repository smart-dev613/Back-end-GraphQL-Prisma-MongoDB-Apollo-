import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import { buildSchemaSync } from "type-graphql";
import { mainResolver } from "./resolvers/resolver";
import { decodeUser } from "./auth/tokeniser";
import { authChecker } from "./auth/authChecker";
import dotenv from "dotenv";

import restRouter from "./rest";
import { PrismaClient } from "@prisma/client"; // Import PrismaClient from the latest version

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import { sendWeeklyReport } from "./weeklyReport";
import "./env";
import { checkIfUserIsSynkd } from "./helpers/permissionsHelper";

import { initXero } from "./billing/xero";
import { crawlCurrencyData } from "../scripts/parseCurrencyRate";
import { run as deleteArchiveItem } from "../scripts/deleteArchiveItem";
import { syncTAR } from "../scripts/syncTAR";
import { addCreditForFreeCompanies } from "../scripts//addCreditsFreePackage";

import { ClusterResolver } from "./resolvers/clusterResolver";
import { marketingResolver } from "./resolvers/marketingResolver";
import { billingResolver } from "./resolvers/billingResolver";
import { researchResolver } from "./resolvers/researchResolver";
import { campaignResolver } from "./resolvers/campaignResolver";
import { PermissionsResolver } from "./resolvers/permissionsResolver";
import { AdminResolver } from "./resolvers/adminResolver";
import { communityResolver } from "./resolvers/communityResolver";
import { supportResolver } from "./resolvers/supportResolver";
import { studioResolver } from "./resolvers/studioResolver";
import { marketplaceResolver } from "./resolvers/marketplaceResolver";
import { mediaResolver } from "./resolvers/mediaResolver";
import { CodesResolver } from "./resolvers/codesResolver";
import { eventsResolver } from "./resolvers/eventsResolver";
import { CrmQueries } from "./resolvers/cluster/versioning";
import { hubResolver } from "./resolvers/hubResolver";
import { LegacyCrmResolver } from "./resolvers/cluster/legacyUpdate";
import { KeywordsResolver } from "./resolvers/keywordsResolver";
import { ProjectDomainResolver } from "./resolvers/projectDomainResolver";
import { createObjectID } from "../util/createIDs";

// Initialize PrismaClient
const prisma = new PrismaClient();

dotenv.config({ override: true, debug: true });
interface Cookies {
  FenixToken?: string;
  CurrentCompany?: string;
  [key: string]: string;
}

const bootstrap = async () => {
  // Initialise Express, which we'll be running alongside Apollo Server
  // override bodyparser with express 
  const app = express();
  const path = "/";
  const port = process.env.PORT || 800;

  app.use(cookieParser());
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  app.use((
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    if (req.originalUrl === '/stripe') {
      next();
    } else if (req.originalUrl === '/revolut-auth'){
      next();
    } else {
      express.json({limit: '2mb'})(req, res, next);
    }
  })
  app.set("trust proxy", true);

  const corsOptions: cors.CorsOptions = {
    credentials: true,
    origin: [
      /^(https?:\/\/(?:.+\.)?realtek\.digital(?::\d{1,5})?)$/,
      /^(https?:\/\/(?:.+\.)?synkd\.life(?::\d{1,5})?)$/,
      /^(https?:\/\/(?:.+\.)?byinspired\.com(?::\d{1,5})?)$/,
      /^(https?:\/\/(?:.+\.)?localhost(?::\d{1,5})?)$/,
      /^(https?:\/\/(?:.+\.)?inspired-mobile\.com(?::\d{1,5})?)$/,
      /^(https?:\/\/(?:.+\.)?imagine-mobile\.com(?::\d{1,5})?)$/,
      /^(https?:\/\/(?:.+\.)?amazonaws\.com(?::\d{1,5})?)$/,
      /^(https?:\/\/(?:.+\.)?inspired-mobile\.cn(?::\d{1,5})?)$/,
    ],
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));

  app.use("/", restRouter);

  const schema = buildSchemaSync({
    resolvers: [
      mainResolver,
      CrmQueries,
      studioResolver,
      CodesResolver,
      eventsResolver,
      campaignResolver,
      ClusterResolver,
      researchResolver,
      marketingResolver,
      billingResolver,
      AdminResolver,
      communityResolver,
      hubResolver,
      supportResolver,
      PermissionsResolver,
      marketplaceResolver,
      mediaResolver,
      LegacyCrmResolver,
      KeywordsResolver,
      ProjectDomainResolver,
    ],
    authChecker,
  });

  const server = new ApolloServer({
    introspection: true,
    playground: false,
    schema,
    context: async ({ req, ...ctx }) => {
      const cookies = req.cookies;
      let user = null;
      const sessionID = decodeUser(cookies.FenixToken);
      if (sessionID) {
        // console.log("session found");
        // Fetch the user session using the sessionID from the cookies
        const sessionObject = await prisma.userSession.findUnique({
          where: { SessionID: sessionID["token"] },
          include: {
            user: {
              include: { company: true },
            },
          },
        });
        if (sessionObject) {
          user = sessionObject.user;
        }
      }

      let company = null;
      if (user) {
        // console.log("user found");
        // Fetch the company associated with the user
        company = await prisma.company.findUnique({
          where: { id: user.company.id }, // Ensure this field matches the actual field in your user model
        });
      }

      let companyMembership = null;

      if (company && user) {
        // Fetch company membership for the user
        companyMembership = await prisma.companyMembership.findFirst({
          where: {
            company: { id: company.id },
            userId: user.id, // Ensure userID matches the actual field in your companyMembership model
          },
        });
      }
      let userRoles = [];

      if (user) {
        // Check if the user is synced and add roles accordingly
        const isSynkd = await checkIfUserIsSynkd(user.id);
        if (isSynkd) userRoles.push("synkd");
        user.roles = userRoles; // Add roles to the user object
      }

      return { user, company, companyMembership, req, ...ctx }; // Return the context object
    },
  });

  // Apply middleware to Apollo Server so that Express can be used alongside
  server.applyMiddleware({ app, path, cors: false });

  app.listen({ port }, () => {
    console.log(
      `🚀 Server is running at http://localhost:${port}${server.graphqlPath}`
    );
  });
};

bootstrap();
initXero();

// Schedule tasks
const { COMMUNITY_WEEKLY_REPORT = 5 } = process.env;
cron.schedule("0 0 * * " + COMMUNITY_WEEKLY_REPORT, () => sendWeeklyReport());
// run tar sync every 24hrs only in prod
if (process.env.NODE_ENV === "production") {
  cron.schedule("0 0 * * *", () => syncTAR());
}
// for testing - run every 10mins
// cron.schedule('*/10 * * * *', () => syncTAR())

// cron.schedule("0 0 0 1 * *", () => crawlCurrencyData());
// remove this for now
// cron.schedule("0 0 1 * * *", () => deleteArchiveItem());
cron.schedule("0 0 3 1 * *", () => addCreditForFreeCompanies());
