import { useState, useEffect } from 'react';
import { Button, Input } from '../components/UI';
import {
    getShelfConfigs,
    upsertShelfConfig,
    deleteShelfConfig,
    type ShelfConfig,
    updateProduct,
    clearExperimentData
} from '../lib/api';
import { supabase } from '../lib/supabaseClient';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'shelf' | 'product' | 'danger'>('shelf');

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
    const [secret, setSecret] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleReset() {
        if (secret !== 'ภากร') {
            alert('รหัสลับไม่ถูกต้อง!');
            return;
        }

        if (!confirm('ยืนยันจริงๆ ใช่ไหม? ข้อมูลสินค้าและประวัติทั้งหมดจะหายไปกู้คืนไม่ได้!')) return;

        setLoading(true);
        try {
            await clearExperimentData();
            alert('ล้างข้อมูลเรียบร้อย! ระบบสะอาดเหมือนใหม่');
            setSecret('');
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

            <div className="bg-white p-4 rounded-lg shadow-sm max-w-sm mx-auto space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                    พิมพ์รหัสลับเพื่อยืนยัน
                </label>
                <Input
                    type="password" // or text
                    value={secret}
                    onChange={e => setSecret(e.target.value)}
                    placeholder="รหัสลับ..."
                    className="text-center"
                />
            </div>

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
        setProducts(data || []);

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
                        <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-gray-500">Unit: {p.unit} | Tags: {p.tags?.join(', ')}</div>
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

function EditProductModal({ item, onClose, onSuccess }: any) {
    const [form, setForm] = useState({
        name: item.name,
        unit: item.unit || '',
        tags: item.tags ? item.tags.join(', ') : ''
    });
    const [loading, setLoading] = useState(false);

    async function save() {
        setLoading(true);
        try {
            await updateProduct(item.name, {
                name: form.name,
                unit: form.unit,
                tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            });
            alert('บันทึกสำเร็จ');
            onSuccess();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
                <h3 className="font-bold text-lg">แก้ไขสินค้า</h3>

                <div>
                    <label className="text-sm">ชื่อสินค้า</label>
                    <Input
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                    <div className="text-xs text-yellow-600 mt-1">
                        * การเปลี่ยนชื่อสินค้าอาจมีผลต่อประวัติย้อนหลัง
                    </div>
                </div>

                <div>
                    <label className="text-sm">หน่วย</label>
                    <Input
                        value={form.unit}
                        onChange={e => setForm({ ...form, unit: e.target.value })}
                    />
                </div>

                <div>
                    <label className="text-sm">Tags (คั่นด้วย comma)</label>
                    <Input
                        value={form.tags}
                        onChange={e => setForm({ ...form, tags: e.target.value })}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
                    <Button onClick={save} disabled={loading}>
                        {loading ? 'บันทึก...' : 'บันทึก'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
