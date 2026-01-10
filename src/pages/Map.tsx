// src/pages/Map.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button } from '../components/UI';
import { listReceipts, getOutHistory, type OutHistoryRow } from '../lib/api';

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
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Product[];
    return products.filter((x) => x.name.toLowerCase().includes(q));
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
}: {
  product: Product;
  location: Location;
  onBack: () => void;
  onSwitch: (loc: Location) => void;
}) {
  const navigate = useNavigate();

  const handleIssueOut = () => {
    navigate('/issue-out', {
      state: {
        itemName: product.name,
        zone: location.zone,
        channel: location.channel,
        unit: location.unit,
      },
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">ผังชั้นเก็บสินค้า</h2>
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
          <Button variant="primary" onClick={handleIssueOut} className="ml-auto">
            เบิกสินค้านี้
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

      // 1. Fetch In & Out history concurrently
      const [receiptsData, outHistory] = await Promise.all([
        listReceipts({ limit: 1000 }), // Fetch recent 1000 items (adjust limit if needed)
        getOutHistory(),
      ]);

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

        if (existing) {
          existing.qty -= qty;
        } else {
          // If out exists without in (should not happen normally but handle it)
          stockMap.set(key, {
            name: item.item_name.trim(),
            zone: item.zone,
            channel: item.channel,
            qty: -qty,
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
          });
        }
      }

      setProducts(Array.from(productMap.values()));
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
    />
  ) : null;
}
