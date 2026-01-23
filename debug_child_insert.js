
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for debug purposes
const supabaseUrl = 'https://tffvsyarxfujmvbqlutr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZnZzeWFyeGZ1am12YnFsdXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzU0OTEsImV4cCI6MjA4MjkxMTQ5MX0.7ctb_C-BJN_WTNi_yqaQllFY0oVARqsvSjQkte_M-yo';

const supabase = createClient(supabaseUrl, supabaseKey);

// Use a known existing user ID if possible, or try to sign in
// Since we don't have the user's password easily, we might need to assume the RLS allows 'authenticated'.
// But wait, the RLS policies strictly check 'auth.uid()'.
// We cannot easily test "as the user" via a script without their password to get a session.
// However, we can check if the TABLE allows insertion generally if we were that user.

// ALTERNATIVE: Attempt to insert with a dummy UUID if we can't auth.
// But RLS will block it.

// Let's rely on checking the columns first, as that was the last error.
async function checkTableStructure() {
    console.log('Checking table structure again...');

    // 1. Check if 'type' column exists by selecting it
    const { data, error } = await supabase.from('children').select('type').limit(1);
    if (error) {
        console.error("Column Check Error:", error);
    } else {
        console.log("Column 'type' exists.");
    }

    // 2. Check strict RLS? 
    // We can't easily simulate the INSERT without auth.
    // BUT we can try to call signUp with a test user to get a valid UID and then try.
}

async function tryInsertWithTestUser() {
    // Create a temporary test user to verify RLS works
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'password123';

    console.log(`Creating test user ${testEmail}...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
    });

    if (authError) {
        console.error("Auth Error:", authError);
        return;
    }

    const userId = authData.user?.id;
    if (!userId) {
        console.error("No user ID returned from signup");
        return;
    }

    console.log("Test User ID:", userId);

    // Try to insert a child
    console.log("Attempting to insert child...");
    const { data, error } = await supabase.from('children').insert({
        name: 'TestChild',
        birthdate: '2020-01-01',
        type: '유아',
        parent_id: userId
    }).select(); // Select to verify return

    if (error) {
        console.error("INSERT FAILED:", error);
    } else {
        console.log("INSERT SUCCESS:", data);
    }
}

tryInsertWithTestUser();
