const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) env[key.trim()] = val.trim().replace(/"/g, '');
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listColumns() {
    console.log('Checking children table...');
    const { data: children, error: childError } = await supabase.from('children').select('*').limit(1);
    if (childError) {
        console.error('Error selecting children:', childError);
    } else if (children && children.length > 0) {
        console.log('Child sample keys:', Object.keys(children[0]));
    } else {
        // If empty, try to insert a dummy to provoke a column list error or just infer?
        // Let's try to select 'parent_id' specifically?
        const { error: parentError } = await supabase.from('children').select('parent_id').limit(1);
        if (!parentError) console.log('Column parent_id EXISTS');
        const { error: profileError } = await supabase.from('children').select('profile_id').limit(1);
        if (!profileError) console.log('Column profile_id EXISTS');
        else console.log('Column profile_id MISSING');
    }

    console.log('Checking books table...');
    const { data: books, error: bookError } = await supabase.from('books').select('*').limit(1);
    if (bookError) {
        console.error('Error selecting books:', bookError);
    } else if (books && books.length > 0) {
        console.log('Book sample keys:', Object.keys(books[0]));
    }
}

listColumns();
