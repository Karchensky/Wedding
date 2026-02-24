# Emily & Bryan's Wedding Website

Wedding website with invitation list, emailer, and RSVP flows (informal now; formal later). Includes photo upload.

## Flow

1. **Upload invitation list** — Edit `data/invitations.csv`. Run `npm run sync-invitations` to upsert into the database. Composite key: **(code, invitation_type)**. Each row has one code and one type (`informal`, `save_the_date`, `formal`). Sync never changes `sent_at`; only the emailer sets it when an email is sent.
2. **Send emails** — Use one emailer by invitation type and distribution (by code, list of codes, or all). Sending updates `sent_at` on the **invitations** table for that (code, invitation_type).
3. **Guests respond** — Recipients open the link, enter their **invite code**, and submit. Right now only **Informal RSVP** is live (responses go to `informal_rsvp` table). Later you’ll add the formal RSVP form and it will write to `formal_rsvp`. Save the date has no response.
4. **Later** — Send save-the-dates (same emailer, type `save_the_date`). Then send formal invitations (type `formal`) and turn on the formal RSVP flow on the site.

## Invitations table

- **Composite key:** `(code, invitation_type)`. Types: `informal`, `save_the_date`, `formal`.
- **sent_at** — Set only by the emailer when that invitation (code + type) is sent. Sync does not touch it.

## CSV and sync

- **File:** `data/invitations.csv`
- **Columns:** `party_name`, `guest_names`, `email`, `code`, `planning_request`, `save_the_date`, `formal_invitation` (Y/N).
- Each Y creates/updates one row with that code and the corresponding `invitation_type`. Run `npm run sync-invitations` after editing.

## Emailer (single script)

From project root:

```bash
npm run send-invitation -- --type=informal --to=all
npm run send-invitation -- --type=informal --to=ABC123
npm run send-invitation -- --type=informal --to=ABC123,DEF456
npm run send-invitation -- --type=informal --to=file:invitations/informal_rsvp/codes.txt
npm run send-invitation -- --type=save_the_date --to=all --dry-run
npm run send-invitation -- --type=informal --to=all --resend
```

- **--type** (required): `informal` | `save_the_date` | `formal`
- **--to** (required): one code, comma-separated codes, `file:path` (one code per line), or `all`
- **--dry-run** — Don’t send or update DB.
- **--resend** — Send even if `sent_at` is already set.

Templates live in `invitations/<type>/template.html`. Replace `{{INVITE_CODE}}` per recipient. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`; for email: `GMAIL_USER` + `GMAIL_APP_PASSWORD` (or `SENDER_EMAIL` + `EMAIL_PASSWORD`).

## Invitations folder

- **invitations/informal_rsvp/** — Template and (optional) codes list for informal RSVP. This one is ready.
- **invitations/save_the_date/** — Placeholder template; no response.
- **invitations/formal_rsvp/** — Placeholder template; formal RSVP flow to be added on the website later.

## Database

- **invitations** — Guest list and which invite types they get; `sent_at` per (code, type).
- **informal_rsvp** — Informal RSVP responses (one per invitation).
- **formal_rsvp** — Formal RSVP responses (for later).

Run migrations: `npm run migrate`.
