# Asset của Avalon — icon (và cảnh, từ GĐ2)

Mọi icon trong game Avalon đi qua **một** chỗ: `registry.ts`. Component chỉ gọi icon theo
**tên khái niệm**, không bao giờ import file icon trực tiếp:

```tsx
import AvIcon from '../assets/AvIcon';

<AvIcon name="leader" />                     // cỡ 1em, màu theo chữ xung quanh
<AvIcon name="quest-success" size={48} />    // 48px
<AvIcon name="clock" className="text-amber-300" />
<AvIcon name="unknown" title="Merlin hay Morgana?" />  // có title = có nhãn cho trình đọc màn hình
```

- `size`: số (px) hoặc chuỗi CSS. Mặc định `1em`, nên icon đặt trong câu tự lớn theo cỡ chữ.
- Icon SVG tô bằng `currentColor`: đổi màu bằng class `text-*` như chữ.
- Muốn ẩn/hiện icon theo breakpoint thì bọc trong `<span className="hidden sm:inline">`
  (class `.av-icon` trong `avalon.css` luôn đặt `display: inline-block`).
- **Mỗi tên mang đúng một nghĩa** trong toàn game (ví dụ `leader` chỉ là token Leader, không dùng
  cho Mordred hay thanh từ chối). Cần nghĩa mới thì thêm tên mới vào registry.
- Vai → icon: `ROLE_ICON_NAME` trong `../presentation.ts`. Phe → icon: `TEAM_ICON_NAME`.
- Huy hiệu vai (khiên + icon, viền màu phe): `ui/RoleEmblem.tsx`. Avatar người chơi:
  `ui/PlayerAvatar.tsx`.

Danh sách icon, tác giả và giấy phép: [`CREDITS.md`](./CREDITS.md).

## Thay một icon bằng ảnh (ví dụ ảnh AI vẽ)

1. **Chuẩn bị file.**
   - Tốt nhất là **SVG**. Nếu là ảnh bitmap: **WebP vuông 256×256** (hoặc 128×128 cho icon chỉ
     hiện nhỏ), **nền trong suốt**, chủ thể nằm giữa, chừa lề khoảng 8%.
   - Ảnh **không** đổi màu theo `currentColor` như SVG, nên hãy vẽ sẵn màu cuối cùng. Icon nằm
     trên nền tối (giấy da / gỗ / đêm), nên chủ thể cần sáng hoặc có viền sáng.
   - Icon vai (`merlin`, `percival`…) được đặt trong khung khiên của `RoleEmblem`, chiếm khoảng
     55% bề ngang: tránh chi tiết quá nhỏ.
   - Mỗi tên một nghĩa: ảnh cho `leader` phải khác hẳn ảnh cho `mordred`.
2. **Thả file** vào `public/avalon/icons/`, ví dụ `public/avalon/icons/merlin.webp`.
3. **Sửa đúng một dòng** trong `registry.ts`:

   ```ts
   // trước
   merlin: svg(PointyHat),
   // sau
   merlin: { kind: 'image', src: '/avalon/icons/merlin.webp', alt: 'Merlin' },
   ```

4. Xoá dòng `import PointyHat …` không còn dùng (ESLint sẽ nhắc), và nếu không còn dùng file
   `icons/pointy-hat.tsx` thì xoá luôn cả file lẫn dòng của nó trong `CREDITS.md`.
5. Mở **Xem trước** ở lobby, đi qua các cảnh có icon đó ở 375px và 1440px.

Muốn quay lại SVG thì đảo ngược bước 3.

## Thêm một icon mới từ game-icons.net

1. Hỏi người dùng trước khi tải (tên icon, tác giả, URL).
2. Tạo `icons/<ten-icon>.tsx` theo mẫu các file sẵn có: `export default gameIcon('TenIcon', '<path d>')`,
   ghi tác giả và URL ở dòng chú thích đầu file. Path nên làm tròn còn 1 chữ số thập phân.
3. Thêm một dòng vào `ICONS` trong `registry.ts` và một dòng vào `CREDITS.md`.

## Cảnh nền (GĐ2)

