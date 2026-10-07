# Kế hoạch UX/UI, cảnh truyện & animation — Avalon

> Tài liệu điều phối. Session "nhạc trưởng" viết và duy trì file này; mỗi giai đoạn (GĐ) do một session thực thi riêng làm theo đúng phạm vi bên dưới.
> Số dòng được trích theo commit `c74fcbad` (trên `dev`). Sau GĐ0 file sẽ bị tách nên các GĐ sau tra theo **tên hàm/component**, không theo số dòng.

---

## 0. Cách làm việc

### Vai trò
- **Nhạc trưởng** (session gốc): giữ kế hoạch, review kết quả từng GĐ, cập nhật file này và memory, chỉnh brief cho GĐ kế tiếp.
- **Người thực thi** (session mới, có thể là model khác): làm **một** GĐ, đúng phạm vi.

### Quy trình cho người thực thi
1. Đọc hết file này, nhất là mục 2 (Luật) và mục của GĐ được giao. Đọc `AGENTS.md`: bản Next.js trong repo có thay đổi lớn, nên đọc hướng dẫn trong `node_modules/next/dist/docs/` trước khi dùng API của Next (ví dụ `next/font`).
2. Làm trực tiếp trên branch tích hợp **`dev-avalon-uxui`** (tách từ `dev`): `git checkout dev-avalon-uxui`. Kiểm tra working tree sạch và ghi lại commit hiện tại (`git rev-parse --short HEAD`): đó là điểm bắt đầu của GĐ.
3. Chỉ làm trong phạm vi của GĐ. Nếu thấy cần sửa logic-core (mục 2.1) hoặc cần thêm dependency: **dừng lại và hỏi người dùng**, không tự làm.
4. Chạy các bước ở mục 9 (Kiểm thử).
5. Cập nhật mục 10 (Nhật ký tiến độ): trạng thái, commit bắt đầu → commit kết thúc, các điểm lệch kế hoạch, việc còn dở.
6. Commit lên `dev-avalon-uxui` với message `feat(avalon-ux): GĐ<N> — <tóm tắt>`. Nếu chia nhỏ thì mọi commit đều mang tiền tố `GĐ<N>`. **Không push**, trừ khi người dùng bảo.
7. Báo cáo cho người dùng: đã làm gì, lệch kế hoạch ở đâu, kết quả kiểm thử (kèm ảnh chụp 375px và 1440px nếu có), và khoảng commit để nhạc trưởng review (`git diff <đầu>..<cuối>`).

Nhạc trưởng review theo khoảng commit đó. Nếu một GĐ hỏng thì dùng `git revert`, không viết lại lịch sử. Các GĐ **làm tuần tự**, không song song, vì cùng sửa `RoundTable`, các section và `avalon.css`. Khi xong (hoặc tới mốc người dùng muốn), `dev-avalon-uxui` được merge vào `dev`, rồi mở PR `dev` → `main` như quy trình thường lệ.

### Prompt mẫu để mở session thực thi
```
Bạn là người thực thi GĐ<N> của kế hoạch src/components/games/avalon/docs/ux-plan.md.
Đọc toàn bộ file đó (bắt buộc mục 0 "Cách làm việc", mục 2 "Luật" và mục GĐ<N>) và AGENTS.md,
rồi làm đúng phạm vi GĐ<N> trên branch dev-avalon-uxui. Không sửa logic-core. Không thêm dependency nếu chưa hỏi.
Xong thì chạy kiểm thử ở mục 9, cập nhật mục 10 (Nhật ký tiến độ), commit (không push)
và báo cáo: đã làm gì, lệch kế hoạch chỗ nào, kết quả kiểm thử, khoảng commit để review.
```
Gợi ý model: GĐ0 (refactor cơ học, cần cẩn thận) dùng Sonnet hoặc Opus đều được. GĐ1–GĐ2 (thiết kế, vẽ SVG) nên dùng Opus. GĐ3–GĐ6 dùng Opus hoặc Sonnet.

---

## 1. Quyết định đã chốt (người dùng, 2026-10-05)

| Chủ đề | Quyết định |
|---|---|
| Phong cách hình ảnh | **Cắt giấy vector nhiều lớp** (SVG phẳng, xếp lớp). Có thể thay bằng tranh vẽ sau này |
| Cảnh theo Quest | Mỗi Quest một địa điểm. **Thứ tự random mỗi ván**, nhưng mọi máy phải giống nhau |
| Icon | Trước mắt dùng **game-icons.net** (CC BY 3.0, cần ghi credit). Sau này muốn **nhờ AI vẽ rồi thay vào linh hoạt**, nên mọi icon và cảnh phải đi qua một registry có thể nhận cả SVG lẫn file ảnh |
| Phiếu bầu | **Ẩn**: chỉ hiện tổng số, không lộ ai bầu gì |
| Thời gian xem kết quả | Giữ **8 giây** (`team-vote-result`, `quest-result`) |
| Âm thanh | **Không** thêm âm thanh |
| Rung máy | Chưa bàn tới. Mặc định **không rung**; nếu muốn thêm thì hỏi người dùng (không bao giờ rung vào ban đêm) |

---

## 2. Luật bất di bất dịch

### 2.1 Không sửa logic-core
- `useAvalon.ts`: toàn bộ.
- `types.ts`: `AvalonGameState`, `PHASE_TIMEOUTS_MS`, các type.
- `constants.ts`: các hằng **luật chơi** (`ROLE_TEAM`, `TEAM_DISTRIBUTION`, `QUEST_TEAM_SIZES`, `questNeedsTwoFails`, `REQUIRED_ROLES`, `ALL_OPTIONAL_ROLES`, `VOTE_TRACK_LIMIT`, `QUESTS_TO_WIN`, `PLAYER_COUNTS`).
  - **Được** đổi hoặc chuyển các map hiển thị: `ROLE_ICONS`, `ROLE_NAMES_VI`, `ROLE_DESC_VI`, `TEAM_NAME_VI`.
- `AvalonBoard.tsx`: không sửa khối auto-progression (`arm` + các `useEffect` ở dòng 129–246) và logic của các handler (`handleStartGame`, `handleNewGame`, `handleRoleRevealDone`…).
  - **Được** sửa JSX, props truyền xuống, phần render lobby, `Modal`, banner.
- Không đổi schema Firestore, không thêm field vào `gameState`.

### 2.2 Animation là hàm của state
- Mọi animation chỉ được tính từ `state`, `state.phaseStartedAt` và `serverNow()`, thông qua hook `usePhaseTimeline` (GĐ0). Như vậy mọi máy đồng bộ; reload giữa chừng thì nhảy đúng khung; mount lại **không phát lại**.
- Không dùng `setTimeout` tính từ lúc mount cho animation có ý nghĩa chung.
- Chỉ được dùng state cục bộ phía client (`useRef` giữ giá trị trước) cho hiệu ứng "chuyển tiếp" mang tính trang trí, ví dụ token bay khi `currentLeaderId` đổi. Reload thì bỏ qua hiệu ứng đó.

### 2.3 Không chặn gameplay
- Animation phải xong trước khi hết giờ phase (xem bảng ngân sách ở Phụ lục D).
- Không khoá nút hành động trong các phase có hạn giờ. Overlay dài cho phép chạm để bỏ qua.

### 2.4 Không lộ thông tin ẩn
- **Nhìn từ xa, màn hình mọi người phải giống nhau.** Không tô nền theo phe của người xem. Ban đêm ai cũng thấy cùng một lớp phủ, người có vai phải nhấn giữ mới xem. Không rung hay nháy riêng cho ai vào ban đêm.
- Thứ tự lật lá Quest không được gắn với người chơi. DB chỉ có `failCount`, nên dựng chuỗi lá từ số đếm rồi xáo theo seed.
- Phiếu bầu vẫn ẩn (mục 1).

### 2.5 Hiệu năng và trợ năng
- Mobile-first: kiểm tra ở 375×812 trước, rồi 1440×900.
- Chỉ animate `transform` và `opacity`. Hạt hiệu ứng ≤ 20 mỗi cảnh. Mỗi cảnh SVG khoảng ≤ 30KB.
- Tôn trọng `prefers-reduced-motion`: bỏ chuyển động, hiện ngay trạng thái cuối.
- Chữ trên cảnh nền phải đủ tương phản: khung nội dung dùng lớp kính tối.

### 2.6 Phạm vi
- Chỉ sửa trong `src/components/games/avalon/**`. Ngoại lệ duy nhất: GĐ4 được rẽ nhánh `gameType === 'avalon'` trong `src/app/room/[gameType]/[roomId]/page.tsx`.
- Không sửa `globals.css` (dùng chung cho game khác); CSS mới của Avalon để trong `avalon.css`.
- Không đụng các game khác (Clocktower, Sheriff, Shadow Hunters).
- Không thêm dependency nếu chưa hỏi người dùng. Dùng CSS keyframes, Tailwind v4 và React.
- Toàn bộ chữ hiển thị bằng tiếng Việt. Font mới phải có bộ ký tự `vietnamese`.

---

## 3. Bản đồ code hiện tại (commit `c74fcbad`)

| File | Vai trò |
|---|---|
| `useAvalon.ts` | **Core.** State machine, transaction CAS (`advance`, `updateInPhase`), xoay Leader theo `seatOrder` |
| `AvalonBoard.tsx` | Timer tự chuyển phase (core); render lobby; chọn màn theo phase; truyền props xuống `PlayerPanel` |
| `PlayerPanel.tsx` (2982 dòng) | Toàn bộ UI trong ván: top bar, layout 3 cột, khoảng 20 section theo phase, overlay ám sát |
| `RoundTable.tsx` | Bàn tròn trong ván: ghế, ô Quest ở tâm, thanh từ chối, popup chi tiết Quest |
| `LobbyRoundTable.tsx` | Bàn tròn ở lobby |
| `RoleReveal.tsx` | Màn lộ vai (hiện tại chỉ có emoji nhấp nháy rồi hiện thẻ) |
| `RoleCard.tsx`, `RolePreviewPopup.tsx`, `RoleGuide.tsx`, `RoomSettings.tsx` | Các modal |
| `AvalonPreview.tsx` | **Bộ dựng cảnh giả** cho từng phase (nút "👁️ Xem trước" ở lobby). Đây là công cụ chính để làm UI |
| `avalon.css` | Keyframes của Avalon |
| `QuestTrack.tsx`, `VoteTrack.tsx` | **Code chết**, không còn được import ở đâu |

Thứ tự `players` mà `AvalonBoard` nhận được là theo `joinedAt` (`firebaseAdapter.ts:32`). `useAvalon` có trả về `gamePlayers` đã xếp theo `seatOrder` (thứ tự ghế được random lúc bắt đầu ván), nhưng `AvalonBoard` lại đang truyền `players` (theo thứ tự vào phòng) xuống `PlayerPanel`. Xem lỗi B1.

---

## 4. Kiến trúc đích (sau GĐ0–GĐ2)

```
src/components/games/avalon/
  PlayerPanel.tsx            # chỉ còn layout + top bar + switch phase
  panel/                     # các section, tách từ PlayerPanel
    shared.tsx               # PhaseChip, TokenBadges, RoleLineChip, RoleIntroCard, WaitingCard…
    PlayerRoster.tsx
    LineupPreviewSection.tsx  RoleRevealWaitingSection.tsx  NightSections.tsx
    TeamBuildSection.tsx  TeamVoteSection.tsx  TeamVoteResultSection.tsx
    QuestPlaySection.tsx  QuestResultSection.tsx  DiscussionSection.tsx
    LadySection.tsx  AssassinSection.tsx  EndSection.tsx  AssassinRevealOverlay.tsx
  hooks/
    usePhaseClock.ts         # đồng hồ đếm ngược theo giờ server (GĐ0)
    usePhaseTimeline.ts      # các mốc animation theo phaseStartedAt (GĐ0)
    useReducedMotion.ts      # (GĐ0)
  table/
    seatPosition.ts          # toạ độ ghế (tách từ RoundTable) (GĐ0)
  assets/                    # GĐ1
    registry.ts              # tên → nguồn (SVG component | file ảnh)
    AvIcon.tsx
    icons/*.tsx              # SVG từ game-icons.net, fill=currentColor
    CREDITS.md  README.md    # README hướng dẫn thay icon/cảnh bằng ảnh AI
  ui/                        # GĐ1
    PlayerAvatar.tsx  RoleEmblem.tsx  GlassPanel.tsx  ConfirmDialog.tsx (GĐ5)
  scenes/                    # GĐ2
    types.ts  journey.ts  getScene.ts  SceneBackdrop.tsx  SceneTitle.tsx  JourneyStrip.tsx
    layers/<sceneId>.tsx     # mỗi cảnh một component SVG nhiều lớp
    weather/Storm.tsx
```

### 4.1 Asset registry (để sau này thay bằng ảnh AI)
```ts
type AssetSource =
  | { kind: 'svg'; Component: React.ComponentType<React.SVGProps<SVGSVGElement>> }
  | { kind: 'image'; src: string; alt?: string }; // ví dụ '/avalon/icons/merlin.webp'
export const ICONS: Record<IconName, AssetSource>;
export const SCENES: Record<SceneId, { layers: AssetSource[] /* xa → gần */; palette: ScenePalette }>;
```
- `<AvIcon name="merlin" size={24} />` render SVG inline (`currentColor`) hoặc thẻ `<img>`.
- Thay một icon hay một cảnh bằng ảnh AI chỉ cần: thả file vào `public/avalon/...` rồi sửa **một dòng** trong `registry.ts`. Ghi rõ cách làm trong `assets/README.md`.

