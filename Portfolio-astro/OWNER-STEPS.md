# Steps only the account owner can do

These need a login to Resend, Stripe, DNS, GitHub or Netlify. Menu names change, so each step gives the page address first and describes what to look for. Where a step has not been checked against the current screens, it says so.

## Verify your own domain in Resend (so clients get email)

Test mode only delivers to your own address, so this is required before any client can book.

1. Open https://resend.com/domains and choose Add Domain. Use a subdomain such as `mail.yourdomain.com` so it cannot disturb your normal email.
2. Resend shows a few DNS records (SPF, DKIM, optionally DMARC). Add each exactly as shown at the company that hosts your DNS (where you bought the domain, or Netlify DNS if you moved it there).
3. Back in Resend choose Verify. It can take from minutes to a day.
4. Set the GitHub secret `EMAIL_FROM` to something like `Fox & Fern <bookings@mail.yourdomain.com>` and run **Sync secrets to Netlify**, then redeploy.
5. Run `npm run launch-check -- https://<site>` and make a test booking with an email address that is not yours.

## Stripe: webhook events

Developers > Webhooks (in newer dashboards it may sit under Workbench). Open your endpoint and make sure it listens to:

- `checkout.session.completed`
- `charge.refunded` (needed so a refund in Stripe frees the date)

## Stripe: go live

1. Finish the business details Stripe asks for under account activation (legal name, bank account, and so on).
2. Switch to live mode (the toggle in the dashboard) and create the webhook endpoint again there with the same two events. Copy its signing secret (`whsec_...`).
3. Copy the live secret key (`sk_live_...`) from Developers > API keys.
4. Put both in the GitHub `production` environment as `LIVE_STRIPE_SECRET_KEY` and `LIVE_STRIPE_WEBHOOK_SECRET`. Follow section 4 of `CLIENT-LAUNCH.md`.
5. Payment methods: in Settings > Payment methods (live mode) turn off Klarna and Affirm for this account, or restrict them, so deposits are card, Apple Pay and Google Pay. *The exact menu label was not checked.*

## Uptime monitor

Use any monitor that checks a web address every few minutes and emails you (UptimeRobot and Better Stack both have free plans). Add two checks: the home page, and `https://<site>/api/availability` which should return JSON containing `"configured":true`. Send alerts to the studio owner's email.

## Verify the content editor login on Netlify (not yet confirmed)

The editor at `/Photography-Studio/admin/` signs in with GitHub through Netlify. Two things have never been confirmed on a real deploy:

1. Open the editor on the deployed site and sign in. If the page stays blank, open the browser console: a Content-Security-Policy error means the relaxed rule for `/Photography-Studio/admin/*` in `public/_headers` is being combined with the strict site-wide rule. Fix by changing the site-wide rule to exclude the admin path.
2. If sign-in opens a popup that closes without logging in, in Netlify go to Site configuration > Access & security > OAuth and make sure a GitHub provider is installed. *Menu names unverified.*

Make a small edit in the editor, save, and check a commit appears on the branch.

## GitHub settings used by the workflows

- Repository secrets: those listed in `.github/workflows/netlify-env.yml`, plus `SITE_URL` for the backup.
- Environment `production`: required reviewer yourself; holds the two `LIVE_` secrets.
- Repository variable `GO_LIVE`: `true` after going live.
- Backups and the daily reminder only run on the default branch and the production deploy respectively. Reminders are Netlify scheduled functions, which run on production deploys only.
