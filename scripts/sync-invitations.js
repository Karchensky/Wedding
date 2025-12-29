/**
 * Invitation sync script
 * Upserts invitations from data/invitations.json to Supabase
 * 
 * Usage: npm run sync-invitations
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
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

async function syncInvitations() {
    const dataFile = path.join(__dirname, '..', 'data', 'invitations.json');
    
    if (!fs.existsSync(dataFile)) {
        console.error('File not found:', dataFile);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const invitations = data.invitations || [];

    if (invitations.length === 0) {
        console.log('No invitations to sync.');
        return;
    }

    console.log(`Syncing ${invitations.length} invitation(s) to Supabase...`);
    console.log('Target:', SUPABASE_URL);
    console.log('');

    let added = 0;
    let updated = 0;
    let errors = 0;

    for (const inv of invitations) {
        if (!inv.code || !inv.party_name || !inv.guest_names || inv.guest_names.length === 0) {
            console.error(`Skipping invalid invitation: ${JSON.stringify(inv)}`);
            errors++;
            continue;
        }

        const record = {
            code: inv.code.toUpperCase(),
            party_name: inv.party_name,
            guest_names: inv.guest_names,
            party_size: inv.guest_names.length,
            email: inv.email || null,
            notes: inv.notes || null
        };

        const { data: existing } = await supabase
            .from('invitations')
            .select('id')
            .eq('code', record.code)
            .single();

        if (existing) {
            const { error } = await supabase
                .from('invitations')
                .update(record)
                .eq('code', record.code);

            if (error) {
                console.error(`Error updating ${record.code}:`, error.message);
                errors++;
            } else {
                console.log(`Updated: ${record.code} - ${record.party_name} (${record.party_size} guests)`);
                updated++;
            }
        } else {
            const { error } = await supabase
                .from('invitations')
                .insert(record);

            if (error) {
                console.error(`Error adding ${record.code}:`, error.message);
                errors++;
            } else {
                console.log(`Added: ${record.code} - ${record.party_name} (${record.party_size} guests)`);
                added++;
            }
        }
    }

    console.log('');
    console.log('--- Summary ---');
    console.log(`Added: ${added}`);
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total in file: ${invitations.length}`);

    const { count } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true });
    
    console.log(`Total in database: ${count}`);
}

syncInvitations().catch(console.error);
