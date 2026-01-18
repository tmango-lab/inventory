import { useState } from 'react';
import { Button } from './UI';

type ProductDetailModalProps = {
    product: {
        name: string;
        images?: string[];
        tags?: string[];
        // We can add more fields if available in the product object
        // But currently the Product type in Map.tsx has: id, name, img, locations, tags, images
        locations: {
            zone: string;
            channel: string;
            qty: number;
            unit: string;
        }[];
    };
    onClose: () => void;
};

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const images = product.images && product.images.length > 0 ? product.images : [];
    const hasImages = images.length > 0;

    const currentImageSrc = hasImages
        ? (images[activeImageIndex].startsWith('http') ? images[activeImageIndex] : `data:image/jpeg;base64,${images[activeImageIndex]}`)
        : null;

    const totalQty = product.locations.reduce((acc, loc) => acc + loc.qty, 0);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header / Image Area */}
                <div className="relative bg-gray-100 aspect-video flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {currentImageSrc ? (
                        <img
                            src={currentImageSrc}
                            alt={product.name}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>No Image</span>
                        </div>
                    )}

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 z-20 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 backdrop-blur transition-all shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Image Navigation Dots */}
                    {images.length > 1 && (
                        <>
                            {/* Left Arrow */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
                                }}
                                className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center bg-transparent hover:bg-black/5 transition-colors group"
                            >
                                <div className="p-2 bg-white/80 rounded-full shadow-sm group-hover:bg-white text-gray-800">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Right Arrow */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveImageIndex((prev) => (prev + 1) % images.length);
                                }}
                                className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center bg-transparent hover:bg-black/5 transition-colors group"
                            >
                                <div className="p-2 bg-white/80 rounded-full shadow-sm group-hover:bg-white text-gray-800">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Dots */}
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 pointer-events-none">
                                {images.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Allow dot clicking if we enable pointer-events
                                            setActiveImageIndex(idx);
                                        }}
                                        className={`w-2 h-2 rounded-full transition-all pointer-events-auto ${idx === activeImageIndex ? 'bg-white w-4 shadow' : 'bg-white/50 hover:bg-white/80'
                                            }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div className="p-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">{product.name}</h2>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {product.tags && product.tags.length > 0 ? (
                            product.tags.map((tag, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                                    #{tag}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400 italic">ไม่มีแท็ก</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <label className="text-xs text-gray-500 uppercase font-semibold">คงเหลือรวม</label>
                            <div className="text-xl font-bold text-gray-800">{totalQty} {product.locations[0]?.unit || 'ชิ้น'}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <label className="text-xs text-gray-500 uppercase font-semibold">จำนวนตำแหน่งเก็บ</label>
                            <div className="text-xl font-bold text-gray-800">{product.locations.length} จุด</div>
                        </div>
                    </div>

                    <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">ตำแหน่งเก็บสินค้า</h3>
                    <div className="space-y-2">
                        {product.locations.map((loc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                        {loc.zone}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">ช่อง {loc.channel}</div>
                                        <div className="text-xs text-gray-500">โซน {loc.zone}</div>
                                    </div>
                                </div>
                                <div className="font-semibold text-gray-700">
                                    {loc.qty} <span className="text-xs font-normal text-gray-500">{loc.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <Button onClick={onClose} variant="secondary" className="w-full sm:w-auto">ปิดหน้าต่าง</Button>
                </div>
            </div>
        </div>
    );
}
