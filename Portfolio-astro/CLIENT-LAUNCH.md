# Launching a client site

Work top to bottom. Everything marked **you** needs your own account or a decision; the rest is automated.

## 1. Make it theirs (about an hour)

1. Copy `client.json` fields from the header of `tools/new-client.mjs`, then run `npm run new-client -- client.json`.
   It swaps the name, brand, colour, location, domain and security contact, then runs the content, search, logic, browser-booking and accessibility checks.
2. Photos: drop files into `photo-inbox/` (see its README) or use the content editor. Delete the template photos.
3. In `public/Photography-Studio/content/`: packages (prices and deposits), About, FAQ, day-of-session list, print sizes, booking rules (notice days, days closed, refund window, time windows, travel note).
4. Replace the template footnote in `site.json`. Remove the testimonials unless a client has agreed to be quoted.
5. **you**: read `terms/` and `privacy/` and have a lawyer review them. The refund window in the Terms must match `refundFullDays` in the booking rules.

## 2. Accounts (all in the client's name where possible)

Step-by-step guides are in `OWNER-STEPS.md`.

- [ ] Netlify site connected to the repository, custom domain added, HTTPS on
- [ ] Resend domain verified (so email reaches clients, not only you)
- [ ] Stripe account: business details finished, sandbox tested, then live keys
- [ ] GitHub secrets and the `production` environment (see below)
- [ ] Uptime monitor on the home page and `/api/availability`

**Shortcut:** fill in `services.config.json` (or give `new-client` an `emailDomain`), add the secrets, and run the **Configure services** workflow (dry run first). It does the webhook, Stripe payment methods, Resend domain, Netlify domain and variables for you. The manual steps below are the fallback and the checks.

## 3. Test keys first

1. Add the repository secrets listed at the top of `.github/workflows/netlify-env.yml` (test Stripe key and test webhook secret).
2. Run **Sync secrets to Netlify** (mode: test). Redeploy.
3. In Stripe (test mode), the webhook endpoint `https://<site>/api/stripe-webhook` must listen to `checkout.session.completed` **and `charge.refunded`**.
4. `npm run launch-check -- https://<site>` must print "All checks passed" (the security.txt contact and domain lines will fail until step 1 is done).
5. Make one real test booking with Stripe's test card 4242 4242 4242 4242. Check: both emails arrive, the date shows as taken, the calendar invite opens, the manage link works, a cancel more than 14 days out refunds.

## 4. Going live

1. In Stripe live mode: create the webhook endpoint (same two events), copy its signing secret.
2. GitHub > Settings > Environments > create `production`, add yourself as required reviewer, add secrets `LIVE_STRIPE_SECRET_KEY` and `LIVE_STRIPE_WEBHOOK_SECRET` to that environment.
3. Set the repository variable `GO_LIVE` to `true`. This stops the test sync from running again.
4. Run **Sync secrets to Netlify** with mode `live`, approve it, redeploy.
5. `npm run launch-check -- https://<site> --live` must pass.
6. Make one real small booking with your own card and refund it from the Stripe dashboard. The date must free itself and you get an email.
7. Switch off Klarna and Affirm for deposits in Stripe's payment-method settings. They fit large purchases, not deposits, and clients get confused.

## 5. After launch

- Weekly backup runs from `.github/workflows/backup.yml`; add the `SITE_URL` secret.
- Dependabot opens update pull requests weekly; the quality workflow runs the dependency audit and the booking test on every push.
- Reminders run daily on the production site. Confirm the first one arrives.
- Never share client emails or booking exports outside the client's own accounts.

## Not built in (use a service, link it from the site)

- **Private photo galleries for delivery**: use a gallery service (Pixieset, ShootProof, Pic-Time or similar) and link it from the confirmation email. Hosting client photos privately needs storage, access control and download handling; a gallery service already does that and handles print sales.
- **Contracts and e-signatures**: use a signing service (Dubsado, HoneyBook, DocuSign, or Dropbox Sign) and send the contract after the deposit. Signing has legal requirements that are better met by a service built for it. Have a lawyer supply the contract text.
