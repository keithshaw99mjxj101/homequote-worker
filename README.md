# Quote Worker (Playwright-ready, placeholders)

This is a tiny Node/Express service designed to accept **basic contact & address data** from your website and (optionally) run **Playwright** to log into carrier portals and fill quote forms. It ships with **placeholders** so you can deploy now and add real selectors later.

## Endpoints
- `GET /` → health check ("OK")
- `POST /submit-quote` → accepts JSON:
```json
{
  "contact": { "firstName": "Jane", "lastName": "Doe", "email": "jane@example.com", "phone": "5551234567" },
  "address": { "street1": "123 Main St", "city": "Austin", "state": "TX", "zip": "78701" }
}
```

## Quick Start (Render deploy)
1. Create a **GitHub** repo (e.g., `quote-worker`) and upload these files.
2. Create a **Render** account → **New → Web Service → Build from a repo** → pick your repo.
3. Render detects the `Dockerfile` and builds automatically.
4. Add **Environment Variables** (in Render → your service → *Environment*):
   - `DRY_RUN=true` (default). Set to `false` later to run real browsers.
   - `CARRIER_A_LOGIN_URL`, `CARRIER_A_START_URL`, `CARRIER_A_USER`, `CARRIER_A_PASS`
   - `CARRIER_B_LOGIN_URL`, `CARRIER_B_START_URL`, `CARRIER_B_USER`, `CARRIER_B_PASS`
5. Open your service URL. `GET /` should respond with **OK**.

### Test the API
```bash
curl -X POST https://YOUR-RENDER-URL/submit-quote \
  -H "Content-Type: application/json" \
  -d '{"contact":{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","phone":"5551234567"},"address":{"street1":"123 Main St","city":"Austin","state":"TX","zip":"78701"}}'
```

You should see a JSON response with `ok: true`, an `id`, and `results` per placeholder carrier. With `DRY_RUN=true`, no actual browser launches; it just shows what it *would* do. Set `DRY_RUN=false` later to enable real Playwright navigation and fill steps.

## Wiring your HostGator form
**Direct POST from the browser:**
```html
<script>
async function submitQuote(e) {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target).entries());
  const payload = {
    contact: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone },
    address: { street1: form.street1, city: form.city, state: form.state, zip: form.zip }
  };
  const res = await fetch("https://YOUR-RENDER-URL/submit-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log("Result:", data);
}
</script>
```

**Or via a tiny PHP proxy** (`/public_html/api/submit-quote.php`):
```php
<?php
header('Content-Type: application/json');
$payload = file_get_contents('php://input');
$ch = curl_init("https://YOUR-RENDER-URL/submit-quote");
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
echo curl_exec($ch);
curl_close($ch);
```

## Where to add real selectors later
Open `server.js` → edit `runCarrierPlaceholder()`:
- Replace the placeholder selectors for first/last/email/phone/address with each carrier's **actual** field selectors.
- Update the **loginUrl** and **startUrl** in your environment variables.
- When ready, set `DRY_RUN=false` in Render to enable the real browser flow.

## Notes
- Keep credentials in environment variables (never hardcode).
- Use HTTPS only; avoid logging PII.
- To reduce MFA challenges, establish a trusted device/session once and consider saving cookies with Playwright `storageState` (add a persistent disk on Render if you want to keep it across restarts).
