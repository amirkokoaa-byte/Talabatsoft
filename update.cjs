const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Replacements for texts
content = content.replace(/طلبات سوفت روز/g, 'اوردار');
content = content.replace(/<p className="text-gray-500 mt-2 text-lg">نظام إدارة طلبات الطعام وتوزيع التكاليف الذكي<\/p>\n/g, '');

// 2. Add new states and refs
content = content.replace(
  `  const [modalPersonId, setModalPersonId] = useState<string | null>(null);`,
  `  const [modalPersonId, setModalPersonId] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isExportingSummary, setIsExportingSummary] = useState(false);
  const summaryPrintRef = useRef<HTMLDivElement>(null);`
);

// 3. Add Export PDF for summary
content = content.replace(
  `  const exportToPDF = async () => {`,
  `  const exportSummaryToPDF = async () => {
    if (!summaryPrintRef.current) return;
    setIsExportingSummary(true);
    try {
      const canvas = await html2canvas(summaryPrintRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('ملخص-اوردار.pdf');
    } catch (error) {
      console.error('Error generating Summary PDF', error);
      alert('حدث خطأ أثناء تصدير ملف الـ PDF');
    } finally {
      setIsExportingSummary(false);
    }
  };

  const exportToPDF = async () => {`
);

// 4. Update Header for the Summary button
content = content.replace(
  `              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Receipt className="w-5 h-5 ml-2 text-rose-500" />
                  ملخص الطلبات الحالية
                </h2>
                <div className="w-full sm:w-64">`,
  `              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Receipt className="w-5 h-5 ml-2 text-rose-500" />
                    ملخص الطلبات الحالية
                  </h2>
                  <button 
                    onClick={() => setShowSummaryModal(true)}
                    className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    ملخص
                  </button>
                </div>
                <div className="w-full sm:w-64">`
);

// 5. Add Global Summary Calculations
content = content.replace(
  `  const remainingTotal = Math.max(0, grandTotal - paidAmount);
  const paidOrders = activeOrders.filter(o => o.isPaid);

  return (`,
  `  const remainingTotal = Math.max(0, grandTotal - paidAmount);
  const paidOrders = activeOrders.filter(o => o.isPaid);

  const getGlobalItemsSummary = () => {
    const summary: Record<string, { name: string; quantity: number; totalValue: number }> = {};
    let totalSandwiches = 0;
    let totalValueAll = 0;

    activeOrders.forEach(order => {
      order.rows.forEach(row => {
        if (row.itemId && row.quantity > 0) {
          const itemBase = items.find(i => i.id === row.itemId);
          if (itemBase) {
            const price = row.price !== undefined ? row.price : itemBase.price;
            if (!summary[row.itemId]) {
              summary[row.itemId] = { name: itemBase.name, quantity: 0, totalValue: 0 };
            }
            summary[row.itemId].quantity += row.quantity;
            summary[row.itemId].totalValue += (price * row.quantity);
            
            totalSandwiches += row.quantity;
            totalValueAll += (price * row.quantity);
          }
        }
      });
    });
    return { summary: Object.values(summary), totalSandwiches, totalValueAll };
  };
  const itemsSummaryData = getGlobalItemsSummary();

  return (`
);


