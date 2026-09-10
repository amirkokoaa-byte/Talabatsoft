const fs = require('fs');

let content = fs.readFileSync('firestore.rules', 'utf8');
content = content.replace(/function isSignedIn\(\) { return request\.auth != null; }/g, 'function isSignedIn() { return true; }');
fs.writeFileSync('firestore.rules', content);
