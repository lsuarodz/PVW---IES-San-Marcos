import fs from 'fs';
let code = fs.readFileSync('src/pages/Orders.tsx', 'utf8');

code = code.replace(
  /  const handleSaveOrder = async \(\) => \{[\s\S]*?    \} finally \{\s*setIsSaving\(false\);\s*\}\s*\};/g,
  `  const handleSaveOrder = async (isDraft: boolean = true) => {
    if (orderItems.length === 0) {
      showToast('Añade al menos una receta, menú o ingrediente suelto a tu pedido.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const orderId = editingOrderId || doc(collection(db, 'orders')).id;
      const titleStr = orderTitle.trim() || \`Pedido de \${appUser?.name || 'Profesor'} - \${new Date().toLocaleDateString('es-ES')}\`;
      const existingOrder = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;
      
      let newStatus: 'draft' | 'pending' | 'completed' = 'draft';
      if (!isDraft) newStatus = 'pending';
      else if (existingOrder) newStatus = existingOrder.status;

      const newOrder: Order = {
        id: orderId,
        title: titleStr,
        userId: existingOrder ? existingOrder.userId : (appUser?.uid || ''),
        userName: existingOrder ? existingOrder.userName : (appUser?.name || 'Profesor'),
        items: orderItems,
        createdAt: existingOrder ? existingOrder.createdAt : new Date().toISOString(),
        status: newStatus
      };
      
      await setDoc(doc(db, 'orders', orderId), newOrder);
      showToast(isDraft ? (editingOrderId ? 'Borrador actualizado.' : 'Borrador guardado.') : '¡Pedido enviado a consolidación!', 'success');
      setOrderItems([]);
      setOrderTitle('');
      setEditingOrderId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders');
      showToast('Error al guardar el pedido.', 'error');
    } finally {
      setIsSaving(false);
    }
  };`
);

fs.writeFileSync('src/pages/Orders.tsx', code);
