import express from "express";
import { chromium } from "playwright";

/**
 * Simple Quote Worker (Placeholders)
 * Accepts minimal contact/address fields and includes a Playwright
 * structure with login placeholders for future carrier automation.
 */

const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/", (_req, res) => res.send("OK"));

/**
 * Expected payload shape:
 * {
 *   "contact": { "firstName": "", "lastName": "", "email": "", "phone": "" },
 *   "address": { "street1": "", "city": "", "state": "", "zip": "" }
 * }
 */
app.post("/submit-quote", async (req, res) => {
  const id = Date.now().toString();
  const payload = req.body ?? {};

  const errors = validatePayload(payload);
  if (errors.length) {
    return res.status(400).json({ ok: false, id, errors });
  }

  // Placeholder carriers list — update LOGIN_URL/START_URL and env vars later.
  const carriers = [
    {
      name: "UP&C",
      loginUrl: process.env.CARRIER_A_LOGIN_URL || "https://example.com/login-a",
      startUrl: process.env.CARRIER_A_START_URL || "https://example.com/new-quote-a",
      username: process.env.CARRIER_A_USER || "user@example.com",
      password: process.env.CARRIER_A_PASS || "password123",
    },
    {
      name: "carrierB",
      loginUrl: process.env.CARRIER_B_LOGIN_URL || "https://example.com/login-b",
      startUrl: process.env.CARRIER_B_START_URL || "https://example.com/new-quote-b",
      username: process.env.CARRIER_B_USER || "user2@example.com",
      password: process.env.CARRIER_B_PASS || "password456",
    },
  ];

  try {
    // For now, run in "dryRun" mode (no real navigation). Set DRY_RUN=false to enable the browser steps.
    const dryRun = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";

    const results = [];
    for (const cfg of carriers) {
      // Only attempt carriers that have both username and password present
      if (!cfg.username || !cfg.password) {
        results.push({ backend: cfg.name, ok: false, error: "Missing credentials" });
        continue;
      }
      results.push(await runCarrierPlaceholder(cfg, payload, id, { dryRun }));
    }

    return res.json({ ok: true, id, results });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, id, error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("quote-worker ready on :" + (process.env.PORT || 3000)));

/** ---------------- Helpers ---------------- */

function validatePayload(p) {
  const errs = [];
  const c = p.contact || {};
  const a = p.address || {};
  if (!c.firstName) errs.push("contact.firstName is required");
  if (!c.lastName) errs.push("contact.lastName is required");
  if (!c.email) errs.push("contact.email is required");
  if (!c.phone) errs.push("contact.phone is required");
  if (!a.street1) errs.push("address.street1 is required");
  if (!a.city) errs.push("address.city is required");
  if (!a.state) errs.push("address.state is required (2-letter code)");
  if (!a.zip) errs.push("address.zip is required");
  return errs;
}

/**
 * Placeholder Playwright flow.
 * - If dryRun=true, it just returns what it *would* do without launching a browser.
 * - Set DRY_RUN=false in env to enable real browser automation.
 */
async function runCarrierPlaceholder(cfg, payload, id, { dryRun }) {
  if (dryRun) {
    return {
      backend: cfg.name,
      ok: true,
      mode: "dryRun",
      message: "Would login and fill quote with provided data.",
      usedSelectorsExample: {
        firstName: 'input[name=\"firstName\"], #firstName',
        lastName: 'input[name=\"lastName\"], #lastName',
        email: 'input[type=\"email\"], #email',
        phone: 'input[name=\"phone\"], #phone',
        street1: '#addr1, input[name=\"street1\"]',
        city: '#city, input[name=\"city\"]',
        state: '#state, select[name=\"state\"]',
        zip: '#zip, input[name=\"zip\"]',
      }
    };
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    // 1) Login
    await page.goto(cfg.loginUrl, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="text"], input[name="username"], #username', cfg.username);
    await page.fill('input[type="password"], #password', cfg.password);
    await Promise.any([
      page.click('button[type="submit"]'),
      page.press('input[type="password"]', "Enter"),
    ]);
    await page.waitForLoadState("networkidle");

    // 2) Start new quote
    await page.goto(cfg.startUrl, { waitUntil: "domcontentloaded" });

    // 3) Fill basics (adjust selectors later per carrier UI)
    const c = payload.contact;
    const a = payload.address;
    await page.fill('input[name="firstName"], #firstName', c.firstName);
    await page.fill('input[name="lastName"], #lastName', c.lastName);
    await page.fill('input[type="email"], #email', c.email);
    await page.fill('input[name="phone"], #phone', String(c.phone).replace(/\\D/g, ""));
    await page.fill('#addr1, input[name="street1"]', a.street1);
    await page.fill('#city, input[name="city"]', a.city);
    await page.selectOption('#state, select[name="state"]', a.state);
    await page.fill('#zip, input[name="zip"]', a.zip);

    // 4) Submit/rate (placeholder)
    await Promise.any([
      page.click('button[type="submit"]'),
      page.click('button:has-text("Rate")'),
      page.click('button:has-text("Next")'),
    ]);
    await page.waitForLoadState("networkidle");

    // 5) Capture a result (placeholder selector)
    const premiumSel = '.total-premium, [data-test="total-premium"]';
    let premium = null;
    try {
      await page.waitForSelector(premiumSel, { timeout: 15000 });
      premium = (await page.textContent(premiumSel))?.trim() || null;
    } catch {}

    return { backend: cfg.name, ok: true, premium };
  } catch (e) {
    return { backend: cfg.name, ok: false, error: e.message };
  } finally {
    await browser.close();
  }
}
