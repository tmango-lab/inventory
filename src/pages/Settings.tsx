import { useState, useEffect } from 'react';
import { Button, Input } from '../components/UI';
import {
    getShelfConfigs,
    upsertShelfConfig,
    deleteShelfConfig,
    type ShelfConfig,
    updateProduct,
    clearExperimentData,
    normalizeImages
} from '../lib/api';
import { supabase } from '../lib/supabaseClient';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'shelf' | 'product' | 'danger'>('shelf');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        if (password === 'ภากร') {
            setIsAuthorized(true);
        } else {
            alert('รหัสผ่านไม่ถูกต้อง');
            setPassword('');
        }
    };

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="text-xl font-bold text-gray-700">กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน</div>
                <Input
                    type="password"
                    placeholder="รหัสผ่าน..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="text-center max-w-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <Button onClick={handleLogin}>เข้าสู่ระบบ</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b pb-2">
                <button
                    className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'shelf'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('shelf')}
                >
                    ตั้งค่าชั้นวาง (Shelf Config)
                </button>
                <button
                    className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'product'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('product')}
                >
                    จัดการสินค้า (Product Master)
                </button>
                <button
                    className={`pb-2 text-sm font-medium transition-colors ml-auto ${activeTab === 'danger'
                        ? 'border-b-2 border-red-600 text-red-600'
                        : 'text-red-400 hover:text-red-600'
                        }`}
                    onClick={() => setActiveTab('danger')}
                >
                    ⚠️ Reset Data
                </button>
            </div>

            {activeTab === 'shelf' && <ShelfTab />}
            {activeTab === 'product' && <ProductTab />}
            {activeTab === 'danger' && <DangerTab />}
        </div>
    );
}

function DangerTab() {
    const [loading, setLoading] = useState(false);

    async function handleReset() {
        if (!confirm('ยืนยันจริงๆ ใช่ไหม? ข้อมูลสินค้าและประวัติทั้งหมดจะหายไปกู้คืนไม่ได้!')) return;

        setLoading(true);
        try {
            await clearExperimentData();
            alert('ล้างข้อมูลเรียบร้อย! ระบบสะอาดเหมือนใหม่');
        } catch (err: any) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-xl mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-6">
            <h3 className="text-2xl font-bold text-red-700">⚠️ Danger Zone</h3>
            <p className="text-gray-600">
                ล้างสินค้าและประวัติทั้งหมด <span className="text-red-600">(กู้คืนไม่ได้)</span>
                <br />
                * การตั้งค่าชั้นวางจะยังอยู่
            </p>

            <Button
                onClick={handleReset}
                className="bg-red-600 hover:bg-red-700 text-white w-full max-w-xs text-lg py-3"
                disabled={loading}
            >
                {loading ? 'กำลังล้างระบบ...' : '💣 ยืนยันล้างข้อมูลทั้งหมด'}
            </Button>
        </div>
    );
}

