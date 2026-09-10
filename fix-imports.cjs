const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `import { Plus, Trash2, UserPlus, Receipt, DollarSign, Calculator, User, Check, Download, Loader2, FileSpreadsheet, LogIn, LogOut, X, Menu, Save, Archive } from 'lucide-react';`,
  `import { Plus, Trash2, UserPlus, Receipt, DollarSign, Calculator, User, Check, Download, Loader2, FileSpreadsheet, LogIn, LogOut, X, Menu, Save, Archive, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';`
);

fs.writeFileSync('src/App.tsx', content);