// 6. Add the Modal UI & Hidden PDF ref
const newModal = `        {showSummaryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 bg-gray-50/80">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-xl hidden sm:block">
                    <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                  </div>
                  ملخص الأصناف المطلوبة
                </h2>
                <button onClick={() => setShowSummaryModal(false)} className="p-2 hover:bg-gray-200 bg-gray-100 rounded-full transition-colors text-gray-600">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#fafaf9]">
                {itemsSummaryData.summary.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">لا توجد أصناف مطلوبة حالياً.</p>
                ) : (
                  <div className="space-y-3">
                    {itemsSummaryData.summary.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm gap-2">
                        <span className="font-bold text-lg text-gray-800">{item.name}</span>
                        <div className="flex justify-between sm:justify-end gap-4 w-full sm:w-auto">
                          <span className="text-gray-600 font-medium">العدد: <span className="font-bold text-indigo-600 text-lg">{item.quantity}</span></span>
                          <span className="text-gray-600 font-medium sm:w-24 text-left">القيمة: <span className="font-bold text-gray-900 text-lg">{item.totalValue} ج</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-gray-100 p-4 sm:p-6 border-t border-gray-200 rounded-b-3xl">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-gray-500 text-sm font-medium mb-1">إجمالي العدد</div>
                    <div className="text-2xl font-bold text-indigo-600">{itemsSummaryData.totalSandwiches}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-gray-500 text-sm font-medium mb-1">إجمالي القيمة</div>
                    <div className="text-2xl font-bold text-gray-900">{itemsSummaryData.totalValueAll} ج</div>
                  </div>
                </div>
                <button 
                  onClick={exportSummaryToPDF}
                  disabled={isExportingSummary || itemsSummaryData.summary.length === 0}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isExportingSummary ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  تصدير PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Printable PDF Layout */}`;

content = content.replace(`        {/* Hidden Printable PDF Layout */}`, newModal);


const newHiddenPdf = `        {/* Hidden Printable PDF Layout */}
        <div className="absolute top-0 right-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0 w-0">
          
          <div ref={summaryPrintRef} className="w-[800px] h-auto p-10 font-sans" dir="rtl" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
            <div className="text-center mb-8 border-b-2 pb-6" style={{ borderColor: '#e5e7eb' }}>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#111827' }}>ملخص اوردار</h1>
              <p className="text-lg font-medium" style={{ color: '#6b7280' }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
            </div>
            <table className="w-full text-right mb-8 border-collapse">
              <thead>
                <tr className="border-y-2" style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }}>
                  <th className="py-3 px-4 font-bold border-l text-lg" style={{ borderColor: '#e5e7eb' }}>الصنف</th>
                  <th className="py-3 px-4 font-bold border-l text-center text-lg w-32" style={{ borderColor: '#e5e7eb' }}>العدد</th>
                  <th className="py-3 px-4 font-bold text-center text-lg w-40">القيمة</th>
                </tr>
              </thead>
              <tbody>
                {itemsSummaryData.summary.map((item, idx) => (
                  <tr key={idx} className="border-b" style={{ borderColor: '#e5e7eb' }}>
                    <td className="py-4 px-4 font-bold align-middle border-l text-lg" style={{ borderColor: '#e5e7eb' }}>{item.name}</td>
                    <td className="py-4 px-4 align-middle text-center border-l font-bold text-xl" style={{ borderColor: '#e5e7eb', color: '#4f46e5' }}>{item.quantity}</td>
                    <td className="py-4 px-4 align-middle text-center font-bold text-xl">{item.totalValue} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-8">
              <div className="w-96 p-6 rounded-2xl border-2" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                <h3 className="text-2xl font-bold mb-4 border-b pb-3" style={{ borderColor: '#e5e7eb' }}>الإجماليات</h3>
                <div className="flex justify-between mb-3 text-lg font-medium" style={{ color: '#374151' }}>
                  <span>إجمالي العدد:</span>
                  <span className="font-bold" style={{ color: '#4f46e5' }}>{itemsSummaryData.totalSandwiches}</span>
                </div>
                <div className="flex justify-between mt-5 pt-5 border-t-2 text-2xl font-bold" style={{ borderColor: '#111827' }}>
                  <span>إجمالي القيمة:</span>
                  <span>{itemsSummaryData.totalValueAll} ج</span>
                </div>
              </div>
            </div>
          </div>

          <div ref={printRef}`;

content = content.replace(`        {/* Hidden Printable PDF Layout */}
        <div className="absolute top-0 right-0 -z-50 opacity-0 pointer-events-none overflow-hidden h-0 w-0">
          <div ref={printRef}`, newHiddenPdf);

fs.writeFileSync('src/App.tsx', content);
