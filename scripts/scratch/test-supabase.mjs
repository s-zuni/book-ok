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

    console.log("Testing library edge function...");
    try {
        const { data: libData, error: libError } = await supabase.functions.invoke('library', {
            method: 'POST',
            body: { apiType: 'search', region: '11', dtl_region: '11230' }
        });
        console.log("Library Edge Function Response:", libData, libError);
    } catch (e) {
        console.error("Library Edge Function Invoke Exception:", e);
    }

    console.log("Testing direct data4library.kr API fetch (WITHOUT encoding)...");
    try {
        const API_KEY = "c0bde3ba4483595bfd280c80c6bfa5bf7627b8d4477ce024e44c1ea1db1af866";
        const fetchUrl1 = `http://data4library.kr/api/libSrch?authKey=${API_KEY}&format=json&pageSize=150&region=11&dtl_region=11230`;
        const res1 = await fetch(fetchUrl1);
        const data1 = await res1.json();
        console.log("Direct Fetch (WITHOUT encoding) result count:", data1?.response?.libs?.length, data1?.response?.error);
    } catch (e) {
        console.error("Direct Fetch (WITHOUT encoding) Exception:", e);
    }

    console.log("Testing direct data4library.kr API fetch (WITH encoding)...");
    try {
        const API_KEY = "c0bde3ba4483595bfd280c80c6bfa5bf7627b8d4477ce024e44c1ea1db1af866";
        const r = encodeURIComponent('11');
        const dr = encodeURIComponent('11230');
        const fetchUrl2 = `http://data4library.kr/api/libSrch?authKey=${API_KEY}&format=json&pageSize=150&region=${r}&dtl_region=${dr}`;
        const res2 = await fetch(fetchUrl2);
        const data2 = await res2.json();
        console.log("Direct Fetch (WITH encoding) result count:", data2?.response?.libs?.length, data2?.response?.error);
        if (data2?.response?.libs) {
            console.log("First lib:", JSON.stringify(data2?.response?.libs[0]));
        }
    } catch (e) {
        console.error("Direct Fetch (WITH encoding) Exception:", e);
    }
}

test();


