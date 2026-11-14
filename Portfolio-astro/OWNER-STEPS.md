# Steps only the account owner can do

## Most settings are applied by the pipeline

The **Configure services** workflow (`.github/workflows/configure-services.yml`) reads `services.config.json` and the GitHub secrets, then sets up:

- Stripe: the webhook endpoint with `checkout.session.completed` and `charge.refunded`, and Klarna/Affirm/Afterpay off (test, and live once `GO_LIVE` is true)
- Resend: adds your sending domain and starts verification; with `netlify.manageDnsRecords` true and Netlify hosting your DNS it also adds the DNS records
- Netlify: custom domain, force HTTPS, and every environment variable
- GitHub: stores the signing secrets Stripe creates, if you add a `GH_ADMIN_TOKEN` secret (a fine-grained token limited to this repository with Secrets: read and write)

Run it from the Actions tab with **dry run** on first: it only reads and prints what it would change. Turn dry run off to apply. It is safe to run again.

What no API can do for you: Stripe's business verification and bank details for live mode, DNS records at a registrar that is not Netlify (the workflow prints the exact records to paste), and approving the production environment. The sections below are the manual fallbacks.

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

## Content editor sign-in (GitHub OAuth app)

The editor at `/Photography-Studio/admin/` signs in with GitHub through the site's own `/api/oauth/auth` and `/api/oauth/callback` functions. It does not use Netlify's sign-in service. It needs a GitHub OAuth app, which is a one-time setup per site address. GitHub screens may differ slightly from these steps; the field names are what matter.

1. Open https://github.com/settings/applications/new (Settings > Developer settings > OAuth Apps > New OAuth App).
2. Application name: the site name, for example `Fox & Fern editor`.
3. Homepage URL: the site address, for example `https://redesign-rails-nav-theme--starlight-dogfood-test-1.netlify.app`. It must match `siteUrl` (or `customDomain`) in `services.config.json`.
4. Authorization callback URL: that same address plus `/api/oauth/callback`. GitHub accepts one address per app, so a different site address needs its own OAuth app.
5. Leave "Enable Device Flow" off and Register application.
6. Copy the **Client ID**. Choose **Generate a new client secret** and copy it right away; GitHub shows it once.
7. In the repository go to Settings > Secrets and variables > Actions and add two secrets: `OAUTH_GITHUB_CLIENT_ID` and `OAUTH_GITHUB_CLIENT_SECRET`. (The names cannot start with `GITHUB_`.)
8. Apply them: Actions > Configure services > open the latest run > Re-run all jobs. Then redeploy the site.
9. Open `/Photography-Studio/admin/` (capital P and S) on the site address from step 3, choose Login with GitHub, authorise, and make a small edit. A commit should appear on the branch.

Only people with write access to the repository can save changes, because the token is theirs.
If the popup says "Editor sign-in is not set up yet", the two secrets did not reach Netlify: re-run step 8.
If GitHub says the redirect_uri is not associated with the application, step 4 does not match the site address.

## GitHub settings used by the workflows

- Repository secrets: those listed in `.github/workflows/netlify-env.yml`, plus `SITE_URL` for the backup.
- Environment `production`: required reviewer yourself; holds the two `LIVE_` secrets.
- Repository variable `GO_LIVE`: `true` after going live.
- Backups and the daily reminder only run on the default branch and the production deploy respectively. Reminders are Netlify scheduled functions, which run on production deploys only.
