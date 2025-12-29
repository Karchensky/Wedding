# Supabase Edge Functions - Email Notifications

Uses Gmail SMTP to send email notifications when RSVPs or photos are submitted.

## Setup Instructions

### 1. Create Gmail App Password
1. Go to Google Account → Security
2. Enable 2-Step Verification (if not already)
3. Go to App passwords (search for it in Google Account settings)
4. Create a new app password for "Mail"
5. Copy the 16-character password (no spaces)

### 2. Install Supabase CLI
```bash
npm install -g supabase
```

### 3. Login and Link Project
```bash
supabase login
supabase link --project-ref dutvixuprybiwxsdvzdf
```

### 4. Set Environment Variables
```bash
supabase secrets set GMAIL_USER=youremail@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
supabase secrets set NOTIFICATION_EMAILS=bkarchensky@gmail.com,emily@example.com
```

### 5. Deploy Functions
```bash
supabase functions deploy notify-rsvp
supabase functions deploy notify-photo
```

### 6. Configure Database Webhooks
In Supabase Dashboard (Database > Webhooks):

**RSVP Notifications:**
- Name: `notify-rsvp`
- Table: `rsvps`
- Events: `INSERT`, `UPDATE`
- Type: Supabase Edge Function
- Function: `notify-rsvp`

**Photo Notifications:**
- Name: `notify-photo`
- Table: `shared_photos`
- Events: `INSERT`
- Type: Supabase Edge Function
- Function: `notify-photo`

## Distribution List
To add multiple email recipients:
```bash
supabase secrets set NOTIFICATION_EMAILS="email1@example.com,email2@example.com"
```

## Troubleshooting
- Make sure 2-Step Verification is enabled on your Google Account
- Use an App Password, NOT your regular Gmail password
- Check Supabase Dashboard → Edge Functions → Logs for errors

