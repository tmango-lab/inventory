import React, { useEffect, useState } from 'react';
import { getAllHistory, type HistoryFilterType } from '../lib/api';

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

const HistoryPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<HistoryFilterType>('ALL');
    const [raw, setRaw] = useState<HistoryItem[]>([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal State
    const [open, setOpen] = useState(false);
    const [images, setImages] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getAllHistory(activeTab);
            setRaw(data);
        } catch (err) {
            console.error(err);
            alert('โหลดข้อมูลไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    const rows = raw.filter((x) =>
        x.itemName.toLowerCase().includes(filter.toLowerCase())
    );

    // Helper colors for badge
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'IN': return 'bg-green-100 text-green-800';
            case 'BORROW': return 'bg-yellow-100 text-yellow-800';
            case 'CONSUME': return 'bg-orange-100 text-orange-800';
            case 'RETURN': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'IN': return 'รับเข้า';
            case 'BORROW': return 'เบิกยืม';
            case 'CONSUME': return 'เบิกใช้';
            case 'RETURN': return 'คืนของ';
            default: return type;
        }
    };

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                {(['ALL', 'IN', 'OUT'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${activeTab === t
                                ? 'bg-white text-blue-600 shadow-sm font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t === 'ALL' ? 'ทั้งหมด' : t === 'IN' ? 'ประวัติรับเข้า' : 'ประวัติเบิก/ออก'}
                    </button>
                ))}
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

            {/* List */}
            <div className="space-y-3">
                {rows.map((x) => (
                    <div key={x.id} className="border rounded-lg shadow-sm px-4 py-3 bg-white flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${getTypeColor(x.type)}`}>
                                    {getTypeLabel(x.type)}
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
                                        // Note: Handle legacy drive ID if mixed? Assuming new Supabase logic uses base64 or stored URL. 
                                        // For now, assume simplified base64 from current logic or handle error gracefully.
                                        alt="img"
                                        className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                                        onClick={() => {
                                            setImages(x.images);
                                            setOpen(true);
                                        }}
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {!loading && rows.length === 0 && (
                    <div className="text-center text-gray-500 py-8">ไม่พบข้อมูล</div>
                )}
            </div>

            {/* Modal Lightbox */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setOpen(false)}
                >
                    <div className="bg-white p-2 rounded max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="grid gap-4">
                            {images.map((img, i) => (
                                <img
                                    key={i}
                                    src={img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`}
                                    className="w-full h-auto rounded"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
