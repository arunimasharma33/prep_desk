// generate_pdf.js
// Usage: node generate_pdf.js <input.html> <output.pdf>
//
// Renders the given HTML file to a clean, print-ready PDF using Puppeteer.
// Respects PUPPETEER_EXECUTABLE_PATH / CHROME_PATH env vars if set, so it can
// use a system-installed Chromium instead of downloading its own.

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function main() {
  const [, , inputPath, outputPath] = process.argv;

  if (!inputPath || !outputPath) {
    console.error("Usage: node generate_pdf.js <input.html> <output.pdf>");
    process.exit(1);
  }

  const absInput = path.resolve(inputPath);
  if (!fs.existsSync(absInput)) {
    console.error(`Input HTML not found: ${absInput}`);
    process.exit(1);
  }

  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };

  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (execPath) {
    launchOptions.executablePath = execPath;
  }

  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.goto(`file://${absInput}`, { waitUntil: "networkidle0" });
    await page.pdf({
      path: path.resolve(outputPath),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } catch (err) {
    console.error("PDF generation error:", err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