---

## 5. GĐ0 — Nền móng (không đổi giao diện, chỉ sửa lỗi UI)

**Mục tiêu:** dọn đường cho các GĐ sau và sửa các lỗi UI đã phát hiện. Ngoài các lỗi được liệt kê, giao diện phải **giống hệt** trước.

### Việc cần làm
- **0.1 Một cây render duy nhất.**
  - `PlayerPanel` đang render `phaseSection` và `RoundTable` **2 lần**: một cây desktop (`hidden lg:grid`, dòng 316) và một cây mobile (`lg:hidden`, dòng 357). Cây kia chỉ bị CSS ẩn nhưng timer, interval và state cục bộ vẫn chạy đôi.
  - Gộp lại thành **một** DOM dùng grid responsive. Desktop vẫn 3 cột: roster | bàn | section; khi chưa có bàn (`lineup-preview`, `role-reveal`) thì section nằm ở cột giữa. Mobile xếp dọc: bàn rồi đến section.
  - Gắn `data-phase-section` vào wrapper của section để kiểm thử.
  - `RoundTable` luôn nhận `onTogglePick`, `canPick`, `onAssassinPick`, `canAssassinPick`. Việc này sửa lỗi B3.
- **0.2 Truyền ghế đúng thứ tự (lỗi B1).** `AvalonBoard` truyền `gamePlayers` (từ `useAvalon`, đã xếp theo `seatOrder`) thay cho `players` vào `PlayerPanel` và `RolePreviewPopup`. Tập người chơi giữ nguyên, chỉ đổi thứ tự. Không sửa `useAvalon`.
- **0.3 Tách `PlayerPanel.tsx`** vào `panel/` theo cấu trúc ở mục 4.
  - Dùng script cắt theo khoảng dòng để code giữ **nguyên văn**, rồi chỉ sửa import/export.
  - Khoảng dòng ở commit `c74fcbad`: Discussion 375–480; PhaseChip 482–505; TokenBadges 507–533; RosterMark, deriveAutoHighlight, buildRosterMarks, buildHistoryMarks, PlayerRoster 535–880; WaitingCard 882–889 (đang không dùng, có thể xoá); LineupPreview 891–1074; RoleLineChip 1076–1109; RoleRevealWaiting 1111–1230; RoleIntroCard 1232–1279; getActiveNightPlayerIds, NightCountdown, NightEvils, NightMerlin, NightPercival 1281–1646; TeamBuild 1649–1810; TeamVote 1812–1946; QuestPlay 1948–2090; TeamVoteResult 2092–2157; QuestResult 2159–2216; Lady 2218–2456; Assassin 2458–2682; AssassinRevealOverlay 2684–2851; End 2853–2982.
  - Giữ nguyên default export và `PlayerPanelProps`, vì `AvalonBoard` và `AvalonPreview` đều dùng.
- **0.4 `hooks/usePhaseClock.ts`.**
  - `usePhaseClock(state, timeoutMs = PHASE_TIMEOUTS_MS[state.phase])` trả về `{ now, elapsed, remaining }`, tick mỗi giây theo `serverNow()`. Kèm helper `formatClock(ms)` (dạng `m:ss`, làm tròn xuống) và `formatSecs(ms)` (dạng `Ns`, làm tròn lên).
  - Thay khoảng 10 chỗ đang tự viết `useState(serverNow()) + setInterval` (Discussion, LineupPreview, RoleRevealWaiting, NightCountdown, TeamBuild, TeamVote, Lady, Assassin). **Giữ đúng định dạng hiển thị** của từng chỗ.
  - LineupPreview đang ghi cứng `60_000` (dòng 908): đổi sang `PHASE_TIMEOUTS_MS['lineup-preview']` (cùng giá trị).
- **0.5 `hooks/usePhaseTimeline.ts` và `hooks/useReducedMotion.ts`.**
  ```ts
  // stages: [{ id: 'a', at: 0 }, { id: 'b', at: 1000 }, …, { id: 'done', at: 7950 }] — `at` tính bằng ms từ startedAt
  usePhaseTimeline<S extends string>(startedAt: number, stages: readonly { id: S; at: number }[]): { stage: S; elapsed: number }
  ```
  - `elapsed = serverNow() - startedAt`; `stage` là mốc cuối cùng có `at ≤ elapsed`.
  - Hẹn **một** `setTimeout` tới mốc kế tiếp (không dùng interval). Khi `startedAt` đổi thì tính lại.
  - Nếu reduced motion: trả về mốc cuối ngay lập tức.
  - Áp dụng ngay cho `AssassinRevealOverlay` (lỗi B4). Các mốc 0 / 1000 / 1800 / 3550 / 4250 / 7950 tính từ `state.phaseStartedAt` của phase `end`. Nhờ đó reload sau 8 giây không phát lại; vào lại ở giây thứ 5 thì nhảy thẳng tới khung lộ vai.
- **0.6 Tách `seatPosition(i, n)`** khỏi `RoundTable` (góc `(360/n)*i - 90`, bán kính 43%) sang `table/seatPosition.ts`, để GĐ3 dùng cho token bay.
- **0.7 CSS.**
  - Đổi tên các class trong `avalon.css` sang tiền tố `av-`: `animate-stab` → `av-stab`, `animate-assassin-fly-in` → `av-assassin-fly-in`, `animate-assassin-blackout` → `av-assassin-blackout`, `animate-assassin-whiteout` → `av-assassin-whiteout`, `animate-split-upper/lower` → `av-split-upper/lower`. Cập nhật chỗ dùng (AssassinSection, AssassinRevealOverlay, `RoundTable` dòng 273).
  - Lý do (lỗi B5): `.animate-stab` và `.animate-assassin-fly-in` đang được định nghĩa ở **cả** `globals.css` lẫn `avalon.css` với keyframes khác nhau. **Không sửa `globals.css`.**
  - Thêm class `avalon-root` cho wrapper gốc của Avalon (mọi nhánh return trong `AvalonBoard`). Thêm luật `@media (prefers-reduced-motion: reduce)` trong `avalon.css` để tắt animation và transition bên trong `.avalon-root`.
- **0.8 Sửa lỗi UI nhỏ.**
  - **B2, `TeamVoteResultSection`** (dòng 2099–2100): đếm theo đúng luật của `useAvalon.resolveTeamVote`, tức `approves` = số phiếu approve của người còn trong phòng, `rejects = tổng − approves`. Nếu có người không bầu, hiện thêm "(gồm N người không bầu)". Phiếu vẫn ẩn.
  - **B6**: chữ ở `RoleRevealWaitingSection` (dòng 1214–1215) nói "Quest", thực ra là chuyển sang lượt Đêm.
  - **B7**: xoá `QuestTrack.tsx` và `VoteTrack.tsx` (grep lại để chắc chắn không còn import).
- **0.9 Cập nhật `AvalonPreview`** (lỗi B8).
  - Các cảnh Lady đã cũ: người bị soi không còn tự chọn lá, Lady luôn thấy phe thật. Danh sách mới: Lady đang chọn / đã chọn chưa xác nhận / kết quả Người / kết quả Quỷ; người bị soi đang bị ngắm / đã bị soi (Người) / đã bị soi (Quỷ); người ngoài cuộc lúc đang ngắm / lúc đã soi. Bỏ cảnh "Quỷ hiện Người (xạo)".
  - Dùng `serverNow()` thay `Date.now()`.
  - Thêm nút **"Phát lại"**: dựng lại cảnh với `phaseStartedAt = serverNow()` để xem lại animation. Các cảnh `end-*` có `merlinTargetId` phải phát được overlay.
  - Truyền thêm `onSetAssassinChoice`, `onShowRolePreview` (dạng noop).

### Không làm
Không đổi màu, layout hay icon (trừ các lỗi kể trên). Không thêm cảnh, không thêm animation mới.

### Nghiệm thu
- `npm run lint`, `npx tsc --noEmit`, `npm run build` đều sạch.
- `document.querySelectorAll('[data-phase-section]').length === 1` ở cả 375px và 1440px.
- Mọi cảnh trong `AvalonPreview` trông giống trước (so ảnh chụp trước và sau ở 375 và 1440). Riêng B2 và B6 thì khác theo ý muốn.
- Trên mobile, Leader chọn đội và Sát Thủ chọn mục tiêu được bằng cách chạm avatar trên bàn.
- Trên bàn, thứ tự ghế khớp chiều xoay Leader: Leader kế tiếp luôn là ghế kế bên theo chiều kim đồng hồ.
- Reload ở màn kết thúc (sau 8 giây) không phát lại overlay ám sát.
- Bật giả lập reduced motion trong DevTools thì không còn animation nào trong Avalon.

---

## 6. GĐ1 — Bộ nhận diện (icon, màu, font, avatar, huy hiệu vai)

**Mục tiêu:** thay toàn bộ emoji bằng bộ icon riêng, có hệ màu chuẩn và font tiêu đề. Làm **trước** animation để khỏi phải làm lại.

### Việc cần làm
- **1.1 Registry và `AvIcon`** theo mục 4.1. Viết `assets/README.md`: cách thay icon bằng ảnh (AI vẽ) và kích thước, định dạng nên dùng (SVG; hoặc WebP vuông 128/256px, nền trong suốt).
- **1.2 Chọn icon** từ game-icons.net theo Phụ lục B.
  - **Trước khi tải file, phải hỏi người dùng**: lập bảng gồm tên icon, tác giả, URL, kích thước, và chỉ tải khi người dùng đồng ý (theo luật an toàn của trợ lý).
  - Tối ưu path rồi lưu thành component trong `assets/icons/*.tsx` với `fill="currentColor"`.
  - Ghi tác giả vào `assets/CREDITS.md` và hiện một dòng credit trong `RoleGuide` (ví dụ "Icon: Lorc, Delapouite… — game-icons.net, CC BY 3.0").
- **1.3 Thay emoji ở mọi nơi trong Avalon.**
  - Tạo map hiển thị `ROLE_ICON_NAME: Record<AvalonRole, IconName>` (đặt trong `presentation.ts` hoặc ngay `constants.ts`, chỉ là dữ liệu hiển thị). Xoá `ROLE_ICONS` khi không còn chỗ nào dùng.
  - Gỡ các chỗ trùng nghĩa: 👑 đang dùng cho cả Mordred, Leader và thanh từ chối; 🛡️ cho cả Percival, lá Thành công và nhãn Phe Người; 🗡️ cho cả Sát Thủ, lá Thất bại, nhãn Phe Quỷ và đêm của Quỷ.
  - Thanh từ chối đổi thành **5 ngọn nến**: mỗi lần bị bác tắt một ngọn.
- **1.4 Token màu** đặt dưới `.avalon-root` trong `avalon.css`: `--av-good`, `--av-evil`, `--av-leader` (vàng kim), `--av-lady` (xanh ngọc), `--av-gold`, `--av-parchment`, `--av-ink`, `--av-glass-bg`, `--av-glass-border`.
  - Dùng qua giá trị tuỳ biến của Tailwind, ví dụ `text-[color:var(--av-gold)]`. **Không** thêm `@theme` vào `avalon.css`.
  - Quy ước: xanh lam và đỏ **chỉ** dùng cho ý nghĩa phe.
- **1.5 Font tiêu đề** dùng `next/font/google`, có subset `vietnamese` (ứng viên: Cormorant Garamond, EB Garamond; phải kiểm tra font có bộ tiếng Việt). Cinzel **không** có dấu tiếng Việt, đừng dùng. Gắn qua `--av-font-display` cho tiêu đề; chữ thân vẫn giữ Inter. Đọc docs `next/font` trong `node_modules/next/dist/docs/` trước khi làm.
- **1.6 `ui/PlayerAvatar.tsx`.**
  - Màu cố định theo người: hash `player.id` ra một bảng 10 màu, **không** dùng xanh lam hay đỏ thuần để khỏi lẫn với màu phe.
  - Props cho các trạng thái: viền đội được chọn, Lady đang ngắm, mục tiêu Sát Thủ, "bạn".
  - Thay mọi chỗ đang tự vẽ vòng tròn chữ cái đầu: RoundTable, PlayerRoster, lưới TeamBuild, Lady, Assassin, các danh sách đêm, QuestDetailPopup, End.
- **1.7 `ui/RoleEmblem.tsx`**: khung khiên kèm icon vai, viền màu phe. Dùng cho RoleReveal, RoleCard, RoleIntroCard, chip lineup và danh sách vai ở màn kết thúc.
- **1.8 Riêng tư.** Nút vai ở top bar (`PlayerPanel`, nút `onShowMyRole`) hiện đang hiện icon, tên vai và màu phe. Đổi thành nút trung tính "Vai của tôi" (icon con mắt); chạm vào thì mở `RoleCard` như cũ.

