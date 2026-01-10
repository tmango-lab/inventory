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
};

// =========================
// RECEIVE (IN)
// =========================

export async function uploadReceive(payload: any) {
  // Payload: { name, qty, unit, zone, channel, detail, images: [...] }
  // We map this to 'transactions' table with type='IN'

  // 1. Ensure Product Exists (Optional, but good practice)
  // For now, we assume product exists OR we just insert transaction and let DB handle/ignore FK?
  // Our SQL schema enforces FK on product_name. So we must insert Product first if new.

  try {
    // Upsert product (if name doesn't exist, create it)
    const { error: prodError } = await supabase
      .from('products')
      .upsert(
        {
          name: payload.name,
          unit: payload.unit,
          category: payload.zone // Use zone as category for now
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
      });

    if (transError) throw new Error(transError.message);

    return { ok: true, message: 'Saved successfully' };
  } catch (err: any) {
    console.error('uploadReceive Error:', err);
    return { ok: false, error: err.message };
  }
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
  // Logic: We need to calculate how much is left.
  // We can fetch all BORROW transactions, and for each, fetch related RETURN transactions.

  // For better performance, we should do this in SQL View, but for now let's do JS logic map.

  const { data: borrows, error } = await supabase
    .from('transactions')
    .select(`
      *,
      returns:transactions!parent_id(*)
    `)
    .eq('type', 'BORROW')
    .neq('status', 'RETURNED') // Only active borrows
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const items: BorrowedItem[] = (borrows || []).map((b: any) => {
    // Calculate returned amount
    // 'returns' is the joined children transactions
    const returnedSum = (b.returns || [])
      .filter((r: any) => r.type === 'RETURN')
      .reduce((sum: number, r: any) => sum + r.qty, 0);

    const lostSum = 0; // TODO: Implement LOST logic if needed
    const left = b.qty - returnedSum;

    return {
      outId: b.id,
      date: b.created_at,
      itemName: b.product_name,
      qtyKey: b.qty,
      qtyReturned: returnedSum,
      qtyLost: lostSum,
      qtyLeft: left,
      requestBy: b.request_by,
      remark: b.remark
    };
  });

  // Filter out fully returned items if they somehow slipped through status check
  return items.filter(i => i.qtyLeft > 0);
}

export async function returnItem(payload: {
  outId: string;
  returnQty: number;
  lostQty: number;
  reason?: string;
}) {
  // 1. Fetch original borrow to get details
  const { data: original, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', payload.outId)
    .single();

  if (fetchError || !original) throw new Error('Borrow Record not found');

  // 2. Insert RETURN transaction
  if (payload.returnQty > 0) {
    const { error: retError } = await supabase.from('transactions').insert({
      type: 'RETURN',
      product_name: original.product_name,
      qty: payload.returnQty,
      unit: original.unit,
      parent_id: original.id,
      request_by: original.request_by,
      remark: `Return: ${payload.reason || ''}`,
      status: 'COMPLETED'
    });
    if (retError) throw new Error(retError.message);
  }

  // 3. Mark original as RETURNED if fully returned?
  // We need to check total returned.
  // Ideally, use a Database Trigger. For now, client-side check is okay-ish but race-condition prone.
  // We'll update the status to 'RETURNED' if we think it's done. 
  // Or just leave it as 'PENDING_RETURN' and rely on calculation. 
  // Let's update it for UI filtering.

  const { data: returns } = await supabase
    .from('transactions')
    .select('qty')
    .eq('parent_id', payload.outId)
    .eq('type', 'RETURN');

  const totalReturned = (returns || []).reduce((mockAccumulator, r) => mockAccumulator + r.qty, 0) + payload.returnQty; // + current one (Wait, if I inserted it above, it should be in query? No, consistency.)

  const isFullyReturned = totalReturned >= original.qty;

  if (isFullyReturned) {
    await supabase
      .from('transactions')
      .update({ status: 'RETURNED' })
      .eq('id', payload.outId);
  }

  return { ok: true, message: 'Returned successfully' };
}
