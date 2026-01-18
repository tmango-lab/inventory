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

// Helper to upload a single file to Supabase Storage
export async function uploadToStorage(file: Blob, path: string) {
  console.log('Starting upload for:', path, 'Size:', file.size, 'Type:', file.type);
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Supabase Upload Error:', error);
    throw error;
  }

  // Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  console.log('Upload success. Public URL:', publicUrl);
  return publicUrl;
}

export async function uploadReceive(payload: any) {
  // Payload: { name, qty, unit, zone, channel, detail, images: [...], tags: string[] }
  // Images array contains: { base64?, blob?, file?, ... } from imaging.ts

  try {
    console.log('uploadReceive payload:', payload);

    // 1. Upload Images to Storage
    const imageUrls: string[] = [];

    if (payload.images && Array.isArray(payload.images)) {
      console.log('Found images to upload:', payload.images.length);
      for (let i = 0; i < payload.images.length; i++) {
        const item = payload.images[i];
        let blobToUpload: Blob | null = null;
        let filename = `img_${Date.now()}_${i}.jpg`; // Default name

        // Handle various input formats from processFiles/imaging.ts
        if (item.file instanceof Blob) {
          blobToUpload = item.file;
          filename = item.filename || item.file.name;
        } else if (item.blob instanceof Blob) {
          blobToUpload = item.blob;
          filename = item.filename || `image_${i}.jpg`;
        } else if (item.base64) {
          // Fallback for base64: create Blob (less efficient but works)
          const res = await fetch(`data:${item.mimeType};base64,${item.base64}`);
          blobToUpload = await res.blob();
          filename = item.filename || `image_${i}.jpg`;
        } else if (typeof item === 'string' && item.startsWith('blob:')) {
          // If it's a blob url, we might need to fetch it? 
          // Usually processFiles returns objects with .blob. 
          // If we just pass pure File objects?
          if (item instanceof File) {
            blobToUpload = item;
            filename = item.name;
          }
        }

        if (blobToUpload) {
          // Sanitize filename
          const cleanName = filename.replace(/[^a-zA-Z0-9.]/g, '_');

          // FIX: Invalid key error for non-ASCII (Thai) characters.
          // Instead of using product name as folder, use a generic folder + unique timestamp
          // Pattern: uploads/{timestamp}_{random}_{cleanName}
          const path = `uploads/${Date.now()}_${Math.floor(Math.random() * 1000)}_${cleanName}`;

          try {
            console.log(`Processing image ${i}:`, filename, blobToUpload);
            const url = await uploadToStorage(blobToUpload, path);
            imageUrls.push(url);
          } catch (upErr) {
            console.error('Upload failed for', filename, upErr);
            // Verify if we want to abort or continue? Let's continue.
          }
        } else {
          console.warn('No blob found for image item:', item);
        }
      }
    } else {
      console.log('No images in payload');
    }

    console.log('Final Image URLs to save:', imageUrls);

    // Upsert product (if name doesn't exist, create it)
    const { error: prodError } = await supabase
      .from('products')
      .upsert(
        {
          name: payload.name,
          unit: payload.unit,
          category: payload.zone,
          tags: payload.tags,
          // If we receive "new" layout images, maybe we should also append them to product master? 
          // For now, let's keep Receive logic as is, but maybe INIT the images array if empty?
          // We won't touch 'images' here to avoid overwriting Master Images with transaction snapshopts unless intended.
        },
        { onConflict: 'name' }
      );

    if (prodError) throw new Error('Failed to upsert product: ' + prodError.message);


    // 2. Insert Transaction with Image URLs
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
        images: imageUrls,
        status: 'COMPLETED'
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
  const { data, error } = await supabase
    .from('stock_summary')
    .select('*')
    .order('item_name');

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    ITEM_NAME: row.item_name,
    UNIT: row.unit,
    TOTAL_IN: row.total_in,
    TOTAL_OUT: row.total_out + row.total_return,
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
    .neq('type', 'IN')
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
    query = query.neq('type', 'IN');
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
  const { data: borrows, error } = await supabase
    .from('transactions')
    .select(`*, returns:transactions!parent_id(*)`)
    .eq('type', 'BORROW')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (borrows || []).map((b: any) => {
    const returnsList = (b.returns || []) as any[];
    const returnedSum = returnsList.filter((r: any) => r.type === 'RETURN').reduce((sum: number, r: any) => sum + r.qty, 0);
    const lostSum = returnsList.filter((r: any) => r.type === 'LOSS').reduce((sum: number, r: any) => sum + r.qty, 0);
    const left = b.qty - returnedSum - lostSum;
    const lastAction = returnsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    return {
      outId: b.id,
      date: b.created_at,
      itemName: b.product_name,
      qtyKey: b.qty,
      qtyReturned: returnedSum,
      qtyLost: lostSum,
      qtyLeft: left,
      requestBy: b.request_by,
      remark: b.remark,
      zone: b.zone,
      channel: b.channel,
      lastReturnDate: lastAction ? lastAction.created_at : undefined,
      returnerName: lastAction ? lastAction.request_by : undefined,
      lastReturnRemark: lastAction ? lastAction.remark : undefined
    };
  });
}

export async function returnItem(payload: { outId: string; returnQty: number; lostQty: number; returnerName: string; reason?: string; }) {
  const { data: original, error: fetchError } = await supabase.from('transactions').select('*').eq('id', payload.outId).single();
  if (fetchError || !original) throw new Error('Borrow Record not found');

  const { data: previousReturns } = await supabase.from('transactions').select('qty').eq('parent_id', payload.outId).in('type', ['RETURN', 'LOSS']);
  const returnedAlready = (previousReturns || []).reduce((acc, r) => acc + r.qty, 0);
  const remaining = original.qty - returnedAlready;

  if (payload.returnQty + payload.lostQty > remaining) throw new Error(`Exceeds remaining borrowed amount (${remaining} ${original.unit})`);

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
      zone: original.zone,
      channel: original.channel
    });
    if (retError) throw new Error(retError.message);
  }

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
      zone: original.zone,
      channel: original.channel
    });
    if (lossError) throw new Error(lossError.message);
  }

  const totalProcessed = returnedAlready + payload.returnQty + payload.lostQty;
  if (totalProcessed >= original.qty) {
    await supabase.from('transactions').update({ status: 'RETURNED' }).eq('id', payload.outId);
  }

  return { ok: true, message: 'Returned successfully' };
}

