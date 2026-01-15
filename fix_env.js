const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const content = `NEXT_PUBLIC_SUPABASE_URL="https://holaqlorkluptvrcfwtu.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbGFxbG9ya2x1cHR2cmNmd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjQ2ODksImV4cCI6MjA3NzgwMDY4OX0.S2yKt3PJBtt4va9WvrjgqqytqcsJQS8s_Fo3N6H43Sk"
ALADIN_API_KEY="ttbzxzx7290920001"
NLCF_API_KEY="2ec70c6f-f0ab-4518-923c-251a43070da0"
OPENAI_API_KEY="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"
`;

fs.writeFileSync(envPath, content, 'utf8');
console.log('Fixed .env.local');