- **1.9 Ô Quest ở tâm bàn** (`RoundTable`): sửa nhãn "QUEST n" bị ngắt dòng ở 375px (rút gọn, ví dụ số La Mã hoặc "Q1", hoặc giảm cỡ chữ theo bề rộng). Ô đã xong dùng icon `quest-success` / `quest-fail` thay cho ✓ / ✕. Giữ vùng chạm để mở popup chi tiết.
- **1.10 Icon giao diện chung** cũng thay emoji: cài đặt, hướng dẫn vai, xem trước, xoá phòng, rời phòng, mất kết nối (banner), đóng, chi tiết, đồng hồ, cảnh báo. Có ở `AvalonBoard` (header lobby, banner), `RoomSettings`, `RoleGuide`, `RolePreviewPopup`, `LobbyRoundTable`, `RoundTable`.
- **1.11 `AvalonPreview`**: nhãn trong `<option>` không vẽ được SVG, nên chỉ cần bỏ emoji, để chữ thuần.

### Bổ sung sau GĐ0 (nhạc trưởng, 2026-10-06)
- Cấu trúc hiện tại: các section nằm trong `panel/*.tsx` (biểu tượng dùng chung ở `panel/shared.tsx`: `PhaseChip`, `TokenBadges`, `RoleLineChip`, `RoleIntroCard`); hook ở `hooks/`; toạ độ ghế ở `table/seatPosition.ts`.
- **Khối lượng:** khoảng 200 emoji trong khoảng 26 file. Lệnh đếm (ripgrep, công cụ Grep): `rg -c "\p{Extended_Pictographic}" src/components/games/avalon -g "!**/docs/**"` (Bash có sẵn `rg`). `grep -P` trên máy này lỗi locale nên đừng dùng.
- **Ký hiệu chữ** như ✓ ✕ ⏱ ⚠: nếu đứng riêng như một icon thì thay bằng `AvIcon`; nếu nằm trong câu ("✓ Đã chọn") thì được giữ.
- **Chưa làm cảnh nền ở GĐ1:** nền tô theo phe (B10) vẫn giữ tới GĐ2. Không thêm animation.
- **Duyệt icon:** người dùng có mặt ở session thực thi. Đưa bảng icon đề xuất (tên, tác giả, URL) và chờ người dùng đồng ý rồi mới tải.
- GĐ1 **đổi giao diện**, nên không so bố cục trước/sau như GĐ0. Thay vào đó, chụp ảnh mọi cảnh trong Preview ở 375 và 1440 để nhạc trưởng xem.

### Nghiệm thu
- Không còn emoji trong UI Avalon: lệnh `rg` ở trên trả 0 với mọi file ngoài `docs/`.
- Mỗi icon chỉ mang một nghĩa.
- Đổi một icon sang `{ kind: 'image', src }` thì hiển thị đúng (thử với một file PNG tạm rồi trả lại).
- Tiếng Việt có dấu hiển thị đúng ở font tiêu đề.
- Có credit.
- `AvalonPreview` đi qua mọi cảnh mà không vỡ layout.

---

## 7. GĐ2 — Hệ thống cảnh truyện

**Mục tiêu:** mỗi chặng của ván là một khung cảnh cắt giấy, mọi máy giống nhau. Bỏ kiểu nền tô theo phe và mọi bề mặt lớn làm lộ phe.

**Chia làm 2 lượt** (2 session thực thi riêng, để mỗi session không quá tải):

| Lượt | Phạm vi |
|---|---|
| **GĐ2a — Hệ thống + quét lộ phe** | 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9, 2.10 và vẽ **4 cảnh mẫu**: `hall`, `night`, `camp`, `forest`. Cảnh chưa vẽ dùng **placeholder** (nền tối trung tính theo màu chủ đạo ở Phụ lục C), đăng ký trong `SCENES` với cờ `placeholder: true` |
| **GĐ2b — Vẽ đủ cảnh** | Vẽ 10 cảnh còn lại (`mountain`, `sea`, `ruins`, `chapel`, `marsh`, `cave`, `lake`, `blood-moon`, `end-good`, `end-evil`), lớp `weather/Storm`, 2.6 `SceneTitle`, 2.7 `JourneyStrip`, 2.11 huy hiệu vai trung tính ở chỗ riêng tư, tuỳ chọn phủ tối theo số Quest thất bại. Bỏ hết placeholder |

### Phong cách vẽ (áp dụng cho mọi cảnh)
- **Cắt giấy phẳng:** 3–5 lớp hình bóng chồng lên nhau, mỗi lớp một màu phẳng theo Phụ lục C. Không gradient nặng, không ảnh, không `filter: blur`.
- **Khung hình:** `viewBox="0 0 1600 900"` với `preserveAspectRatio="xMidYMax slice"`. Điện thoại dọc sẽ bị cắt hai bên, nên chi tiết chính (lâu đài, đống lửa, thanh kiếm…) đặt ở **giữa, nửa dưới**; bầu trời phải kéo đủ cao cho màn hình dọc.
- **Tương phản thấp:** cảnh chỉ là nền, phần tối chiếm đa số. Không dùng mảng lớn xanh lam hoặc đỏ bão hoà (màu đó dành cho phe).
- **Hạt hiệu ứng** (đom đóm, tuyết, tia lửa, sương): CSS, tối đa 20, chỉ animate `transform` / `opacity`, tắt khi reduced motion.
- **Hiệu năng:** `GlassPanel` dùng nền bán trong suốt đặc (`--av-glass-bg`). **Không** dùng `backdrop-filter: blur` trên nhiều panel đè lên nền có hạt chuyển động, vì điện thoại yếu sẽ phải làm mờ lại mỗi khung hình. Tối đa 1 bề mặt lớn có blur, và tắt blur nếu thấy giật.

### Việc cần làm
- **2.1 `scenes/types.ts`.**
  - Cảnh cố định: `hall`, `night`, `camp`, `lake`, `blood-moon`, `end-good`, `end-evil`.
  - Kho địa điểm Quest (7, để random có biến hoá): `forest`, `mountain`, `sea`, `ruins`, `chapel`, `marsh`, `cave`. Bảng màu ở Phụ lục C.
- **2.2 `scenes/journey.ts`.**
  - `getJourney(state, roomId): LocationId[5]` = xáo kho địa điểm bằng seed `hash(state.seatOrder.join('|'))` (PRNG nhỏ kiểu mulberry32), rồi lấy 5 cái đầu.
  - `seatOrder` được random mỗi ván, giống nhau trên mọi máy và cố định suốt ván, nên mọi máy ra cùng một hành trình. Nếu `seatOrder` rỗng thì dùng `roomId` làm seed.
  - Là hàm thuần, memo theo `seatOrder`.
- **2.3 `scenes/getScene.ts`**, ánh xạ phase sang cảnh:

  | Phase | Cảnh |
  |---|---|
  | Lobby, `lineup-preview`, `role-reveal` | `hall` |
  | `night-*` | `night` |
  | `team-build`, `team-vote`, `team-vote-result`, `quest-play`, `quest-result` | `journey[currentQuest]` |
  | `discussion` | `camp` (lúc này `currentQuest` đã tăng, nên tiêu đề ghi "Dựng trại trước <địa điểm kế>") |
  | `lady-of-lake` | `lake` |
  | `assassinate` | `blood-moon` |
  | `end` | `end-good` hoặc `end-evil` theo `winner` |

  - **Thời tiết (GĐ2b):** khi `currentQuest === 3 && questNeedsTwoFails(playerCount, 3)` thì phủ lớp `weather/Storm` (mưa và chớp thỉnh thoảng) lên địa điểm, để giữ tín hiệu "vòng nguy hiểm" dù thứ tự cảnh là random. GĐ2a chỉ cần `getScene` trả về cờ `storm: boolean`.
  - **Tuỳ chọn (GĐ2b):** phủ tối thêm `0.08 × số Quest thất bại`.
- **2.4 `SceneBackdrop.tsx`.**
  - Lớp `fixed inset-0` nằm dưới nội dung. Các lớp từ xa tới gần: bầu trời, lớp xa, lớp giữa, lớp gần, hạt hiệu ứng, vignette, và một lớp tối đảm bảo đọc được chữ.
  - Đổi cảnh bằng crossfade 600–800ms: giữ cảnh cũ mounted cho tới khi mờ xong.
  - Mỗi cảnh là một component SVG trong `scenes/layers/` và đăng ký trong `SCENES` ở `assets/registry.ts` (mục 4.1). Lớp nào cũng có thể đổi sang `{ kind: 'image' }`.
- **2.5 Bỏ nền tô theo phe** (wrapper ngoài cùng của `PlayerPanel`: gradient xanh hoặc đỏ theo `isGood`, lỗi B10). Thay bằng `SceneBackdrop`.
  - Các card hiện dùng `bg-white/5` sẽ khó đọc trên cảnh nền; chuyển sang `ui/GlassPanel`.
  - Lobby và các màn chờ trong `AvalonBoard` dùng cảnh `hall`.
- **2.6 `SceneTitle.tsx` (GĐ2b).**
  - Khi cảnh đổi, hiện tên địa điểm kèm **một câu dẫn truyện** trong khoảng 2,5 giây, đặt ở phía trên, `pointer-events: none`, có `aria-live="polite"`.
  - Phát hiện đổi cảnh bằng `useRef` lưu cảnh trước. Khi reload, chỉ hiện nếu còn trong 3 giây đầu của phase.
  - Mỗi cảnh viết 2–3 câu dẫn, chọn theo seed của ván. Giọng văn xem Phụ lục E.
- **2.7 `JourneyStrip.tsx` (GĐ2b)**: dải 5 chặng gồm icon địa điểm; chặng đã xong tô màu theo kết quả, chặng hiện tại được đánh dấu. Hiện trong phase thảo luận; GĐ5 dùng lại cho màn tổng kết.
- **2.8 `AvalonPreview`**: thêm ô chọn "Cảnh" (kèm bật/tắt Storm) để xem riêng từng cảnh. Cảnh của từng phase phải theo đúng `getScene`.
- **2.9 Quét lộ phe (GĐ2a).** Quy tắc: **bề mặt lớn** (nền toàn màn hình, thẻ chiếm khoảng ≥ 1/3 màn hình, nút lớn) **không được đổi màu hay độ sáng theo thông tin riêng** của người xem (phe, vai, lá đã đặt, kết quả soi). Màu phe chỉ được xuất hiện ở chi tiết nhỏ: viền `RoleEmblem`, nhãn chữ nhỏ, icon cỡ chữ. Phải sửa:
  - `RoleReveal`: nền toàn màn hình và khung thẻ thành trung tính (cảnh `hall` + khung giấy da / vàng). GĐ4 sẽ làm lại thành thư niêm phong.
  - Modal `RoleCard`: khung trung tính.
  - `QuestPlaySection`:
    - thẻ "Lá bài bạn đã đặt" trung tính, chỉ ghi "Đã đặt lá" kèm một icon nhỏ;
    - hai nút "PHE NGƯỜI" / "PHE QUỶ" phải **trông giống hệt nhau** với mọi người chơi, không làm mờ nút Quỷ cho Phe Người. Phe Người bấm nút Quỷ thì hiện thông báo nhỏ kiểu toast;
    - nút xác nhận không đổi màu theo lá đang chọn.
  - `LadySection`: thẻ kết quả soi (cả phía Lady lẫn phía người bị soi) dùng khung trung tính, phe chỉ thể hiện bằng chữ + icon cỡ vừa.
  - Kiểm lại toàn bộ section còn lại theo cùng quy tắc. Các section **đêm** thì để GĐ4 xử lý bằng lớp phủ "nhắm mắt"; ghi lại chỗ còn lộ vào nhật ký.
- **2.10 Màu phe qua token (GĐ2a):** thay các lớp `blue-*` / `red-*` của Tailwind còn mang nghĩa phe bằng `--av-good` / `--av-evil` (ví dụ `text-(--av-good)`, `border-(--av-evil)/40`), cùng lúc với việc chuyển sang `GlassPanel`. Sau GĐ2a, `rg "(blue|red|rose|cyan)-[0-9]" src/components/games/avalon` chỉ còn những chỗ có lý do (ghi lý do vào nhật ký).

### Nghiệm thu
**GĐ2a**
- `getScene` và `getJourney` có test nhanh (script hoặc kiểm trong Preview): cùng `seatOrder` cho cùng hành trình; hành trình đổi giữa các ván.
- 4 cảnh mẫu đẹp và đọc rõ chữ ở 375 và 1440. Placeholder không làm vỡ layout.
- Hai tab cùng một ván thấy cùng cảnh; reload giữ đúng cảnh.
- **Không còn bề mặt lớn nào đổi màu theo thông tin riêng:** chụp cùng một cảnh Preview dưới góc nhìn Phe Người và Phe Quỷ, hai ảnh phải trông như nhau khi nhìn từ xa (ví dụ thu nhỏ còn 10%).
- DevTools giả lập CPU chậm 4 lần: không giật khi có hạt hiệu ứng.
- Chữ thân đạt độ tương phản ≥ 4.5:1.

**GĐ2b**
- Đủ 7 cảnh cố định, 7 địa điểm và lớp Storm, xem được trong Preview; không còn placeholder.
- `SceneTitle` hiện đúng lúc đổi cảnh, không hiện lại khi reload sau 3 giây.
- `JourneyStrip` đúng thứ tự hành trình và kết quả.
- Mỗi file cảnh khoảng ≤ 30KB.
- Không còn `.av-storm-placeholder`.
- Chữ trên 10 cảnh mới vẫn đạt độ tương phản ≥ 4.5:1 (đo bằng điểm ảnh như GĐ2a).
- Cặp ảnh riêng tư đo lại **ở khung thẻ vai** (`RoleReveal` sau > 1,5 giây, modal `RoleCard`, `RoleIntroCard` ở đêm): thu còn 10% không phân biệt được phe (độ lệch trung bình xấp xỉ các cặp trung tính khác, ≤ 1,5).

