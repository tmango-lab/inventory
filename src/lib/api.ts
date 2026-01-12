import { supabase } from './supabaseClient';

// =========================
// TYPES
// =========================

export type ListReceiptsParams = { search?: string; page?: number; limit?: number };

export type OutHistoryRow = {
  out_id: string; // Map from id
  date: string;   // Map from created_at
  item_name: string; // Map from product_name
  qty: number;
  unit: string;
  zone: string;
  channel: string;
  remark?: string;
  images: string[];
  type: string;
  request_by?: string;
};

export type StockRow = {
  ITEM_NAME: string;
  UNIT: string;
  TOTAL_IN: number;
  TOTAL_OUT: number;
  BALANCE: number;
  LAST_IN_DATE: string | null;
  LAST_OUT_DATE: string | null;
  ZONE?: string;
  CHANNEL?: string;
};

export interface OutFormPayload {
  itemName: string;
  qty: number;
  unit: string;
  zone: string;
  channel: string;
  requestBy: string;
  remark: string;
  images?: any[]; // Array of object {base64, ...} or strings
  type: 'consume' | 'borrow';
}

export type BorrowedItem = {
  outId: string;
  date: string;
  itemName: string;
  qtyKey: number; // Borrowed amount
  qtyReturned: number;
  qtyLost: number;
  qtyLeft: number;
  requestBy: string;
  remark: string;
  zone?: string;
  channel?: string;
  // Extra fields for UI
  lastReturnDate?: string;
  returnerName?: string;
  lastReturnRemark?: string;
};

// =========================
// RECEIVE (IN)
// =========================

export async function uploadReceive(payload: any) {
  // Payload: { name, qty, unit, zone, channel, detail, images: [...], tags: string[] }
  // We map this to 'transactions' table with type='IN'

  try {
    // Upsert product (if name doesn't exist, create it)
    // Update: Add 'tags' to products table. Assumes column 'tags' (text[]) exists or we use 'details' or similar.
    // Let's assume we added 'tags' column of type text[] or text.
    // We will coerce payload.tags (array of strings) to PostgreSQL array or just JSONB.
    const { error: prodError } = await supabase
      .from('products')
      .upsert(
        {
          name: payload.name,
          unit: payload.unit,
          category: payload.zone, // Use zone as category for now
          tags: payload.tags // Array of strings
        },
        { onConflict: 'name' }
      );

    if (prodError) throw new Error('Failed to upsert product: ' + prodError.message);

    // 2. Insert Transaction
    const { error: transError } = await supabase
      .from('transactions')
      .insert({
        type: 'IN',
        product_name: payload.name,
        qty: Number(payload.qty),
        unit: payload.unit,
        zone: payload.zone,
        channel: payload.channel,
        remark: payload.detail,
        images: payload.images, // Storing JSONB
        status: 'COMPLETED'
        // We don't store tags in transaction, only in product master
      });

    if (transError) throw new Error(transError.message);

    return { ok: true, message: 'Saved successfully' };
  } catch (err: any) {
    console.error('uploadReceive Error:', err);
    return { ok: false, error: err.message };
  }
}

// =========================
// SIMILARITY CHECK
// =========================

export async function checkSimilarProducts(name: string) {
  // Call the Postgres RPC function
  // We use a threshold of 0.3 as a baseline (can be tuned)
  const { data, error } = await supabase.rpc('check_similar_products', {
    search_term: name,
    threshold: 0.3
  });

  if (error) {
    console.error("Error checking similar products:", error);
    return [];
  }

  return data || [];
}