function ShelfTab() {
    const [shelves, setShelves] = useState<ShelfConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<ShelfConfig>({ zone: '', floors: 5, slots_per_floor: 5 });

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await getShelfConfigs();
            setShelves(data);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!form.zone) return alert('กรุณาระบุชื่อโซน');
        try {
            await upsertShelfConfig(form);
            alert('บันทึกสำเร็จ');
            setIsEditing(false);
            setForm({ zone: '', floors: 5, slots_per_floor: 5 });
            load();
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleDelete(zone: string) {
        if (!confirm(`ต้องการลบโซน ${zone} หรือไม่?`)) return;
        try {
            await deleteShelfConfig(zone);
            load();
        } catch (err: any) {
            alert(err.message);
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">รายการชั้นวาง</h3>
                <Button onClick={() => setIsEditing(true)} disabled={isEditing}>+ เพิ่มชั้นวาง</Button>
            </div>

            {isEditing && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-4">
                    <h4 className="font-medium text-blue-800">เพิ่ม/แก้ไข ชั้นวาง</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm">ชื่อโซน (A-Z)</label>
                            <Input
                                value={form.zone}
                                onChange={e => setForm({ ...form, zone: e.target.value.toUpperCase() })}
                                placeholder="เช่น A"
                                disabled={shelves.some(s => s.zone === form.zone && isEditing) ? false : false} // Allow editing properties of existing too? For simplify, upsert handles both.
                            />
                        </div>
                        <div>
                            <label className="text-sm">จำนวนชั้น (แนวตั้ง)</label>
                            <Input type="number" value={form.floors} onChange={e => setForm({ ...form, floors: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="text-sm">จำนวนล็อค/ชั้น (แนวนอน)</label>
                            <Input type="number" value={form.slots_per_floor} onChange={e => setForm({ ...form, slots_per_floor: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setIsEditing(false)}>ยกเลิก</Button>
                        <Button onClick={handleSave}>บันทึก</Button>
                    </div>
                </div>
            )}

            <div className="bg-white border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">โซน</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">จำนวนชั้น</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">จำนวนล็อค/ชั้น</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">ความจุรวม</th>
                            <th className="px-6 py-3 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {shelves.map(s => (
                            <tr key={s.zone}>
                                <td className="px-6 py-4 font-bold text-gray-900">{s.zone}</td>
                                <td className="px-6 py-4 text-center">{s.floors}</td>
                                <td className="px-6 py-4 text-center">{s.slots_per_floor}</td>
                                <td className="px-6 py-4 text-center text-gray-500">{s.floors * s.slots_per_floor} ช่อง</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        className="text-blue-600 hover:underline text-sm"
                                        onClick={() => {
                                            setForm(s);
                                            setIsEditing(true);
                                        }}
                                    >
                                        แก้ไข
                                    </button>
                                    <button
                                        className="text-red-600 hover:underline text-sm"
                                        onClick={() => handleDelete(s.zone)}
                                    >
                                        ลบ
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {shelves.length === 0 && !loading && (
                            <tr><td colSpan={5} className="p-4 text-center text-gray-500">ไม่พบข้อมูล (รัน SQL Script หรือยัง?)</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ProductTab() {
    const [products, setProducts] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    const [editingItem, setEditingItem] = useState<any | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        const { data } = await supabase.from('products').select('*').order('name');
        setProducts((data || []).map((p: any) => ({
            ...p,
            images: normalizeImages(p.images)
        })));
    }

    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <Input
                    placeholder="ค้นหาสินค้า..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full max-w-sm"
                />
            </div>

            <div className="grid gap-2">
                {filtered.slice(0, 50).map(p => (
                    <div key={p.name} className="flex justify-between items-center p-3 bg-white border rounded hover:bg-gray-50">
                        <div className="flex gap-3 items-center">
                            {/* Small thumbnail if available */}
                            <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0 border">
                                {p.images && p.images.length > 0 ? (
                                    <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-[10px] text-gray-400">IMG</div>
                                )}
                            </div>
                            <div>
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs text-gray-500">Unit: {p.unit} | Tags: {p.tags?.join(', ')}</div>
                            </div>
                        </div>
                        <Button variant="secondary" onClick={() => setEditingItem(p)}>แก้ไข</Button>
                    </div>
                ))}
            </div>

            {editingItem && (
                <EditProductModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSuccess={() => {
                        setEditingItem(null);
                        fetchProducts();
                    }}
                />
            )}
        </div>
    );
}

import { processFiles } from '../lib/imaging';

function EditProductModal({ item, onClose, onSuccess }: any) {
    const [form, setForm] = useState({
        name: item.name,
        unit: item.unit || '',
        tags: item.tags ? item.tags.join(' ') : ''
    });

    // Manage images: 
    // We start with existing images (URLs).
    // User can add new files (Blob) or delete existing/new.
    // Normalized structure: { id: string, url?: string, blob?: Blob, isNew: boolean }
    const [imageList, setImageList] = useState<any[]>(
        (item.images || []).map((url: string) => ({ id: url, url, isNew: false }))
    );
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setProcessing(true);
        try {
            const processed = await processFiles(e.target.files);
            // Append to list
            const newItems = processed.map(p => ({
                id: p.objectUrl, // Use objectUrl as temporary ID
                url: p.objectUrl,
                blob: p.blob,
                fileName: p.fileName, // Pass filename for upload
                isNew: true
            }));
            setImageList(prev => [...prev, ...newItems]);
        } catch (error) {
            console.error(error);
            alert('Error processing images');
        } finally {
            setProcessing(false);
            // Reset input
            e.target.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImageList(prev => prev.filter((_, i) => i !== index));
    };

    async function save() {
        setLoading(true);
        try {
            // Prepare images payload for updateProduct
            // It expects an array of mixed types (string url or object with blob)
            // Logic in api.ts loops: if string -> keep, if object -> upload.

            const imagesPayload = imageList.map(img => {
                if (img.isNew) {
                    return { blob: img.blob, fileName: img.fileName };
                }
                return img.url;
            });

            await updateProduct(item.name, {
                name: form.name,
                unit: form.unit,
                tags: form.tags.split(/\s+/).map((t: string) => t.trim()).filter(Boolean),
                images: imagesPayload
            });
            alert('บันทึกสำเร็จ');
            onSuccess();
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg">แก้ไขสินค้า</h3>

                <div className="grid gap-4">
                    <div>
                        <label className="text-sm font-medium">รูปภาพสินค้า</label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                            {imageList.map((img, idx) => (
                                <div key={idx} className="relative group aspect-square border rounded-lg overflow-hidden bg-gray-50">
                                    <img src={img.url} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="ลบรูป"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ))}

                            {/* Add Button */}
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 aspect-square">
                                {processing ? (
                                    <span className="text-xs text-gray-400">...</span>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="text-[10px] text-gray-400 mt-1">เพิ่มรูป</span>
                                    </>
                                )}
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} disabled={processing} />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">ชื่อสินค้า</label>
                        <Input
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                        <div className="text-xs text-yellow-600 mt-1">
                            * การเปลี่ยนชื่อสินค้าอาจมีผลต่อประวัติย้อนหลัง
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">หน่วย</label>
                        <Input
                            value={form.unit}
                            onChange={e => setForm({ ...form, unit: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Tags (คั่นด้วย comma)</label>
                        <Input
                            value={form.tags}
                            onChange={e => setForm({ ...form, tags: e.target.value })}
                            placeholder="เช่น ไฟฟ้า, เครื่องเขียน"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>ยกเลิก</Button>
                    <Button onClick={save} disabled={loading || processing}>
                        {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
