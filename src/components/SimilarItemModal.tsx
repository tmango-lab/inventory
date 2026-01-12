import { Button } from './UI';

export type ProductCandidate = {
  id: string;
  product_name: string;
  similarity_score: number;
};

type SimilarItemModalProps = {
  matches: ProductCandidate[];
  onUseExisting: (item: ProductCandidate) => void;
  onForceCreate: () => void;
  onCancel: () => void;
};

export function SimilarItemModal({
  matches,
  onUseExisting,
  onForceCreate,
  onCancel,
}: SimilarItemModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex gap-3 items-start">
          <div className="p-2 bg-yellow-100 text-yellow-700 rounded-full shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">พบสินค้าที่คล้ายกัน</h3>
            <p className="text-sm text-gray-600 mt-1">
              เราพบสินค้าที่มีชื่อใกล้เคียงกันในระบบ เพื่อป้องกันรายการซ้ำ กรุณาตรวจสอบว่าคุณต้องการใช้รายการเดิมหรือไม่
            </p>
          </div>
        </div>

        {/* List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
          {matches.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition"
            >
              <div>
                <p className="font-medium text-gray-900">{item.product_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    ความเหมือน {(item.similarity_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => onUseExisting(item)}
                className="shrink-0 text-sm"
              >
                ใช้รายการนี้
              </Button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-between items-center gap-3">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            ยกเลิก (แก้ไขชื่อ)
          </button>

          <Button variant="ghost" onClick={onForceCreate} className="text-red-600 hover:bg-red-50 border-red-100">
            ยืนยันสร้างใหม่
          </Button>
        </div>
      </div>
    </div>
  );
}
