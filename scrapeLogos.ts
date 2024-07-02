import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import https from "https";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fetchTickers() {
  return await prisma.company.findMany({
    select: {
      symbol: true,
    },
  });
}

// Function to download the image
const downloadImage = (url: string, filepath: string) => {
  return new Promise<void>((resolve, reject) => {
    https
      .get(url, (res) => {
        const fileStream = fs.createWriteStream(filepath);
        res.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          console.log("Downloaded:", filepath);
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(filepath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error removing file:", unlinkErr);
          }
          reject(err);
        });
      });
  });
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const tickers = (await fetchTickers()).map((ticker) => ticker.symbol);

  for (const ticker of tickers) {
    try {
      const filepath = path.join(__dirname, "logos", `${ticker}.svg`);
      if (fs.existsSync(filepath)) {
        console.log(`File already exists, skipping download: ${filepath}`);
        continue;
      }
      const url = `https://www.tradingview.com/symbols/NASDAQ-${ticker}/`;
      await page.goto(url, { waitUntil: "networkidle" });

      // Extracting the logo using the specific class names
      const imageElements = await page.$$(
        "img.tv-circle-logo-PsAlMQQF.tv-circle-logo--xxxlarge-PsAlMQQF.large-xoKMfU7r"
      );
      if (imageElements.length > 0) {
        const imageUrl = await imageElements[0].getAttribute("src");
        if (imageUrl) {
          const filepath = path.join(__dirname, "logos", `${ticker}.svg`);
          await downloadImage(imageUrl, filepath);
        } else {
          console.log(`Logo not found for ${ticker}`);
        }
      } else {
        console.log(`Logo not found for ${ticker}`);
      }
    } catch (error) {
      console.error(`Failed to process ${ticker}: ${error}`);
    }
  }

  await browser.close();
})();
