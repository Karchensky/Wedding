/**
 * Sync invitations from data/invitations.csv to Supabase.
 * Composite key: (code, invitation_type). One row per code+type.
 * sent_at is never set or overwritten by sync — only the emailer script updates sent_at.
 * active: Y in CSV → active = true (upsert). N in CSV → if row exists, set active = false and update party_name, guest_names, email, notes.
 *
 * CSV columns: party_name, guest_names, email, code, and for types use either:
 *   informal, save_the_date, formal   OR   planning_request, save_the_date, formal_invitation
 * Use Y/N. Run: npm run sync-invitations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
});

function parseCSVLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQuotes = !inQuotes;
        else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
            out.push(cur.trim());
            cur = '';
        } else if (c !== '\r') cur += c;
    }
    out.push(cur.trim());
    return out;
}

function parseCSV(content) {
    const lines = content.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const header = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        header.forEach((h, j) => { row[h] = values[j] != null ? values[j] : ''; });
        rows.push(row);
    }
    return rows;
}

function isYes(val) {
    if (val == null || val === '') return false;
    const v = String(val).trim().toUpperCase();
    return v === 'Y' || v === 'YES' || v === '1' || v === 'TRUE';
}

async function syncInvitations() {
    const dataFile = path.join(__dirname, '..', 'data', 'invitations.csv');
    if (!fs.existsSync(dataFile)) {
        console.error('File not found:', dataFile);
        process.exit(1);
    }

    const content = fs.readFileSync(dataFile, 'utf8');
    const rows = parseCSV(content);
    if (rows.length === 0) {
        console.log('No invitation rows in CSV.');
        return;
    }

    const toUpsert = [];
    const toDeactivate = [];
    for (const row of rows) {
        const party_name = (row.party_name || '').trim();
        const guest_namesRaw = (row.guest_names || '').trim();
        const guest_names = guest_namesRaw ? guest_namesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
        const email = (row.email || '').trim() || null;
        const codeBase = (row.code || '').trim().toUpperCase();
        const notes = (row.notes || '').trim() || null;
        const planning = isYes(row.informal ?? row.planning_request);
        const saveTheDate = isYes(row.save_the_date);
        const formal = isYes(row.formal ?? row.formal_invitation);

        if (!codeBase || !party_name || guest_names.length === 0) {
            console.error('Skipping row: missing code, party_name, or guest_names', row);
            continue;
        }

        const base = { code: codeBase, party_name, guest_names, party_size: guest_names.length, email, notes };

        if (planning) {
            toUpsert.push({ ...base, invitation_type: 'informal', active: true });
        } else {
            toDeactivate.push({ ...base, invitation_type: 'informal' });
        }
        if (saveTheDate) {
            toUpsert.push({ ...base, invitation_type: 'save_the_date', active: true });
        } else {
            toDeactivate.push({ ...base, invitation_type: 'save_the_date' });
        }
        if (formal) {
            toUpsert.push({ ...base, invitation_type: 'formal', active: true });
        } else {
            toDeactivate.push({ ...base, invitation_type: 'formal' });
        }
    }

    if (toUpsert.length === 0 && toDeactivate.length === 0) {
        console.log('No invitation rows to sync (no informal, save_the_date, or formal marked Y, and no existing rows to deactivate).');
        return;
    }

    console.log(`Syncing invitations to Supabase...`);
    console.log('Target:', SUPABASE_URL);
    console.log('');

    let added = 0;
    let updated = 0;
    let deactivated = 0;
    let errors = 0;

    for (const record of toUpsert) {
        const { data: existing } = await supabase
            .from('invitations')
            .select('id')
            .eq('code', record.code)
            .eq('invitation_type', record.invitation_type)
            .maybeSingle();

        const payload = {
            code: record.code,
            party_name: record.party_name,
            guest_names: record.guest_names,
            party_size: record.party_size,
            email: record.email,
            notes: record.notes,
            invitation_type: record.invitation_type,
            active: true
        };

        if (existing) {
            const { error } = await supabase
                .from('invitations')
                .update(payload)
                .eq('id', existing.id);
            if (error) {
                console.error(`Error updating ${record.code} (${record.invitation_type}):`, error.message);
                errors++;
            } else {
                console.log(`Updated: ${record.code} (${record.invitation_type}) — ${record.party_name} (${record.party_size} guest(s))`);
                updated++;
            }
        } else {
            const { error } = await supabase
                .from('invitations')
                .insert(payload);
            if (error) {
                console.error(`Error adding ${record.code} (${record.invitation_type}):`, error.message);
                errors++;
            } else {
                console.log(`Added: ${record.code} (${record.invitation_type}) — ${record.party_name} (${record.party_size} guest(s))`);
                added++;
            }
        }
    }

    for (const record of toDeactivate) {
        const { data: existing } = await supabase
            .from('invitations')
            .select('id')
            .eq('code', record.code)
            .eq('invitation_type', record.invitation_type)
            .maybeSingle();

        if (!existing) continue;

        const { error } = await supabase
            .from('invitations')
            .update({
                active: false,
                party_name: record.party_name,
                guest_names: record.guest_names,
                party_size: record.party_size,
                email: record.email,
                notes: record.notes
            })
            .eq('id', existing.id);

        if (error) {
            console.error(`Error deactivating ${record.code} (${record.invitation_type}):`, error.message);
            errors++;
        } else {
            console.log(`Deactivated: ${record.code} (${record.invitation_type}) — ${record.party_name}`);
            deactivated++;
        }
    }

    console.log('');
    console.log('--- Summary ---');
    console.log(`Added: ${added}`);
    console.log(`Updated: ${updated}`);
    console.log(`Deactivated: ${deactivated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Rows from CSV: ${rows.length}`);

    const { count } = await supabase.from('invitations').select('*', { count: 'exact', head: true });
    console.log(`Total in database: ${count}`);
}

syncInvitations().catch(console.error);
