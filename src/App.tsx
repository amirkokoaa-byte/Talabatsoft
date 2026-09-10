/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, UserPlus, Receipt, DollarSign, Calculator, User, Check } from 'lucide-react';

type Item = { id: string; name: string; price: number };
type OrderRow = { id: string; itemId: string; quantity: number };
type PersonOrder = {
  personId: string;
  personName: string;
  rows: OrderRow[];
  isPaid: boolean;
  amountPaid: number;
};

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialNames = ["خالد عاطف", "امير", "خضر محمد", "محمد طلعت", "احمد خليفه", "سيد مصطفي", "محمد ابو المجد", "محمد عبد الفتاح", "ايمن"];
const initialPeople = initialNames.map(name => ({ id: generateId(), name }));

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [availablePeople, setAvailablePeople] = useState(initialPeople);
  const [personOrders, setPersonOrders] = useState<PersonOrder[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // New Item State
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');

  // New Person State
  const [newPersonName, setNewPersonName] = useState('');

  // Select Person State
  const [selectedPersonId, setSelectedPersonId] = useState('');

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemPrice || isNaN(Number(newItemPrice))) return;
    if (items.length >= 100) {
      alert('الحد الأقصى للأصناف هو 100');
      return;
    }
    setItems([...items, { id: generateId(), name: newItemName, price: Number(newItemPrice) }]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleAddPerson = () => {
    if (!newPersonName.trim()) return;
    if (availablePeople.length >= 50) {
      alert('الحد الأقصى للأسماء هو 50');
      return;
    }
    setAvailablePeople([...availablePeople, { id: generateId(), name: newPersonName }]);
    setNewPersonName('');
  };

  const handleSelectPerson = (personId: string) => {
    if (!personId) return;
    const person = availablePeople.find(p => p.id === personId);
    if (!person) return;
    
    if (personOrders.find(p => p.personId === personId)) {
      setSelectedPersonId('');
      return;
    }
    
    setPersonOrders([
      ...personOrders,
      {
        personId: person.id,
        personName: person.name,
        rows: [{ id: generateId(), itemId: '', quantity: 1 }],
        isPaid: false,
        amountPaid: 0
      }
    ]);
    setSelectedPersonId('');
  };

  const updatePersonOrder = (personId: string, updates: Partial<PersonOrder>) => {
    setPersonOrders(prev => prev.map(p => p.personId === personId ? { ...p, ...updates } : p));
  };

  const addOrderRow = (personId: string) => {
    setPersonOrders(prev => prev.map(p => {
      if (p.personId === personId) {
        return { ...p, rows: [...p.rows, { id: generateId(), itemId: '', quantity: 1 }] };
      }
      return p;
    }));
  };

  const updateOrderRow = (personId: string, rowId: string, updates: Partial<OrderRow>) => {
    setPersonOrders(prev => prev.map(p => {
      if (p.personId === personId) {
        return {
          ...p,
          rows: p.rows.map(r => r.id === rowId ? { ...r, ...updates } : r)
        };
      }
      return p;
    }));
  };

  const removeOrderRow = (personId: string, rowId: string) => {
    setPersonOrders(prev => prev.map(p => {
      if (p.personId === personId) {
        return { ...p, rows: p.rows.filter(r => r.id !== rowId) };
      }
      return p;
    }));
  };

  const removePersonOrder = (personId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الشخص من الطلبات؟')) {
      setPersonOrders(prev => prev.filter(p => p.personId !== personId));
    }
  };

  // Calculations
  const hasOrders = (p: PersonOrder) => p.rows.some(r => r.itemId && r.quantity > 0);
  const getOrdersTotal = (p: PersonOrder) => {
    return p.rows.reduce((sum, r) => {
      const item = items.find(i => i.id === r.itemId);
      return sum + (item ? item.price * r.quantity : 0);
    }, 0);
  };

  const peopleWithOrders = personOrders.filter(hasOrders);
  const deliveryShare = peopleWithOrders.length > 0 ? deliveryFee / peopleWithOrders.length : 0;

  const totalOrdersValue = peopleWithOrders.reduce((sum, p) => sum + getOrdersTotal(p), 0);
  const grandTotal = totalOrdersValue + (peopleWithOrders.length > 0 ? deliveryFee : 0);
  const paidAmount = personOrders.filter(p => p.isPaid).reduce((sum, p) => sum + getOrdersTotal(p) + (hasOrders(p) ? deliveryShare : 0), 0);
  const remainingTotal = Math.max(0, grandTotal - paidAmount);
  const paidPeople = personOrders.filter(p => p.isPaid);

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans text-gray-800 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-rose-600 flex items-center">
            <Receipt className="w-8 h-8 ml-3" />
            طلبات سوفت روز
          </h1>
          <p className="text-gray-500 mt-2 text-lg">نظام إدارة طلبات الطعام وتوزيع التكاليف الذكي</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Add Person to Order Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <UserPlus className="w-5 h-5 ml-2 text-rose-500" />
                اطلب (إضافة شخص)
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">اختر من الأسماء المسجلة</label>
                <select 
                  value={selectedPersonId}
                  onChange={(e) => handleSelectPerson(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all outline-none"
                >
                  <option value="">-- اختر اسماً --</option>
                  {availablePeople.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="border-t border-gray-100 pt-4 mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">أو إضافة اسم جديد</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newPersonName}
                    onChange={e => setNewPersonName(e.target.value)}
                    placeholder="اسم الشخص..."
                    className="flex-1 border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                    onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
                  />
                  <button 
                    onClick={handleAddPerson}
                    className="bg-gray-800 text-white hover:bg-gray-900 px-4 py-2.5 rounded-xl font-medium transition-colors"
                  >
                    إضافة
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 ml-2 text-rose-500" />
                قيمة الدليفري
              </h2>
              <div className="flex items-center gap-3">
                <input 
                  type="number"
                  min="0"
                  value={deliveryFee || ''}
                  onChange={e => setDeliveryFee(Number(e.target.value))}
                  placeholder="مثال: 30"
                  className="flex-1 border border-gray-200 rounded-xl p-3 text-lg font-semibold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                />
                <span className="text-gray-600 font-medium">جنيه</span>
              </div>
              {peopleWithOrders.length > 0 && deliveryFee > 0 && (
                <div className="mt-4 text-sm text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100">
                  سيتم تقسيم <strong>{deliveryFee} ج</strong> على <strong>{peopleWithOrders.length} أفراد</strong>
                  <br />
                  نصيب الفرد: <strong>{deliveryShare.toFixed(2)} ج</strong>
                </div>
              )}
            </div>

            {/* Items Management Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Receipt className="w-5 h-5 ml-2 text-rose-500" />
                إدارة الأصناف
              </h2>
              
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder="اسم الصنف"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="flex-[2] border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all min-w-0"
                  onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                />
                <input 
                  type="number" 
                  placeholder="السعر"
                  value={newItemPrice}
                  onChange={e => setNewItemPrice(e.target.value)}
                  className="flex-[1] border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all min-w-0 text-center"
                  onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                />
                <button 
                  onClick={handleAddItem}
                  className="bg-rose-500 text-white hover:bg-rose-600 px-3 py-2.5 rounded-xl transition-colors flex items-center justify-center shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50">
                <table className="w-full text-right text-sm">
                  <thead className="text-gray-500 sticky top-0 bg-gray-100 shadow-sm">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">الصنف</th>
                      <th className="py-2.5 px-3 font-medium w-20">السعر</th>
                      <th className="py-2.5 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-6 text-gray-400">لا يوجد أصناف مسجلة</td></tr>
                    ) : items.map((item, idx) => (
                      <tr key={item.id} className={`hover:bg-rose-50/50 transition-colors ${idx !== items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <td className="py-2.5 px-3 text-gray-700 font-medium">{item.name}</td>
                        <td className="py-2.5 px-3 font-bold text-rose-600">{item.price} ج</td>
                        <td className="py-2.5 px-3 text-left">
                          <button 
                            onClick={() => setItems(items.filter(i => i.id !== item.id))}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>

          {/* Main Area: Person Orders */}
          <div className="lg:col-span-3 space-y-6">
            {personOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-rose-200 p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="w-20 h-20 bg-rose-50 text-rose-300 rounded-full flex items-center justify-center mb-4">
                  <Receipt className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">لا توجد طلبات نشطة</h3>
                <p className="text-gray-500">قم باختيار شخص من القائمة الجانبية للبدء بتسجيل طلباته.</p>
              </div>
            ) : (
              personOrders.map(p => {
                const pTotal = getOrdersTotal(p);
                const pHasOrders = hasOrders(p);
                const pFinalTotal = pTotal + (pHasOrders ? deliveryShare : 0);
                const pChange = p.amountPaid - pFinalTotal;
                
                return (
                  <div key={p.personId} className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${p.isPaid ? 'border-emerald-300 ring-1 ring-emerald-300' : 'border-gray-200 hover:border-rose-300'} p-5 lg:p-7 relative overflow-hidden`}>
                    {p.isPaid && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-sm">تم الدفع</div>}
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                      <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                        <div className="bg-rose-100 p-2 rounded-xl ml-3">
                          <User className="w-6 h-6 text-rose-600" />
                        </div>
                        {p.personName}
                      </h3>
                      
                      <div className="flex items-center gap-3">
                        <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border transition-colors ${p.isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                          <input 
                            type="checkbox" 
                            checked={p.isPaid}
                            onChange={e => updatePersonOrder(p.personId, { isPaid: e.target.checked })}
                            className="w-5 h-5 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="font-semibold">تم الدفع</span>
                        </label>
                        <button 
                          onClick={() => removePersonOrder(p.personId)}
                          className="bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 p-2 rounded-xl transition-all"
                          title="حذف الشخص"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Person's Order Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-right mb-4">
                        <thead className="bg-gray-50 text-gray-500 text-sm">
                          <tr>
                            <th className="py-3 px-4 font-medium rounded-r-xl">الصنف</th>
                            <th className="py-3 px-4 font-medium w-32 text-center">العدد</th>
                            <th className="py-3 px-4 font-medium w-32 text-center">الإجمالي</th>
                            <th className="py-3 px-4 rounded-l-xl w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.rows.map(row => {
                            const rowItem = items.find(i => i.id === row.itemId);
                            const rowTotal = rowItem ? rowItem.price * row.quantity : 0;
                            return (
                              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                <td className="py-3 px-2">
                                  <select 
                                    value={row.itemId}
                                    onChange={e => updateOrderRow(p.personId, row.id, { itemId: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                                  >
                                    <option value="">اختر صنفاً</option>
                                    {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.price} ج)</option>)}
                                  </select>
                                </td>
                                <td className="py-3 px-2">
                                  <input 
                                    type="number" 
                                    min="1"
                                    value={row.quantity || ''}
                                    onChange={e => updateOrderRow(p.personId, row.id, { quantity: Number(e.target.value) })}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-center bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                                  />
                                </td>
                                <td className="py-3 px-2 font-bold text-gray-800 text-center text-lg">{rowTotal} ج</td>
                                <td className="py-3 px-2 text-left">
                                  <button onClick={() => removeOrderRow(p.personId, row.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50">
                                    <Trash2 className="w-5 h-5 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <button 
                      onClick={() => addOrderRow(p.personId)}
                      className="text-sm bg-rose-50 text-rose-600 font-medium hover:bg-rose-100 hover:text-rose-700 flex items-center mb-8 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 ml-1.5" />
                      إضافة صنف
                    </button>
                    
                    {/* Person's Summary */}
                    <div className={`rounded-xl p-5 border flex flex-col md:flex-row md:items-end justify-between gap-6 transition-all ${p.isPaid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="space-y-3 flex-1">
                        <div className="flex justify-between text-sm text-gray-600 font-medium">
                          <span>إجمالي الطلبات:</span>
                          <span className="font-bold text-gray-800 text-base">{pTotal} ج</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 font-medium">
                          <span>نصيب التوصيل:</span>
                          <span className="font-bold text-gray-800 text-base">{pHasOrders ? deliveryShare.toFixed(2) : 0} ج</span>
                        </div>
                        <div className="flex justify-between text-lg text-rose-600 font-bold border-t border-gray-200 pt-3 mt-1">
                          <span>الإجمالي المطلوب:</span>
                          <span className="text-2xl">{pFinalTotal.toFixed(2)} ج</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-3 border-t md:border-t-0 md:border-r border-gray-200 pt-4 md:pt-0 md:pr-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">المبلغ المدفوع</label>
                          <div className="relative">
                            <input 
                              type="number"
                              min="0"
                              value={p.amountPaid || ''}
                              onChange={e => updatePersonOrder(p.personId, { amountPaid: Number(e.target.value) })}
                              placeholder="0"
                              className="w-full border border-gray-300 rounded-xl p-3 pr-10 focus:ring-2 focus:ring-rose-500 font-bold text-lg bg-white outline-none transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">ج</span>
                          </div>
                        </div>
                        {p.amountPaid > 0 && (
                          <div className={`font-bold flex justify-between p-3 rounded-xl border ${pChange >= 0 ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            <span>الباقي له:</span>
                            <span className="text-xl">{pChange >= 0 ? pChange.toFixed(2) : 0} ج</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Global Summary */}
            <div className="bg-gray-900 text-white rounded-3xl shadow-xl p-8 mt-8 border border-gray-800">
              <h2 className="text-2xl font-bold mb-8 flex items-center pb-5 border-b border-gray-800">
                <Calculator className="w-7 h-7 ml-3 text-rose-400" />
                الحساب الختامي
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div className="bg-gray-800/80 rounded-2xl p-5 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2 font-medium">الإجمالي الكلي (بدون توصيل)</div>
                  <div className="text-3xl font-bold">{totalOrdersValue.toFixed(2)} <span className="text-lg text-gray-500 font-normal">ج</span></div>
                </div>
                <div className="bg-gray-800/80 rounded-2xl p-5 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2 font-medium">قيمة التوصيل الكلية</div>
                  <div className="text-3xl font-bold">{deliveryFee || 0} <span className="text-lg text-gray-500 font-normal">ج</span></div>
                </div>
                <div className="bg-gradient-to-br from-rose-900 to-rose-950 rounded-2xl p-5 border border-rose-800 shadow-inner">
                  <div className="text-rose-200 text-sm mb-2 font-medium">الإجمالي العام المطلوب</div>
                  <div className="text-4xl font-bold text-white">{grandTotal.toFixed(2)} <span className="text-xl text-rose-300 font-normal">ج</span></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gray-800/80 rounded-2xl p-5 border-r-4 border-r-emerald-500 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2 font-medium">المبالغ المدفوعة (تم التحصيل)</div>
                  <div className="text-3xl font-bold text-emerald-400">{paidAmount.toFixed(2)} <span className="text-lg font-normal">ج</span></div>
                </div>
                <div className="bg-gray-800/80 rounded-2xl p-5 border-r-4 border-r-orange-500 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-2 font-medium">المتبقي للتحصيل</div>
                  <div className="text-3xl font-bold text-orange-400">{remainingTotal.toFixed(2)} <span className="text-lg font-normal">ج</span></div>
                </div>
              </div>
              
              {paidPeople.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-800">
                  <h3 className="text-lg font-medium text-gray-300 mb-4 flex items-center">
                    <Check className="w-5 h-5 ml-2 text-emerald-400" />
                    الطلبات المدفوعة:
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {paidPeople.map(p => (
                      <span key={p.personId} className="bg-gray-800/80 text-emerald-300 px-4 py-2 rounded-xl text-sm font-medium border border-emerald-900/50 flex items-center">
                        {p.personName}
                        <Check className="w-3 h-3 mr-2 opacity-70" />
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

