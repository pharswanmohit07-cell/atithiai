/* global document, window, localStorage */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = "127.0.0.1";
const server = await createServer({
  configFile: path.join(root, "vite.config.js"),
  logLevel: "error",
  server: { host, port: 4179, strictPort: true }
});
const pageErrors = [];
const runtimeConsoleErrors = [];
const apiRequestsDuringLocalDrafts = [];
let browser;

const profile = {
  interests: ["culture", "food"],
  diet: "none",
  spiceTolerance: 2,
  dailyBudget: { level: "medium", amount: null, currencyCode: null },
  pace: "balanced",
  travelParty: "solo",
  avoidCrowds: false,
  languages: ["en"],
  onboardingComplete: true
};

function errorText(page) {
  return page.locator("body").innerText();
}

async function assertHealthy(page, scenario, destination, tab) {
  const body = await errorText(page);
  assert.doesNotMatch(body, /start fresh/i, scenario + "/" + destination + "/" + tab + " displayed the error-boundary recovery text.");
  assert.doesNotMatch(body, /ReferenceError:|TypeError:|Uncaught exception/i, scenario + "/" + destination + "/" + tab + " rendered an exception.");
}

async function gotoTab(page, tab, destination, scenario) {
  const markers = {
    Home: "Explore " + destination + " at your own pace.",
    Discover: "Say it like a local",
    Plan: "Arriving early or leaving late?",
    Lens: "Try an example",
    Chat: "Talk to a person",
    Profile: "Travel preferences"
  };
  await page.locator('nav[aria-label="Main navigation"]').getByRole("button", { name: tab, exact: true }).click();
  await page.getByText(markers[tab], { exact: false }).first().waitFor({ state: "visible", timeout: 12000 });
  await assertHealthy(page, scenario, destination, tab);
}