export async function listReceipts({ search = "", page = 1, limit = 20 }: ListReceiptsParams) {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('type', 'IN')
    .order('created_at', { ascending: false })
    .range(start, end);

  if (search) {
    query = query.ilike('product_name', `%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) throw new Error(error.message);

  return {
    items: data || [],
    total: count || 0,
    page,
    limit
  };
}

// =========================
// STOCK SUMMARY
// =========================

export async function fetchStockSummary(): Promise<StockRow[]> {
  // Query from the View 'stock_summary'
  const { data, error } = await supabase
    .from('stock_summary')
    .select('*')
    .order('item_name');

  if (error) throw new Error(error.message);

  // Map to StockRow interface
  return (data || []).map((row: any) => ({
    ITEM_NAME: row.item_name,
    UNIT: row.unit,
    TOTAL_IN: row.total_in,
    TOTAL_OUT: row.total_out + row.total_return, // Just logic mapping for UI compat
    BALANCE: row.balance,
    LAST_IN_DATE: null,
    LAST_OUT_DATE: row.last_movement,
    ZONE: row.zone || '',
    CHANNEL: row.channel || ''
  }));
}

// =========================
// OUT / HISTORY
// =========================

export async function getOutHistory(): Promise<OutHistoryRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .neq('type', 'IN') // Everything except IN
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    out_id: row.id,
    date: row.created_at,
    item_name: row.product_name,
    qty: row.qty,
    unit: row.unit,
    zone: row.zone || '',
    channel: row.channel || '',
    remark: row.remark,
    images: Array.isArray(row.images) ? row.images.map((img: any) => img.base64 || '') : [],
    type: row.type,
    request_by: row.request_by
  }));
}

export type HistoryFilterType = 'ALL' | 'IN' | 'OUT';

export async function getAllHistory(filter: HistoryFilterType = 'ALL') {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter === 'IN') {
    query = query.eq('type', 'IN');
  } else if (filter === 'OUT') {
    query = query.neq('type', 'IN'); // OUT, BORROW, CONSUME, RETURN
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.created_at,
    itemName: row.product_name,
    qty: row.qty,
    unit: row.unit,
    type: row.type,
    zone: row.zone,
    channel: row.channel,
    remark: row.remark,
    images: Array.isArray(row.images) ? row.images.map((img: any) => img.base64 || '') : [],
    requestBy: row.request_by
  }));
}

export async function createOut(payload: OutFormPayload) {
  try {
    // type: 'consume' | 'borrow' -> Uppercase for DB
    const dbType = payload.type.toUpperCase() === 'BORROW' ? 'BORROW' : 'CONSUME';
    const status = dbType === 'BORROW' ? 'PENDING_RETURN' : 'COMPLETED';

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        type: dbType,
        product_name: payload.itemName,
        qty: payload.qty,
        unit: payload.unit,
        zone: payload.zone,
        channel: payload.channel,
        request_by: payload.requestBy,
        remark: payload.remark,
        images: payload.images || [],
        status: status
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { ok: true, outId: data.id, message: 'Saved' };

  } catch (e: any) {
    console.error('createOut Error:', e);
    throw new Error(e.message || "Failed to save");
  }
}

// =========================
// BORROW / RETURN
// =========================

export async function getBorrowedList(): Promise<BorrowedItem[]> {
  // Fetch transactions where type='BORROW'
  const { data: borrows, error } = await supabase
    .from('transactions')
    .select(`
      *,
      returns:transactions!parent_id(*)
    `)
    .eq('type', 'BORROW')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const items: BorrowedItem[] = (borrows || []).map((b: any) => {
    // Calculate returned amount
    const returnsList = (b.returns || []) as any[];

    const returnedSum = returnsList
      .filter((r: any) => r.type === 'RETURN')
      .reduce((sum: number, r: any) => sum + r.qty, 0);

    const lostSum = returnsList
      .filter((r: any) => r.type === 'LOSS')
      .reduce((sum: number, r: any) => sum + r.qty, 0);

    const left = b.qty - returnedSum - lostSum;

    // Get latest return/loss info
    // Sort descending by date
    const lastAction = returnsList
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    return {
      outId: b.id,
      date: b.created_at, // Borrow Date
      itemName: b.product_name,
      qtyKey: b.qty,
      qtyReturned: returnedSum,
      qtyLost: lostSum,
      qtyLeft: left,
      requestBy: b.request_by, // Borrowed By
      remark: b.remark, // Borrow Remark

      // Location Info
      zone: b.zone,
      channel: b.channel,

      // New Fields from latest return action
      lastReturnDate: lastAction ? lastAction.created_at : undefined,
      returnerName: lastAction ? lastAction.request_by : undefined,
      lastReturnRemark: lastAction ? lastAction.remark : undefined
    };
  });

  return items;
}

export async function returnItem(payload: {
  outId: string;
  returnQty: number;
  lostQty: number;
  returnerName: string; // New field
  reason?: string;
}) {
  // 1. Fetch original borrow to get details
  const { data: original, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', payload.outId)
    .single();

  if (fetchError || !original) throw new Error('Borrow Record not found');

  // Validate quantities
  const { data: previousReturns } = await supabase
    .from('transactions')
    .select('qty')
    .eq('parent_id', payload.outId)
    .in('type', ['RETURN', 'LOSS']);

  const returnedAlready = (previousReturns || []).reduce((acc, r) => acc + r.qty, 0);
  const remaining = original.qty - returnedAlready;

  if (payload.returnQty + payload.lostQty > remaining) {
    throw new Error(`Exceeds remaining borrowed amount (${remaining} ${original.unit})`);
  }

  // 2. Insert RETURN transaction
  if (payload.returnQty > 0) {
    const { error: retError } = await supabase.from('transactions').insert({
      type: 'RETURN',
      product_name: original.product_name,
      qty: payload.returnQty,
      unit: original.unit,
      parent_id: original.id,
      request_by: payload.returnerName,
      remark: payload.reason || 'Returned',
      status: 'COMPLETED',
      // CRITICAL FIX: Save Zone/Channel so Map calculation works
      zone: original.zone,
      channel: original.channel
    });
    if (retError) throw new Error(retError.message);
  }

  // 3. Insert LOSS transaction
  if (payload.lostQty > 0) {
    const { error: lossError } = await supabase.from('transactions').insert({
      type: 'LOSS',
      product_name: original.product_name,
      qty: payload.lostQty,
      unit: original.unit,
      parent_id: original.id,
      request_by: payload.returnerName,
      remark: payload.reason || 'No reason specified',
      status: 'COMPLETED',
      // CRITICAL FIX: Save Zone/Channel (though Loss doesn't return to stock, consistent data is good)
      zone: original.zone,
      channel: original.channel
    });
    if (lossError) throw new Error(lossError.message);
  }

  // 4. Update parent status if fully resolved
  const totalProcessed = returnedAlready + payload.returnQty + payload.lostQty;

  if (totalProcessed >= original.qty) {
    await supabase
      .from('transactions')
      .update({ status: 'RETURNED' })
      .eq('id', payload.outId);
  }

  return { ok: true, message: 'Returned successfully' };
}

// =========================
// SHELF CONFIG
// =========================

export type ShelfConfig = {
  zone: string;
  floors: number;
  slots_per_floor: number;
};

export async function getShelfConfigs(): Promise<ShelfConfig[]> {
  const { data, error } = await supabase
    .from('shelf_configs')
    .select('*')
    .order('zone');

  // If table doesn't exist yet, return empty or default?
  // Supabase throws error if table missing.
  if (error) {
    console.error('getShelfConfigs error:', error);
    return [];
  }

  return (data || []).map((d: any) => ({
    zone: d.zone,
    floors: d.floors,
    slots_per_floor: d.slots_per_floor
  }));
}

export async function upsertShelfConfig(config: ShelfConfig) {
  const { error } = await supabase
    .from('shelf_configs')
    .upsert({
      zone: config.zone,
      floors: config.floors,
      slots_per_floor: config.slots_per_floor
    });

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteShelfConfig(zone: string) {
  const { error } = await supabase
    .from('shelf_configs')
    .delete()
    .eq('zone', zone);

  if (error) throw new Error(error.message);
  return { ok: true };
}

// =========================
// PRODUCT MANAGEMENT
// =========================

export async function updateProduct(originalName: string, updates: { name?: string; unit?: string; tags?: string[] }) {
  if (updates.name && updates.name !== originalName) {
    const { data: existing } = await supabase.from('products').select('name').eq('name', updates.name).single();
    if (existing) throw new Error(`Product name "${updates.name}" already exists.`);
  }

  const { error } = await supabase
    .from('products')
    .update({
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.unit ? { unit: updates.unit } : {}),
      ...(updates.tags ? { tags: updates.tags } : {}),
    })
    .eq('name', originalName);

  if (error) throw new Error(error.message);

  if (updates.name && updates.name !== originalName) {
    await supabase.from('transactions')
      .update({ product_name: updates.name })
      .eq('product_name', originalName);
  }

  return { ok: true };
}
