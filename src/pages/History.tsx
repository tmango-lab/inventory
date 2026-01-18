import React, { useEffect, useState } from 'react';
import { getAllHistory, getBorrowedList, returnItem, type HistoryFilterType, type BorrowedItem } from '../lib/api';
import { Button, Input, Textarea } from '../components/UI';

// --- Types ---
type HistoryItem = {
    id: string;
    date: string;
    itemName: string;
    qty: number;
    unit: string;
    type: string;
    zone?: string;
    channel?: string;
    remark?: string;
    images: string[];
    requestBy?: string;
};

// --- Return Modal ---
function ReturnModal({
    item,
    onClose,
    onSuccess
}: {
    item: BorrowedItem;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [returnQty, setReturnQty] = useState<number | ''>(item.qtyLeft);
    const [lostQty, setLostQty] = useState<number | ''>(0);
    const [returnerName, setReturnerName] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    // Initialize returnQty with max remaining
    useEffect(() => {
        setReturnQty(item.qtyLeft);
        setLostQty(0);
    }, [item]);

    // Auto-calculate Return Qty when Lost Qty changes
    const handleLostChange = (val: string) => {
        if (val === '') {
            setLostQty('');
            // If lost is empty (0), return is full
            setReturnQty(item.qtyLeft);
            return;
        }
        const numVal = Number(val);
        if (isNaN(numVal)) return;

        const newLost = Math.max(0, numVal);
        if (newLost > item.qtyLeft) return;

        setLostQty(newLost);
        setReturnQty(Math.max(0, item.qtyLeft - newLost));
    };

    const handleReturnChange = (val: string) => {
        if (val === '') {
            setReturnQty('');
            // If return is empty (0), lost could be full? Or stay as is?
            // Let's assume empty return means 0 return.
            // If return is 0, then lost could be up to total.
            // But we don't auto-increase lost usually, unless we want strict complement.
            // Let's just update returnQty and if return+lost > total, reduce lost.
            const currentLost = typeof lostQty === 'number' ? lostQty : 0;
            if (currentLost > item.qtyLeft) {
                setLostQty(item.qtyLeft);
            }
            return;
        }
        const numVal = Number(val);
        if (isNaN(numVal)) return;

        const newReturn = Math.max(0, numVal);
        if (newReturn > item.qtyLeft) return;

        setReturnQty(newReturn);
        const currentLost = typeof lostQty === 'number' ? lostQty : 0;
        if (newReturn + currentLost > item.qtyLeft) {
            setLostQty(Math.max(0, item.qtyLeft - newReturn));
        }
    };

    const handleSubmit = async () => {
        const rQty = typeof returnQty === 'number' ? returnQty : 0;
        const lQty = typeof lostQty === 'number' ? lostQty : 0;

        if (rQty + lQty === 0) {
            alert('ต้องมีการคืนหรือแจ้งหายอย่างน้อย 1 ชิ้น');
            return;
        }
        if (rQty + lQty > item.qtyLeft) {
            alert('จำนวนคืนรวมเกินกว่าที่ค้างรับ');
            return;
        }
        if (!returnerName.trim()) {
            alert('กรุณาระบุชื่อผู้คืน');
            return;
        }

        // If lost > 0, reason is mandatory (user requirement: "If lost/not full return, force remark")
        if (lQty > 0 && !reason.trim()) {
            alert('กรุณาระบุสาเหตุการหาย/เสียหาย');
            return;
        }


        setLoading(true);
        try {
            await returnItem({
                outId: item.outId,
                returnQty: rQty,
                lostQty: lQty,
                returnerName,
                reason
            });
            alert('บันทึกการคืนสำเร็จ');
            onSuccess();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                <h3 className="text-xl font-bold mb-4">คืนสินค้า</h3>
                <div className="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                    <div className="font-semibold text-lg">{item.itemName}</div>

                    {/* Location Highlight */}
                    {(item.zone && item.channel) && (
                        <div className="mt-2 text-center bg-white border border-blue-200 rounded p-2 shadow-sm">
                            <div className="text-gray-500 text-xs uppercase tracking-wide">กรุณานำไปเก็บคืนที่</div>
                            <div className="text-xl font-bold text-blue-700">
                                โซน {item.zone} / ช่อง {item.channel}
                            </div>
                        </div>
                    )}

                    <div className="mt-2 flex justify-between items-end border-t border-blue-200 pt-2">
                        <div>
                            <div>ยืมไป: {item.qtyKey} | คืนแล้ว: {item.qtyReturned}</div>
                            <div className="font-bold">คงเหลือคืน: {item.qtyLeft}</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">จำนวนที่คืน (ดี)</label>
                            <Input
                                type="number"
                                value={returnQty}
                                onChange={(e) => handleReturnChange(e.target.value)}
                                min={0}
                                max={item.qtyLeft}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-red-600">จำนวนที่หาย/เสีย</label>
                            <Input
                                type="number"
                                value={lostQty}
                                onChange={(e) => handleLostChange(e.target.value)}
                                min={0}
                                max={item.qtyLeft}
                                className="border-red-200 text-red-600 focus:border-red-400 focus:ring-red-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">ผู้คืน (Require)</label>
                        <Input
                            value={returnerName}
                            onChange={(e) => setReturnerName(e.target.value)}
                            placeholder="ระบุชื่อผู้คืน..."
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">หมายเหตุ / สาเหตุที่คืนไม่ครบ</label>
                        <Textarea
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={Number(lostQty) > 0 ? "ระบุเหตุผลที่หาย/เสียหาย..." : "หมายเหตุเพิ่มเติม (ถ้ามี)"}
                            rows={2}
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button variant="secondary" onClick={onClose} className="flex-1">
                            ยกเลิก
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                            {loading ? 'บันทึก...' : 'ยืนยันการคืน'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Main Page ---
const HistoryPage: React.FC = () => {
    // Tabs: ALL, IN, CONSUME (Issue), BORROW (Borrow & Return)
    // We map internal 'activeTab' to these concepts.
    const [tab, setTab] = useState<'ALL' | 'IN' | 'CONSUME' | 'BORROW'>('ALL');

    const [rawHistory, setRawHistory] = useState<HistoryItem[]>([]);
    const [borrowList, setBorrowList] = useState<BorrowedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    // Return Modal
    const [selectedBorrow, setSelectedBorrow] = useState<BorrowedItem | null>(null);

    // Image Modal
    const [imgOpen, setImgOpen] = useState(false);
    const [images, setImages] = useState<string[]>([]);

    const handleSwitchTab = (newTab: 'ALL' | 'IN' | 'CONSUME' | 'BORROW') => {
        setLoading(true); // Prevent flash of old data
        setTab(newTab);
    };

    useEffect(() => {
        loadData();
    }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'BORROW') {
                const data = await getBorrowedList();
                setBorrowList(data);
            } else {
                // Map local tab to API filter
                let apiFilter: HistoryFilterType = 'ALL';
                if (tab === 'IN') apiFilter = 'IN';
                else if (tab === 'CONSUME') apiFilter = 'OUT'; // We will client-filter CONSUME later if needed, or API supports it? 
                // Currently API 'OUT' returns everything not IN (Borrow + Consume).
                // We'll client filter for strictly CONSUME.

                const data = await getAllHistory(apiFilter);
                if (tab === 'CONSUME') {
                    setRawHistory(data.filter(x => x.type === 'CONSUME'));
                } else {
                    setRawHistory(data);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Render Helpers
    const renderHistoryList = () => {
        const rows = rawHistory.filter(x => x.itemName.toLowerCase().includes(filter.toLowerCase()));

        if (rows.length === 0) return <div className="text-center text-gray-500 py-8">ไม่พบข้อมูล</div>;

        return (
            <div className="space-y-3">
                {rows.map((x) => (
                    <div key={x.id} className="border rounded-lg shadow-sm px-4 py-3 bg-white flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${x.type === 'IN' ? 'bg-green-100 text-green-800' :
                                    x.type === 'CONSUME' ? 'bg-orange-100 text-orange-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {x.type === 'IN' ? 'รับเข้า' : x.type === 'CONSUME' ? 'เบิกใช้' : x.type}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {new Date(x.date).toLocaleString('th-TH')}
                                </span>
                            </div>
                            <div className="font-semibold text-lg">{x.itemName}</div>
                            <div className="text-sm text-gray-600 mt-1">
                                จำนวน: <span className="font-medium text-black">{x.qty} {x.unit}</span>
                                {x.zone && ` • โซน ${x.zone} / ช่อง ${x.channel}`}
                            </div>
                            {x.requestBy && (
                                <div className="text-xs text-gray-500 mt-1">ผู้เบิก: {x.requestBy}</div>
                            )}
                            {x.remark && (
                                <div className="text-xs text-gray-500 mt-0.5">หมายเหตุ: {x.remark}</div>
                            )}
                        </div>
                        {/* Images */}
                        {x.images && x.images.length > 0 && (
                            <div className="flex gap-2 items-start mt-2 md:mt-0">
                                {x.images.slice(0, 3).map((b64, i) => (
                                    <img
                                        key={i}
                                        src={b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`}
                                        alt="img"
                                        className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                                        onClick={() => {
                                            setImages(x.images);
                                            setImgOpen(true);
                                        }}
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderBorrowList = () => {
        const rows = borrowList.filter(x => x.itemName.toLowerCase().includes(filter.toLowerCase()));

        if (rows.length === 0) return <div className="text-center text-gray-500 py-8">ไม่พบรายการยืมค้างส่งคืน</div>;

        return (
            <div className="space-y-3">
                {rows.map((x) => (
                    <div key={x.outId} className="border rounded-lg shadow-sm px-4 py-3 bg-white flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-yellow-100 text-yellow-800">
                                    ยืมสินค้า
                                </span>
                                <span className="text-xs text-gray-400">
                                    ยืมเมื่อ: {new Date(x.date).toLocaleString('th-TH')}
                                </span>
                            </div>
                            <div className="font-semibold text-lg">{x.itemName}</div>

                            {/* Stats Line */}
                            <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span>ยืมไป: <b className="text-black">{x.qtyKey}</b></span>
                                <span>คืนแล้ว: <b className="text-green-600">{x.qtyReturned}</b></span>
                                {(x.qtyLost > 0) && (
                                    <span>เสียหาย: <b className="text-red-600">{x.qtyLost}</b></span>
                                )}
                            </div>

                            {/* Status Line */}
                            <div className="mt-2">
                                {x.qtyLeft > 0 ? (
                                    <div className="text-sm font-bold text-red-600 bg-red-50 inline-block px-2 py-1 rounded">
                                        สถานะ: ค้างรับ {x.qtyLeft}
                                    </div>
                                ) : x.qtyLost > 0 ? (
                                    <div className="text-sm font-bold text-red-600 bg-red-50 inline-block px-2 py-1 rounded">
                                        สถานะ: คืนไม่ครบ (มีเสียหาย)
                                    </div>
                                ) : (
                                    <div className="text-sm font-bold text-green-600 bg-green-50 inline-block px-2 py-1 rounded">
                                        สถานะ: คืนครบแล้ว
                                    </div>
                                )}
                            </div>

                            {/* People & Remarks */}
                            {/* People & Remarks */}
                            <div className="mt-2 space-y-1 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                <div className="flex flex-col">
                                    <div>
                                        <span className="text-gray-500 mr-1">ผู้ยืม:</span>
                                        <span className="font-medium text-gray-900">
                                            {x.requestBy.replace(/\(Note:.*\)/, '').trim()}
                                        </span>
                                    </div>
                                    {/* Extract Note from requestBy OR use remark */}
                                    {(() => {
                                        const noteMatch = x.requestBy.match(/\(Note:\s*(.*)\)/);
                                        const note = noteMatch ? noteMatch[1].replace(/\)$/, '') : x.remark;
                                        if (note) return (
                                            <div className="mt-0.5">
                                                <span className="text-gray-500 mr-1">หมายเหตุ:</span>
                                                {note}
                                            </div>
                                        );
                                        return null;
                                    })()}
                                </div>

                                {(x.returnerName || x.lastReturnDate) && (
                                    <div className="border-t border-gray-200 mt-1 pt-1">
                                        <div>ล่าสุด: {x.lastReturnDate && new Date(x.lastReturnDate).toLocaleString('th-TH')} โดย {x.returnerName}</div>
                                        {x.lastReturnRemark && <div className="text-gray-600">หมายเหตุ: {x.lastReturnRemark}</div>}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            {x.qtyLeft > 0 ? (
                                <Button
                                    onClick={() => setSelectedBorrow(x)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md text-sm"
                                >
                                    แจ้งคืนสินค้า
                                </Button>
                            ) : (
                                <span className="opacity-50 text-xs text-gray-400">จบรายการ</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )
    };

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-fit max-w-full overflow-x-auto">
                <button
                    onClick={() => handleSwitchTab('ALL')}
                    className={`px-4 py-2 text-sm rounded-md whitespace-nowrap ${tab === 'ALL' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                >
                    ทั้งหมด
                </button>
                <button
                    onClick={() => handleSwitchTab('IN')}
                    className={`px-4 py-2 text-sm rounded-md whitespace-nowrap ${tab === 'IN' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                >
                    รับเข้า
                </button>
                <button
                    onClick={() => handleSwitchTab('CONSUME')}
                    className={`px-4 py-2 text-sm rounded-md whitespace-nowrap ${tab === 'CONSUME' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                >
                    เบิกใช้
                </button>
                <button
                    onClick={() => handleSwitchTab('BORROW')}
                    className={`px-4 py-2 text-sm rounded-md whitespace-nowrap ${tab === 'BORROW' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
                >
                    ยืม/คืน
                </button>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-2">
                <input
                    className="border rounded-md px-3 py-2 w-full"
                    placeholder="ค้นหาชื่อสินค้า..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            {loading && <div className="text-gray-500 text-sm">กำลังโหลด...</div>}

            {!loading && (
                <>
                    {tab === 'BORROW' ? renderBorrowList() : renderHistoryList()}
                </>
            )}

            {/* Return Modal */}
            {selectedBorrow && (
                <ReturnModal
                    item={selectedBorrow}
                    onClose={() => setSelectedBorrow(null)}
                    onSuccess={() => {
                        setSelectedBorrow(null);
                        loadData();
                    }}
                />
            )}

            {/* Image Viewer */}
            {imgOpen && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setImgOpen(false)}
                >
                    <div className="bg-white p-2 rounded max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="grid gap-4">
                            {images.map((img, idx) => {
                                // Check if it's a URL (http/https) or Base64
                                const isUrl = img.startsWith('http');
                                const src = isUrl ? img : `data:image/jpeg;base64,${img}`;

                                return (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                                        <img
                                            src={src}
                                            alt={`รูปสินค้า ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
