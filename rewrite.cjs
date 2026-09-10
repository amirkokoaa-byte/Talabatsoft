const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `type OrderRow = { id: string; itemId: string; quantity: number };`,
  `type OrderRow = { id: string; itemId: string; quantity: number; price?: number };`
);

content = content.replace(
  `  const handleRemoveItem = async (id: string) => {`,
  `  const handleUpdateItem = async (id: string, updates: Partial<Item>) => {
    try {
      await updateDoc(doc(db, 'items', id), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'items');
    }
  };

  const handleRemoveItem = async (id: string) => {`
);

content = content.replace(
  `  const getOrdersTotal = (order: PersonOrder) => {
    return order.rows.reduce((sum, row) => {
      const item = items.find(i => i.id === row.itemId);
      return sum + (item ? item.price * row.quantity : 0);
    }, 0);
  };`,
  `  const getOrdersTotal = (order: PersonOrder) => {
    return order.rows.reduce((sum, row) => {
      const item = items.find(i => i.id === row.itemId);
      const price = row.price !== undefined ? row.price : (item ? item.price : 0);
      return sum + (price * row.quantity);
    }, 0);
  };`
);

content = content.replace(
  `        const details = o.rows.filter(r => r.itemId && r.quantity > 0).map(r => {
          const item = items.find(i => i.id === r.itemId);
          return item ? \`\${item.name} (\${r.quantity})\` : '';
        }).join(' + ');`,
  `        const details = o.rows.filter(r => r.itemId && r.quantity > 0).map(r => {
          const item = items.find(i => i.id === r.itemId);
          return item ? \`\${item.name} (\${r.quantity})\` : '';
        }).join(' + ');`
);

content = content.replace(
  `                      <div className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg ml-3 shrink-0">{item.price} ج</div>`,
  `                      <div className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg ml-3 shrink-0 flex items-center">
                        <input 
                          type="number" 
                          defaultValue={item.price} 
                          onBlur={e => {
                            const newPrice = Number(e.target.value);
                            if (!isNaN(newPrice) && newPrice !== item.price && newPrice >= 0) {
                               handleUpdateItem(item.id, { price: newPrice });
                            }
                          }}
                          className="w-12 sm:w-16 bg-transparent text-center outline-none font-bold"
                        />
                        <span>ج</span>
                      </div>`
);

content = content.replace(
  `                  {orders.find(o => o.personId === modalPersonId)?.rows.map((row, index) => {
                    const rowPrice = items.find(i => i.id === row.itemId)?.price || 0;
                    return (
                      <div key={row.id} className="flex flex-row items-center gap-2 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-sm">
                        
                        <div className="flex items-center gap-1 sm:gap-2 flex-[2] min-w-0">
                          <span className="font-bold text-gray-400 text-xs sm:text-sm px-1 sm:px-2 w-4 sm:w-6 shrink-0">{index + 1}</span>
                          <select 
                            value={row.itemId} 
                            onChange={e => handleUpdateOrderRow(modalPersonId, row.id, { itemId: e.target.value })}
                            className="w-full p-2 sm:p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-medium text-sm sm:text-base bg-gray-50 truncate"
                          >
                            <option value="">اختر الصنف...</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <span className="text-xs sm:text-sm font-medium text-gray-500 hidden sm:inline">العدد:</span>
                          <input 
                            type="number" 
                            min="1" 
                            value={row.quantity || ''} 
                            onChange={e => handleUpdateOrderRow(modalPersonId, row.id, { quantity: Number(e.target.value) || 0 })}
                            className="w-14 sm:w-16 p-2 sm:p-2.5 border border-gray-300 rounded-lg text-center outline-none focus:ring-2 focus:ring-rose-500 font-bold bg-gray-50" 
                          />
                        </div>
                        
                        <div className="shrink-0 w-20 sm:w-24 text-center font-bold text-base sm:text-lg text-gray-800 bg-gray-100 p-2 rounded-lg border border-gray-200 whitespace-nowrap">
                          {rowPrice * row.quantity} ج
                        </div>
                        
                        <button 
                          onClick={() => handleRemoveOrderRow(modalPersonId, row.id)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg shrink-0 transition-colors bg-red-50/50"
                          title="حذف هذا الصنف"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    );
                  })}`,
  `                  {orders.find(o => o.personId === modalPersonId)?.rows.map((row, index) => {
                    const itemBasePrice = items.find(i => i.id === row.itemId)?.price || 0;
                    const rowPrice = row.price !== undefined ? row.price : itemBasePrice;
                    return (
                      <div key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-sm">
                        
                        <div className="flex items-center gap-1 sm:gap-2 w-full sm:flex-[2] min-w-0">
                          <span className="font-bold text-gray-400 text-xs sm:text-sm px-1 sm:px-2 w-4 sm:w-6 shrink-0">{index + 1}</span>
                          <select 
                            value={row.itemId} 
                            onChange={e => {
                              const selectedItem = items.find(i => i.id === e.target.value);
                              handleUpdateOrderRow(modalPersonId, row.id, { itemId: e.target.value, price: selectedItem?.price || 0 });
                            }}
                            className="w-full p-2 sm:p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-medium text-sm sm:text-base bg-gray-50 truncate"
                          >
                            <option value="">اختر الصنف...</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end mt-1 sm:mt-0">
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs sm:text-sm font-medium text-gray-500 hidden sm:inline">العدد:</span>
                            <input 
                              type="number" 
                              min="1" 
                              value={row.quantity || ''} 
                              onChange={e => handleUpdateOrderRow(modalPersonId, row.id, { quantity: Number(e.target.value) || 0 })}
                              className="w-12 sm:w-14 p-2 sm:p-2.5 border border-gray-300 rounded-lg text-center outline-none focus:ring-2 focus:ring-rose-500 font-bold bg-gray-50" 
                            />
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs sm:text-sm font-medium text-gray-500 hidden sm:inline">السعر:</span>
                            <input 
                              type="number" 
                              min="0" 
                              value={rowPrice} 
                              onChange={e => handleUpdateOrderRow(modalPersonId, row.id, { price: Number(e.target.value) || 0 })}
                              className="w-14 sm:w-16 p-2 sm:p-2.5 border border-gray-300 rounded-lg text-center outline-none focus:ring-2 focus:ring-rose-500 font-bold bg-gray-50" 
                            />
                          </div>
                          
                          <div className="shrink-0 w-16 sm:w-20 text-center font-bold text-sm sm:text-lg text-gray-800 bg-gray-100 p-2 rounded-lg border border-gray-200 whitespace-nowrap">
                            {rowPrice * row.quantity} ج
                          </div>
                          
                          <button 
                            onClick={() => handleRemoveOrderRow(modalPersonId, row.id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg shrink-0 transition-colors bg-red-50/50"
                            title="حذف هذا الصنف"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}`
);

content = content.replace(
  `                              <li key={r.id} className="flex justify-between text-base">
                                <span>{item.name} <span className="mx-1" style={{ color: '#9ca3af' }}>×</span> {r.quantity}</span>
                                <span className="font-bold">{item.price * r.quantity} ج</span>
                              </li>`,
  `                              <li key={r.id} className="flex justify-between text-base">
                                <span>{item.name} <span className="mx-1" style={{ color: '#9ca3af' }}>×</span> {r.quantity}</span>
                                <span className="font-bold">{(r.price !== undefined ? r.price : item.price) * r.quantity} ج</span>
                              </li>`
);

fs.writeFileSync('src/App.tsx', content);
