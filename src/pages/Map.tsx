import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input, Button, Textarea } from '../components/UI';
import { supabase } from '../lib/supabaseClient';
import { listReceipts, getOutHistory, createOut, type OutHistoryRow } from '../lib/api';

// ------- Card Components -------
const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className, style, ...props
}) => (
  <div
    className={className}
    style={{ border: '1px solid #e5e7eb', borderRadius: 12, ...style }}
    {...props}
  />
);

const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className, style, ...props
}) => (
  <div className={className} style={{ padding: 16, ...style }} {...props} />
);

// --- Issue Modal ---
function IssueModal({
  product,
  location,
  onClose,
  onSuccess
}: {
  product: Product;
  location: Location;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<'consume' | 'borrow'>('consume');
  const [qty, setQty] = useState<number>(1);
  const [requestBy, setRequestBy] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!requestBy.trim()) {
      alert('กรุณาระบุชื่อผู้เบิก');
      return;
    }
    if (qty <= 0 || qty > location.qty) {
      alert('จำนวนไม่ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      await createOut({
        itemName: product.name,
        qty,
        unit: location.unit,
        zone: location.zone,
        channel: location.channel,
        requestBy,
        remark,
        type,
      });
      alert('บันทึกเรียบร้อย');
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
        <h3 className="text-xl font-bold mb-4">
          {type === 'consume' ? 'เบิกสินค้า' : 'ยืมสินค้า'}
        </h3>

        <div className="mb-4 flex gap-4 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setType('consume')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'consume' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            เบิกใช้ (ตัดสต็อก)
          </button>
          <button
            onClick={() => setType('borrow')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'borrow' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            ยืม (คืนภายหลัง)
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">สินค้า</label>
            <div className="font-medium">{product.name}</div>
            <div className="text-xs text-gray-500">
              พิกัด: {location.zone}/{location.channel} (มี {location.qty} {location.unit})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">จำนวน ({location.unit})</label>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              max={location.qty}
              min={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ผู้เบิก (Require)</label>
            <Input
              value={requestBy}
              onChange={(e) => setRequestBy(e.target.value)}
              placeholder="ระบุชื่อผู้เบิก..."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">หมายเหตุ</label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'บันทึก...' : 'ตกลง'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



// --- Data model ---
export type Location = {
  zone: string;
  channel: string; // 1-25
  qty: number;
  unit: string;
};

export type Product = {
  id: string; // use itemName as ID
  name: string;
  img: string; // placeholder if not available
  locations: Location[];
  tags?: string[];
};

// ช่อง 1–25
const CHANNELS = Array.from({ length: 25 }, (_, i) => String(i + 1));

// --- Rack Map (single zone) ---
function RackMap({ zone, highlight }: { zone: string; highlight?: string }) {
  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">โซน {zone}</h3>
          <span className="text-xs text-gray-500">1–25 ช่อง</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {CHANNELS.map((ch) => (
            <div
              key={ch}
              className={`py-4 rounded-xl border text-center text-sm font-medium transition-colors ${highlight === ch
                ? 'bg-yellow-300 border-yellow-500 font-bold'
                : 'bg-gray-50 border-gray-200'
                }`}
            >
              {ch}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Utility: total quantity ---
function totalQty(p: Product) {
  return p.locations.reduce((s, l) => s + l.qty, 0);
}

// --- Search Page ---
function SearchPage({
  products,
  loading,
  onOpenMap,
}: {
  products: Product[];
  loading: boolean;
  onOpenMap: (product: Product, loc: Location) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);

  // Update URL when typing
  useEffect(() => {
    if (query) setSearchParams({ q: query });
    else setSearchParams({});
  }, [query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Product[];
    return products.filter((x) => {
      // Search by Name or Tags
      const matchName = x.name.toLowerCase().includes(q);
      const matchTags = x.tags?.some(tag => tag.toLowerCase().includes(q));
      return matchName || matchTags;
    });
  }, [query, products]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">ค้นหาสินค้า</h2>
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="พิมพ์ชื่อสินค้า..."
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          className="flex-1"
        />
      </div>

      {loading && <p className="text-sm text-gray-500">กำลังคำนวณยอดสต็อก...</p>}
      {!loading && !query && <p className="text-sm text-gray-500">พิมพ์คำค้นเพื่อแสดงรายการ…</p>}
      {!loading && query && results.length === 0 && (
        <p className="text-sm text-red-600">ไม่พบสินค้าในระบบ</p>
      )}

      <div className="space-y-3">
        {results.map((p) => (
          <Card key={p.id} className="hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Placeholder Image */}
                <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                  IMG
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-gray-600">รวมคงเหลือ {totalQty(p)} ชิ้น</div>
                </div>
              </div>

              {/* Locations list */}
              <div className="mt-3 flex flex-wrap gap-2">
                {p.locations.map((loc, idx) => (
                  <Button
                    key={`${p.id}-${loc.zone}-${loc.channel}-${idx}`}
                    onClick={() => onOpenMap(p, loc)}
                    title={`เปิดผังโซน ${loc.zone} ช่อง ${loc.channel}`}
                    variant="secondary"
                    className="text-xs"
                  >
                    โซน {loc.zone} • ช่อง {loc.channel} • {loc.qty} {loc.unit}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Map Page ---
function MapView({
  product,
  location,
  onBack,
  onSwitch,
  onReload,
}: {
  product: Product;
  location: Location;
  onBack: () => void;
  onSwitch: (loc: Location) => void;
  onReload: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">รายละเอียดสินค้า</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack}>
            ย้อนกลับ
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
            IMG
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{product.name}</div>
            <div className="text-sm text-gray-600">
              โซน {location.zone} / ช่อง {location.channel} • {location.qty} {location.unit}
            </div>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)} className="ml-auto">
            ทำรายการเบิก
          </Button>
        </CardContent>
      </Card>

      {/* Map for the focused zone */}
      <RackMap zone={location.zone} highlight={location.channel} />

      {/* Other locations quick switch */}
      {product.locations.length > 1 && (
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">ตำแหน่งอื่นของสินค้านี้:</div>
          <div className="flex flex-wrap gap-2">
            {product.locations
              .filter(
                (l) => l.zone !== location.zone || l.channel !== location.channel
              )
              .map((loc, idx) => (
                <Button
                  key={`${product.id}-alt-${idx}`}
                  onClick={() => onSwitch(loc)}
                  variant="secondary"
                  className="text-xs"
                >
                  โซน {loc.zone} • ช่อง {loc.channel} • {loc.qty} {loc.unit}
                </Button>
              ))}
          </div>
        </div>
      )}

      {showModal && (
        <IssueModal
          product={product}
          location={location}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onReload();
          }}
        />
      )}
    </div>
  );
}

// --- Root ---
export default function InventorySearchAndMap() {
  const [view, setView] = useState<'search' | 'map'>('search');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Fetch In, Out and Products (for tags) concurrently
      // We need 'products' table to get tags.
      const [receiptsData, outHistory, productsData] = await Promise.all([
        listReceipts({ limit: 1000 }),
        getOutHistory(),
        supabase.from('products').select('name, tags')
      ]);

      // Map: Product Name -> Tags
      const tagsMap = new Map<string, string[]>();
      if (productsData.data) {
        productsData.data.forEach((p: any) => {
          if (p.tags && Array.isArray(p.tags)) {
            tagsMap.set(p.name, p.tags);
          }
        });
      }

      // 2. Aggregate Data
      // Map Key: "Name|Zone|Channel" -> { qty, unit, name, zone, channel }
      const stockMap = new Map<string, {
        name: string;
        zone: string;
        channel: string;
        qty: number;
        unit: string;
      }>();

      // Process IN
      receiptsData.items.forEach((item: any) => {
        // DB column is 'product_name', not 'name'
        const pName = item.product_name || item.name;
        if (!pName || !item.zone || item.channel == null) return;

        const channelStr = String(item.channel); // Convert to string for consistency
        const key = `${pName.trim()}|${item.zone}|${channelStr}`;
        const existing = stockMap.get(key);
        const qty = Number(item.qty) || 0;

        if (existing) {
          existing.qty += qty;
        } else {
          stockMap.set(key, {
            name: pName.trim(),
            zone: item.zone,
            channel: channelStr,
            qty: qty,
            unit: item.unit || 'ชิ้น',
          });
        }
      });

      // Process OUT
      outHistory.forEach((item: OutHistoryRow) => {
        if (!item.item_name || !item.zone || !item.channel) return;
        const key = `${item.item_name.trim()}|${item.zone}|${item.channel}`;
        const existing = stockMap.get(key);
        const qty = Number(item.qty) || 0;

        let adjust = 0;
        // Logic fix:
        // 'CONSUME' | 'BORROW' -> Subtract
        // 'RETURN' -> Add (put back to stock)
        // 'LOSS' -> Ignore (stock was already subtracted when Borrowed/Consumed)
        if (item.type === 'RETURN') {
          adjust = qty; // Add back
        } else if (item.type === 'LOSS') {
          adjust = 0; // Ignore
        } else {
          // BORROW / CONSUME
          adjust = -qty;
        }

        if (existing) {
          existing.qty += adjust;
        } else if (adjust !== 0) {
          // Only create entry if non-zero impact (e.g. Return without In shouldn't happen but...)
          // If we return items to a zone that had 0, we should create it.
          // But normally we subtract. If we add to empty?
          stockMap.set(key, {
            name: item.item_name.trim(),
            zone: item.zone,
            channel: item.channel,
            qty: adjust,
            unit: item.unit || 'ชิ้น',
          });
        }
      });

      console.log('StockMap Size:', stockMap.size);
      console.log('StockMap Entries:', Array.from(stockMap.entries()));

      // 3. Group by Product Name
      const productMap = new Map<string, Product>();

      for (const entry of stockMap.values()) {
        if (entry.qty <= 0) continue; // Filter out 0 or negative stock

        const loc: Location = {
          zone: entry.zone,
          channel: entry.channel,
          qty: entry.qty,
          unit: entry.unit,
        };

        const existingProd = productMap.get(entry.name);
        if (existingProd) {
          existingProd.locations.push(loc);
        } else {
          productMap.set(entry.name, {
            id: entry.name,
            name: entry.name,
            img: '',
            locations: [loc],
            tags: tagsMap.get(entry.name) || [] // Attach tags
          });
        }
      }

      setProducts(Array.from(productMap.values()));

      // Fix: Update selectedProduct and selectedLocation if they are currently active
      if (selectedProduct) {
        const updatedProduct = productMap.get(selectedProduct.name);
        if (updatedProduct) {
          setSelectedProduct(updatedProduct);
          // Also check if we need to update selectedLocation (if quantity changed)
          if (selectedLocation) {
            const updatedLoc = updatedProduct.locations.find(
              l => l.zone === selectedLocation.zone && l.channel === selectedLocation.channel
            );
            if (updatedLoc) {
              setSelectedLocation(updatedLoc);
            }
          }
        }
      }

    } catch (err) {
      console.error('Failed to calculate stock data', err);
    } finally {
      setLoading(false);
    }
  };

  return view === 'search' ? (
    <SearchPage
      products={products}
      loading={loading}
      onOpenMap={(product, loc) => {
        setSelectedProduct(product);
        setSelectedLocation(loc);
        setView('map');
      }}
    />
  ) : selectedProduct && selectedLocation ? (
    <MapView
      product={selectedProduct}
      location={selectedLocation}
      onBack={() => setView('search')}
      onSwitch={(loc) => setSelectedLocation(loc)}
      onReload={loadData}
    />
  ) : null;
}
