const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://holaqlorkluptvrcfwtu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbGFxbG9ya2x1cHR2cmNmd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjQ2ODksImV4cCI6MjA3NzgwMDY4OX0.S2yKt3PJBtt4va9WvrjgqqytqcsJQS8s_Fo3N6H43Sk';

const logFile = path.resolve(__dirname, 'debug_output.txt');
fs.writeFileSync(logFile, ''); // Clear file

function log(...args) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
    fs.appendFileSync(logFile, msg);
}

console.log = log;
console.error = log;

console.log('Connecting to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listColumns() {
    console.log('Checking children table...');

    // Try to select just one row to get keys if possible
    const { data: children, error: childError } = await supabase.from('children').select('*').limit(1);

    if (childError) {
        console.error('Error selecting * from children:', JSON.stringify(childError, null, 2));
    } else if (children && children.length > 0) {
        console.log('Child sample keys:', Object.keys(children[0]));
    } else {
        console.log('No children found or RLS hiding them. Trying to detect columns by probing...');
    }

    // Explicit probe for parent_id
    const { error: parentError } = await supabase.from('children').select('parent_id').limit(1);
    if (!parentError) {
        console.log('>>> Column parent_id EXISTS');
    } else {
        console.log('>>> Column parent_id PROBE FAILED:', parentError.message);
    }

    // Explicit probe for profile_id
    const { error: profileError } = await supabase.from('children').select('profile_id').limit(1);
    if (!profileError) {
        console.log('>>> Column profile_id EXISTS');
    } else {
        console.log('>>> Column profile_id PROBE FAILED:', profileError.message);
    }
}

listColumns();