### Bổ sung cho GĐ2b (nhạc trưởng, 2026-10-07)
- **Vẽ theo mẫu `scenes/layers/forest.tsx`**: dùng các hàm dựng hình trong `scenes/paper.tsx`; mỗi cảnh xuất `sceneLayer(...)`, `PALETTE`, `PARTICLES`, đăng ký trong `SCENES` và bỏ cờ `placeholder`. Nhớ luật `nonzero`: hình trong cùng một `<path>` phải cùng chiều; hình lật gương để ở `<path>` riêng.
- **Gợi ý bố cục từng cảnh** (chi tiết chính ở giữa, nửa dưới; khung dọc chỉ thấy x ≈ 590–1010):
  - `mountain`: đèo giữa hai sườn núi, có tuyết;
  - `sea`: vách đá Tintagel và lâu đài đổ nát, mặt trời lặn trên biển;
  - `ruins`: cột đá gãy, vòm sụp;
  - `chapel`: vòm nhà nguyện, Chén Thánh phát sáng ở giữa;
  - `marsh`: lau sậy, ma trơi, sương thấp;
  - `cave`: miệng hang, hai mắt rồng đỏ cam trong bóng tối, ánh vàng kho báu;
  - `lake`: mặt hồ phẳng, thanh kiếm nhô lên ở giữa (bù cho icon `lady` hiện là sóng nước);
  - `blood-moon`: trăng đỏ lớn, cây chết, quạ;
  - `end-good`: bình minh vàng sau lâu đài Camelot;
  - `end-evil`: Camelot chìm lửa và khói.
- **`weather/Storm.tsx`** thay `.av-storm-placeholder`: vệt mưa nghiêng bằng CSS (≤ 20 phần tử, hoặc một lớp `repeating-linear-gradient` trượt bằng `transform`) và chớp lóe hiếm (khoảng 8–14 giây một lần, chớp là `opacity` của một lớp sáng). Reduced motion: chỉ còn lớp phủ tối và mưa tĩnh, không chớp.
- **2.11 Huy hiệu vai ở chỗ riêng tư:** thêm biến thể trung tính cho `RoleEmblem` (ví dụ prop `tone="neutral"`: viền vàng, lòng khiên màu mực, icon giấy da). Dùng ở `RoleReveal`, `RoleCard`, `RoleIntroCard`, chip "Vai của tôi", và mọi chỗ chỉ người xem mới thấy vai của mình. Phe chỉ còn thể hiện bằng **nhãn chữ nhỏ**. Các chỗ công khai (lineup, danh sách Phe Quỷ ở màn ám sát, màn kết thúc, `RoleGuide`) giữ màu phe.
- **`SceneTitle`:** dò đổi cảnh bằng `getScene(...).id` (thuộc tính `data-scene` của backdrop có sẵn để kiểm thử). Câu "Dựng trại trước <địa điểm kế>" lấy từ `location` (dùng `SCENE_NAMES_VI`). Không hiện ở lần mount đầu nếu đã quá 3 giây kể từ `phaseStartedAt`.
- **`JourneyStrip`:** dùng `getJourney`; icon địa điểm có thể là hình thu nhỏ của lớp xa nhất của cảnh, hoặc icon game-icons mới. Nếu cần icon mới thì phải hỏi người dùng duyệt như GĐ1. Hiện trong `DiscussionSection` (GĐ5 dùng lại).

---

## 8. GĐ3 → GĐ6 — Animation theo từng giai đoạn của ván

Mọi animation đi qua `usePhaseTimeline`, tuân thủ mục 2 và ngân sách thời gian ở Phụ lục D.

### GĐ3 — Vòng Quest (lặp nhiều nhất mỗi ván)
- **`table/TableTokens.tsx`**: lớp phủ trên `RoundTable` vẽ token Leader (vương miện), token Lady và token "đề cử" ở vị trí `seatPosition`, với `transition: left, top` khoảng 500ms.
  - Khi `currentLeaderId` đổi, vương miện **bay sang ghế mới**.
  - Khi Leader chọn người, token khiên bay từ ghế Leader tới ghế được chọn.
- **Thanh hành động cố định ở đáy màn hình trên mobile** (`ui/ActionDock`, có tính safe-area) cho nút chính của từng phase: trình đội, Đồng ý / Từ chối, đặt lá, xác nhận soi, xác nhận đâm, sẵn sàng. Desktop vẫn để ở cột phải.
- **`team-vote`**: sau khi bầu, lá phiếu úp xuống ("đã bỏ phiếu", vẫn hiện nhỏ lựa chọn của mình). Chấm "đã bầu" trên bàn có hiệu ứng nảy. Mười giây cuối nhấp nháy cảnh báo.
- **`team-vote-result`** (8s):
  - 0–0,6s: tiêu đề hiện ra.
  - 0,6–2,6s: hai bộ đếm Đồng ý / Từ chối chạy số.
  - 2,8s: đóng dấu "ĐƯỢC DUYỆT" hoặc "BỊ BÁC".
  - Nếu bị bác: 3,5s tắt ngọn nến thứ `voteRejectStreak`; khi `voteRejectStreak ≥ 4` thì rung và đỏ cảnh báo.
  - Xong trước khoảng 5s.
- **`quest-play`**: lá được chọn bay vào chồng bài úp ở tâm bàn. Hiện "x/y lá đã đặt" (đếm số người trong đội đã có `questCard`; chỉ đếm, không lộ nội dung).
- **`quest-result`** (8s):
  - 0–0,8s: xáo chồng bài.
  - Sau đó lật từng lá, mỗi lá cách nhau 0,6s. Chuỗi lá dựng từ `teamSize − failCount` lá thành công và `failCount` lá thất bại, xáo bằng seed `phaseStartedAt`.
  - Lá cuối lật xong cộng 0,4s thì đóng dấu THÀNH CÔNG / THẤT BẠI, và ô Quest tương ứng trên bàn được "niêm phong" màu.
  - Xong trước khoảng 5,5s.
- **`discussion`**: dấu tích sẵn sàng có hiệu ứng nảy, đồng hồ dạng vòng, `JourneyStrip`.

### GĐ4 — Vào phòng, lobby, mở đầu ván
- **Trang vào phòng:** rẽ nhánh `gameType === 'avalon'` trong `page.tsx`, render `AvalonJoinScreen` (cảnh `hall`, tiếng Việt). Game khác giữ nguyên.
- **Lobby:** khi có người vào thì hiệu ứng "ngồi xuống" (scale và fade), khi rời thì fade out, kèm thông báo nhỏ "<Tên> đã vào phòng" (so danh sách người chơi phía client, bỏ qua lần tải đầu).
- **Màn "Đang chia bài…"** (`AvalonBoard`, nhánh `!myPlayer || !myRole`): thay bằng animation xoè bài.
- **`lineup-preview`:** hiện `RoundTable` ở phase này (hiện đang ẩn).
  - 0–1,2s: **xáo chỗ ngồi**, ghế trượt từ thứ tự vào phòng (`players` theo `joinedAt`) sang `seatOrder`.
  - 1,2–3,2s: **vương miện quay quanh bàn** chậm dần rồi dừng ở `currentLeaderId`. Số bước tính từ index ghế, nên mọi máy giống nhau.
  - Đặt token Lady (khi từ 7 người trở lên).
  - Chip vai lần lượt bay vào, cách nhau 80ms. Panel trông như cuộn giấy da.
- **Lộ vai:** `RoleReveal` thành **thư niêm phong dấu sáp**.
  - **Nhấn giữ để xem**, thả tay là che lại; sau đó bấm "Đã đọc". Giữ nguyên ngữ nghĩa của `onDone`.
- **Đêm:** cảnh `night`.
  - Mọi người thấy **cùng một** lớp phủ "nhắm mắt", kèm dòng dẫn công khai ("Phe Quỷ mở mắt…").
  - Người có vai trong lượt đó nhấn giữ thì mới thấy thông tin. Trong lúc giữ, ghế liên quan trên bàn mới phát sáng.
  - Không rung.

### GĐ5 — Kết thúc ván
- Cảnh `end-good` / `end-evil`. Banner cá nhân "Bạn thắng!" / "Bạn thua…" (so phe của người xem với `winner`).
- Tàn lửa hoặc hạt lấp lánh trong 3 giây, tối đa 30 hạt.
- Vai được lật lần lượt ngay trên `RoundTable` (thêm prop `revealAll`), mỗi ghế cách nhau 150ms. Màn này bắt đầu sau khi overlay ám sát xong (dùng chung timeline).
- **Tổng kết:** `JourneyStrip` mở rộng. Mỗi Quest hiện địa điểm, Leader, đội, số Đồng ý / Từ chối (của đề xuất được duyệt), kết quả và số lá thất bại. Kèm lý do thắng: đủ 3 Quest / Sát Thủ trúng hoặc trật / 5 lần bị bác.
- `ui/ConfirmDialog.tsx` thay cho `confirm()` gốc ở: ván mới, rời phòng, xoá phòng, kick (`AvalonBoard`), và xác nhận đâm (`AssassinSection`). Chỉ thay phần UI, giữ nguyên handler.

### GĐ6 — Lady, ám sát, hoàn thiện
- **Lady:** cảnh `lake`. Token Lady bay tới người bị ngắm. Lật bài kết quả, chỉ người cầm Lady thấy. Khi `ladyHolderId` đổi thì token chuyển ghế.
- **Ám sát:** cảnh `blood-moon`. Hồng tâm và hiệu ứng nhịp tim trên mục tiêu đang ngắm. Overlay hiện có giữ nguyên (đã sửa ở GĐ0).
- **"Đến lượt bạn"** (chỉ hình ảnh): viền nhấp nháy và tiền tố "● " trên tiêu đề tab. Không bao giờ bật vào ban đêm. Chỉ thêm rung nếu người dùng đồng ý.
- **Trợ năng:** focus ring rõ, vùng chạm ≥ 44px, `aria-live` cho banner.
- **Hiệu năng:** đo lại trên máy yếu; nếu bundle lớn thì lazy-load từng cảnh.

---

## 9. Kiểm thử (mọi GĐ)

1. Chạy `npx tsc --noEmit`, `npx eslint src/components/games/avalon` (không được thêm lỗi mới; mốc hiện tại là 2 lỗi `react-hooks/set-state-in-effect` có sẵn), và `npm run build`. Không dùng `npm run lint` toàn repo vì bị nhiễu bởi `.claude/worktrees/**`.
   - Có thể kiểm UI mà không cần Firebase bằng trang harness tạm (xem memory `avalon-ux-test-recipes`); nhớ xoá harness trước khi commit.
2. **AvalonPreview:**
   - Chạy app, tạo phòng Avalon (dùng Firebase thật trong `.env.local`), bấm "👁️ Xem trước".
   - Đi qua mọi cảnh liên quan ở 375×812 và 1440×900, chụp ảnh.
   - **Xoá phòng test khi xong.**
3. **Ván thật** (khi GĐ có đụng tới đồng bộ hoặc thời gian):
   - Mở 5 tab trên 5 origin khác nhau: `localhost:3000`, `127.0.0.1:3000`, `a.localhost:3000`, `b.localhost:3000`, IP LAN.
   - Dùng bản production (`npm run build` rồi `next start`), không dùng `next dev`.
   - Trình duyệt trong app tự đóng `confirm()`, nên trước khi bấm cần stub `window.confirm = () => true`.
4. Bật giả lập reduced motion và CPU chậm 4 lần trong DevTools.

---

## 10. Nhật ký tiến độ (người thực thi cập nhật)

Branch: `dev-avalon-uxui`.

| GĐ | Trạng thái | Commit (đầu → cuối) | Model | Ghi chú / lệch kế hoạch |
|---|---|---|---|---|
| 0 Nền móng | **Đã review — đạt** (2026-10-06) | `3e76509d` → `cba374f3` (code) + commit docs ngay sau (cập nhật nhật ký này) — xem `git log 3e76509d..HEAD` | Claude Sonnet 5.5 | Mọi lỗi B1–B8 đã xử lý, giao diện giữ nguyên. Chi tiết lệch kế hoạch + kết quả kiểm thử ở mục "Ghi chú của người thực thi GĐ0" bên dưới. |
| 1 Bộ nhận diện | **Đã review — đạt** (2026-10-06) | `928c1afa` → `f92d548d` (code) + commit docs ngay sau (cập nhật nhật ký này) — xem `git log 928c1afa..HEAD` | Claude Opus 5.5 | 47 icon game-icons.net (người dùng đã duyệt bảng) + 1 icon chỉnh sửa, registry + `AvIcon`, token màu, font Cormorant Garamond, `PlayerAvatar`, `RoleEmblem`; 0 emoji. Lệch kế hoạch + kết quả kiểm thử ở "Ghi chú của người thực thi GĐ1" bên dưới. |
| 2a Hệ thống cảnh + quét lộ phe | **Đã review — đạt** (2026-10-07) | `d6e27ed7` → `ccfb2005` (code) + commit docs ngay sau (cập nhật nhật ký này) — xem `git log d6e27ed7..HEAD` | Claude Opus 5.5 | `scenes/` (types, journey, getScene, SceneBackdrop, paper), 4 cảnh mẫu `hall`/`night`/`camp`/`forest` + 10 placeholder, `SCENES` trong registry, `ui/GlassPanel`, quét lộ phe, token màu phe (regex màu = 0). Lệch kế hoạch + kết quả kiểm thử ở "Ghi chú của người thực thi GĐ2a" bên dưới. |
| 2b Vẽ đủ cảnh + tiêu đề + hành trình | Chưa bắt đầu | | | |
| 3 Vòng Quest | Chưa bắt đầu | | | |
| 4 Mở đầu | Chưa bắt đầu | | | |
| 5 Kết thúc | Chưa bắt đầu | | | |
| 6 Hoàn thiện | Chưa bắt đầu | | | |

