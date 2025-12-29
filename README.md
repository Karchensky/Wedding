# Wedding Website

A simple wedding website with RSVP tracking, photo sharing, and an admin dashboard. Built for our Italy wedding but you can fork it for yours.

## Stack
- Static HTML/CSS/JS (hosted on GitHub Pages)
- Supabase (database + storage + edge functions)
- Gmail SMTP for email notifications

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/Wedding.git
cd Wedding
npm install
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Grab your project URL and anon key from Project Settings → API
3. Update `supabase-config.js` with your credentials

### 3. Run Migrations
Create a `.env` file:
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
SUPABASE_SERVICE_KEY=[YOUR-SERVICE-ROLE-KEY]
```

Then run:
```bash
npm run migrate
```

This creates all the tables, RLS policies, and RPC functions.

### 4. Add Your Invitations
Edit `data/invitations.json` with your guest list:
```json
{
  "invitations": [
    {
      "code": "SMITH01",
      "party_name": "The Smiths",
      "guest_names": ["John Smith", "Jane Smith"],
      "email": "john@email.com"
    }
  ]
}
```

Sync to database:
```bash
npm run sync-invitations
```

### 5. Host It
Push to GitHub and enable GitHub Pages (Settings → Pages → Deploy from main branch). Your site will be at `https://yourusername.github.io/Wedding/`

### 6. Email Notifications (Optional)
If you want email alerts when someone RSVPs or uploads a photo:

1. Create a Gmail App Password (Google Account → Security → App passwords)
2. Install Supabase CLI: `scoop install supabase` (Windows) or `brew install supabase` (Mac)
3. Link and deploy:
```bash
supabase login
supabase link --project-ref [YOUR-PROJECT-REF]
supabase secrets set GMAIL_USER=you@gmail.com
supabase secrets set GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
supabase secrets set NOTIFICATION_EMAILS="you@gmail.com,partner@gmail.com"
supabase functions deploy notify-rsvp
supabase functions deploy notify-photo
```
4. Set up webhooks in Supabase Dashboard → Database → Webhooks:
   - `notify-rsvp` on `rsvps` table (INSERT, UPDATE)
   - `notify-photo` on `shared_photos` table (INSERT)

### 7. Customize
- Update names/dates in `index.html`
- Swap out photos
- Change the admin password in `admin.html` AND run migration 006 to update the database password
- Edit `styles.css` for colors/fonts

## Admin Dashboard
Access at `/admin.html` - shows RSVP stats, guest responses, and uploaded photos.

## Files You'll Edit
- `index.html` - main site content
- `styles.css` - styling
- `data/invitations.json` - guest list (gitignored)
- `.env` - secrets (gitignored)
- `admin.html` - change the password on line ~448

## Notes
- The invitation codes are how guests RSVP - send them their unique code
- `data/invitations.json` and `.env` are gitignored so your guest emails and secrets don't end up on GitHub
- The RLS policies are set up so guests can only look up their own invitation by code, not browse the full list
