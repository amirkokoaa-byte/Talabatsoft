const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `import { db, auth, loginWithGoogle, logout } from './firebase';\nimport { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';\nimport { onAuthStateChanged } from 'firebase/auth';`,
  `import { db } from './firebase';\nimport { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';`
);

content = content.replace(
  `  const [user, setUser] = useState<any>(null);\n  const [loading, setLoading] = useState(true);\n`,
  `  const [isAuthenticated, setIsAuthenticated] = useState(false);\n  const [passwordInput, setPasswordInput] = useState('');\n`
);

content = content.replace(
  `  useEffect(() => {\n    const unsubscribe = onAuthStateChanged(auth, (u) => {\n      setUser(u);\n      setLoading(false);\n    });\n    return () => unsubscribe();\n  }, []);\n\n  useEffect(() => {\n    if (!user) return;\n    \n`,
  `  useEffect(() => {\n    if (!isAuthenticated) return;\n    \n`
);

content = content.replace(
  `  }, [user]);`,
  `  }, [isAuthenticated]);`
);

content = content.replace(
  /  if \(loading\).*?\n\n  if \(\!user\) \{[\s\S]*?    \);\n  }\n/m,
  `  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]" dir="rtl">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full mx-4">
          <div className="bg-rose-50 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
            <LogIn className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">طلبات سوفت روز</h1>
          <p className="text-gray-500 mb-8">يُرجى إدخال كلمة المرور للوصول إلى النظام</p>
          <div className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="كلمة المرور"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && passwordInput === '0000') {
                  setIsAuthenticated(true);
                } else if (e.key === 'Enter') {
                  alert('كلمة المرور خاطئة');
                }
              }}
              className="w-full border-2 border-gray-200 rounded-xl p-3 text-center text-lg outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
            />
            <button 
              onClick={() => {
                if (passwordInput === '0000') {
                  setIsAuthenticated(true);
                } else {
                  alert('كلمة المرور خاطئة');
                }
              }}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }\n`
);

content = content.replace(
  `            <button onClick={logout} className="text-gray-500 hover:text-gray-700 bg-gray-100 px-4 py-3 rounded-xl font-medium flex items-center gap-2 w-full justify-center sm:w-auto">\n              <LogOut className="w-5 h-5" />\n              تسجيل خروج\n            </button>\n`,
  `            <button onClick={() => { setIsAuthenticated(false); setPasswordInput(''); }} className="text-gray-500 hover:text-gray-700 bg-gray-100 px-4 py-3 rounded-xl font-medium flex items-center gap-2 w-full justify-center sm:w-auto">\n              <LogOut className="w-5 h-5" />\n              تسجيل خروج\n            </button>\n`
);

fs.writeFileSync('src/App.tsx', content);