### Ghi chú của người thực thi GĐ0

**Đã làm:** đúng 0.1–0.9. Không sửa logic-core (`useAvalon.ts`, `types.ts`, `constants.ts`, khối auto-progression `AvalonBoard.tsx`); diff `AvalonBoard.tsx` chỉ gồm thêm `avalon-root` và đổi `players` → `gamePlayers`. Không thêm dependency. Không sửa `globals.css`.

**Lệch / quyết định nhỏ so với kế hoạch (nhạc trưởng nên liếc qua):**
1. `usePhaseClock(state)` dùng timeout mặc định `PHASE_TIMEOUTS_MS[state.phase]` ở mọi section (kể cả `LineupPreview`, nên không còn `60_000` cứng); riêng `NightCountdown` vẫn truyền tường minh theo prop `phase`. Đồng hồ `Assassin` giữ định dạng cũ (làm tròn *lên* rồi mới ra `m:ss`) bằng `formatClock(Math.ceil(remaining / 1000) * 1000)`.
2. Không dùng class `pb-safe` của `globals.css` cho wrapper gộp, vì nó là CSS không nằm trong `@layer` nên thắng cả `lg:pb-0`; thay bằng `pb-[max(1rem,env(safe-area-inset-bottom))]` (cùng giá trị). Cần nhớ khi GĐ3 làm `ActionDock`.
3. Luật reduced-motion dùng `animation: none !important; transition: none !important` (không phải duration 0,01ms) để các nháy sáng `av-assassin-blackout/whiteout` không bật một khung trắng đứng yên. Hệ quả: với reduced motion, `usePhaseTimeline` trả mốc cuối ⇒ **overlay ám sát bị bỏ qua hoàn toàn** (màn kết thúc vẫn nêu đủ kết quả). Đúng với đề bài, ghi lại để GĐ5 biết.
4. `AvalonPreview`: (a) cảnh `end-*` bắt đầu với `phaseStartedAt = serverNow()` nên overlay vẫn chạy khi vừa chọn cảnh như trước; (b) id cảnh Lady đổi: `lady-holder-waiting`→`lady-holder-picked`, `lady-target-*`/`lady-bystander` thay bằng `lady-target-aimed|inspected-good|inspected-evil`, `lady-bystander-aiming|inspected`; cảnh "kết quả Người" nay soi một người thuộc phe Người (trước dùng Morgana hiện "Người"); (c) thêm cảnh **mới** `team-vote-result-rejected-novote` để xem B2; (d) panel được `key` theo cảnh + lần phát lại nên mỗi lần đổi cảnh là mount mới; (e) vì Preview nay truyền `onShowRolePreview`, thanh trên cùng ở Preview có thêm nút "🎭 Preview" (ở 375px thanh cao thêm một dòng) — đúng yêu cầu 0.9 nhưng khác ảnh cũ.
5. `RoleRevealWaitingSection` (B6): "Tự động vào lượt Đêm sau" / "Đang chuyển sang lượt Đêm". Nút "✓ Đã xem — Vào Quest" ở `NightPercival` giữ nguyên (sau đêm là vào chọn đội Quest 1).
6. Xoá `WaitingCard` cùng `QuestTrack.tsx`, `VoteTrack.tsx` (đã grep: không còn import).

**Kết quả kiểm thử:**
- `npx tsc --noEmit` sạch; `npm run build` thành công.
- ESLint: `npm run lint` toàn repo **không sạch từ trước** (329 lỗi / ~10.300 cảnh báo, gần như toàn bộ nằm trong `.claude/worktrees/*/.next/**`). Riêng `npx eslint src`: 47 lỗi / 36 cảnh báo → 47 / 35 (hết cảnh báo `WaitingCard`). Hai lỗi còn lại trong Avalon là `react-hooks/set-state-in-effect` có sẵn (`AvalonBoard.tsx:121`, và `QuestPlaySection` — chuyển nguyên văn từ `PlayerPanel`). Không thêm vấn đề lint mới.
- Phần thân các `panel/*.tsx` đã đối chiếu với đoạn gốc bằng script: chỉ khác ở các chỗ cố ý (đồng hồ, class `av-*`, B2, B6, overlay).
- **Một cây render:** `document.querySelectorAll('[data-phase-section]').length === 1` ở mọi cảnh dùng `PlayerPanel` (375, 800, 1024, 1440) và cả trong ván thật.
- **So bố cục trước/sau (Preview, dựng DOM không cần Firebase):** 40 cảnh × 375px và 1440px, cộng 10 cảnh × 800px và 1024px: tọa độ/kích thước/class từng phần tử giống hệt, trừ các khác biệt dự kiến — vài wrapper (gộp cây), avatar trên bàn thành `<button>` ở mobile (B3), nút "🎭 Preview" ở thanh trên (xem 4e), đếm ngược lệch 1 giây, thanh tiến độ đang chạy transition, các cảnh Lady/B2/B6 đổi có chủ ý. (Khi so ở 1440px phải ẩn nút "🎭 Preview", vì thanh trên cao hơn 3px làm nhiễu làm tròn.)
- **B3:** ở 375px chạm avatar trên bàn để chọn đội (thêm, bỏ, thay người đầu khi đầy) và để Sát Thủ chọn mục tiêu đều chạy đúng (click thật).
- **B4:** nhảy đúng khung theo thời gian từ `phaseStartedAt` (mount ở 0,5s → bay vào; 2,5s → chém; 4,3s và 6s → lộ vai; 9s → không hiện); các mốc chuyển khung đo được 1,09 / 1,86 / 3,60 / 4,36 / 8,06s so với mốc 1,0 / 1,8 / 3,55 / 4,25 / 7,95s. **Trong ván thật, reload ở màn kết thúc sau khi overlay xong thì không phát lại.**
- **Reduced motion:** Chrome headless với `--force-prefers-reduced-motion`: `matchMedia` = true, số phần tử còn animation/transition trong `.avalon-root` = 0, overlay không hiện; không bật cờ thì 22 phần tử có animation và overlay hiện.
- **B1 + đồng bộ, ván thật (bản production, 5 origin: `localhost`, `127.0.0.1`, `a.localhost`, `b.localhost`, IP LAN, host + 4 người):** thứ tự vào phòng Host1,P2,P3,P4,P5 nhưng ghế trên bàn P5,Host1,P3,P4,P2 và **giống hệt trên cả 5 tab**; Leader xoay P2 → P5 → Host1, tức luôn là ghế kế bên theo chiều kim đồng hồ. Ván chạy đủ lineup → lộ vai → đêm → 3 Quest → ám sát → kết thúc, không lỗi JS ở tab nào.
- Giả lập CPU chậm 4× **chưa** làm (GĐ0 không thêm animation mới).
- Ảnh chụp: không đính kèm file vào repo; xem phần báo cáo của session.

**Dọn dẹp:** các trang harness tạm (`src/app/avtest*`, `api/avtest-save`) đã xoá, không có trong commit. Phòng test của ván thật đã xoá. **Còn sót 1 phòng lobby cũ `O1e2bKPU1QMym1HvywJb`** (tạo trước khi phiên bị ngắt, mất danh tính host nên không xoá được từ UI; có 4–5 người chơi giả). Nó sẽ tự hết hạn theo bộ dọn phòng cũ (lobby 3 giờ) hoặc xoá tay trong Firestore `rooms/O1e2bKPU1QMym1HvywJb`.

**Quan sát ngoài phạm vi (không sửa):** nhãn "QUEST n" trong ô Quest ở tâm bàn nằm sát mép, có lúc ngắt dòng (rất rõ ở 375px, đôi khi cả 1440px) — có từ trước, nên xem lại ở GĐ1/GĐ3 khi làm lại ô Quest.

### Ghi chú review của nhạc trưởng

**GĐ0 (2026-10-06): đạt, đã push.** Nhạc trưởng tự kiểm lại:
- `npx tsc --noEmit` sạch; `npm run build` thành công.
- `npx eslint src/components/games/avalon`: chỉ còn 2 lỗi có sẵn từ trước.
- Logic-core không đổi: `useAvalon.ts`, `types.ts`, `constants.ts` không có trong diff. `AvalonBoard.tsx` chỉ đổi class `avalon-root` và `players` → `gamePlayers`.
- So tự động từng hàm gốc của `PlayerPanel` với file mới trong `panel/`: chỉ khác ở các chỗ cố ý (đồng hồ dùng `usePhaseClock`, định dạng giữ nguyên; class `av-*`; B2; B6; `startedAt` cho overlay).

Lưu ý cho các GĐ sau:
1. `usePhaseTimeline` chỉ render lại ở **mốc chuyển stage**, không theo từng khung hình. Hiệu ứng chạy liên tục (đếm số, thanh tiến độ) nên làm bằng CSS animation, đồng bộ bằng `animation-delay: -<elapsed>ms` (để reload nhảy đúng chỗ), không setState mỗi frame.
2. Khi bật reduced motion, overlay ám sát bị bỏ hẳn. GĐ5 nên hiện thay bằng **thẻ kết quả tĩnh** (nội dung của stage `reveal`) thay vì không hiện gì.
3. Không dùng `pb-safe` hay `min-h-dvh` của `globals.css` khi cần ghi đè theo breakpoint: chúng không nằm trong `@layer` nên thắng utility của Tailwind. Dùng giá trị tuỳ biến như `pb-[max(1rem,env(safe-area-inset-bottom))]`. Liên quan tới `ActionDock` ở GĐ3.
4. Nhãn "QUEST n" trong ô Quest ở tâm bàn bị ngắt dòng ở 375px: giao cho GĐ1 (mục 1.9).
5. Lint: dùng `npx eslint src/components/games/avalon` làm thước đo. `npm run lint` toàn repo bị nhiễu bởi `.claude/worktrees/**` (ngoài phạm vi).
6. Phòng mồ côi `O1e2bKPU1QMym1HvywJb` sẽ tự hết hạn nhờ bộ dọn phòng cũ, không cần xử lý.
7. Mẹo kiểm thử không cần Firebase (harness tạm, so bố cục, kiểm reduced motion, bot chơi 5 tab) đã được lưu trong memory `avalon-ux-test-recipes`. Người thực thi các GĐ sau nên dùng.

**GĐ1 (2026-10-06): đạt, đã push.** Nhạc trưởng tự kiểm lại:
- `npx tsc --noEmit` sạch; `npm run build` thành công.
- `npx eslint src/components/games/avalon`: vẫn 2 lỗi có sẵn từ trước.
- Logic-core không đổi: `useAvalon.ts`, `types.ts` không có trong diff; `constants.ts` chỉ xoá map hiển thị `ROLE_ICONS`; ở `AvalonBoard.tsx` chỉ đổi JSX từ dòng 315 trở đi.
- Lệnh `rg` đếm emoji trả về 0.
- Đã xem ảnh chụp ở 375 và 1440: team-build, team-vote, role-reveal, lobby, kết thúc.

Chấp nhận các điểm lệch kế hoạch:
- Thêm 3 token `--av-team`, `--av-approve`, `--av-reject`.
- Đồng ý / Từ chối dùng xanh lá / tím mận.
- `lady` dùng icon sóng nước (ảnh AI có thể thay sau qua registry).
- Ô Quest dùng số La Mã; chìa khoá cho chủ phòng.

Lưu ý cho các GĐ sau:
1. **Vẫn còn bề mặt lớn tô màu theo thông tin riêng** (có từ trước GĐ1). Người ngồi cạnh nhìn là đoán được:
   - nền `RoleReveal` và modal `RoleCard`;
   - thẻ "Lá bài bạn đã đặt" ở `QuestPlaySection` (đỏ khi đặt lá Quỷ);
   - nút "PHE QUỶ" bị làm mờ với Phe Người (`disabled:opacity-30`), nên nhìn độ sáng là đoán được phe;
   - thẻ kết quả soi ở `LadySection` (cả người cầm Lady lẫn người bị soi).

   Tất cả chuyển sang **GĐ2a, mục 2.9** (quét lộ phe), không đợi tới GĐ3/GĐ4.
2. Các thẻ còn dùng `blue-*` / `red-*` của Tailwind: GĐ2a chuyển sang token `--av-good` / `--av-evil` cùng lúc với `GlassPanel`.
3. Lobby 375px khi đủ 10 ghế: nút kick chồng lên ghế bên cạnh, ghế hơi sát nhau. Giao cho GĐ4 xem lại.
4. Màn kết thúc: Quest chưa chơi (ví dụ Quest V khi ván kết thúc ở Quest IV) vẫn hiện như "Quest hiện tại" (viền vàng). Giao cho GĐ5.
5. `SCENES` thêm vào `assets/registry.ts` theo đúng mục 4.1. Mỗi lớp cảnh là một `AssetSource`, để sau này thay bằng ảnh AI.
6. Cách chụp ảnh tự động bằng Chrome headless qua DevTools Protocol (cập nhật trong memory `avalon-ux-test-recipes`) dùng tốt; các GĐ sau dùng lại, ảnh để trong `.claude/gd<N>-shots/` (git đã bỏ qua thư mục này).