Cảnh là nền cắt giấy phía sau toàn bộ màn hình Avalon. **Chọn cảnh nào** là việc của
`../scenes/getScene.ts` (hàm thuần của `state`, mọi máy như nhau); **vẽ cảnh** là việc của
`../scenes/SceneBackdrop.tsx`; còn **cảnh gồm những lớp gì** nằm trong `SCENES` ở `registry.ts`:

```ts
forest: {
  layers: [svg(ForestSky), svg(ForestFar), svg(ForestMist), svg(ForestNear)], // xa → gần
  palette: FOREST_PALETTE,      // màu nền (base) + màu sáng nhất (accent)
  particles: FOREST_PARTICLES,  // đom đóm, tia lửa… (≤ 20 hạt / cảnh)
},
mountain: placeholder('#1f2833', '#e8eef4'), // chưa vẽ: chỉ một nền phẳng màu base
```

### Khung hình (mọi lớp, SVG hay ảnh, đều theo khung này)
- Mỗi lớp là một bức **1600×900**, phủ kín màn hình và **neo đáy-giữa** (giống SVG
  `preserveAspectRatio="xMidYMax slice"`).
- Điện thoại dọc (375×812) thấy **đủ chiều cao** nhưng chỉ khoảng **420 đơn vị giữa** của bề
  ngang (x ≈ 590–1010). Desktop 1440×900 thấy x ≈ 80–1520. Vì vậy chi tiết chính (lâu đài,
  đống lửa, lối mòn…) đặt ở **giữa, nửa dưới**; hai bên chỉ là phần thêm cho màn hình rộng.
- Cảnh chỉ là nền: tối, tương phản thấp, không mảng lớn xanh lam / đỏ bão hoà (màu đó dành cho
  phe). `SceneBackdrop` tự phủ thêm vignette + một lớp tối để chữ phía trên luôn đọc được.

### Thay một lớp (hoặc cả cảnh) bằng tranh vẽ
1. Vẽ / xuất ảnh đúng khung **1600×900** (hoặc 3200×1800 cho màn hình nét), **WebP**, các lớp
   phía trước nên có **nền trong suốt** để nhìn thấy lớp phía sau. Muốn thay cả cảnh bằng một
   bức duy nhất thì dùng một ảnh đặc cho lớp đầu tiên và bỏ các lớp còn lại.
2. Thả file vào `public/avalon/scenes/`, ví dụ `public/avalon/scenes/forest-near.webp`.
3. Sửa **một dòng** trong `SCENES`:

   ```ts
   // trước
   layers: [svg(ForestSky), svg(ForestFar), svg(ForestMist), svg(ForestNear)],
   // sau: chỉ thay lớp gần nhất
   layers: [svg(ForestSky), svg(ForestFar), svg(ForestMist), { kind: 'image', src: '/avalon/scenes/forest-near.webp' }],
   ```
4. Mở **Xem trước** → ô **Cảnh** → chọn cảnh đó, xem ở 375px và 1440px.

Ảnh được vẽ bằng `<img class="object-cover object-bottom">` trên cùng khung, nên ảnh khác tỉ lệ
16:9 vẫn phủ kín (bị cắt hai bên / phía trên). Hạt hiệu ứng (`particles`) giữ nguyên, toạ độ của
chúng tính theo khung 1600×900 nên vẫn khớp với tranh mới; muốn bỏ thì xoá dòng `particles`.

### Vẽ thêm cảnh SVG (GĐ2b)
- Mỗi cảnh một file `../scenes/layers/<id>.tsx`, xuất 3–5 lớp bằng `sceneLayer(tên, <>…</>)`
  và `PALETTE`, `PARTICLES`. Màu theo Phụ lục C của `docs/ux-plan.md`.
- Hình dựng sẵn trong `../scenes/paper.tsx`: `ridge` (đồi / mặt đất), `pineRow` / `pine` (hàng
  thông), `blobs` (tán cây, mây), `archPath` (vòm Gothic), `scatter` (sao). Tất cả có seed nên
  máy chủ và trình duyệt vẽ giống hệt nhau.
- **Mọi hình vẽ theo chiều kim đồng hồ** trong cùng một `<path>`; hình lật gương (ngược chiều)
  thì để ở `<path>` riêng, nếu không chỗ chồng nhau sẽ bị thủng (luật tô `nonzero`).
- Đăng ký trong `SCENES` (bỏ `placeholder`) — tên trong `../scenes/types.ts`.
