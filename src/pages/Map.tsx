import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input, Button, Textarea } from '../components/UI';
import { supabase } from '../lib/supabaseClient';
import { listReceipts, getOutHistory, createOut, normalizeImages, type OutHistoryRow } from '../lib/api';
import { ProductDetailModal } from '../components/ProductDetailModal';

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
  images?: string[];
};

// ช่อง 1–25 (Dynamic now)
// const CHANNELS = Array.from({ length: 25 }, (_, i) => String(i + 1));

// --- Rack Map (single zone) ---
function RackMap({ zone, highlight }: { zone: string; highlight?: string }) {
  const [config, setConfig] = useState<{ floors: number, slots: number } | null>(null);

  useEffect(() => {
    supabase.from('shelf_configs').select('*').eq('zone', zone).single()
      .then(({ data }) => {
        if (data) setConfig({ floors: data.floors, slots: data.slots_per_floor });
        else setConfig({ floors: 5, slots: 5 }); // Default fallback
      });
  }, [zone]);

  const totalSlots = config ? config.floors * config.slots : 25;
  const slotsPerFloor = config ? config.slots : 5;

  // Create grid columns style
  const gridStyle = {
    gridTemplateColumns: `repeat(${slotsPerFloor}, minmax(0, 1fr))`
  };

  const channels = Array.from({ length: totalSlots }, (_, i) => String(i + 1));

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">โซน {zone}</h3>
          <span className="text-xs text-gray-500">{totalSlots} ช่อง ({config?.floors} ชั้น x {config?.slots} ล็อค)</span>
        </div>
        <div className="grid gap-2" style={gridStyle}>
          {channels.map((ch) => (
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

// --- Image Preview Modal (Lightbox) ---
function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full flex justify-center">
        <img
          src={src}
          alt="Preview"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
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
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

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
    <>
      <div className="max-w-3xl mx-auto">
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
                  {/* Product Image or Placeholder */}
                  {p.images && p.images.length > 0 ? (
                    <div
                      className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setDetailProduct(p)}
                    >
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                      IMG
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate cursor-pointer hover:underline" onClick={() => setDetailProduct(p)}>{p.name}</div>
                    <div className="text-xs text-gray-600">รวมคงเหลือ {totalQty(p)} ชิ้น</div>
                    <button
                      onClick={() => setDetailProduct(p)}
                      className="text-[10px] text-blue-600 hover:underline mt-1"
                    >
                      ดูรายละเอียด
                    </button>
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

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </>
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return (
    <>
      <div className="max-w-3xl mx-auto">
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
            {product.images && product.images.length > 0 ? (
              <div
                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border bg-gray-50 cursor-zoom-in hover:opacity-90 transition-opacity"
                onClick={() => setPreviewImage(product.images![0])}
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                IMG
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{product.name}</div>
              <div className="text-sm text-gray-600">
                โซน {location.zone} / ช่อง {location.channel} • {location.qty} {location.unit}
              </div>
            </div>
            <Button variant="primary" onClick={() => setShowModal(true)} className="ml-auto">
              เบิก
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

      {/* Lightbox Modal */}
      {previewImage && (
        <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </>
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

      // 1. Fetch In, Out and Products (for tags & master images) concurrently
      // We need 'products' table to get tags and master images.
      const [receiptsData, outHistory, productsData] = await Promise.all([
        listReceipts({ limit: 1000 }),
        getOutHistory(),
        supabase.from('products').select('name, tags, images')
      ]);

      // Map: Product Name -> { tags, images }
      const masterDataMap = new Map<string, { tags: string[], images: string[] }>();
      if (productsData.data) {
        productsData.data.forEach((p: any) => {
          masterDataMap.set(p.name, {
            tags: p.tags || [],
            images: normalizeImages(p.images)
          });
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
        images?: string[];
      }>();

      // Process IN
      receiptsData.items.forEach((item: any) => {
        // DB column is 'product_name', not 'name'
        const pName = item.product_name || item.name;
        if (!pName || !item.zone || !item.channel) return;

        const channelStr = String(item.channel); // Convert to string for consistency
        const key = `${pName.trim()}|${item.zone}|${channelStr}`;
        const existing = stockMap.get(key);
        const qty = Number(item.qty) || 0;
        const imgs = normalizeImages(item.images);

        if (existing) {
          existing.qty += qty;
          if (imgs.length > 0) existing.images = [...(existing.images || []), ...imgs];
        } else {
          stockMap.set(key, {
            name: pName.trim(),
            zone: item.zone,
            channel: channelStr,
            qty: qty,
            unit: item.unit || 'ชิ้น',
            images: imgs
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

        // Master Data (Tags + Master Images)
        const master = masterDataMap.get(entry.name) || { tags: [], images: [] };

        const existingProd = productMap.get(entry.name);
        if (existingProd) {
          existingProd.locations.push(loc);
          // Accumulate transaction images
          if (entry.images && entry.images.length > 0) {
            entry.images.forEach(i => {
              if (!existingProd.images?.includes(i)) {
                existingProd.images?.push(i);
              }
            });
          }
        } else {
          // Initialize with Master Images FIRST
          const initialImages = [...master.images];
          if (entry.images) {
            entry.images.forEach(i => {
              if (!initialImages.includes(i)) initialImages.push(i);
            });
          }

          productMap.set(entry.name, {
            id: entry.name,
            name: entry.name,
            img: '',
            locations: [loc],
            tags: master.tags,
            images: initialImages
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