**GĐ2a (2026-10-07): đạt, đã push.** Nhạc trưởng tự kiểm lại:
- `npx tsc --noEmit` sạch; `npm run build` thành công.
- `npx eslint src/components/games/avalon`: vẫn 2 lỗi có sẵn từ trước.
- Logic-core không đổi: `useAvalon.ts`, `types.ts`, `constants.ts` và các file ngoài thư mục Avalon không có trong diff; `AvalonBoard.tsx` chỉ đổi JSX và thêm `withScene`.
- Đếm emoji = 0; regex màu phe = 0.
- Đã đọc `getScene`, `journey`, `SceneBackdrop`, `GlassPanel`: cảnh là hàm thuần của state; backdrop nằm cùng vị trí ở mọi nhánh `return` nên giữ mount; panel không dùng blur.
- Đã xem 4 cảnh mẫu (đúng phong cách cắt giấy, tối vừa đủ, chi tiết chính ở giữa), cảnh rừng có UI đè lên, các cặp ảnh kiểm lộ phe và ảnh ván thật.

Ghi nhận:
1. **Cảnh trong ảnh ván thật trông mờ hoặc ám tím** là do chụp ở tab chạy nền: trình duyệt dừng CSS animation nên crossfade đứng ở khung đầu (log: `hall+night`, `night+sea`). Màu tím là placeholder `sea`. Không phải lỗi. Khi tab hiện lại, crossfade chạy tiếp.
2. **Cặp ảnh "Lộ vai: Merlin | Sát Thủ" chụp ở khung "Đang lật bài…"** (1,2 giây đầu), chưa phải lúc thẻ vai hiện, nên số 0,13 chưa chứng minh được gì. Đọc code thì thẻ vai đã trung tính. GĐ2b đo lại ở khung thẻ vai (chờ > 1,5 giây).
3. **Chỗ còn lộ lớn nhất là `RoleEmblem`:** khiên xanh hay đỏ khá to ở `RoleReveal`, modal `RoleCard` và `RoleIntroCard` (cặp "Vai của tôi" lệch 3,4, thu còn 10% vẫn phân biệt được). Kế hoạch cho phép tô viền theo phe nên không phải lỗi GĐ2a, nhưng cần siết: giao **GĐ2b, mục 2.11**.
4. Nút "PHE NGƯỜI" / "PHE QUỶ" ở QuestPlay vẫn xanh / đỏ nhưng giống hệt nhau với mọi người xem: chấp nhận.
5. Nút Xoá / Rời đè lên chip nến ở top bar (thấy rõ ở ván thật 375 và 1440): giao GĐ3 (gom vào top bar khi làm `ActionDock`). Padding `px-4 py-6` của trang phòng: giao GĐ4.
6. Các section đêm vẫn khác nhau theo vai (nút "Đã xem" đỏ của Phe Quỷ…): đã nằm trong kế hoạch GĐ4.

### Ghi chú của người thực thi GĐ1

**Đã làm:** đúng 1.1–1.11. Không sửa logic-core: `useAvalon.ts`, `types.ts` không có trong diff; ở `constants.ts` chỉ xoá map hiển thị `ROLE_ICONS`; ở `AvalonBoard.tsx` chỉ đổi JSX (header lobby, nút, banner, màn chờ, `Modal` thêm prop `icon`) và class gốc (`AVALON_ROOT` = `avalon-root` + biến font), khối auto-progression và các handler giữ nguyên. Không thêm dependency, không sửa `globals.css`.

**Cấu trúc mới:** `assets/` (`registry.ts`, `AvIcon.tsx`, `fonts.ts`, `icons/*.tsx` + `icons/gameIcon.tsx`, `CREDITS.md`, `README.md`), `ui/PlayerAvatar.tsx`, `ui/RoleEmblem.tsx`, `presentation.ts` (`ROLE_ICON_NAME`, `TEAM_ICON_NAME`).

**Lệch / quyết định nhỏ so với kế hoạch (nhạc trưởng nên liếc qua):**
1. **Bộ icon** (bảng đã được người dùng duyệt trong session): 47 icon của Lorc, Delapouite, Sbed. So với Phụ lục B: `lady` = sóng nước (`lorc/waves`) vì game-icons.net không có "kiếm nhô khỏi hồ"; `quest-fail` = chén đổ (`lorc/pouring-chalice`) để thành cặp với Chén Thánh và tránh trùng hình khiên với Percival; `team-evil` = mặt nạ quỷ (đôi mắt khó đọc ở cỡ nhỏ); `minion` = `lorc/hood`. Thêm các tên ngoài Phụ lục B: `host` (chìa khoá — lobby đang dùng nhầm 👑 cho chủ phòng), `unknown`, `roles`, `seal`, `card-play`, `team`, `avalon` và 17 icon giao diện. `candle-out` là bản **chỉnh sửa** của `candle-light` (bỏ ngọn lửa, thêm nét khói tự vẽ), ghi rõ trong `CREDITS.md`.
2. File icon đặt tên theo **icon gốc** (`icons/pointy-hat.tsx`), registry ánh xạ khái niệm → component, nên đổi sang icon khác chỉ là thêm file + sửa một dòng. Path làm tròn còn 1 chữ số thập phân bằng script có bù sai số cho toạ độ tương đối (sai lệch tối đa 0,05/512, không trôi): 59 KB → 45 KB ký tự path; toàn bộ `icons/` khoảng 21 KB gzip. `SCENES` để GĐ2 thêm vào cùng file.
3. **Token màu:** thêm 3 token ngoài danh sách: `--av-team` (cam, người được đề cử), `--av-approve` (xanh lá), `--av-reject` (tím mận). Dùng cú pháp Tailwind v4 `text-(--av-gold)`, `bg-(--av-good)/20` (tương đương `text-[color:var(--av-gold)]`, có hỗ trợ độ trong suốt).
4. **Quy ước xanh lam/đỏ chỉ cho phe:** đã đổi những chỗ không mang nghĩa phe: nút và kết quả Đồng ý / Từ chối (xanh lá / tím mận), đồng hồ sắp hết giờ (cam), banner mất kết nối và hover nút Xoá/Rời (cam), nhãn "bạn" (giấy da), nút "Bắt đầu ván" (vàng), mục tiêu Lady (xanh ngọc thay cho hồng fuchsia, ở bàn, danh sách, lưới chọn và nút xác nhận). Các thẻ mang nghĩa phe (thẻ vai, kết quả Quest, đêm, Lady soi ra phe) vẫn dùng lớp `blue-*`/`red-*` của Tailwind; chuyển hàng loạt sang token + `GlassPanel` để GĐ2 làm cùng lúc đổi nền.
5. **Riêng tư (1.8 và hơn thế):** nút top bar thành "Vai của tôi" + icon con mắt, màu trung tính. Thêm: **ghế của chính mình trên `RoundTable` trước đây có viền xanh/đỏ theo phe** (nhìn từ xa là biết phe); nay `PlayerAvatar` dùng viền đứt nét màu giấy da cho "bạn". Còn tồn tại, **chưa sửa** (ngoài phạm vi GĐ1): `RoleReveal` tô cả màn hình theo phe (để GĐ4 làm thư niêm phong); thẻ "Lá bài bạn đã đặt" ở `QuestPlaySection` tô theo lá (GĐ3); huy hiệu gợi ý trên bàn/danh sách (mặt quỷ đỏ cho Merlin/Quỷ, dấu hỏi cho Percival) vẫn hiện suốt ván như trước.
6. **Ô Quest (1.9):** dùng **số La Mã** (font tiêu đề) thay "QUEST n", không bao giờ ngắt dòng. Dưới 640px, ô đã xong chỉ hiện số + icon kết quả + kính lúp (chữ "Thành công/Thất bại", "Chi tiết" chỉ hiện từ `sm`; có `aria-label` đầy đủ); số người hiện thành icon `team` + số. Nhãn đếm lá trong popup chi tiết và màn kết quả Quest đổi thành "Lá Phe Người" / "Lá Phe Quỷ".
7. **Thanh từ chối:** 5 ngọn nến, mỗi lần bị bác tắt một ngọn; ngọn thứ 5 cháy màu `--av-evil` (tắt là Phe Quỷ thắng); ngọn sắp tắt phóng to 125%. Bỏ vương miện đứng đầu thanh và số 1–5 (số còn trong `title`). Chip ở top bar dùng icon nến tắt.
8. **Font:** Cormorant Garamond 600/700, subset `latin` + `vietnamese`, nạp ở `assets/fonts.ts`, gắn biến `--av-font-display` lên mọi `.avalon-root` của `AvalonBoard`. Class `.av-display` (không nằm trong `@layer`, nên thắng utility): ép `font-weight: 700` (font chỉ tới 700, tránh "đậm giả" khi gặp `font-black`) và `font-variant-numeric: lining-nums` (Cormorant mặc định dùng số kiểu cổ, "1" trông như "I"). Dùng cho tiêu đề lobby, tiêu đề modal, tên vai, tiêu đề kết quả và h3 các section; vài tiêu đề viết hoa toàn bộ đổi sang viết thường cho hợp chữ có chân ("Đội được duyệt", "Quest thất bại"…).
9. `.av-icon` (trong `avalon.css`, ngoài `@layer`) đặt `display: inline-block` vì preflight của Tailwind biến mọi `svg` thành `block`. Muốn ẩn/hiện icon theo breakpoint thì bọc trong `<span>` (đã ghi trong `assets/README.md`).
10. Nhánh `{ kind: 'image' }` của `AvIcon` dùng `<img>` thường (có `eslint-disable` cho `@next/next/no-img-element`): icon nhỏ, cỡ theo `em`, trình tối ưu ảnh không giúp gì.
11. `PlayerAvatar`: 10 màu (không có xanh lam/đỏ thuần), băm FNV-1a theo `player.id`, nên 2 người có thể trùng màu (tên vẫn khác). Màu nền không đổi theo trạng thái nữa (trước đây đổi gradient khi được chọn); trạng thái thể hiện bằng vòng: đề cử (cam), Lady ngắm (xanh ngọc), Sát Thủ ngắm (đỏ), "bạn" (viền đứt nét). Dùng ở `RoundTable`, `LobbyRoundTable`, `PlayerRoster`, `TeamBuildSection` (lưới + chip đội), `LadySection`, `AssassinSection`, `NightSections`, `QuestDetailPopup`, `AssassinRevealOverlay`.
12. `RoleEmblem`: khiên SVG tự vẽ, 5 cỡ (xs–xl). Dùng ở `RoleReveal`, `RoleCard`, `RoleIntroCard`, `RoleLineChip`, `RoleGuide`, `RolePreviewPopup`, `RoomSettings`, danh sách Phe Quỷ ở màn ám sát, overlay ám sát và màn kết thúc.
13. Emoji chỉ để trang trí được thay bằng icon sẵn có hoặc bỏ: 🤫 → `team-good`, 🤝/💀 → `team-evil`, 😴 → `night`, 🤐 và 👤 bỏ. Ký hiệu ✓ nằm trong câu chữ của nút được giữ (đúng mục "Bổ sung sau GĐ0").
14. Top bar ở 375px nay nằm gọn **một dòng** (GĐ0 ghi là cao thêm một dòng): `PhaseChip` không xuống dòng, nút "Các vai" chỉ còn icon dưới `sm`.
15. Lobby: huy hiệu chủ phòng là chìa khoá; nút kick màu tối trung tính với icon đóng.
16. Dọn kèm: bỏ import `ROLE_NAMES_VI` không dùng trong `RoomSettings` (cảnh báo ESLint có từ trước).

