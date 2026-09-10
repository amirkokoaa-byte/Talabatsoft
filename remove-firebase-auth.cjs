const fs = require('fs');

let content = fs.readFileSync('src/firebase.ts', 'utf8');
content = content.replace(/import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase\/auth';\n/g, '');
content = content.replace(/export const auth = getAuth\(app\);\nconst provider = new GoogleAuthProvider\(\);\n\nexport const loginWithGoogle = async \(\) => \{\n  try \{\n    await signInWithPopup\(auth, provider\);\n  \} catch \(error\) \{\n    console.error\('Error logging in with Google', error\);\n  \}\n\};\n\nexport const logout = async \(\) => \{\n  try \{\n    await signOut\(auth\);\n  \} catch \(error\) \{\n    console.error\('Error logging out', error\);\n  \}\n\};\n/g, '');
fs.writeFileSync('src/firebase.ts', content);
