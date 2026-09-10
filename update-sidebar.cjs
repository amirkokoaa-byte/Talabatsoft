const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Imports
content = content.replace(
  `import { Plus, Trash2, UserPlus, Receipt, DollarSign, Calculator, User, Check, Download, Loader2, FileSpreadsheet, LogIn, LogOut, X } from 'lucide-react';`,
  `import { Plus, Trash2, UserPlus, Receipt, DollarSign, Calculator, User, Check, Download, Loader2, FileSpreadsheet, LogIn, LogOut, X, Menu, Save, Archive } from 'lucide-react';`
);

// 2. Types
content = content.replace(
  `type PersonOrder = {`,
  `type HistorySession = {
  id: string;
  date: string;
  timestamp: number;
  orders: any[];
  totalOrdersValue: number;
  deliveryFee: number;
  grandTotal: number;
};
type PersonOrder = {`
);

// 3. States
content = content.replace(
  `  const [modalPersonId, setModalPersonId] = useState<string | null>(null);`,
  `  const [modalPersonId, setModalPersonId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistorySession[]>([]);`
);

// 4. UseEffect
content = content.replace(
  `    const unsubSession = onSnapshot(doc(db, 'sessions', 'global'), (docSnap) => {`,
  `    const historyQ = query(collection(db, 'history'), where('organization', '==', ORG_NAME));
    const unsubHistory = onSnapshot(historyQ, (snap) => {
      const hist = snap.docs.map(d => ({ id: d.id, ...d.data() } as HistorySession));
      hist.sort((a, b) => b.timestamp - a.timestamp);
      setHistoryList(hist);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'history'));

    const unsubSession = onSnapshot(doc(db, 'sessions', 'global'), (docSnap) => {`
);

content = content.replace(
  `      unsubOrders();
      unsubSession();
    };`,
  `      unsubOrders();
      unsubHistory();
      unsubSession();
    };`
);

// 5. handleSaveCurrentOrders
content = content.replace(
  `  const exportSummaryToPDF = async () => {`,
  `  const handleSaveCurrentOrders = async () => {
    if (activeOrders.length === 0) return;
    const snapshotOrders = activeOrders.map(o => {
      const p = people.find(person => person.id === o.personId);
      const pTotal = getOrdersTotal(o);
      const pHasOrders = hasOrders(o);
      const pFinalTotal = pTotal + (pHasOrders ? deliveryShare : 0);
      const rowDetails = o.rows.filter(r => r.itemId && r.quantity > 0).map(r => {
         const item = items.find(i => i.id === r.itemId);
         const price = r.price !== undefined ? r.price : (item?.price || 0);
         return {
           itemName: item?.name || 'صنف محذوف',
           quantity: r.quantity,
           price: price,
           total: price * r.quantity
         };
      });
      return {
        personName: p?.name || 'غير معروف',
        rows: rowDetails,
        total: pTotal,
        deliveryShare: pHasOrders ? deliveryShare : 0,
        finalTotal: pFinalTotal,
        isPaid: o.isPaid,
        paidAmount: o.paidAmount
      };
    });

    const id = Date.now().toString();
    try {
      const currentTotalValue = activeOrders.reduce((sum, o) => sum + getOrdersTotal(o), 0);
      const currentGrandTotal = currentTotalValue + deliveryFee;
      
      await setDoc(doc(db, 'history', id), {
        date: new Date().toLocaleDateString('ar-EG'),
        timestamp: Date.now(),
        orders: snapshotOrders,
        totalOrdersValue: currentTotalValue,
        deliveryFee,
        grandTotal: currentGrandTotal,
        organization: ORG_NAME
      });
      alert('تم حفظ الطلبات بنجاح في القائمة الجانبية');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'history');
    }
  };

  const exportSummaryToPDF = async () => {`
);

// 6. Header menu
content = content.replace(
  `            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-gray-900 to-gray-600 flex items-center gap-3">
              <span className="bg-gray-900 text-white p-2 rounded-2xl shadow-md">
                <Receipt className="w-8 h-8" />
              </span>
              اوردار
            </h1>`,
  `            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-700 transition-colors shadow-sm">
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-gray-900 to-gray-600 flex items-center gap-3">
                <span className="bg-gray-900 text-white p-2 rounded-2xl shadow-md hidden sm:block">
                  <Receipt className="w-8 h-8" />
                </span>
                اوردار
              </h1>
            </div>`
);

// 7. Save button (left below the names grid)
content = content.replace(
  `                </div>
              )}
            </div>

            {/* Global Summary */}`,
  `                </div>
              )}
              {activeOrders.length > 0 && (
                <div className="mt-6 flex justify-end border-t border-gray-100 pt-6">
                  <button onClick={handleSaveCurrentOrders} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                    <Save className="w-5 h-5" />
                    حفظ الطلبات
                  </button>
                </div>
              )}
            </div>

            {/* Global Summary */}`
);

// 8. The Drawer Sidebar
const drawerHtml = `
        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[110] transition-opacity" onClick={() => setIsSidebarOpen(false)} />
        )}
        
        {/* Sidebar Drawer */}
        <div className={\`fixed top-0 right-0 h-full w-full max-w-sm bg-[#fafaf9] shadow-2xl z-[120] transform transition-transform duration-300 overflow-hidden flex flex-col border-l border-gray-200 \${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}\`}>
          <div className="flex justify-between items-center p-5 bg-white border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Archive className="w-5 h-5 text-indigo-500" />
              سجل الطلبات
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {historyList.length === 0 ? (
              <p className="text-center text-gray-500 py-10 font-medium">لا توجد طلبات محفوظة حتى الآن</p>
            ) : (
              historyList.map(session => (
                <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{session.date}</div>
                      <div className="text-sm text-gray-500">{new Date(session.timestamp).toLocaleTimeString('ar-EG')}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-indigo-600 text-lg">{session.grandTotal.toFixed(2)} ج</div>
                      <div className="text-xs text-gray-500 font-bold">{session.orders.length} طلبات</div>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    {session.orders.map((o, i) => (
                      <div key={i} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-800">{o.personName}</span>
                          <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{o.finalTotal.toFixed(2)} ج</span>
                        </div>
                        <ul className="text-sm text-gray-600 space-y-1.5 mt-2 pr-2 border-r-2 border-indigo-100">
                          {o.rows.map((r, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{r.itemName} <span className="text-gray-400 mx-1">×</span> {r.quantity}</span>
                              <span className="font-medium text-gray-700">{r.total} ج</span>
                            </li>
                          ))}
                          {o.deliveryShare > 0 && (
                            <li className="flex justify-between text-indigo-600/90 pt-1 mt-1 border-t border-gray-50">
                              <span>نصيب التوصيل</span>
                              <span className="font-medium">{Number(o.deliveryShare).toFixed(2)} ج</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit Order Modal */}`;

content = content.replace(`        {/* Edit Order Modal */}`, drawerHtml);

fs.writeFileSync('src/App.tsx', content);
