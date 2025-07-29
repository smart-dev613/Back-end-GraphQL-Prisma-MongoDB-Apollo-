import { createObjectID } from "../util/createIDs";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const xlsx = require("xlsx");
// change path name to desired excel below (check /scripts/upload)
const inputFile = "scripts/upload/EnglishEmployeeClustersKeywords.csv";

export const keywordUploadCluster = async () => {
  // Helper function to clean and standardize column names
  function cleanColumnName(colName: string) {
    return colName
      .replace("Fav.", "Fav")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/^_+|_+$/g, "") // Trim leading/trailing underscores
      .replace(/__+/g, "_") // replace double underscores
      .toLowerCase() // Convert to lowercase
      .trim();
  }

  try {
    // Read Excel file
    const workbook = xlsx.readFile(inputFile);
    const sheetName = workbook.SheetNames[0]; // Assume data is in the first sheet
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" }); // Convert sheet to JSON

    if (rows.length === 0) {
      console.log("No data found in the Excel sheet.");
      return;
    }

    // Extract headers and clean them
    const headers = Object.keys(rows[0]);
    const cleanedHeaders = headers
      .map(cleanColumnName)
      .filter((header, index) => {
        // Check if the first header item is empty or not
        const firstItemInColumn = rows[0][headers[index]];
        return header && header !== "empty" && header !== "" && firstItemInColumn;
      });

    console.log("Cleaned Headers:", cleanedHeaders);

    // Process each header (column)
    for (const [index, header] of cleanedHeaders.entries()) {
      if (index === 0) continue; // Skip the first column if it's an identifier

      // Collect keywords for this column
      const keywords = rows
        .map((row: any) => {
          const keywordValue = row[headers[index]];
          if (keywordValue && String(keywordValue).trim()) {
            const { id } = createObjectID();
            return {
              id: id,
              slug: cleanColumnName(String(keywordValue)).toLowerCase(),
              displayName: String(keywordValue).trim(),
            };
          }
          return null;
        })
        .filter(Boolean); // Remove null/undefined entries

      // Generate CrmSubCluster data
      const subClusters = keywords.map((keyword: any) => {
        return {
          id: keyword.id,
          name: keyword.displayName,
          description: keyword.displayName,
          clusterType: "KEYWORDS",
        };
      });

      //console.log("keywords: ", keywords.slice(0, 3));

      //Commented out database creation code
      try {
        const ids = createObjectID();
        // Create CrmCluster
        const crmCluster = await prisma.crmCluster.create({
          data: {
            id: ids.id,
            name: headers[index],
            description: headers[index],
            clusterType: "KEYWORDS",
            subClusters: {
              create: subClusters,
            },
          },
        });

        // Create Keyword yarn devCategory -- evaluate below to avoid dplicates with employee keywords
        await prisma.keywordCategory.create({
          data: {
            id: ids.id,
            slug: header.toLowerCase(),
            displayName: headers[index],
            description: headers[index],
            language: "ENGLISH",
            type: "EMPLOYEE",
            keywords: {
              create: keywords,
            },
          },
        });

        console.log(`Successfully created cluster and profile keyword for ${headers[index]}`);
      } catch (err) {
        console.error(`Error creating data for ${headers[index]}:`, err);
      }
    }

    console.log("Excel file processed successfully.");
  } catch (err) {
    console.error("Error reading or processing the Excel file:", err);
  }
};

keywordUploadCluster();