import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, "nasdaqlisted.txt");
  const data = fs.readFileSync(filePath, "utf8");
  const lines = data.split("\n");

  console.log("Starting to process companies...");

  for (let line of lines) {
    const [symbol, name] = line.split("|");
    if (symbol && name) {
      console.log(`Processing company: ${symbol.trim()}`);
      await prisma.company
        .create({
          data: {
            name: name.trim(),
            symbol: symbol.trim(),
          },
        })
        .catch((err: Error) => console.error(`Error inserting ${symbol}: ${err.message}`));
    }
  }

  console.log("Finished processing all companies.");
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
