# Asset của Ma Sói — icon và cảnh

Mọi icon và mọi lớp cảnh đi qua **một** chỗ: `registry.ts`. Component chỉ gọi theo **tên khái
niệm**, không import file icon trực tiếp:

```tsx
import WwIcon from '../assets/WwIcon';

<WwIcon name="werewolf" />                      // cỡ 1em, màu theo chữ xung quanh
<WwIcon name="dead" size={26} className="text-(--ww-text-3)" />
<WwIcon name="hold" title="Nhấn giữ để xem" />  // có title = có nhãn cho trình đọc màn hình
```

- Icon SVG tô bằng `currentColor`. **Mỗi tên mang đúng một nghĩa** trong cả game; cần nghĩa mới thì
  thêm tên mới.
- Vai → icon: tên vai trong registry trùng với `WwRole` (`werewolf`, `villager`, `seer`, `guard`,
  `witch`, `hunter`).
- Danh sách icon, tác giả, giấy phép: [`CREDITS.md`](./CREDITS.md). Icon dùng chung với Avalon nằm ở
  `src/components/games/shared/icons/`.

## Thay một icon bằng ảnh (ví dụ ảnh AI vẽ)

1. File: tốt nhất là SVG; ảnh bitmap thì **WebP vuông 256×256**, nền trong suốt, chủ thể ở giữa,
   chừa lề ~8 %. Ảnh không đổi màu theo chữ, nên vẽ sẵn màu sáng (icon nằm trên nền đêm).
2. Thả vào `public/werewolf/icons/`, ví dụ `public/werewolf/icons/werewolf.webp`.
3. Sửa **một dòng** trong `ICONS`: `werewolf: { kind: 'image', src: '/werewolf/icons/werewolf.webp', alt: 'Ma Sói' },`
   rồi xoá dòng `import` không còn dùng.
4. Mở `WerewolfPreview` → "Bảng phong cách" và các màn có icon đó ở 375px và 1440px.

## Thêm icon mới từ game-icons.net

Hỏi người dùng trước khi tải (tên, tác giả, URL). Tạo `icons/<ten>.tsx` theo mẫu
(`export default gameIcon('Ten', '<path d>')`, `gameIcon` ở `shared/icons/gameIcon.tsx`), ghi tác giả và
URL ở dòng đầu file, path làm tròn 1 chữ số thập phân; thêm một dòng vào `ICONS` và `CREDITS.md`.

## Cảnh nền

- Mỗi cảnh là một chồng lớp phủ kín khung **1600×900**, neo đáy-giữa (`xMidYMax slice`): điện thoại
  dọc chỉ thấy khoảng x ≈ 590–1010, nên chi tiết chính đặt ở giữa, nửa dưới. Ở điện thoại, vật sáng
  (trăng, mặt trời) không được nằm sau chữ: trăng nằm sau thẻ giữ, mặt trời dưới khung công bố.
- Vẽ bằng các hàm cắt giấy của Avalon (`avalon/scenes/paper.tsx`: `ridge`, `pineRow`, `blobs`,
  `pill`, `box`, `taper`…) và bóng làng chung `scenes/village.ts` (mọi cảnh là cùng một ngôi làng).
  Mọi hình trong một `<path>` quấn cùng chiều (nonzero).
- Phẳng: 3–5 lớp màu đặc, không gradient nặng, không blur, không mảng lớn đỏ (màu phe Sói) hay xanh lá
  (phe Dân). Hạt hiệu ứng ≤ 20 mỗi cảnh, chỉ `transform` / `opacity`, ẩn khi giảm chuyển động.
- Cảnh chọn theo phase (`scenes/getScene.ts`), **không bao giờ theo vai** của người xem.
- Thay một lớp bằng ảnh: `layers: [{ kind: 'image', src: '/werewolf/scenes/dawn-sky.webp' }, svg(DawnHills), …]`
  (ảnh 1600×900 hoặc 3200×1800, cùng khung).
- 6 cảnh: `village-night` (sảnh, xem vai, đêm), `dawn`, `day` (thảo luận, bỏ phiếu, Thợ săn sau bình minh), `gallows` (kết quả phiếu, Thợ săn sau khi treo), `end-village`, `end-wolves`.
- Chuyển động của cảnh (GĐ4): lớp có `motion: 'rise'` (mặt trời của `dawn`, trăng của `village-night`)
  nhô lên sau đồi lúc bước bắt đầu; `intro: 'brighten'` (`dawn`) làm trời sáng dần. Mốc ở
  `scenes/timelines.ts`, bước nào có chuyển động ở `getSceneMotion`. Lớp đổi sang ảnh vẫn giữ được
  `motion` (`{ kind: 'image', src: …, motion: 'rise' }`); vật chuyển động phải nằm riêng một lớp.
- Hạt và sao trang trí **không nằm trên vùng chữ** (tiêu đề, lời mời của màn vào phòng): ở cảnh đêm, sao
  nhấp nháy chỉ ở hai bên trời, ngoài cột giữa.
