const fs = require('fs');
const path = 'src/main.js';
let content = fs.readFileSync(path, 'utf8');

// Fix the merged line - addMessageToFeed and try { are on same line
const bad = "addMessageToFeed(`Calling ${contact.name?.display || spokenName}...`, 'system');                    try {";
const good = "addMessageToFeed(`Calling ${contact.name?.display || spokenName}...`, 'system');\n                    try {";

if (content.includes(bad)) {
    content = content.replace(bad, good);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed merged line');
} else {
    console.log('Pattern not found');
}