try {
  await server.listen();
  const address = server.httpServer?.address();
  const baseUrl = "http://" + host + ":" + (typeof address === "object" && address ? address.port : 4179);
  browser = await chromium.launch({ headless: true });

  for (const scenario of ["clean-storage", "corrupted-storage"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await context.addInitScript(({ profileState, corruption }) => {
      localStorage.setItem("atithi-started-exploring", "yes");
      localStorage.setItem("atithi-traveler-profile-v1", JSON.stringify(profileState));
      if (corruption) {
        for (const city of ["jaipur", "ubud", "lisbon"]) {
          localStorage.setItem("atithi-traveler-plan:" + city, "{bad json");
          localStorage.setItem("atithi-plan-meta:" + city, "{bad json");
          localStorage.setItem("atithi-traveler-requests:" + city, "{bad json");
          localStorage.setItem("atithi-traveler-chat:" + city, "{bad json");
          localStorage.setItem("atithi-saved-experiences:" + city, "{bad json");
          localStorage.setItem("atithi-local-suggestions:" + city, "{bad json");
        }
        localStorage.setItem("atithi-flex-stay-v1", "{bad json");
        localStorage.setItem("atithi-theme", "{bad json");
        localStorage.setItem("atithi-chat-language", "unknown-language");
      }
    }, { profileState: profile, corruption: scenario === "corrupted-storage" });

    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(scenario + ": " + error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const value = message.text();
      if (/Uncaught|ReferenceError|TypeError:|The above error occurred|Objects are not valid as a React child/i.test(value)) {
        runtimeConsoleErrors.push(scenario + ": " + value);
      }
    });
    await page.route("**/api/**", (route) => route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Offline smoke test: API is intentionally unavailable." })
    }));
    await page.route("https://**/*", (route) => route.abort());
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#header-destination").waitFor({ state: "visible", timeout: 12000 });

    for (const destination of [
      { id: "jaipur", city: "Jaipur" },
      { id: "ubud", city: "Ubud" },
      { id: "lisbon", city: "Lisbon" }
    ]) {
      await page.locator("#header-destination").selectOption(destination.id);
      await page.waitForFunction((id) => document.documentElement.getAttribute("data-destination") === id, destination.id);
      for (const tab of ["Home", "Discover", "Plan", "Lens", "Chat", "Profile"]) {
        await gotoTab(page, tab, destination.city, scenario);
        for (const width of [320, 360, 390, 430, 768]) {
          await page.setViewportSize({ width, height: 844 });
          await page.waitForTimeout(30);
          const overflow = await page.evaluate(() => {
            const offenders = [...document.querySelectorAll("body *")].filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1);
            }).slice(0, 8).map((element) => {
              const rect = element.getBoundingClientRect();
              return { tag: element.tagName, id: element.id, className: String(element.className || "").slice(0, 100), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
            });
            return {
              horizontal: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 1,
              rootScrollWidth: document.documentElement.scrollWidth,
              bodyScrollWidth: document.body.scrollWidth,
              offenders
            };
          });
          assert.equal(overflow.horizontal, false, scenario + "/" + destination.id + "/" + tab + " has horizontal overflow at " + width + "px: " + JSON.stringify(overflow));
          await assertHealthy(page, scenario, destination.city, tab + " at " + width + "px");
        }
      }
    }

    await context.close();
    console.log("PASS runtime matrix: " + scenario + ", 3 destinations, 6 tabs, viewport widths 320/360/390/430/768px.");
  }

  // Verify the new local-only tasks end to end without enabling any API route.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((profileState) => {
    localStorage.setItem("atithi-started-exploring", "yes");
    localStorage.setItem("atithi-traveler-profile-v1", JSON.stringify(profileState));
  }, profile);
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push("feature-smoke: " + error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequestsDuringLocalDrafts.push(request.url());
  });
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.route("https://**/*", (route) => route.abort());
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#header-destination").waitFor({ state: "visible", timeout: 12000 });

  await gotoTab(page, "Plan", "Jaipur", "feature-smoke");
  await page.getByLabel("Arrival time (optional)").fill("10:00");
  await page.getByRole("button", { name: "Draft a request to my hotel", exact: true }).first().click();
  const draftDialog = page.getByRole("dialog");
  await draftDialog.getByText(/hotel decides availability and fees/i).waitFor({ state: "visible" });
  await draftDialog.locator("textarea").fill("My edited local draft. Thank you.");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Plan around this gap", exact: true }).first().click();
  await assertHealthy(page, "feature-smoke", "Jaipur", "Flex Stay");

  await gotoTab(page, "Discover", "Jaipur", "feature-smoke");
  await page.getByRole("button", { name: "Local Experiences", exact: true }).click();
  await page.getByRole("button", { name: "Ask the host", exact: true }).first().click();
  await page.getByRole("dialog").getByText(/Demo host\. No live host is connected/i).waitFor({ state: "visible" });
  await page.keyboard.press("Escape");

  await gotoTab(page, "Chat", "Jaipur", "feature-smoke");
  await page.getByRole("button", { name: "Talk to a person", exact: true }).click();
  await page.getByRole("dialog").getByText(/does not connect you to live staff/i).waitFor({ state: "visible" });
  await page.getByRole("dialog").getByRole("button", { name: /Draft a message to my hotel front desk/i }).click();
  await page.getByRole("dialog").getByText(/does not send this or contact anyone/i).waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Talk to a person", exact: true }).click();
  await page.getByRole("button", { name: /Suggest a correction or hidden gem for our local curators/i }).click();
  await page.getByLabel("Place name").fill("A local courtyard");
  await page.getByLabel("Area / neighbourhood").fill("Old city");
  await page.getByLabel("Why is it special?").fill("A quiet place to pause between walks.");
  await page.getByRole("button", { name: "Save suggestion locally", exact: true }).click();
  await page.getByText("Thanks, a local curator would review this (demo).", { exact: true }).waitFor({ state: "visible" });
  await assertHealthy(page, "feature-smoke", "Jaipur", "Curator suggestion");

  for (const route of ["about", "privacy", "terms"]) {
    await page.goto(baseUrl + "/" + route, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: route === "about" ? "Real traveler needs we solve" : route === "privacy" ? "Privacy policy" : "Terms and conditions" }).waitFor({ state: "visible", timeout: 8000 });
    for (const width of [320, 360, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const hasOverflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 1);
      assert.equal(hasOverflow, false, "/" + route + " has horizontal overflow at " + width + "px.");
      await assertHealthy(page, "feature-smoke", "Jaipur", "/" + route + " at " + width + "px");
    }
  }

  // Captured viewport screenshots are uploaded as a CI artifact for visual review.
  const screenshotDir = path.join(root, "artifacts", "screenshots");
  await mkdir(screenshotDir, { recursive: true });
  for (const viewport of [{ width: 390, height: 844, label: "390x844" }, { width: 1280, height: 800, label: "1280x800" }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#header-destination").waitFor({ state: "visible", timeout: 12000 });
    await page.locator('nav[aria-label="Main navigation"]').getByRole("button", { name: "Plan", exact: true }).click();
    await page.locator("#flex-stay-title").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshotDir, "plan-flex-stay-" + viewport.label + ".png"), fullPage: false });
    await page.getByLabel("Arrival time (optional)").fill("10:00");
    await page.getByRole("button", { name: "Draft a request to my hotel", exact: true }).first().click();
    await page.getByRole("dialog").getByText(/hotel decides availability and fees/i).waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(screenshotDir, "hotel-draft-sheet-" + viewport.label + ".png"), fullPage: false });
    await page.keyboard.press("Escape");
    await page.locator('nav[aria-label="Main navigation"]').getByRole("button", { name: "Discover", exact: true }).click();
    await page.getByRole("button", { name: "Local Experiences", exact: true }).click();
    await page.getByRole("button", { name: "Ask the host", exact: true }).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshotDir, "discover-ask-host-" + viewport.label + ".png"), fullPage: false });
    await page.locator('nav[aria-label="Main navigation"]').getByRole("button", { name: "Chat", exact: true }).click();
    await page.getByRole("button", { name: "Talk to a person", exact: true }).first().click();
    await page.getByRole("dialog").getByText(/does not connect you to live staff/i).waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(screenshotDir, "human-help-sheet-" + viewport.label + ".png"), fullPage: false });
    await page.keyboard.press("Escape");
    await page.goto(baseUrl + "/about", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Real traveler needs we solve" }).waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(screenshotDir, "about-page-" + viewport.label + ".png"), fullPage: true });
  }
  assert.equal(apiRequestsDuringLocalDrafts.length, 0, "Draft preparation and help UI must not call any /api endpoint.");
  assert.equal(pageErrors.length, 0, "Runtime raised page errors: " + pageErrors.join(" | "));
  assert.equal(runtimeConsoleErrors.length, 0, "Runtime logged JavaScript exceptions: " + runtimeConsoleErrors.join(" | "));
  await context.close();

  console.log("PASS feature smoke: Flex Stay gap calculation/draft/mini-plan, Ask the host draft, Human help sheet, About/Privacy/Terms routes; no API calls from draft actions.");
  console.log("PASS runtime smoke: no error-boundary recovery text, uncaught page errors or horizontal overflow in tested scenarios.");
} catch (error) {
  console.error("FAIL runtime smoke: " + (error?.stack || error));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  await server.close().catch(() => {});
}
