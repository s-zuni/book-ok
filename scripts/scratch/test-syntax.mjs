import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://holaqlorkluptvrcfwtu.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseAnonKey) {
    console.error("Please set NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log("Testing fetchChildrenData syntax...");
    const { data: cData, error: cError } = await supabase.from('children').select('*, birthdate').limit(1);
    console.log("Children select *, birthdate:", cData, cError);
}

test();