**Kết quả kiểm thử:**
- `npx tsc --noEmit` sạch; `npm run build` thành công.
- `npx eslint src/components/games/avalon`: 2 lỗi `react-hooks/set-state-in-effect` có sẵn (`AvalonBoard.tsx:127` — trước là dòng 121, lệch do thêm import — và `QuestPlaySection.tsx:27`) + 2 cảnh báo có sẵn trong `useAvalon.ts`. Không có vấn đề mới (bớt 1 cảnh báo, xem mục 16).
- `rg -c "\p{Extended_Pictographic}" src/components/games/avalon -g "!**/docs/**"` → **0**.
- **Ảnh Preview:** 41 cảnh × 375px (chụp cả chiều cao trang) và 1440×900, cộng khung "lộ vai" của overlay ám sát ở 2 cảnh `end-*` có ám sát: 86 ảnh, chụp bằng Chrome headless qua DevTools Protocol trên trang harness tạm (không cần Firebase). Ảnh nằm ở `.claude/gd1-shots/` (git bỏ qua), mở `index.html` để xem theo cặp. Đã sửa sau khi xem ảnh: top bar xuống dòng, huy hiệu vai nằm cùng dòng với nhãn phe ở `RoleReveal`/`RoleCard`/`RolePreviewPopup`, số kiểu cổ.
- **Đổi icon sang ảnh:** tạm đặt `merlin: { kind: 'image', src: '/avalon/icons/test-merlin.png' }` với một PNG 128×128 tự tạo: ảnh hiện đúng trong `RoleEmblem` và cả icon trong dòng tiêu đề (`tsc` vẫn sạch). Đã trả lại và xoá file.
- **Font tiếng Việt:** chuỗi "ẦẨẪẬ ỀỂỄỆ ỒỔỖỘ ƯỪỬỮỰ", "Phe Người thắng!", "Đội bị từ chối" hiển thị đúng dấu bằng Cormorant Garamond; ở lobby thật, `--av-font-display` có trên `.avalon-root` và tiêu đề modal tính ra `font-family: "Cormorant Garamond"`.
- **Reduced motion** (giả lập qua DevTools Protocol, 41 cảnh): 0 phần tử còn animation/transition trong `.avalon-root`; overlay ám sát bị bỏ qua như GĐ0. Không giả lập thì overlay hiện ở 2 cảnh có ám sát.
- **CPU chậm 4×:** đổi cảnh → vẽ xong 2 khung: trung bình 85 ms, tối đa 127 ms (`team-vote-not-voted`). GĐ1 không thêm animation.
- **Lỗi JS:** 0 trên cả 2 lượt quét 41 cảnh.
- **Lobby thật** (`next dev`, Firebase thật): tạo phòng, kiểm header, các nút, huy hiệu chủ phòng, viền "bạn" ở 375px; header 1 hàng ở 1440px; mở modal Cài đặt và Hướng dẫn vai (icon tiêu đề, nút đóng, dòng credit). **Đã xoá phòng test** (mở lại link báo "Room Not Found").
- **Không làm:** ván thật 5 người (GĐ1 không đụng đồng bộ hay thời gian).

**Dọn dẹp:** trang harness `src/app/avtest` và file PNG thử đã xoá, không có trong commit. Đã tạo `.claude/launch.json` (git bỏ qua) để chạy preview.

**Gợi ý cho GĐ sau:**
- Ảnh chụp tự động qua DevTools Protocol (Chrome headless `--remote-debugging-port`, `Emulation.setDeviceMetricsOverride` cho 375px, đổi `<select>` của Preview bằng native setter + sự kiện `change`) ổn định hơn chụp trong pane trình duyệt của app (pane hay treo khi cửa sổ bị che).
- Icon đứng riêng một dòng phía trên chữ (huy hiệu lớn, icon kết quả) nên bọc trong `<div className="flex justify-center">`: `AvIcon` và `RoleEmblem` là phần tử inline, đứng cạnh một `<span>` thì sẽ nằm cùng dòng.

### Ghi chú của người thực thi GĐ2a

**Đã làm:** 2.1–2.5, 2.8, 2.9, 2.10 và 4 cảnh mẫu. Không sửa logic-core: `useAvalon.ts`, `types.ts`, `constants.ts` không có trong diff; ở `AvalonBoard.tsx` chỉ đổi JSX (mọi nhánh `return` bọc qua `withScene`, thẻ QR thành `GlassPanel`, màu chữ màn chờ, nút Xoá/Rời bỏ blur), khối auto-progression và các handler giữ nguyên. Không thêm dependency, không sửa `globals.css`, không đụng game khác.

**Cấu trúc mới:** `scenes/types.ts` (id cảnh, `SCENE_NAMES_VI`, kiểu palette/hạt), `scenes/journey.ts` (`getJourney`, FNV-1a + mulberry32, memo 1 mục), `scenes/getScene.ts`, `scenes/SceneBackdrop.tsx`, `scenes/paper.tsx` (hình cắt giấy có seed), `scenes/layers/{hall,night,camp,forest}.tsx`, `ui/GlassPanel.tsx`; `SCENES` thêm vào `assets/registry.ts`; `assets/README.md` có mục "Cảnh nền" (khung hình, cách thay lớp bằng ảnh, cách vẽ thêm cảnh).

**Lệch / quyết định nhỏ so với kế hoạch (nhạc trưởng nên liếc qua):**
1. **Cảnh vẽ bằng hàm dựng hình có seed** (`paper.tsx`: `ridge`, `pineRow`, `blobs`, `archPath`, `scatter`) chạy một lần lúc nạp module, thay vì dán path tĩnh: mỗi file cảnh 3,6–5,1 KB, dễ chỉnh, server và client vẽ giống hệt (không lệch hydration). Mỗi lớp vẫn là một component SVG trong `SCENES`, nên thay bằng ảnh được.
2. **Khung hình:** mỗi lớp là một bức 1600×900 đặt trên một "sân khấu" CSS phủ kín màn hình, neo đáy-giữa (= `xMidYMax slice`), tính bằng container query units (`cqw`/`cqh`). Lớp SVG, lớp ảnh và hạt hiệu ứng dùng chung toạ độ đó. Điện thoại dọc thấy đủ chiều cao nhưng chỉ x ≈ 590–1010, nên chi tiết chính đặt giữa.
3. **`SceneBackdrop` do container render** (`AvalonBoard` cho cả lobby, màn chờ và trong ván; `AvalonPreview` tự render), không nằm trong `PlayerPanel`: nhờ vậy backdrop giữ mount khi chuyển lobby → ván. Nó là `fixed inset-0 -z-10`, nằm trong stacking context `main.relative.z-10` của trang phòng.
4. **Crossfade 700 ms**, nhưng **không fade trong 1,5 s đầu sau khi mount**: khi reload, màn "Đang tải" (cảnh `hall`) đổi sang cảnh thật ngay, không fade. Tab ở nền: trình duyệt không chạy CSS animation, nên cảnh cũ nằm dưới cho tới khi tab hiện lại rồi mới fade (thấy rõ trong ván thật chạy headless); thuộc tính `data-scene` luôn là cảnh mới.
5. **Storm** chưa vẽ (GĐ2b): `getScene` trả `storm`, và `SceneBackdrop` hiện một lớp tạm (phủ tối + vệt mưa tĩnh, `.av-storm-placeholder`). `getScene` trả thêm `location`: địa điểm đang chơi, hoặc địa điểm kế khi đang ở `camp` (cho tiêu đề "Dựng trại trước…" của GĐ2b).
6. **Token:** `--av-glass-bg` 0,72 → 0,8; thêm `--av-bar-bg` (thanh trên, gần đặc), `--av-good-light` / `--av-evil-light` (chữ màu phe trên nền tối), `--av-reject-light`. Thanh trên cùng và nút Xoá/Rời bỏ `backdrop-filter: blur`; modal giữ blur (mỗi lúc chỉ có một modal).
7. **Quét lộ phe, thêm ngoài danh sách:** `RolePreviewPopup` (khung và nút tô theo phe người xem), `RoleIntroCard` (thẻ "Bạn là…" ở đêm tô theo phe), thẻ "Phiếu của bạn" sau khi bầu (tô theo phiếu; nay là "Đã bỏ phiếu" trung tính, lựa chọn chỉ còn một dòng nhỏ), và các hàng `PlayerRoster` bị tô đỏ/chàm theo hiểu biết riêng (Merlin/Quỷ/Percival; nay chỉ còn chip nhỏ). `RoleCard`/`RoleReveal`: ô mô tả có `min-h` bằng mô tả dài nhất (4 dòng), nên thẻ của mọi vai cao bằng nhau.
8. **QuestPlay:** câu luật chung cho mọi người trong đội ("Phe Người bắt buộc… · Phe Quỷ…") thay cho hai câu khác nhau theo phe. Hai nút vẫn xanh/đỏ (mỗi nút giống nhau với mọi người xem; tôi hiểu "giống hệt nhau với mọi người chơi" theo nghĩa đó). Vòng chọn màu vàng như nhau; nút xác nhận vàng cố định, ghi "Xác nhận đặt lá" + icon cỡ chữ; toast thay cho `alert()`.
9. **Lady:** "PHE THIỆN / PHE ÁC" đổi thành "Phe Người / Phe Quỷ" (`TEAM_NAME_VI`) cho thống nhất. Nút Hoàn tất / Xác nhận soi dùng `--av-lady` + chữ mực.
10. **Tương phản:** chữ trắng trên nút màu token (Đồng ý, Từ chối, nút "Đã xem" ở đêm, Xác nhận đâm) chỉ đạt ~2,8–3,6:1, nên đổi sang chữ mực `--av-ink`. Gradient emerald 600 → 700. Vài nhãn `slate-500`/`stone-500` (ví dụ "Quest n/5", "N người" ở ô Quest) đổi thành `-400`. Chip phase đêm/ám sát dùng bản `-light`. Nút bị vô hiệu ở QuestPlay/TeamBuild/Assassin không dùng `opacity` nữa (cảnh nhìn xuyên qua), thay bằng nền tối đặc.
11. **Preview:** thêm cảnh mock `role-reveal-evil`, `team-vote-voted-reject`, `quest-play-on-team-evil`, `quest-play-played-good|evil` để chụp theo cặp. Các cảnh quest-play đổi Leader thành Charlie (người ngoài cặp), để so cặp không bị lệch bởi dải "Bạn là Leader" (thông tin công khai). Nút "Các vai" nay mở `RolePreviewPopup`. Header của Preview cao thêm 2 dòng (ô Cảnh + Bão, dòng hành trình + "Ván khác").
12. `rg "(blue|red|rose|cyan)-[0-9]" src/components/games/avalon` = **0**, nên không còn chỗ nào cần ghi lý do. Ngoài regex còn `indigo-*` (Percival: "Merlin hay Morgana", lượt đêm Percival) và `fuchsia-*`/`purple-*` (lineup, nút "Các vai"); các màu này không mang nghĩa phe.

**Còn lộ (theo 2.9, để GĐ4):**
- **Các section đêm** khác nhau theo vai: Quỷ thấy danh sách đồng đội + nút, Merlin thấy danh sách + nút, người khác thấy thẻ chờ. Cặp "Đêm Phe Quỷ: Người | Quỷ" lệch TB 19,4 (375px), ngang 2 phase khác nhau. GĐ4 xử lý bằng lớp phủ "nhắm mắt".
- Huy hiệu gợi ý nhỏ trên bàn/danh sách (mặt quỷ cho Merlin/Quỷ, dấu hỏi cho Percival) vẫn hiện; đây là chi tiết cỡ icon, có từ trước. `RoleEmblem` giữ viền + lòng khiên tô nhẹ màu phe (2.9 cho phép).
- `AssassinSection` khác nhau theo phe, nhưng lúc đó cả Phe Quỷ đã lộ công khai.

**Kết quả kiểm thử:**
- `npx tsc --noEmit` sạch; `npm run build` thành công (build lại sạch sau khi xoá harness).
- `npx eslint src/components/games/avalon`: 2 lỗi `react-hooks/set-state-in-effect` có sẵn (`AvalonBoard.tsx:145`, trước là 127, lệch do thêm import và `withScene`; `QuestPlaySection.tsx:28`) + 2 cảnh báo có sẵn trong `useAvalon.ts`. Không có vấn đề mới.
- Đếm emoji = 0; regex màu = 0.
- **getJourney / getScene:** biên dịch bằng `tsc` rồi chạy bằng Node, 13 kiểm tra đạt. Cùng `seatOrder` (khác instance, xen kẽ ván khác) cho cùng hành trình. 300 `seatOrder` ngẫu nhiên cho 281 hành trình khác nhau, và cả 7 địa điểm đều có lúc mở màn. `seatOrder` rỗng thì seed theo `roomId`. Ánh xạ phase đúng bảng 2.3; `storm` chỉ bật ở Quest 4 khi ≥ 7 người và chỉ ở cảnh địa điểm; `currentQuest` ngoài 0..4 không vỡ. Preview hiện hành trình, nút "Ván khác" đổi `seatOrder` để xem hành trình đổi.
- **Ảnh** ở `.claude/gd2a-shots/` (mở `index.html`), chụp bằng Chrome headless qua DevTools Protocol trên harness tạm:
  - 8 cảnh trần (ẩn UI: 4 cảnh mẫu + 4 placeholder) ở 1440 và 375;
  - 46 cảnh Preview × (375 phần trên + phần dưới khi cuộn, 1440), kèm khung lộ vai của overlay ám sát;
  - vòng Quest trên cảnh rừng + lớp bão tạm;
  - kết quả: 0 lỗi JS, `[data-phase-section]` = 1 ở mọi cảnh, placeholder không vỡ bố cục.
- **Đổi lớp sang ảnh:** tạm đặt lớp gần của `forest` = `{ kind: 'image', src }` với một PNG 1600×900 tự tạo; ảnh nạp đủ 1600 px và nằm đúng khung ở 1440 và 375. Đã trả lại registry và xoá file.
- **Không lộ phe từ xa** (cặp ảnh thu còn 10%, độ lệch điểm ảnh trung bình 0–255; composite ở `pairs/`):

  | Cặp | 375 | 1440 |
  |---|---|---|
  | Lộ vai: Merlin \| Sát Thủ | 0,13 | 0,06 |
  | Đặt lá, chưa chọn: Người \| Quỷ | 0,31 | 0,45 |
  | Đặt lá, đã chọn: Người chọn lá Người \| Quỷ chọn lá Quỷ | 1,98 | 0,73 |
  | Đã đặt lá: Người \| Quỷ | 0,31 | 0,45 |
  | Đã bầu: Đồng ý \| Từ chối | 0 | 0,02 |
  | Lady thấy: Người \| Quỷ | 1,28 | 1,09 (GĐ1: 3,13) |
  | Bị soi: Người \| Quỷ | 1,60 | 1,37 (GĐ1: 5,83) |
  | Modal "Vai của tôi": Merlin \| Mordred | 3,37 | 0,85 |
  | Popup "Các vai": Merlin \| Mordred | 1,94 | 0,52 |
  | *Đối chứng: 2 phase khác nhau* | *14,87* | *11,12* |
  | *Đêm Phe Quỷ: Người \| Quỷ (GĐ4)* | *19,37* | *10,25* |

  Phần lệch còn lại là chi tiết cỡ icon: viền/lòng huy hiệu, icon kết quả soi, vòng chọn, huy hiệu gợi ý trên bàn.
