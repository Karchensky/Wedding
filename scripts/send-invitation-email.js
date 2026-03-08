/**
 * Send invitation emails by type. Updates invitations.sent_at for each (code, invitation_type).
 * Only invitations with active = true are sent. sent_at is only set by this script.
 *
 * Usage (from project root):
 *   node scripts/send-invitation-email.js --type=informal --to=all
 *   node scripts/send-invitation-email.js --type=informal --to=ABC123
 *   node scripts/send-invitation-email.js --type=informal --to=ABC123,DEF456,GHI789
 *   node scripts/send-invitation-email.js --type=informal --to=file:invitations/informal_rsvp/codes.txt
 *   node scripts/send-invitation-email.js --type=informal --to=all --dry-run
 *   node scripts/send-invitation-email.js --type=informal --to=all --resend
 *
 * --type   required: informal | save_the_date | formal
 * --to     required: one code, comma-separated codes, file:path (one code per line), or all
 * --dry-run  do not send or update DB
 * --resend   send even if sent_at already set (no prompt)
 * --yes / -y  non-interactive: skip already-sent without prompting
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY; for email use SENDER_EMAIL + EMAIL_PASSWORD (or GMAIL_USER + GMAIL_APP_PASSWORD). SMTP_SERVER, SMTP_PORT optional.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve((answer || '').trim().toLowerCase());
        });
    });
}

function formatSentAt(iso) {
    if (!iso) return 'unknown date';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
        return iso;
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GMAIL_USER = process.env.SENDER_EMAIL || process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;
const SMTP_SERVER = process.env.SMTP_SERVER || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = SMTP_PORT === 465;
const CC_EMAIL = process.env.CC_EMAIL ? process.env.CC_EMAIL.trim() : '';

const PROJECT_ROOT = path.join(__dirname, '..');
const INVITATION_TYPES = ['informal', 'save_the_date', 'formal'];

const SUBJECTS = {
    informal: 'Informal RSVP — Emily & Bryan\'s Wedding — Italy, May 2027',
    save_the_date: 'Emily & Bryan — Save the Date',
    formal: 'Emily & Bryan — Formal Invitation'
};

function parseArgs() {
    const args = process.argv.slice(2);
    const typeRaw = args.find(a => a.startsWith('--type='));
    const toRaw = args.find(a => a.startsWith('--to='));
    const dryRun = args.includes('--dry-run');
    const resend = args.includes('--resend');
    const yes = args.includes('--yes') || args.includes('-y');

    const type = typeRaw ? typeRaw.replace('--type=', '').trim() : null;
    const to = toRaw ? toRaw.replace('--to=', '').trim() : null;

    if (!type || !INVITATION_TYPES.includes(type)) {
        console.error('Usage: node scripts/send-invitation-email.js --type=informal|save_the_date|formal --to=CODE|CODE1,CODE2|file:path|all [--dry-run] [--resend] [--yes]');
        console.error('With npm run, add -- before args: npm run send-invitation -- --type=informal --to=KARCHENSKY02');
        process.exit(1);
    }
    if (!to) {
        console.error('--to is required: one code, comma-separated codes, file:path, or all');
        console.error('With npm run, add -- before args: npm run send-invitation -- --type=informal --to=KARCHENSKY02');
        process.exit(1);
    }
    return { type, to, dryRun, resend, yes };
}

function resolveCodes(to, type) {
    if (to === 'all') return null; // fetch all for type in DB
    if (to.startsWith('file:')) {
        const filePath = to.replace('file:', '').trim();
        const absPath = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
        if (!fs.existsSync(absPath)) {
            console.error('File not found:', absPath);
            process.exit(1);
        }
        const content = fs.readFileSync(absPath, 'utf8');
        const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        return lines.map(c => c.toUpperCase());
    }
    const codes = to.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
    if (codes.length === 0) {
        console.error('No valid codes in --to');
        process.exit(1);
    }
    return codes;
}

function loadTemplate(type) {
    const templatePath = path.join(PROJECT_ROOT, 'invitations', type, 'template.html');
    if (!fs.existsSync(templatePath)) {
        console.error('Template not found:', templatePath);
        process.exit(1);
    }
    return fs.readFileSync(templatePath, 'utf8');
}

function buildHtml(template, code, partyName) {
    return template
        .replace(/\{\{INVITE_CODE\}\}/g, code || '')
        .replace(/\{\{PARTY_NAME\}\}/g, partyName || '');
}

async function main() {
    const { type, to, dryRun, resend, yes } = parseArgs();
    const codes = resolveCodes(to, type);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
        process.exit(1);
    }
    if (!dryRun && (!GMAIL_USER || !GMAIL_APP_PASSWORD)) {
        console.error('Missing email credentials in .env (required unless --dry-run)');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

    let invitations;
    if (codes === null) {
        const { data, error } = await supabase
            .from('invitations')
            .select('id, code, party_name, email, sent_at')
            .eq('invitation_type', type)
            .eq('active', true)
            .not('email', 'is', null);
        if (error) {
            console.error('Failed to fetch invitations:', error.message);
            process.exit(1);
        }
        invitations = data || [];
    } else {
        const { data, error } = await supabase
            .from('invitations')
            .select('id, code, party_name, email, sent_at')
            .eq('invitation_type', type)
            .eq('active', true)
            .in('code', codes);
        if (error) {
            console.error('Failed to fetch invitations:', error.message);
            process.exit(1);
        }
        invitations = data || [];
    }

    const template = loadTemplate(type);
    const subject = SUBJECTS[type];

    console.log(`${type} — recipients: ${invitations.length}`);
    if (dryRun) console.log('DRY RUN — no emails sent, no DB updates.\n');

    let sent = 0, skipped = 0, failed = 0;
    const isTty = process.stdin.isTTY === true;

    for (const inv of invitations) {
        if (!inv.email || !inv.email.trim()) {
            console.log('  Skip (no email):', inv.code, inv.party_name);
            skipped++;
            continue;
        }
        if (inv.sent_at && !resend) {
            const sentStr = formatSentAt(inv.sent_at);
            if (yes || !isTty) {
                console.log('  Skip (already sent):', inv.code, inv.party_name, '— sent', sentStr);
                skipped++;
                continue;
            }
            const answer = await ask(`  Send to ${inv.email} (${inv.party_name})? Invite was already sent on ${sentStr}. (y/N): `);
            if (answer !== 'y' && answer !== 'yes') {
                console.log('  Skipped:', inv.code);
                skipped++;
                continue;
            }
        }

        const html = buildHtml(template, inv.code, inv.party_name);

        if (dryRun) {
            console.log('  Would send to:', inv.email, '|', inv.code, inv.party_name);
            sent++;
            continue;
        }

        try {
            const transporter = nodemailer.createTransport({
                host: SMTP_SERVER,
                port: SMTP_PORT,
                secure: SMTP_SECURE,
                auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
            });
            const mailOptions = {
                from: `"Emily & Bryan" <${GMAIL_USER}>`,
                to: inv.email.trim(),
                subject,
                html
            };
            if (CC_EMAIL && type === 'informal') mailOptions.cc = CC_EMAIL;
            await transporter.sendMail(mailOptions);

            const { error: updateError } = await supabase
                .from('invitations')
                .update({ sent_at: new Date().toISOString() })
                .eq('id', inv.id);

            if (updateError) {
                console.error('  Email sent but DB update failed:', inv.code, updateError.message);
            }
            console.log('  Sent:', inv.email, '|', inv.code);
            sent++;
        } catch (err) {
            console.error('  Failed:', inv.email, inv.code, err.message);
            failed++;
        }
    }

    console.log('\n--- Summary ---');
    console.log('Sent:', sent);
    console.log('Skipped:', skipped);
    console.log('Failed:', failed);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
