const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Imports
content = content.replace(
  `import { Plus, Trash2, UserPlus, Receipt, DollarSign, Calculator, User, Check, Download, Loader2, FileSpreadsheet, LogIn, LogOut, X, Menu, Save, Archive } from 'lucide-react';`,
  `import { Plus, Trash2, UserPlus, Receipt, DollarSign, Calculator, User, Check, Download, Loader2, FileSpreadsheet, LogIn, LogOut, X, Menu, Save, Archive, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';`
);

// 2. State
content = content.replace(
  `  const [historyList, setHistoryList] = useState<HistorySession[]>([]);`,
  `  const [historyList, setHistoryList] = useState<HistorySession[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});`
);

// 3. handleStartNewOrder Function
content = content.replace(
  `  const handleSaveCurrentOrders = async () => {`,
  `  const handleStartNewOrder = async () => {
    if (!window.confirm("هل أنت متأكد من مسح جميع الطلبات الحالية للبدء في أوردار جديد؟ (لن يتم حذف الأسماء)")) return;
    try {
      await updateDeliveryFee(0);
      const promises = orders.map(o => 
        updateDoc(doc(db, 'orders', o.personId), { rows: [], isPaid: false, paidAmount: 0 })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error("Error clearing orders", e);
    }
  };

  const handleSaveCurrentOrders = async () => {`
);

// 4. "New Order" Button
content = content.replace(
  `                <div className="flex items-center justify-between sm:justify-start gap-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Receipt className="w-5 h-5 ml-2 text-rose-500" />
                    ملخص الطلبات الحالية
                  </h2>
                  <button 
                    onClick={() => setShowSummaryModal(true)}`,
  `                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Receipt className="w-5 h-5 ml-2 text-rose-500" />
                    ملخص الطلبات الحالية
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowSummaryModal(true)}
                      className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-1"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      ملخص
                    </button>
                    <button 
                      onClick={handleStartNewOrder}
                      className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      اوردار جديد
                    </button>
                  </div>
                </div>
                <div className="w-full sm:w-64">
                  <select`
);
// Make sure I don't accidentally remove the select. I'll just adjust the regex or use index.
