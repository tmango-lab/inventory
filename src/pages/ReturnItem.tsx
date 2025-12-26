// src/pages/ReturnItem.tsx
import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea } from '../components/UI';
import { getBorrowedList, returnItem, BorrowedItem } from '../lib/api';

const ReturnItem: React.FC = () => {
    const [list, setList] = useState<BorrowedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [selectedItem, setSelectedItem] = useState<BorrowedItem | null>(null);
    const [returnQty, setReturnQty] = useState<number | ''>('');
    const [lostQty, setLostQty] = useState<number | ''>(0);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchList();
    }, []);

    const fetchList = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getBorrowedList();
            setList(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item: BorrowedItem) => {
        setSelectedItem(item);
        setReturnQty(item.qtyLeft); // default full return
        setLostQty(0);
        setReason('');
    };

    const handleCloseModal = () => {
        setSelectedItem(null);
    };

    const handleReturnSubmit = async () => {
        if (!selectedItem) return;
        const rQty = Number(returnQty || 0);
        const lQty = Number(lostQty || 0);

        if (rQty < 0 || lQty < 0) {
            alert('จำนวนต้องไม่ติดลบ');
            return;
        }
        if (rQty + lQty === 0) {
            alert('ต้องระบุจำนวนคืน หรือ จำนวนเสีย/หาย อย่างน้อย 1');
            return;
        }
        if (rQty + lQty > selectedItem.qtyLeft) {
            alert('จำนวนรวม (คืน+หาย) ต้องไม่เกินยอดค้างคืน');
            return;
        }
        if (lQty > 0 && !reason.trim()) {
            alert('กรณีมีของหาย/เสีย ต้องระบุเหตุผล');
            return;
        }

        setSubmitting(true);
        try {
            await returnItem({
                outId: selectedItem.outId,
                returnQty: rQty,
                lostQty: lQty,
                reason: reason.trim(),
            });
            alert('บันทึกการคืนเรียบร้อย');
            handleCloseModal();
            fetchList(); // Refresh list
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">รายการยืมคงค้าง</h2>
                <Button onClick={fetchList} variant="secondary" className="text-sm">
                    Refresh
                </Button>
            </div>

            {loading && <p className="text-slate-500">กำลังโหลด...</p>}
            {error && <p className="text-red-600">{error}</p>}

            {!loading && !error && list.length === 0 && (
                <p className="text-slate-500 italic">ไม่มีรายการยืมคงค้าง</p>
            )}

            {/* List */}
            <div className="space-y-3">
                {list.map((item) => (
                    <div
                        key={item.outId}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg border shadow-sm gap-4"
                    >
                        <div>
                            <div className="font-semibold text-slate-800">
                                {item.itemName}
                            </div>
                            <div className="text-sm text-slate-500">
                                ผู้ยืม: {item.requestBy} | วันที่: {item.date.split('T')[0]}
                            </div>
                            <div className="text-sm mt-1">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium mr-2">
                                    ค้างคืน: {item.qtyLeft}
                                </span>
                                <span className="text-slate-400 text-xs">
                                    (ยืม {item.qtyKey} / คืนแล้ว {item.qtyReturned} / หาย {item.qtyLost})
                                </span>
                            </div>
                        </div>
                        <Button onClick={() => handleOpenModal(item)}>
                            แจ้งคืน
                        </Button>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-800">
                            แจ้งคืน: {selectedItem.itemName}
                        </h3>
                        <div className="text-sm text-slate-600">
                            ค้างคืนทั้งหมด: <span className="font-semibold">{selectedItem.qtyLeft}</span>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    จำนวนที่คืน (สภาพดี)
                                </label>
                                <Input
                                    type="number"
                                    value={returnQty}
                                    onChange={(e) => setReturnQty(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-red-600">
                                    จำนวนที่เสีย/หาย
                                </label>
                                <Input
                                    type="number"
                                    value={lostQty}
                                    onChange={(e) => setLostQty(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    เหตุผล (กรณีเสีย/หาย)
                                </label>
                                <Input
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="เช่น ทำหายหน้างาน, แตกหักระหว่างขนย้าย"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                            <Button variant="secondary" onClick={handleCloseModal}>
                                ยกเลิก
                            </Button>
                            <Button onClick={handleReturnSubmit} disabled={submitting}>
                                {submitting ? 'กำลังบันทึก...' : 'บันทึกการคืน'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReturnItem;
