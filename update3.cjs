const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. State
content = content.replace(
  `  const [isExportingSummary, setIsExportingSummary] = useState(false);
  const summaryPrintRef = useRef<HTMLDivElement>(null);`,
  `  const [isExportingSummary, setIsExportingSummary] = useState(false);
  const summaryPrintRef = useRef<HTMLDivElement>(null);
  const [isExportingSingleOrder, setIsExportingSingleOrder] = useState(false);
  const singleOrderPrintRef = useRef<HTMLDivElement>(null);`
);

// 2. Export Function
content = content.replace(
  `  const exportSummaryToPDF = async () => {`,
  `  const exportSingleOrderToPDF = async () => {
    if (!singleOrderPrintRef.current) return;
    setIsExportingSingleOrder(true);
    try {
      const canvas = await html2canvas(singleOrderPrintRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const personName = people.find(p => p.id === modalPersonId)?.name || 'اوردار';
      pdf.save(\`طلب-\${personName}.pdf\`);
    } catch (error) {
      console.error('Error generating Single PDF', error);
      alert('حدث خطأ أثناء تصدير ملف الـ PDF');
    } finally {
      setIsExportingSingleOrder(false);
    }
  };

  const exportSummaryToPDF = async () => {`
);

// 3. Modal Header
content = content.replace(
  `              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 bg-gray-50/80">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-xl">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  تفاصيل طلب {people.find(p => p.id === modalPersonId)?.name}
                </h2>
                <button onClick={() => setModalPersonId(null)}`,
  `              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 bg-gray-50/80">
                <div className="flex items-center gap-3 sm:gap-4">
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-xl hidden sm:block">
                      <User className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span>تفاصيل طلب {people.find(p => p.id === modalPersonId)?.name}</span>
                  </h2>
                  <button
                    onClick={exportSingleOrderToPDF}
                    disabled={isExportingSingleOrder}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center gap-1 disabled:opacity-70"
                  >
                    {isExportingSingleOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span className="hidden sm:inline">تصدير PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                </div>
                <button onClick={() => setModalPersonId(null)}`
);

// 4. Hidden PDF Area
content = content.replace(
  `        {/* Hidden Printable PDF Layout */}
        <div className="absolute top-0 right-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0 w-0">
          
          <div ref={summaryPrintRef}`,
  `        {/* Hidden Printable PDF Layout */}
        <div className="absolute top-0 right-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0 w-0">
          
          <div ref={singleOrderPrintRef} className="w-[600px] h-auto p-8 font-sans" dir="rtl" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
            {(() => {
              const order = orders.find(o => o.personId === modalPersonId);
              const p = people.find(person => person.id === modalPersonId);
              if (!order || !p) return null;
              
              const pTotal = getOrdersTotal(order);
              const pHasOrders = hasOrders(order);
              const pFinalTotal = pTotal + (pHasOrders ? deliveryShare : 0);
              
              return (
                <div className="flex flex-col h-full">
                  <div className="text-center mb-6 border-b-2 pb-4" style={{ borderColor: '#e5e7eb' }}>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: '#111827' }}>تفاصيل طلب: {p.name}</h1>
                    <p className="text-base font-medium" style={{ color: '#6b7280' }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                  <table className="w-full text-right mb-6 border-collapse">
                    <thead>
                      <tr className="border-y-2" style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }}>
                        <th className="py-2 px-3 font-bold border-l text-lg" style={{ borderColor: '#e5e7eb' }}>الصنف</th>
                        <th className="py-2 px-3 font-bold border-l text-center text-lg w-20" style={{ borderColor: '#e5e7eb' }}>العدد</th>
                        <th className="py-2 px-3 font-bold text-center text-lg w-28">القيمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.rows.filter(r => r.itemId && r.quantity > 0).map((r, idx) => {
                        const item = items.find(i => i.id === r.itemId);
                        if (!item) return null;
                        const price = r.price !== undefined ? r.price : item.price;
                        return (
                          <tr key={idx} className="border-b" style={{ borderColor: '#e5e7eb' }}>
                            <td className="py-3 px-3 font-bold align-middle border-l text-lg" style={{ borderColor: '#e5e7eb' }}>{item.name}</td>
                            <td className="py-3 px-3 align-middle text-center border-l font-bold text-lg" style={{ borderColor: '#e5e7eb' }}>{r.quantity}</td>
                            <td className="py-3 px-3 align-middle text-center font-bold text-lg">{price * r.quantity} ج</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex justify-end">
                    <div className="w-72 p-4 rounded-xl border-2" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                      <div className="flex justify-between mb-2 text-base font-medium" style={{ color: '#374151' }}>
                        <span>إجمالي الطلبات:</span>
                        <span className="font-bold">{pTotal} ج</span>
                      </div>
                      {pHasOrders && deliveryShare > 0 && (
                        <div className="flex justify-between mb-2 text-base font-medium" style={{ color: '#374151' }}>
                          <span>التوصيل:</span>
                          <span className="font-bold">{deliveryShare.toFixed(2)} ج</span>
                        </div>
                      )}
                      <div className="flex justify-between mt-3 pt-3 border-t-2 text-xl font-bold" style={{ borderColor: '#111827' }}>
                        <span>الإجمالي المطلوب:</span>
                        <span>{pFinalTotal.toFixed(2)} ج</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div ref={summaryPrintRef}`
);

fs.writeFileSync('src/App.tsx', content);
