import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://holaqlorkluptvrcfwtu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbGFxbG9ya2x1cHR2cmNmd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjQ2ODksImV4cCI6MjA3NzgwMDY4OX0.S2yKt3PJBtt4va9WvrjgqqytqcsJQS8s_Fo3N6H43Sk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log("Testing profiles...");
    const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1);
    console.log("Profiles:", pData, pError);

    console.log("Testing children...");
    const { data: cData, error: cError } = await supabase.from('children').select('*').limit(1);
    console.log("Children:", cData, cError);
    
    console.log("Testing posts...");
    const { data: postData, error: postError } = await supabase.from('posts').select('*').limit(1);
    console.log("Posts:", postData, postError);

    console.log("Testing reports...");
    const { data: reportData, error: reportError } = await supabase.from('reports').select('*').limit(1);
    console.log("Reports:", reportData, reportError);
}

test();


