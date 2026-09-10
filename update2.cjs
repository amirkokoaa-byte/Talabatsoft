const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `                  <button 
                    onClick={() => setShowSummaryModal(true)}
                    className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    ملخص
                  </button>`,
  `                  <div className="flex gap-2">
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
                  </div>`
);

// Toggle arrow in sidebar
content = content.replace(
  `                <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                  <div className="p-4 space-y-4">`,
  `                <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div 
                    onClick={() => setExpandedHistory(prev => ({ ...prev, [session.id]: !prev[session.id] }))}
                    className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 text-indigo-600 p-1 rounded">
                        {expandedHistory[session.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-lg">{session.date}</div>
                        <div className="text-sm text-gray-500">{new Date(session.timestamp).toLocaleTimeString('ar-EG')}</div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-indigo-600 text-lg">{session.grandTotal.toFixed(2)} ج</div>
                      <div className="text-xs text-gray-500 font-bold">{session.orders.length} طلبات</div>
                    </div>
                  </div>
                  {expandedHistory[session.id] && (
                  <div className="p-4 space-y-4">`
);

content = content.replace(
  `                      </div>
                    ))}
                  </div>
                </div>`,
  `                      </div>
                    ))}
                  </div>
                  )}
                </div>`
);

fs.writeFileSync('src/App.tsx', content);
