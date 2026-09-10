import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, UserPlus, Receipt, DollarSign, Calculator, User, Check, Download, Loader2, FileSpreadsheet, LogIn, LogOut, X, Menu, Save, Archive, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

import { db } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const ORG_NAME = "soft-rose";

type Item = { id: string; name: string; price: number };
type OrderRow = { id: string; itemId: string; quantity: number; price?: number };
type Person = { id: string; name: string };
type HistorySession = {
  id: string;
  date: string;
  timestamp: number;
  orders: any[];
  totalOrdersValue: number;
  deliveryFee: number;
  grandTotal: number;
};
type PersonOrder = { 
  personId: string; 
  isPaid: boolean; 
  paidAmount: number;
  rows: OrderRow[];
};

enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  console.error('Firestore Error:', operationType, path, error);
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Firestore sync state
  const [items, setItems] = useState<Item[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [orders, setOrders] = useState<PersonOrder[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Local UI state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  
  // Modal state
  const [modalPersonId, setModalPersonId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistorySession[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isExportingSummary, setIsExportingSummary] = useState(false);
  const summaryPrintRef = useRef<HTMLDivElement>(null);
  const [isExportingSingleOrder, setIsExportingSingleOrder] = useState(false);
  const singleOrderPrintRef = useRef<HTMLDivElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const itemsQ = query(collection(db, 'items'), where('organization', '==', ORG_NAME));
    const unsubItems = onSnapshot(itemsQ, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Item)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'items'));

    const peopleQ = query(collection(db, 'people'), where('organization', '==', ORG_NAME));
    const unsubPeople = onSnapshot(peopleQ, (snap) => {
      setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() } as Person)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'people'));

    const ordersQ = query(collection(db, 'orders'), where('organization', '==', ORG_NAME));
    const unsubOrders = onSnapshot(ordersQ, (snap) => {
      setOrders(snap.docs.map(d => ({ personId: d.id, ...d.data() } as PersonOrder)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    const historyQ = query(collection(db, 'history'), where('organization', '==', ORG_NAME));
    const unsubHistory = onSnapshot(historyQ, (snap) => {
      const hist = snap.docs.map(d => ({ id: d.id, ...d.data() } as HistorySession));
      hist.sort((a, b) => b.timestamp - a.timestamp);
      setHistoryList(hist);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'history'));

    const unsubSession = onSnapshot(doc(db, 'sessions', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setDeliveryFee(docSnap.data().deliveryFee || 0);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sessions/global'));

    return () => {
      unsubItems();
      unsubPeople();
      unsubOrders();
      unsubHistory();
      unsubSession();
    };
  }, [isAuthenticated]);

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice || isNaN(Number(newItemPrice))) return;
    const id = Date.now().toString();
    try {
      await setDoc(doc(db, 'items', id), {
        name: newItemName.trim(),
        price: Number(newItemPrice),
        organization: ORG_NAME
      });
      setNewItemName('');
      setNewItemPrice('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'items');
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<Item>) => {
    try {
      await updateDoc(doc(db, 'items', id), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'items');
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'items');
    }
  };

  const handleAddPerson = async (name: string) => {
    if (!name.trim()) return null;
    const id = Date.now().toString();
    try {
      await setDoc(doc(db, 'people', id), {
        name: name.trim(),
        organization: ORG_NAME
      });
      await setDoc(doc(db, 'orders', id), {
        personId: id,
        isPaid: false,
        paidAmount: 0,
        rows: [],
        organization: ORG_NAME
      });
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'people');
    }
    return null;
  };
  
  const updateDeliveryFee = async (fee: number) => {
    try {
      await setDoc(doc(db, 'sessions', 'global'), {
        deliveryFee: fee,
        organization: ORG_NAME
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'sessions/global');
    }
  };

  const updateOrder = async (personId: string, updates: Partial<PersonOrder>) => {
    try {
      const order = orders.find(o => o.personId === personId);
      if (!order) return;
      const updatedOrder = { ...order, ...updates, organization: ORG_NAME };
      await setDoc(doc(db, 'orders', personId), updatedOrder, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `orders/${personId}`);
    }
  };

  const handleAddOrderRow = (personId: string) => {
    const order = orders.find(o => o.personId === personId);
    if (!order) return;
    const newRow = { id: Date.now().toString(), itemId: '', quantity: 1 };
    updateOrder(personId, { rows: [...order.rows, newRow] });
  };

  const handleUpdateOrderRow = (personId: string, rowId: string, updates: any) => {
    const order = orders.find(o => o.personId === personId);
    if (!order) return;
    const updatedRows = order.rows.map(r => r.id === rowId ? { ...r, ...updates } : r);
    updateOrder(personId, { rows: updatedRows });
  };

  const handleRemoveOrderRow = (personId: string, rowId: string) => {
    const order = orders.find(o => o.personId === personId);
    if (!order) return;
    updateOrder(personId, { rows: order.rows.filter(r => r.id !== rowId) });
  };

  const handleRemoveOrder = async (personId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', personId));
      if (modalPersonId === personId) {
        setModalPersonId(null);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `orders/${personId}`);
    }
  };

  const activeOrders = orders.filter(o => o.rows.length > 0);
  const peopleWithOrdersCount = activeOrders.filter(o => o.rows.some(r => r.itemId && r.quantity > 0)).length;
  const deliveryShare = peopleWithOrdersCount > 0 ? deliveryFee / peopleWithOrdersCount : 0;

  const getOrdersTotal = (order: PersonOrder) => {
    return order.rows.reduce((sum, row) => {
      const item = items.find(i => i.id === row.itemId);
      const price = row.price !== undefined ? row.price : (item ? item.price : 0);
      return sum + (price * row.quantity);
    }, 0);
  };
  
  const hasOrders = (order: PersonOrder) => order.rows.some(r => r.itemId && r.quantity > 0);

  const handleStartNewOrder = async () => {
    if (!window.confirm("هل أنت متأكد من مسح جميع الطلبات الحالية للبدء في أوردار جديد؟ (لن يتم حذف الأسماء)")) return;
    try {
      await updateDoc(doc(db, 'sessions', 'global'), { deliveryFee: 0 });
      const promises = orders.map(o => 
        updateDoc(doc(db, 'orders', o.personId), { rows: [], isPaid: false, paidAmount: 0 })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error("Error clearing orders", e);
    }
  };

  const handleSaveCurrentOrders = async () => {
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

  const exportSingleOrderToPDF = async () => {
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
      pdf.save(`طلب-${personName}.pdf`);
    } catch (error) {
      console.error('Error generating Single PDF', error);
      alert('حدث خطأ أثناء تصدير ملف الـ PDF');
    } finally {
      setIsExportingSingleOrder(false);
    }
  };

  const exportSummaryToPDF = async () => {
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

  const exportToPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('فاتورة-طلبات-سوفت-روز.pdf');
    } catch (error) {
      console.error('Error generating PDF', error);
      alert('حدث خطأ أثناء تصدير ملف الـ PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    try {
      const data: any[] = [];
      data.push(["الاسم", "تفاصيل الطلبات", "نصيب التوصيل", "الإجمالي"]);

      activeOrders.forEach(o => {
        const pTotal = getOrdersTotal(o);
        const pHasOrders = hasOrders(o);
        const pFinalTotal = pTotal + (pHasOrders ? deliveryShare : 0);
        const p = people.find(person => person.id === o.personId);
        if (!pHasOrders || !p) return;

        const details = o.rows.filter(r => r.itemId && r.quantity > 0).map(r => {
          const item = items.find(i => i.id === r.itemId);
          return item ? `${item.name} (${r.quantity})` : '';
        }).join(' + ');

        data.push([
          p.name,
          details,
          pHasOrders ? deliveryShare.toFixed(2) : "0",
          pFinalTotal.toFixed(2)
        ]);
      });

      const totalOrdersValue = activeOrders.reduce((sum, o) => sum + getOrdersTotal(o), 0);
      const grandTotal = totalOrdersValue + deliveryFee;

      data.push([]);
      data.push(["ملخص الحساب", "", "", ""]);
      data.push(["إجمالي قيمة الطلبات", totalOrdersValue.toFixed(2) + " ج", "", ""]);
      data.push(["إجمالي التوصيل", deliveryFee + " ج", "", ""]);
      data.push(["الإجمالي العام المطلوب", grandTotal.toFixed(2) + " ج", "", ""]);

      const ws = XLSX.utils.aoa_to_sheet(data);
      if (!ws['!views']) ws['!views'] = [];
      ws['!views'].push({ rightToLeft: true });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "الطلبات");
      XLSX.writeFile(wb, "فاتورة-طلبات-سوفت-روز.xlsx");
    } catch (error) {
      console.error('Error generating Excel', error);
      alert('حدث خطأ أثناء تصدير ملف الإكسيل');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]" dir="rtl">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full mx-4">
          <div className="bg-rose-50 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
            <LogIn className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">اوردار</h1>
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
  }

  const totalOrdersValue = activeOrders.reduce((sum, o) => sum + getOrdersTotal(o), 0);
  const grandTotal = totalOrdersValue + deliveryFee;
  const paidAmount = activeOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const remainingTotal = Math.max(0, grandTotal - paidAmount);
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

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans text-gray-800 p-2 sm:p-4 md:p-8 overflow-hidden" dir="rtl">
      <div className="max-w-6xl mx-auto w-full">
        
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-700 transition-colors shadow-sm">
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-gray-900 to-gray-600 flex items-center gap-3">
                <span className="bg-gray-900 text-white p-2 rounded-2xl shadow-md hidden sm:block">
                  <Receipt className="w-8 h-8" />
                </span>
                اوردار
              </h1>
            </div>
                      </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0 items-center">
            <button onClick={() => { setIsAuthenticated(false); setPasswordInput(''); }} className="text-gray-500 hover:text-gray-700 bg-gray-100 px-4 py-3 rounded-xl font-medium flex items-center gap-2 w-full justify-center sm:w-auto">
              <LogOut className="w-5 h-5" />
              تسجيل خروج
            </button>
            {activeOrders.length > 0 && (
              <>
                <button
                  onClick={exportToExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm w-full sm:w-auto"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  إكسيل
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={isExporting}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  PDF
                </button>
              </>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Global Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:p-7">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                    <DollarSign className="w-5 h-5 ml-2 text-rose-500" />
                    تكلفة التوصيل (الدليفري)
                  </h2>
                  <p className="text-gray-500 text-sm">سيتم تقسيم هذا المبلغ بالتساوي على جميع الأشخاص الذين لديهم طلبات</p>
                </div>
                <div className="relative w-full md:w-64">
                  <input 
                    type="number" 
                    value={deliveryFee || ''}
                    onChange={e => updateDeliveryFee(Number(e.target.value) || 0)}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 text-2xl font-bold text-center bg-gray-50 focus:bg-white focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                    placeholder="0"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ج.م</span>
                </div>
              </div>
            </div>

            {/* Active Orders Dashboard */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:p-7">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-4">
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
                  <select 
                    value=""
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (val === "ADD_NEW") {
                        const name = window.prompt("أدخل اسم الشخص الجديد:");
                        if (name) {
                          const id = await handleAddPerson(name);
                          if (id) setModalPersonId(id);
                        }
                      } else if (val) {
                        if (!orders.find(o => o.personId === val)) {
                          await setDoc(doc(db, 'orders', val), {
                            personId: val,
                            isPaid: false,
                            paidAmount: 0,
                            rows: [],
                            organization: ORG_NAME
                          });
                        }
                        setModalPersonId(val);
                      }
                    }}
                    className="w-full p-3 border-2 border-rose-200 rounded-xl bg-rose-50 text-rose-700 font-bold cursor-pointer outline-none focus:border-rose-400 appearance-none"
                  >
                    <option value="" disabled hidden>+ اطلب / اختر اسم...</option>
                    <option value="ADD_NEW" className="font-extrabold text-gray-900 bg-gray-100 text-lg">➕ أضف اسم جديد</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id} className="text-base text-gray-800 font-medium">{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لا توجد طلبات حالياً. اختر اسماً للبدء.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeOrders.map(o => {
                    const p = people.find(person => person.id === o.personId);
                    if (!p) return null;
                    const pTotal = getOrdersTotal(o);
                    const pHasOrders = hasOrders(o);
                    const pFinalTotal = pTotal + (pHasOrders ? deliveryShare : 0);
                    return (
                      <div 
                        key={o.personId} 
                        onClick={() => setModalPersonId(o.personId)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${o.isPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 hover:border-rose-300'}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-lg">{p.name}</h3>
                          {o.isPaid && <Check className="w-5 h-5 text-emerald-500" />}
                        </div>
                        <div className="text-sm text-gray-600 mb-2 font-medium">
                          {o.rows.length} أصناف • إجمالي: {pFinalTotal.toFixed(2)} ج
                        </div>
                        <div className="text-xs font-bold text-emerald-600 bg-emerald-100/50 inline-block px-2 py-1 rounded-md">
                          تم دفع: {o.paidAmount || 0} ج
                        </div>
                      </div>
                    );
                  })}
                </div>
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

            {/* Global Summary */}
            <div className="bg-gray-900 text-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-800">
              <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 flex items-center pb-4 border-b border-gray-800">
                <Calculator className="w-6 h-6 sm:w-7 sm:h-7 ml-3 text-rose-400" />
                الحساب الختامي
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
                <div className="bg-gray-800/80 rounded-2xl p-4 sm:p-5 border border-gray-700">
                  <div className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">الإجمالي الكلي (بدون توصيل)</div>
                  <div className="text-2xl sm:text-3xl font-bold">{totalOrdersValue.toFixed(2)} <span className="text-sm sm:text-lg text-gray-500 font-normal">ج</span></div>
                </div>
                <div className="bg-gray-800/80 rounded-2xl p-4 sm:p-5 border border-gray-700">
                  <div className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">قيمة التوصيل الكلية</div>
                  <div className="text-2xl sm:text-3xl font-bold">{deliveryFee || 0} <span className="text-sm sm:text-lg text-gray-500 font-normal">ج</span></div>
                </div>
                <div className="bg-gradient-to-br from-rose-900 to-rose-950 rounded-2xl p-4 sm:p-5 border border-rose-800 shadow-inner">
                  <div className="text-rose-200 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">الإجمالي العام المطلوب</div>
                  <div className="text-3xl sm:text-4xl font-bold text-white">{grandTotal.toFixed(2)} <span className="text-lg sm:text-xl text-rose-300 font-normal">ج</span></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-800/80 rounded-2xl p-4 sm:p-5 border-r-4 border-r-emerald-500 border border-gray-700">
                  <div className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">المبالغ المدفوعة (تم التحصيل)</div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400">{paidAmount.toFixed(2)} <span className="text-sm sm:text-lg font-normal">ج</span></div>
                </div>
                <div className="bg-gray-800/80 rounded-2xl p-4 sm:p-5 border-r-4 border-r-orange-500 border border-gray-700">
                  <div className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">المتبقي للتحصيل</div>
                  <div className="text-2xl sm:text-3xl font-bold text-orange-400">{remainingTotal.toFixed(2)} <span className="text-sm sm:text-lg font-normal">ج</span></div>
                </div>
              </div>
            </div>
            
          </div>

          {/* Items Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:p-6 sticky top-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="bg-rose-100 p-1.5 rounded-lg ml-2">
                <Plus className="w-5 h-5 text-rose-600" />
              </span>
              إدارة الأصناف
            </h2>
            
            <div className="flex flex-col gap-3 mb-6">
              <input 
                type="text" 
                placeholder="اسم الصنف"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              />
              <div className="flex gap-2 w-full">
                <input 
                  type="number" 
                  placeholder="السعر"
                  value={newItemPrice}
                  onChange={e => setNewItemPrice(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition-all text-center"
                  onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                />
                <button 
                  onClick={handleAddItem}
                  className="bg-rose-500 text-white hover:bg-rose-600 px-4 py-3 rounded-xl transition-colors flex items-center justify-center shrink-0 font-bold"
                >
                  إضافة
                </button>
              </div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-2 scrollbar-thin">
              {items.length === 0 ? (
                <p className="text-gray-400 text-center py-6 text-sm font-medium">لم يتم إضافة أي أصناف بعد</p>
              ) : (
                <ul className="space-y-2">
                  {items.map(item => (
                    <li key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:border-rose-200 transition-colors">
                      <input
                        type="text"
                        defaultValue={item.name}
                        onBlur={e => {
                          const newName = e.target.value.trim();
                          if (newName && newName !== item.name) {
                             handleUpdateItem(item.id, { name: newName });
                          }
                        }}
                        className="flex-1 font-medium text-gray-700 bg-transparent outline-none truncate pr-2 focus:bg-gray-50 focus:ring-1 focus:ring-rose-200 rounded px-1 transition-all"
                      />
                      <div className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg ml-3 shrink-0 flex items-center">
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
                      </div>
                      <button onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>


        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[110] transition-opacity" onClick={() => setIsSidebarOpen(false)} />
        )}
        
        {/* Sidebar Drawer */}
        <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-[#fafaf9] shadow-2xl z-[120] transform transition-transform duration-300 overflow-hidden flex flex-col border-l border-gray-200 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Edit Order Modal */}
        {modalPersonId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 bg-gray-50/80">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                  <div className="bg-rose-100 p-2 rounded-xl hidden sm:block">
                    <User className="w-6 h-6 text-rose-600" />
                  </div>
                  {people.find(p => p.id === modalPersonId)?.name}
                </h2>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={exportSingleOrderToPDF}
                    disabled={isExportingSingleOrder}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm sm:text-base disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isExportingSingleOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span className="hidden sm:inline">تصدير PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                  <button 
                    onClick={() => handleRemoveOrder(modalPersonId)}
                    className="text-red-500 hover:bg-red-50 px-3 sm:px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-red-100 transition-colors text-sm sm:text-base"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">حذف من الطلبات</span>
                  </button>
                  <button 
                    onClick={() => setModalPersonId(null)}
                    className="p-2 hover:bg-gray-200 bg-gray-100 rounded-full transition-colors text-gray-600"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-[#fafaf9]">
                <div className="space-y-3 mb-6">
                  {orders.find(o => o.personId === modalPersonId)?.rows.map((row, index) => {
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
                  })}
                  
                  <button 
                    onClick={() => handleAddOrderRow(modalPersonId)} 
                    className="w-full py-4 border-2 border-dashed border-rose-300 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 bg-white"
                  >
                    <Plus className="w-5 h-5" />
                    إضافة صنف
                  </button>
                </div>
              </div>

              {/* Modal Footer Summary */}
              {(() => {
                const order = orders.find(o => o.personId === modalPersonId);
                if (!order) return null;
                const pTotal = getOrdersTotal(order);
                const pHasOrders = hasOrders(order);
                const pFinalTotal = pTotal + (pHasOrders ? deliveryShare : 0);

                return (
                  <div className="bg-gray-100 p-4 sm:p-6 border-t border-gray-200 rounded-b-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-end">
                      
                      <div className="space-y-3 sm:space-y-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between text-gray-600 font-medium text-sm sm:text-base">
                          <span>إجمالي الطلبات:</span>
                          <span className="font-bold text-gray-900 text-base sm:text-lg">{pTotal} ج</span>
                        </div>
                        <div className="flex justify-between text-gray-600 font-medium pb-3 sm:pb-4 border-b border-gray-100 text-sm sm:text-base">
                          <span>نصيب التوصيل:</span>
                          <span className="font-bold text-gray-900 text-base sm:text-lg">{pHasOrders ? deliveryShare.toFixed(2) : '0'} ج</span>
                        </div>
                        <div className="flex justify-between text-lg sm:text-xl font-bold text-rose-600 pt-1 sm:pt-2">
                          <span>الإجمالي المطلوب:</span>
                          <span className="text-xl sm:text-2xl">{pFinalTotal.toFixed(2)} ج</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 sm:space-y-4">
                        <label className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border-2 transition-colors cursor-pointer ${order.isPaid ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                          <span className="font-bold text-base sm:text-lg flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={order.isPaid} 
                              onChange={e => updateOrder(order.personId, { isPaid: e.target.checked })} 
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer" 
                            />
                            تم الدفع بالكامل
                          </span>
                        </label>
                        
                        <div className="bg-white p-3 sm:p-4 rounded-xl border-2 border-gray-200 flex items-center justify-between gap-2 sm:gap-4 focus-within:border-gray-400 transition-colors">
                          <span className="font-bold text-gray-700 text-sm sm:text-base whitespace-nowrap">المبلغ المدفوع:</span>
                          <div className="relative">
                            <input 
                              type="number" 
                              value={order.paidAmount || ''} 
                              onChange={e => updateOrder(order.personId, { paidAmount: Number(e.target.value) || 0 })} 
                              className="w-24 sm:w-32 p-2 pl-6 sm:pl-8 border-2 border-gray-100 rounded-lg text-center font-bold text-lg sm:text-xl outline-none focus:border-rose-300 transition-colors bg-gray-50 focus:bg-white" 
                              placeholder="0"
                            />
                            <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs sm:text-sm">ج</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {showSummaryModal && (
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

        {/* Hidden Printable PDF Layout */}
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

          <div ref={printRef} className="w-[800px] h-auto p-10 font-sans" dir="rtl" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
            <div className="text-center mb-8 border-b-2 pb-6" style={{ borderColor: '#e5e7eb' }}>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#111827' }}>فاتورة اوردار</h1>
              <p className="text-lg font-medium" style={{ color: '#6b7280' }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
            </div>
            <table className="w-full text-right mb-8 border-collapse">
              <thead>
                <tr className="border-y-2" style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }}>
                  <th className="py-3 px-4 font-bold border-l text-lg" style={{ borderColor: '#e5e7eb' }}>الاسم</th>
                  <th className="py-3 px-4 font-bold border-l text-lg" style={{ borderColor: '#e5e7eb' }}>تفاصيل الطلبات</th>
                  <th className="py-3 px-4 font-bold border-l w-32 text-center text-lg" style={{ borderColor: '#e5e7eb' }}>التوصيل</th>
                  <th className="py-3 px-4 font-bold w-32 text-center text-lg">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.map(o => {
                  const p = people.find(person => person.id === o.personId);
                  if (!p) return null;
                  const pTotal = getOrdersTotal(o);
                  const pHasOrders = hasOrders(o);
                  const pFinalTotal = pTotal + (pHasOrders ? deliveryShare : 0);
                  if (!pHasOrders) return null;
                  
                  return (
                    <tr key={o.personId} className="border-b" style={{ borderColor: '#e5e7eb' }}>
                      <td className="py-4 px-4 font-bold align-top border-l text-lg" style={{ borderColor: '#e5e7eb' }}>{p.name}</td>
                      <td className="py-4 px-4 align-top border-l" style={{ borderColor: '#e5e7eb' }}>
                        <ul className="space-y-2">
                          {o.rows.filter(r => r.itemId && r.quantity > 0).map(r => {
                            const item = items.find(i => i.id === r.itemId);
                            if (!item) return null;
                            return (
                              <li key={r.id} className="flex justify-between text-base">
                                <span>{item.name} <span className="mx-1" style={{ color: '#9ca3af' }}>×</span> {r.quantity}</span>
                                <span className="font-bold">{(r.price !== undefined ? r.price : item.price) * r.quantity} ج</span>
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td className="py-4 px-4 align-middle text-center border-l font-bold text-lg" style={{ borderColor: '#e5e7eb', color: '#4b5563' }}>
                        {pHasOrders ? deliveryShare.toFixed(2) : 0} ج
                      </td>
                      <td className="py-4 px-4 align-middle text-center font-bold text-2xl">
                        {pFinalTotal.toFixed(2)} ج
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end mt-8">
              <div className="w-96 p-6 rounded-2xl border-2" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                <h3 className="text-2xl font-bold mb-4 border-b pb-3" style={{ borderColor: '#e5e7eb' }}>ملخص الحساب</h3>
                <div className="flex justify-between mb-3 text-lg font-medium" style={{ color: '#374151' }}>
                  <span>إجمالي قيمة الطلبات:</span>
                  <span className="font-bold">{totalOrdersValue.toFixed(2)} ج</span>
                </div>
                <div className="flex justify-between mb-3 text-lg font-medium" style={{ color: '#374151' }}>
                  <span>إجمالي التوصيل:</span>
                  <span className="font-bold">{deliveryFee} ج</span>
                </div>
                <div className="flex justify-between mt-5 pt-5 border-t-2 text-2xl font-bold" style={{ borderColor: '#111827' }}>
                  <span>الإجمالي العام:</span>
                  <span>{grandTotal.toFixed(2)} ج</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
