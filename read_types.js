const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const localLog = path.resolve(__dirname, 'debug_output.txt');
fs.writeFileSync(localLog, '');

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    fs.appendFileSync(localLog, '--- ENV START ---\n');
    fs.appendFileSync(localLog, content);
    fs.appendFileSync(localLog, '\n--- ENV END ---\n');
} else {
    fs.appendFileSync(localLog, 'No .env.local found');
}
process.exit(0);
