const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const functionToAdd = `  const handleStartNewOrder = async () => {
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

  const handleSaveCurrentOrders = async () => {`;

content = content.replace("  const handleSaveCurrentOrders = async () => {", functionToAdd);

fs.writeFileSync('src/App.tsx', content);
