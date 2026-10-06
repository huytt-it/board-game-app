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

## Cảnh (GĐ2)

GĐ2 sẽ thêm `SCENES` vào `registry.ts` theo cùng kiểu `AssetSource`: mỗi lớp của cảnh là
`{ kind: 'svg', Component }` hoặc `{ kind: 'image', src }`, nên thay một lớp cảnh bằng tranh vẽ
cũng chỉ là sửa một dòng.
