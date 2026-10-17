// Cảnh nền của Ma Sói: một bức cắt giấy phía sau cả màn hình. Cảnh chỉ phụ
// thuộc phase (thông tin công khai), nên mọi máy, mọi vai thấy cùng một cảnh
// (plan §2.3, §8 "Bổ sung cho GĐ3" mục 1). Chỉ là dữ liệu hiển thị.

export const SCENE_IDS = [
  'village-night', // sảnh, xem vai, Đêm ①, Đêm ②
  'dawn', // bình minh
  'day', // thảo luận, bỏ phiếu, Thợ săn sau bình minh (GĐ3b)
  'gallows', // kết quả phiếu, Thợ săn sau khi treo (GĐ3b)
  'end-village', // Dân thắng (GĐ3b)
  'end-wolves', // Sói thắng (GĐ3b)
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export const SCENE_NAMES_VI: Record<SceneId, string> = {
  'village-night': 'Làng ban đêm',
  dawn: 'Bình minh',
  day: 'Làng ban ngày',
  gallows: 'Giàn treo',
  'end-village': 'Dân làng thắng',
  'end-wolves': 'Bầy Sói thắng',
};

export interface ScenePalette {
  /** Màu chủ đạo: tô kín màn hình phía sau các lớp (và lúc lớp ảnh đang tải). */
  base: string;
  /** Màu sáng nhất của cảnh (trăng, mặt trời, đèn), để tham khảo. */
  accent: string;
}

/** Hạt hiệu ứng vẽ bằng HTML trên các lớp; toạ độ theo khung cảnh 1600×900. Ẩn khi giảm chuyển động. */
export type ParticleKind =
  | 'twinkle' // đứng yên, nhấp nháy (sao)
  | 'firefly' // bay lượn, nhấp nháy (đom đóm)
  | 'mote' // bụi trôi chậm trong nắng
  | 'flicker'; // quầng sáng run rẩy (cửa sổ, đèn)

export interface ParticleGroup {
  kind: ParticleKind;
  count: number;
  color: string;
  /** Vùng rải hạt: [x0, y0, x1, y1] theo đơn vị cảnh. */
  area: readonly [number, number, number, number];
  /** Đường kính (px); mặc định theo loại. */
  size?: number;
}