- **Ván thật** (bản production; 5 origin `localhost`, `127.0.0.1`, `a.localhost`, `b.localhost`, `c.localhost`; không dùng IP LAN):
  - Ván chạy lobby → lineup → thư lộ vai → đêm → Quest 1 (chọn đội, bầu, kết quả phiếu, chơi, kết quả) → thảo luận → Quest 2.
  - **11 checkpoint, 5 tab cùng cảnh ở mọi checkpoint** (`hall` → `night` → `sea` → `camp` → `mountain`).
  - Reload tab `a.localhost` giữa Quest 2: vào thẳng `mountain`, khớp 4 tab còn lại.
  - 0 lỗi JS ở cả 5 tab. Ảnh ở `game/`.
  - Phòng test đã xoá (link báo "Room Not Found"). Lần chạy thứ 2 bị `timeout` cắt trước bước dọn dẹp, nên tôi xoá tay phòng đó bằng danh tính chủ phòng; cả 3 phòng đều đã xác nhận "Room Not Found".
- **CPU chậm 4×** (Chrome headless, có hạt hiệu ứng, bước hình không giới hạn vsync): trong lúc crossfade và 4 s đứng yên, ở 375 và 1440 với `forest` (16 hạt), `camp` (10), `hall` (12), `night` (12):
  - không khung nào > 50 ms;
  - p95 = 7 ms; khung dài nhất 28 ms (lúc crossfade).
  - Animation của cảnh chỉ đụng `opacity` và `transform`.
- **Reduced motion** (giả lập): 0 hạt hiện, 0 animation đang chạy trong `.avalon-root`, đổi cảnh thay ngay (không giữ 2 lớp).
- **Tương phản chữ:** đo trên điểm ảnh thật. Với mỗi chữ ≤ 18,5 px trong UI ván, chụp lại màn hình với chữ trong suốt để có đúng nền dưới chữ, rồi so màu chữ với trung vị nền. Đo 19 cảnh × 2 cỡ, ở cả phần trên và phần dưới khi cuộn, gồm `forest`, `hall`, `camp`, `night` và placeholder.
  - Chữ thân ≥ 11 px: **1866/1866 đạt ≥ 4,5:1**, thấp nhất 4,56. Theo phân vị 75 (mảng nền sáng hơn): 1852/1866.
  - Chữ < 11 px: 512/512 đạt.

**Quan sát ngoài phạm vi (không sửa):**
- Ở ván thật 375px, nút Xoá/Rời `absolute right-4 top-4` của `AvalonBoard` đè lên chip thanh từ chối ở top bar. Lỗi này có từ trước (Preview không render nút này nên ảnh GĐ0/GĐ1 không thấy). Đề nghị xử lý ở GĐ3 cùng `ActionDock`.
- Trang phòng bọc game trong `px-4 py-6`, nên top bar của ván không tràn mép. GĐ4 có thể xử lý khi rẽ nhánh `page.tsx`.

**Dọn dẹp:** harness `src/app/avtest` đã xoá (không có trong commit), `.next` build lại sạch, file ảnh thử đã xoá, 3 phòng test đã xoá.

**Gợi ý cho GĐ2b:**
- Vẽ cảnh mới theo mẫu `scenes/layers/forest.tsx`: xuất các lớp `sceneLayer(...)` + `PALETTE` + `PARTICLES`, đăng ký trong `SCENES` và bỏ `placeholder`.
- Mọi hình trong cùng một `<path>` phải cùng chiều kim đồng hồ; hình lật gương để ở `<path>` riêng, nếu không chỗ chồng nhau bị thủng (luật `nonzero`).
- Lớp bão: thay `.av-storm-placeholder` trong `SceneBackdrop` bằng `weather/Storm.tsx`; cờ `storm` đã có sẵn.
- `SceneTitle` dò đổi cảnh theo `data-scene` / `getScene(...).id`, và dùng `location` cho câu "Dựng trại trước <địa điểm kế>".

---

## Phụ lục A — Lỗi đã phát hiện (commit `c74fcbad`), đều xử lý ở GĐ0

| # | Lỗi | Vị trí |
|---|---|---|
| B1 | Bàn tròn hiện ghế theo thứ tự vào phòng, nhưng Leader xoay theo `seatOrder` (random), nên trên màn hình Leader kế tiếp "nhảy cóc" | `AvalonBoard.tsx:493` truyền `players` thay vì `gamePlayers` |
| B2 | Kết quả phiếu chỉ đếm phiếu reject đã bầu; logic thì tính người không bầu là Từ chối, nên số hiện ra có thể mâu thuẫn với kết quả | `PlayerPanel.tsx:2099` |
| B3 | Mobile không chạm avatar trên bàn để chọn đội / chọn Merlin được, trong khi hướng dẫn bảo làm vậy | `PlayerPanel.tsx:360`, `:2635` |
| B4 | Overlay ám sát chạy theo thời điểm mount, nên reload là phát lại | `PlayerPanel.tsx:2706` |
| B5 | `.animate-stab` và `.animate-assassin-fly-in` được định nghĩa 2 lần với keyframes khác nhau | `avalon.css:20,39` và `globals.css:355,377` |
| B6 | Chữ "Tự động vào Quest sau", thực ra là sang lượt Đêm | `PlayerPanel.tsx:1215` |
| B7 | `QuestTrack.tsx`, `VoteTrack.tsx`, `WaitingCard` không được dùng | |
| B8 | Các cảnh Lady trong `AvalonPreview` không còn khớp logic | `AvalonPreview.tsx:36-43,494-520` |
| B9 | Mỗi section render 2 lần (cây desktop và mobile), timer chạy đôi | `PlayerPanel.tsx:316,357` |
| B10 | Nền tô theo phe người xem: người bên cạnh nhìn là biết phe (để GĐ2 xử lý) | `PlayerPanel.tsx:307-311` |

## Phụ lục B — Bản đồ icon (khái niệm; người thực thi đề xuất icon cụ thể để người dùng duyệt)

| Tên | Khái niệm | Từ khoá gợi ý trên game-icons.net (cần xác minh) |
|---|---|---|
| `merlin` | Mũ phù thuỷ hoặc gậy phép có sao | pointy-hat, wizard-staff |
| `percival` | Khiên chữ thập | templar-shield |
| `loyal-servant` | Kiếm dựng đứng hoặc mũ giáp | broadsword, visored-helm |
| `mordred` | Đầu lâu đội vương miện (tối) | crowned-skull |
| `morgana` | Quả cầu pha lê hoặc trăng lưỡi liềm | crystal-ball |
| `oberon` | Cú | owl |
| `assassin` | Dao găm | plain-dagger |
| `minion` | Người trùm mũ | hood, cultist |
| `leader` | Vương miện vàng (khác hẳn Mordred) | crown |
| `lady` | Kiếm nhô lên khỏi mặt hồ (Excalibur) | sword-altar, wave |
| `quest-success` | Chén Thánh sáng | holy-grail |
| `quest-fail` | Khiên vỡ hoặc chén đổ | broken-shield |
| `vote-approve` / `vote-reject` | Cờ giương / cờ rách (không dùng xanh/đỏ phe) | flag, banner |
| `candle-lit` / `candle-out` | Ngọn nến cháy / tắt, có khói | candle-light |
| `team-good` / `team-evil` | Khiên sư tử / mắt quỷ | lion, evil-eyes |
| Phase | `night` (trăng), `discussion` (lửa trại), `vote` (phiếu), `quest` (cuộn giấy), `assassinate` (đâm lén), `end` (lâu đài) | moon, campfire, scroll-unfurled, backstab, castle |
| Khác | Con mắt (xem vai), dấu sáp, đồng hồ cát | eye, wax-seal, hourglass |

## Phụ lục C — Bảng màu cảnh (đã phác thảo; cắt giấy phẳng, không gradient nặng)

| Cảnh | Màu chính |
|---|---|
| `hall` | nền `#23170f`, vòm `#3a2a1c`, cờ `#9a7024`, đuốc `#f2a541`, sàn `#1a110b`, bàn `#5a3a1e` / `#7c5229` |
| `night` | trời `#0e1326`, sao `#cfd6ff`, trăng `#e8e3c9`, lâu đài `#05070f`, cửa sổ `#f2c14e` |
| `forest` (Rừng Broceliande) | `#0f2a22`, sương `#1d4a3c`, cây xa `#163d31`, cây gần `#0a1f19`, đom đóm `#d9f27a` |
| `mountain` (Đèo núi tuyết) | `#1f2833`, núi xa `#3a4756`, tuyết `#c9d2db`, núi gần `#121921`, bông tuyết `#e8eef4` |
| `sea` (Biển Tintagel) | trời `#2b2140`, chân trời `#7a4a2c`, mặt trời `#e0913a`, biển `#12304a`, sóng `#2a5170`, vách đá `#0b0f14` |
| `ruins` (Phế tích) | `#1c1a26`, mây `#2c2838`, phế tích `#0b0a10` (mưa `#3c3850` và chớp `#e6e0ff` thuộc lớp Storm) |
| `chapel` (Nhà nguyện Chén Thánh) | `#2a2210`, tia sáng `#4a3a14`, vòm `#120e06`, chén `#e3b341` |
| `marsh` (Đầm lầy sương, mới) | `#1a2420`, sương `#2c3a33`, lau sậy `#0c1310`, ma trơi `#9fe3c8` |
| `cave` (Hang rồng, mới) | `#120d0b`, đá `#2a201a`, mắt rồng `#e0663a`, ánh vàng `#e3b341` |
| `camp` | `#140f0c`, quầng sáng `#22160e`, lều `#2b211a`, đất `#1f1712`, lửa `#e0663a` / `#f2c14e`, tia lửa `#f2a541` |
| `lake` (Hồ Avalon) | `#132a33`, sương `#1f4450` / `#2a5560`, nước `#0d222a`, kiếm `#d6dee3`, chuôi `#b8a24a`, gợn sóng `#3f7280` |
| `blood-moon` | `#1a0d10`, trăng `#8f2a2a`, cây và đất `#0a0506`, quạ `#050203` |
| `end-good` (Bình minh Camelot) | trời `#5d6a8c`, rạng đông `#d9a86a` / `#f2c879`, mặt trời `#ffd98a`, lâu đài `#1a1d2b` |
| `end-evil` (Camelot chìm lửa) | `#140a0a`, khói `#2a1a1a`, lửa `#a8321f` / `#e0663a`, lâu đài `#050303` |

Không dùng mảng lớn xanh lam hoặc đỏ bão hoà ở các cảnh trong ván, để màu phe vẫn nổi bật.

## Phụ lục D — Ngân sách thời gian animation theo phase (`PHASE_TIMEOUTS_MS`, không đổi)

| Phase | Thời lượng | Animation tối đa | Ghi chú |
|---|---|---|---|
| `lineup-preview` | 60s | ~4s | Có nút sẵn sàng; không chặn nút |
| `role-reveal` | 120s | ~1,5s | Mở thư do người chơi chủ động |
| `night-*` | 45s mỗi lượt | ~1,5s | Không rung, không làm màn hình khác nhau |
| `team-build` | 60s | ~1s | Token bay; không chặn việc chọn |
| `team-vote` | 30s | ≤ 0,6s | Phase rất ngắn, tuyệt đối không chặn |
| `team-vote-result` | **8s** | ≤ 5s | Chừa ~3s để đọc |
| `quest-play` | 120s | ~0,8s | |
| `quest-result` | **8s** | ≤ 5,5s | Lật tối đa 5 lá |
| `discussion` | tối đa 600s | ~2,5s (tiêu đề cảnh) | |
| `lady-of-lake` | 60s | ~1,5s | Mỗi lần đổi mục tiêu, đồng hồ được đặt lại |
| `assassinate` | 180s | — | |
| `end` | — | overlay ~8s, rồi tổng kết | Chạm để bỏ qua overlay |

## Phụ lục E — Giọng văn dẫn truyện

Câu ngắn (≤ 90 ký tự), ngôi thứ ba, không tiết lộ vai, có chút u tối, tránh sáo rỗng. Ví dụ:
- `forest`: "Đoàn hiệp sĩ tiến vào rừng Broceliande. Trong sương, không ai chắc người bên cạnh là ai."
- `camp`: "Lửa trại bập bùng. Đêm nay, lời nói cũng sắc như kiếm."
- `lake`: "Mặt hồ Avalon lặng như gương — và gương thì không biết nói dối."
- `blood-moon`: "Trăng nhuốm máu. Kẻ ám sát chỉ có một nhát duy nhất."
