/**
 * NIRIKSHA Admin Dashboard Screenshot Capture Script
 *
 * Captures 4 screenshots for the hackathon PPT as specified in ADMIN_SCREENSHOT_GUIDE.md
 *
 * Usage: node scripts/capture-screenshots.mjs
 *
 * Prerequisites: playwright installed (npm install playwright)
 */

import { chromium } from "playwright";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, "screenshots");

const SCREENSHOTS = [
  {
    file: "niriksha_ss1_command_center.png",
    route: "/admin",
    viewport: { width: 1920, height: 1080 },
    zoom: 0.9,
    description: "Executive Command Center — full top-to-bottom viewport with KPIs, agents, and charts",
    waitForSelector: ".grid-cols-2\\.gap-3", // Hero KPIs grid
  },
  {
    file: "niriksha_ss2_ai_agents.png",
    route: "/admin",
    viewport: { width: 1440, height: 1080 },
    zoom: 1.0,
    description: "Agentic AI Operations — 3 agent cards with confidence scores",
    waitForSelector: "text=Agent Intelligence",
    scrollToSelector: "text=Agent Intelligence",
  },
  {
    file: "niriksha_ss3_analytics.png",
    route: "/admin",
    viewport: { width: 1920, height: 1080 },
    zoom: 0.9,
    description: "Inspection Intelligence & Analytics — compliance trend, dept volume, AI recommendations",
    waitForSelector: "text=AI Recommendations",
    scrollToSelector: "text=Compliance Trend",
  },
  {
    file: "niriksha_ss4_governance.png",
    route: "/admin/users",
    viewport: { width: 1920, height: 1080 },
    zoom: 1.0,
    description: "Governance & Administration — users table with RBAC",
    waitForSelector: "text=Users",
  },
];

function startDevServer() {
  return new Promise((resolve, reject) => {
    const server = spawn("pnpm", ["run", "dev"], {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let started = false;

    server.stdout.on("data", (data) => {
      const text = data.toString();
      process.stdout.write(text);
      // Vite prints "Local:" when the server is ready
      if (!started && text.includes("Local:")) {
        started = true;
        // Extract the URL
        const match = text.match(/http:\/\/localhost:\d+/);
        const url = match ? match[0] : "http://localhost:5173";
        console.log(`\n✅ Dev server ready at ${url}\n`);
        resolve({ server, url });
      }
    });

    server.stderr.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    server.on("error", (err) => {
      reject(err);
    });

    server.on("exit", (code) => {
      if (!started) {
        reject(new Error(`Server exited with code ${code} before becoming ready`));
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!started) {
        reject(new Error("Dev server did not start within 60 seconds"));
      }
    }, 60000);
  });
}

async function waitForServer(url) {
  // Use wait-on for reliable server readiness check
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["dlx", "wait-on", url], {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      shell: true,
      timeout: 60000,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`wait-on exited with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

async function captureScreenshots(serverUrl) {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // Retina quality
    colorScheme: "light",
    locale: "en-US",
  });

  const page = await context.newPage();

  try {
    for (const [index, shot] of SCREENSHOTS.entries()) {
      console.log(`\n📸 Screenshot ${index + 1}/${SCREENSHOTS.length}: ${shot.file}`);
      console.log(`   → ${shot.description}`);

      // Navigate to the page
      const fullUrl = `${serverUrl}${shot.route}`;
      await page.goto(fullUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for the key selector to appear
      await page.waitForSelector(shot.waitForSelector, { timeout: 15000 });

      // Small delay for animations to settle
      await page.waitForTimeout(1500);

      // Apply zoom via page CSS
      if (shot.zoom !== 1.0) {
        await page.evaluate((zoom) => {
          document.body.style.zoom = zoom;
        }, shot.zoom);
        await page.waitForTimeout(500);
      }

      // Scroll to the target section if specified
      if (shot.scrollToSelector) {
        await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (el) {
            el.scrollIntoView({ block: "start", behavior: "instant" });
          }
        }, shot.scrollToSelector);
        await page.waitForTimeout(1000);
      }

      // Set viewport after zoom
      await page.setViewportSize(shot.viewport);

      // Capture screenshot
      const outputPath = path.join(OUTPUT_DIR, shot.file);
      await page.screenshot({
        path: outputPath,
        fullPage: false,
        type: "png",
      });

      console.log(`   ✅ Saved to ${outputPath}`);

      // Verify file exists and has size
      const stats = fs.statSync(outputPath);
      console.log(`   📦 File size: ${(stats.size / 1024).toFixed(1)} KB`);
    }

    console.log("\n✅ All 4 screenshots captured successfully!");
  } catch (err) {
    console.error("\n❌ Error capturing screenshots:", err.message);
    throw err;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("  NIRIKSHA Admin Dashboard — Screenshot Capture");
  console.log("=".repeat(60));

  let serverProcess = null;

  try {
    // Step 1: Start the dev server
    console.log("\n🚀 Starting dev server...");
    const { server, url } = await startDevServer();
    serverProcess = server;

    // Step 2: Wait for server to be ready using wait-on
    console.log("⏳ Waiting for server to be ready...");
    await waitForServer(url);
    console.log("✅ Server is ready!");

    // Step 3: Capture screenshots
    await captureScreenshots(url);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("  Screenshots saved to:", OUTPUT_DIR);
    console.log("=".repeat(60));
    console.log("\nFiles:");
    for (const shot of SCREENSHOTS) {
      const filePath = path.join(OUTPUT_DIR, shot.file);
      const exists = fs.existsSync(filePath);
      const size = exists ? fs.statSync(filePath).size : 0;
      console.log(`  ${exists ? "✅" : "❌"} ${shot.file} (${(size / 1024).toFixed(1)} KB)`);
    }
    console.log("\n📋 Ready for PPT placement!");
  } catch (err) {
    console.error("\n❌ Fatal error:", err.message);
    process.exit(1);
  } finally {
    // Cleanup: kill the dev server
    if (serverProcess) {
      console.log("\n🛑 Stopping dev server...");
      serverProcess.kill("SIGTERM");
      // Give it a moment to clean up
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

main();