// SHELF CONFIG
// =========================

export type ShelfConfig = {
  zone: string;
  floors: number;
  slots_per_floor: number;
};

export async function getShelfConfigs(): Promise<ShelfConfig[]> {
  const { data, error } = await supabase.from('shelf_configs').select('*').order('zone');
  if (error) { console.error('getShelfConfigs error:', error); return []; }
  return (data || []).map((d: any) => ({ zone: d.zone, floors: d.floors, slots_per_floor: d.slots_per_floor }));
}

export async function upsertShelfConfig(config: ShelfConfig) {
  const { error } = await supabase.from('shelf_configs').upsert({ zone: config.zone, floors: config.floors, slots_per_floor: config.slots_per_floor });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteShelfConfig(zone: string) {
  const { error } = await supabase.from('shelf_configs').delete().eq('zone', zone);
  if (error) throw new Error(error.message);
  return { ok: true };
}



// =========================
// PRODUCT MANAGEMENT
// =========================
export async function updateProduct(originalName: string, updates: {
  name?: string;
  unit?: string;
  tags?: string[];
  images?: any[]; // Array of strings (existing URLs) or objects (new blobs)
}) {
  console.log('updateProduct:', originalName, updates);

  if (updates.name && updates.name !== originalName) {
    const { data: existing } = await supabase.from('products').select('name').eq('name', updates.name).single();
    if (existing) throw new Error(`Product name "${updates.name}" already exists.`);
  }

  // Handle Image Uploads if 'images' is present
  let finalImages: string[] | undefined = undefined;

  if (updates.images) {
    finalImages = [];
    for (const img of updates.images) {
      if (typeof img === 'string') {
        // Existing URL
        finalImages.push(img);
      } else if (img.blob || img.file) {
        // New file to upload
        const blob = img.blob || img.file;
        const filename = img.fileName || img.filename || `update_${Date.now()}.jpg`;
        const cleanName = filename.replace(/[^a-zA-Z0-9.]/g, '_');
        const path = `uploads/${Date.now()}_${Math.floor(Math.random() * 1000)}_${cleanName}`;
        try {
          const url = await uploadToStorage(blob, path);
          finalImages.push(url);
        } catch (e) {
          console.error('Failed to upload image in updateProduct', e);
        }
      }
    }
  }

  const { error } = await supabase
    .from('products')
    .update({
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.unit ? { unit: updates.unit } : {}),
      ...(updates.tags ? { tags: updates.tags } : {}),
      ...(finalImages ? { images: finalImages } : {})
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

// =========================
// SYSTEM RESET
// =========================

export async function clearExperimentData() {
  // 1. Delete all transactions
  const { error: transError } = await supabase
    .from('transactions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (safe trick)

  if (transError) throw new Error('Failed to delete transactions: ' + transError.message);

  // 2. Delete all products
  const { error: prodError } = await supabase
    .from('products')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (prodError) throw new Error('Failed to delete products: ' + prodError.message);

  // 3. (Optional) Try to list and delete images
  // For now, we just clear the DB references. Cleaning storage is harder without admin limits.
  // But we can try to empty the 'uploads' folder if possible.
  try {
    const { data: list } = await supabase.storage.from('product-images').list('uploads', { limit: 100 });
    if (list && list.length > 0) {
      const filesToRemove = list.map(x => `uploads/${x.name}`);
      await supabase.storage.from('product-images').remove(filesToRemove);
    }
  } catch (e) {
    console.warn('Failed to clean storage (permissions?)', e);
  }

  return { ok: true };
}
