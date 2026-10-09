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

#### Bổ sung cho GĐ3 (nhạc trưởng, 2026-10-08)
- **Việc tồn từ các GĐ trước, phải làm trong GĐ3:**
  - Nút Xoá / Rời của `AvalonBoard` (`absolute right-4 top-4`) đang đè lên chip nến ở top bar, ở cả 375 lẫn 1440. Đưa nút này vào top bar (hoặc menu nhỏ trong top bar). Chỉ đổi JSX, handler giữ nguyên.
  - `animate-pulse` trên ô Quest hiện tại (`RoundTable`) và trên avatar đang được đề cử làm mờ **cả chữ**. Chỉ cho **viền hoặc ánh sáng** nhấp nháy; chữ luôn đậm đủ (≥ 4.5:1).
  - Kiểm lại vị trí `SceneTitle` khi có `ActionDock`: tiêu đề không được che nút hành động; nếu chồng nhau thì dời tiêu đề.
- **Nền tảng có sẵn để dùng:**
  - `usePhaseTimeline` (các mốc stage) cho các chuỗi animation;
  - với hiệu ứng chạy liên tục (đếm số, xáo bài): dùng CSS animation kèm `animation-delay: -<elapsed>ms` (xem `SceneTitle` và `Storm`), không setState mỗi khung hình;
  - `seatPosition` cho toạ độ ghế; `PlayerAvatar`, `GlassPanel`, `AvIcon` và token màu `--av-*`.
  - Không dùng lại lớp `blue-*` / `red-*`; regex màu phe phải vẫn = 0.
- **Riêng tư trong animation (mục 2.4):**
  - Lá bài bay vào chồng bài ở `quest-play` phải **giống hệt nhau** dù là lá Người hay lá Quỷ (luôn úp, cùng màu, cùng đường bay).
  - Lá phiếu úp sau khi bầu trông như nhau dù Đồng ý hay Từ chối.
  - Kết quả lật bài ở `quest-result` dựng từ số đếm, xáo bằng seed `phaseStartedAt`.
- **`ActionDock` (mobile):** `fixed` ở đáy, có safe-area. Dùng giá trị tuỳ biến như `pb-[max(1rem,env(safe-area-inset-bottom))]`, **không** dùng `pb-safe` của `globals.css` (ghi chú review GĐ0, mục 3). Thêm khoảng đệm đáy cho cột nội dung để dock không che chữ. Desktop giữ nút ở cột phải như cũ.
- **Kiểm thử thêm:**
  - Mỗi chuỗi animation: reload ở giữa chuỗi phải nhảy đúng khung; với reduced motion thì hiện ngay trạng thái cuối.
  - Đo ngân sách thời gian (Phụ lục D) trong ván thật 5 tab: `team-vote-result` và `quest-result` xong trước 5–5,5 giây, cả 5 tab cùng khung (lệch ≤ 1 nhịp lấy mẫu).
  - Cặp ảnh riêng tư cho `quest-play` lúc lá đang bay và lúc đã đặt, và cho `team-vote` sau khi bầu.

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

#### Bổ sung cho GĐ4 (nhạc trưởng, 2026-10-09)
- **Việc tồn phải làm trong GĐ4:**
  - **Top bar:** chip phase **không được** hiện dấu "…". Ở bề rộng không đủ cho nhãn ngắn thì chỉ hiện icon (nhãn đầy đủ vẫn có trong `title` / `aria-label`). Kiểm ở 320, 360, 375, 390px **trong ván thật**: trang phòng hiện bọc `px-4`, nên bề rộng thật nhỏ hơn màn hình 32px.
  - **Trang phòng:** khi rẽ nhánh `gameType === 'avalon'` trong `page.tsx`, bỏ `px-4 py-6` cho Avalon (Avalon tự lo khoảng đệm). Các game khác giữ nguyên.
  - **Dock:** đưa nút "Đã đọc" ở lineup và các nút "Đã xem" ban đêm vào `ActionDock`, cùng lúc với lớp phủ "nhắm mắt". **Mọi người** đều thấy dock với cùng một nút ("Tôi đã mở mắt / Tiếp tục", hoặc "Nhấn giữ để xem"), nên dock không lộ ai có vai trong lượt đó.
  - **Riêng tư:**
    - `PlayerRoster` bản mobile không được cao khác nhau theo vai. Ví dụ: gợi ý chỉ là icon cạnh tên, hoặc mọi hàng giữ chỗ chip như nhau.
    - `RoleCard` ("Vai của tôi") cũng dùng **nhấn giữ để xem**, giống `RoleReveal`. Đây là phần còn lệch 1,5–2,5 ở 375 (ghi chú GĐ2b).
  - **Lobby 375px khi đủ 10 ghế:** nút kick đè ghế bên cạnh (ghi chú GĐ1). Làm nút kick nhỏ hơn hoặc gom vào menu của ghế.
- **Nền tảng có sẵn:**
  - Vương miện quay quanh bàn: dùng lại `TableTokens` / `useOrbit`. Hiệu ứng "vòng quay" ở lineup có thể đặt số vòng và điểm dừng tính từ `seatOrder` + `currentLeaderId`, để mọi máy giống nhau.
  - Thời gian dùng `useCue` / `<Cued>` + `usePhaseTimeline`, theo quy ước "style tĩnh = khung cuối".
  - **Xáo ghế:** **không** dịch chuyển hay xoay một lớp to bằng cả bàn, vì hộp đã biến đổi sẽ thò ra ngoài trang (bài học GĐ3, ghi chú trong `TableTokens`). Mỗi ghế tự `transform` từ vị trí cũ (thứ tự `joinedAt`) tới vị trí mới (`seatOrder`), tính bằng `cqw` trên neo kích thước 0.
- **Riêng tư ở đêm (mục 2.4):** lớp phủ đêm và dock phải **giống hệt nhau trên mọi máy** khi không ai nhấn giữ. Nhấn giữ thì chỉ máy đó hiện thông tin. Không rung máy. Đo bằng cặp ảnh như GĐ2a, cho cả 3 lượt đêm (người có vai và người không).
- **Gợi ý model:** Opus 5.5 (nhiều phần hình ảnh: trang vào phòng, thư niêm phong, màn đêm).

### GĐ5 — Kết thúc ván
- Cảnh `end-good` / `end-evil`. Banner cá nhân "Bạn thắng!" / "Bạn thua…" (so phe của người xem với `winner`).
- Tàn lửa hoặc hạt lấp lánh trong 3 giây, tối đa 30 hạt.
- Vai được lật lần lượt ngay trên `RoundTable` (thêm prop `revealAll`), mỗi ghế cách nhau 150ms. Màn này bắt đầu sau khi overlay ám sát xong (dùng chung timeline).
- **Tổng kết:** `JourneyStrip` mở rộng. Mỗi Quest hiện địa điểm, Leader, đội, số Đồng ý / Từ chối (của đề xuất được duyệt), kết quả và số lá thất bại. Kèm lý do thắng: đủ 3 Quest / Sát Thủ trúng hoặc trật / 5 lần bị bác.
- `ui/ConfirmDialog.tsx` thay cho `confirm()` gốc ở: ván mới, rời phòng, xoá phòng, kick (`AvalonBoard`), và xác nhận đâm (`AssassinSection`). Chỉ thay phần UI, giữ nguyên handler.

#### Bổ sung cho GĐ5 (nhạc trưởng, 2026-10-09)
- **Việc tồn phải làm trong GĐ5:**
  - Nút cuối ván ("Chơi tiếp ván mới", "Thoát phòng") vào `ActionDock` (chuyển từ GĐ3).
  - Quest chưa chơi (ví dụ Quest V khi ván kết thúc ở Quest IV) không được hiện như "Quest hiện tại" (viền vàng) ở màn kết thúc (ghi chú GĐ1). Ô chưa chơi hiện trung tính, mờ.
  - Khi bật reduced motion, overlay ám sát đang bị bỏ hẳn (ghi chú GĐ0). Thay bằng một **thẻ kết quả tĩnh** (nội dung stage `reveal`: người bị đâm, vai thật, ai thắng).
  - `confirm()` gốc ở "Chơi ván mới", "Rời / Xoá phòng", kick (`AvalonBoard`) và "Xác nhận đâm" (`AssassinSection`): thay bằng `ui/ConfirmDialog` (theo mục GĐ5). Handler giữ nguyên.
- **Thứ tự thời gian ở `end`** (theo `phaseStartedAt`, dùng `useCue` / `<Cued>` + `usePhaseTimeline`, quy ước "style tĩnh = khung cuối"):
  - Có ám sát (`merlinTargetId`): overlay chạy 0–7,95 s như hiện tại, rồi mới tới banner cá nhân, lật vai trên bàn và tổng kết.
  - Không có ám sát (3 Quest thất bại, 5 lần bị bác, Sát Thủ hết giờ): banner hiện ngay.
  - Lật vai trên `RoundTable` (prop `revealAll`): mỗi ghế cách nhau 150 ms, theo thứ tự ghế. Màn kết thúc là **thông tin công khai**, nên huy hiệu và viền **được** dùng màu phe (`RoleEmblem tone="team"`).
  - Reload sau khi chuỗi xong thì vào thẳng khung cuối, không phát lại.
- **Tổng kết:** chỉ dùng dữ liệu đang có: `quests[]` gồm `leaderId`, `teamIds`, `approveCount`, `rejectCount`, `result`, `failCount` (chỉ của đề xuất **được duyệt**). Các đề xuất bị bác **không** được lưu, nên không bịa ra. `JourneyStrip` dùng lại cho hành trình 5 chặng; chặng chưa chơi hiện mờ.
- **Banner cá nhân:** "Bạn thắng!" / "Bạn thua…" (so phe người xem với `winner`), kèm lý do thắng: 3 Quest / Sát Thủ trúng hoặc trật / 5 lần bị bác / Sát Thủ hết giờ.
- **Hạt hiệu ứng** (tàn lửa khi Quỷ thắng, lấp lánh vàng khi Người thắng): tối đa 30, trong 3 giây, chỉ `transform` / `opacity`, tắt khi reduced motion. Cảnh `end-good` / `end-evil` có sẵn.
- **Gợi ý model:** Opus 5.5.

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
| 2b Vẽ đủ cảnh + tiêu đề + hành trình | **Đã review — đạt** (2026-10-08) | `0f6cb1c5` → `059830b6` (code) + commit docs ngay sau (cập nhật nhật ký này) — xem `git log 0f6cb1c5..HEAD` | Claude Opus 5.5 | 10 cảnh mới (đủ 14, hết placeholder), `weather/Storm`, phủ tối theo Quest thất bại, `SceneTitle` + câu dẫn, `JourneyStrip` (hình thu nhỏ lấy từ chính cảnh, không cần icon mới), `RoleEmblem tone="neutral"` ở chỗ riêng tư. Lệch kế hoạch + kết quả kiểm thử ở "Ghi chú của người thực thi GĐ2b" bên dưới. |
| 3 Vòng Quest | **Đã review — đạt** (2026-10-09) | `95fdbcfa` → `8a33c2c5` (code) + commit docs ngay sau (cập nhật nhật ký này) — xem `git log 95fdbcfa..HEAD` | Claude Opus 5.5 | `TableTokens` (vương miện / Lady trượt theo vành bàn, token đề cử bay từ Leader), chồng bài úp + lá bay, chuỗi `team-vote-result` và `quest-result` theo giờ server, lá phiếu úp, đồng hồ vòng, `ActionDock`, nút Xoá/Rời vào top bar, `animate-pulse` chỉ còn ở viền. Lệch kế hoạch + kết quả kiểm thử ở "Ghi chú của người thực thi GĐ3" bên dưới. |
| 4 Mở đầu | **Đã review — đạt** (2026-10-09) | `beb7a58f` → `782e560c` (code) + commit docs ngay sau (cập nhật nhật ký này) — xem `git log beb7a58f..HEAD` | Claude Opus 5.5 | Trang vào phòng riêng (`AvalonJoinScreen`), lobby ngồi xuống / rời + thông báo, bộ bài xoè, lineup (bàn tròn, xáo ghế, vương miện quay, Lady, cuộn giấy da), thư niêm phong nhấn giữ (lộ vai + "Vai của tôi"), đêm "nhắm mắt" giống nhau trên mọi máy, chip phase không còn "…", danh sách mobile cao như nhau. Lệch kế hoạch + kết quả kiểm thử ở "Ghi chú của người thực thi GĐ4" bên dưới. |
| 5 Kết thúc | Xong — chờ review | `3de2e6e2` → `8740affc` (code) + commit docs ngay sau (cập nhật nhật ký này) — xem `git log 3de2e6e2..HEAD` | Claude Opus 5.5 | Màn kết thúc theo đồng hồ phase (overlay ám sát → banner "Bạn thắng!" / "Bạn thua…" + lý do, tàn lửa / lấp lánh, ghế lật sang vai, thẻ "Sát Thủ đâm", tổng kết hành trình, danh sách vai), chạm để bỏ qua overlay, ô Quest chưa chơi trung tính, nút cuối ván vào dock, `ConfirmDialog` thay mọi `confirm()` gốc. Lệch kế hoạch + kết quả kiểm thử ở "Ghi chú của người thực thi GĐ5" bên dưới. |
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

**GĐ2b (2026-10-08): đạt, đã push.** Nhạc trưởng tự kiểm lại:
- `npx tsc --noEmit` sạch; `npm run build` thành công.
- `npx eslint src/components/games/avalon`: vẫn 2 lỗi có sẵn từ trước.
- Logic-core và các file ngoài thư mục Avalon không có trong diff.
- Đếm emoji = 0; regex màu phe = 0; không còn `placeholder`.
- Đã đọc `Storm` (chớp theo giờ server, gán qua ref, không setState), `SceneTitle` (chỉ hiện trong 3 giây đầu của phase, khung hình theo `phaseStartedAt`), `gloom` trong `getScene`, `RoleEmblem tone="neutral"`.
- Đã xem cảnh `lake`, `sea`, `end-evil` (1440), `cave`, `mountain`, `end-good` (375), tiêu đề cảnh trại và `JourneyStrip`: đẹp, đúng phong cách, chi tiết chính nằm giữa khung dọc.
- Gói JS của Avalon (UI, icon và 14 cảnh): khoảng 265 KB thô, 78 KB gzip. Được tải riêng qua `dynamic()`. Chấp nhận được; nếu GĐ sau làm gói tăng nhiều thì lazy-load từng cảnh (GĐ6).

Ghi nhận:
1. **Thẻ vai ở 375 còn lệch 1,5–2,5** sau khi thu nhỏ, do chữ của từng vai khác nhau (độ rộng tên, số dòng mô tả, icon). Phần lệch này **không phụ thuộc phe**: cặp cùng phe lệch ngang cặp khác phe. Chấp nhận; GĐ4 làm "nhấn giữ để xem" thì hết hẳn.
2. Sửa thêm ngoài kế hoạch, được chấp nhận:
   - tên "Minion of Mordred" xuống 2 dòng làm thẻ Tay sai cao hơn (một chỗ lộ phe thật), nay tên luôn một dòng;
   - `RoleIntroCard` biến thể `other` cũng trung tính;
   - nhãn tên dưới ghế đổi sang nền `black/75` để đủ tương phản trên cảnh bình minh.
3. **`animate-pulse` làm mờ cả chữ** (ô Quest hiện tại, avatar trong đội), có chỗ chỉ còn tương phản 2,9:1: giao GĐ3.
4. Tiêu đề cảnh ở 375 đè lên bàn tròn khoảng 2,6 giây (không chặn bấm): GĐ3 kiểm lại cùng `ActionDock`.

**GĐ3 (2026-10-09): đạt, đã push.** Nhạc trưởng tự kiểm lại:
- `npx tsc --noEmit` sạch; `npm run build` thành công.
- `npx eslint src/components/games/avalon`: vẫn 2 lỗi có sẵn từ trước.
- Logic-core và các file ngoài thư mục Avalon không có trong diff. `AvalonBoard.tsx` chỉ bỏ khối nút Xoá/Rời (handler giữ nguyên, truyền qua `onLeaveRoom`).
- Đếm emoji = 0; regex màu phe = 0.
- Đã đọc code:
  - `table/timelines.ts`: mọi mốc ở một chỗ; thứ tự lật dựng từ `failCount` và xáo bằng seed `phaseStartedAt`;
  - `useCue` / `Cued` (delay cố định từ lúc mount, quy ước "style tĩnh = khung cuối");
  - `useTableReveal` (nến và ô Quest chờ đúng mốc);
  - `TableTokens` (chỉ `transform`, neo kích thước 0 để không tràn ngang);
  - `ActionDock` (spacer đo bằng `ResizeObserver`, không dùng `pb-safe`).
- Đã xem chuỗi lật 5 lá ở 375 (giữa chừng và lúc đóng dấu) và ảnh ván thật `quest-result` / `team-vote-result` ở 375: các tab khớp nhau, dấu và ô niêm phong đúng lúc.
- Gói JS của Avalon: 84,5 KB gzip.

Ghi nhận:
1. **Chip phase ở top bar vẫn bị cắt** thành "Kết …" trong ván thật ở 375px (ảnh `game/sheet-*-375.png`), trái với báo cáo "không còn nhãn bị cắt". Lỗi thẩm mỹ: giao GĐ4, làm cùng lúc bỏ `px-4` của trang phòng.
2. Độ trễ dựng ≤ 0,2 s khi reload (thấy đuôi hiệu ứng vừa xong): chấp nhận.
3. Sửa thêm ngoài kế hoạch, được chấp nhận:
   - kết quả không lộ trước con dấu (ô Quest, chip Quest trong danh sách, `gloom`);
   - icon kết quả ở đầu panel phiếu chuyển vào con dấu;
   - tiêu đề panel lật bài là "Lật bài" (trung tính).
4. Lá bay từ ghế người đặt (lộ **ai** đã đặt và lúc nào, không lộ lá gì): chấp nhận, giống chơi trực tiếp.
5. Việc chuyển sang GĐ sau (người thực thi đã liệt kê):
   - nút "Đã đọc" ở lineup và các nút đêm vào dock, cùng lớp phủ "nhắm mắt" (GĐ4);
   - chip gợi ý trong `PlayerRoster` bản mobile làm danh sách cao khác nhau theo vai, lệch 25px (GĐ4, riêng tư);
   - nút cuối ván vào dock (GĐ5);
   - token Lady bay tới người bị ngắm (GĐ6).

**GĐ4 (2026-10-09): đạt, đã push.** Nhạc trưởng tự kiểm lại:
- `npx tsc --noEmit` sạch; `npm run build` thành công.
- `npx eslint src/components/games/avalon`: vẫn 2 lỗi có sẵn từ trước.
- Logic-core, `src/lib`, `src/hooks`, `src/services`, `src/components/core` và các game khác không có trong diff.
- `page.tsx` chỉ thêm nhánh `gameType === 'avalon'`: trang vào phòng nạp từ module `AvalonBoard` và bỏ padding. Các game khác giữ nguyên.
- `AvalonBoard.tsx` chỉ đổi JSX và props (thông báo lobby, `DealingCards`, `startedAt`, `joinOrder`, export `AvalonJoinScreen`).
- Đếm emoji = 0; regex màu phe = 0.
- Đã đọc `AvalonJoinScreen` (bắt lỗi, dịch lỗi), `useHold` (che lại khi thả tay, mất focus, tab ẩn, sang phase mới) và logic đêm: người không được gọi bấm "Tiếp tục" thì không ghi Firestore, `roleAcks` của người được gọi giữ như cũ.
- Đã xem ảnh tổng hợp 375 (trang vào phòng, lobby, lineup, thư niêm phong / đang giữ, đêm chưa giữ / Quỷ giữ / Người giữ, "Vai của tôi", chia bài): đẹp; khi chưa giữ thì màn hình như nhau.
- Gói JS của Avalon: 88 KB gzip; trang vào phòng dùng chung chunk.

Ghi nhận:
1. **Độ trễ dựng khi reload** lên tới 0,3 s (vương miện ở lineup): chấp nhận. Việc bù bằng `currentTime` trong layout effect là tuỳ chọn ở GĐ6.
2. Sửa thêm ngoài kế hoạch, được chấp nhận:
   - bỏ bước "Đang lật bài…" vốn dùng `setTimeout` từ lúc mount (trái mục 2.2);
   - dấu sáp màu hổ phách (không đỏ);
   - bỏ `RoleIntroCard` công khai ở đêm;
   - bàn tròn hiện cả ở `role-reveal`;
   - lobby không bao giờ ẩn người vượt `maxPlayers`.
3. Khi đang nhấn giữ ban đêm, màn hình người được gọi có ghế sáng vàng: đúng yêu cầu. Ai nhìn thẳng vào màn hình người đang giữ thì vẫn thấy, giống như liếc bài của người khác khi chơi trực tiếp.
4. Thông báo vào / rời ở lobby đè lên dòng tiêu đề khoảng 3 s (không chặn bấm): chấp nhận.

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

### Ghi chú của người thực thi GĐ2b

**Đã làm:** vẽ 10 cảnh còn lại, `weather/Storm`, phủ tối theo số Quest thất bại (tuỳ chọn), 2.6 `SceneTitle`, 2.7 `JourneyStrip`, 2.11 huy hiệu vai trung tính. Bỏ hẳn placeholder (`SceneDef.placeholder`, `.av-storm-placeholder`). Không sửa logic-core: `useAvalon.ts`, `types.ts`, `constants.ts` không có trong diff. Ở `AvalonBoard.tsx` chỉ đổi JSX và props: `withScene` nhận thêm `game` để vẽ `SceneTitle`, `HALL` thêm `gloom`, truyền `roomId` cho `PlayerPanel`; khối auto-progression và các handler giữ nguyên. Không thêm dependency, **không tải icon mới** (dải hành trình dùng hình thu nhỏ của chính cảnh), không sửa `globals.css`, không đụng game khác.

**Cấu trúc mới:**
- `scenes/layers/{mountain,sea,ruins,chapel,marsh,cave,lake,blood-moon,end-good,end-evil}.tsx` và `layers/camelot.ts` (lâu đài dùng chung cho 2 cảnh kết thúc).
- `scenes/weather/Storm.tsx`, `scenes/SceneTitle.tsx`, `scenes/narration.ts`, `scenes/JourneyStrip.tsx`, `scenes/SceneThumb.tsx`.
- `paper.tsx` thêm `peaks` / `mountainPath`, `taper`, `deadTree`, `reeds`, `box`, `pill`, `bird`. Hạt hiệu ứng thêm loại `snow`.
- `assets/README.md`: cập nhật mục "Cảnh nền" (đủ 14 cảnh, hàm dựng hình mới, quy ước chiều vẽ của từng hàm).

**Lệch / quyết định nhỏ so với kế hoạch (nhạc trưởng nên liếc qua):**
1. **Cảnh:** mỗi cảnh 4 lớp (riêng `cave` 3 lớp), bố cục theo gợi ý, thêm vài chi tiết:
   - `mountain`: dãy núi giữa che chân đỉnh chính, mô đá dẫn đường;
   - `sea`: cột đá ngoài khơi, hải âu;
   - `ruins`: vòm sụp ở đỉnh giữa hai cột, bức tường trống cửa sổ;
   - `chapel`: khung vòm tối phía trước, hàng ghế;
   - `marsh`: cầu ván mục dẫn ra gò cây chết;
   - `cave`: đầu rồng mờ trong bóng tối, xương và thanh kiếm rơi;
   - `lake`: **một cánh tay áo trắng giơ Excalibur** lên khỏi mặt hồ (thay vì kiếm cắm);
   - `blood-moon`: hàng rào xiêu vẹo có quạ đậu;
   - `end-good` / `end-evil` dùng **cùng một Camelot** (`camelot.ts`); bản thua gãy chóp, cháy, khói.

   Mỗi file cảnh 3,6–6,6 KB. **SVG khi render 3,6–23 KB mỗi cảnh** (đo `outerHTML`). Bản đầu `marsh` 46,5 KB và `blood-moon` 31,8 KB, nên tôi cho cành nhỏ của `deadTree` thành một nét, bỏ khớp tròn ở cành mảnh và giảm số lá sậy. Mỗi cảnh 12–18 hạt.
2. **Storm:** 4 phần tử: lớp phủ tối, 2 lớp mưa và 1 lớp chớp.
   - Mỗi lớp mưa là một ô SVG lặp (`background-image`), trượt đúng một ô xuống-trái mỗi vòng nên lặp liền mạch. Lớp dư một ô ở phía trên và bên phải nên luôn phủ kín màn hình (đã kiểm bằng toạ độ).
   - Chớp chỉ đổi `opacity`: chu kỳ 22 s, 2 lần chớp cách nhau 9 s và 13 s, đỉnh 0,32. Pha của chu kỳ **tính theo giờ server** (gán `animation-delay` trong `useEffect`, không dùng state) nên mọi máy chớp cùng lúc.
   - Reduced motion: chỉ còn lớp phủ tối và mưa đứng yên, không chớp.
3. **Phủ tối theo Quest thất bại** (tuỳ chọn, đã làm): `getScene` trả `gloom = 0,08 × số Quest thất bại` cho mọi cảnh từ Quest đầu trở đi (địa điểm, trại, hồ, trăng máu), **trừ cảnh kết thúc** (bình minh khi Phe Người thắng phải sáng). `SceneBackdrop` thêm lớp `.av-scene-gloom`, chuyển dần 1,2 s.
4. **`SceneTitle`:**
   - Do container vẽ ngay cạnh `SceneBackdrop` (trong `withScene` của `AvalonBoard` và trong Preview), nên giữ mount qua mọi nhánh `return`.
   - Hiện khi `getScene(...).id` khác cảnh trước **và** phase mới bắt đầu chưa quá 3 s (`serverNow() − phaseStartedAt`). Giữ 2,6 s; khung hình tính theo `phaseStartedAt` (animation-delay âm) nên mọi máy cùng khung.
   - Không hiện ở lobby (chưa có `phaseStartedAt`). Lady đổi mục tiêu đặt lại `phaseStartedAt` nhưng cảnh không đổi, nên tiêu đề không hiện lại.
   - Dòng nhỏ phía trên: "Quest II" ở địa điểm; "Trước Quest III" ở trại, tiêu đề "Dựng trại trước <địa điểm kế>".
   - Reduced motion: **vẫn hiện** (đứng yên) 2,6 s, vì chữ mang thông tin.
   - Vị trí `top: max(4.5rem, 11vh)`, `z-40` (dưới modal), `pointer-events: none`, `aria-live="polite"`. Trong Preview tiêu đề đè lên header nhưng không chặn bấm; nút "Phát lại" dựng lại để xem.
5. **Câu dẫn** (`narration.ts`): 2–3 câu mỗi cảnh, dài nhất 88 ký tự, chọn theo `hash(journeyKey + id)`. `journeyKey` (seatOrder, hoặc roomId khi rỗng) tách ra từ `getJourney` để dùng chung.
6. **`JourneyStrip`:**
   - Không cần icon mới: mỗi chặng là **hình thu nhỏ của chính cảnh**. `SceneThumb` vẽ lại các lớp trong `SCENES` với `viewBox` cắt vùng giữa-dưới 720×540, nên khi thay lớp bằng ảnh AI thì hình thu nhỏ đổi theo.
   - Chặng đã xong: viền màu phe + icon kết quả (thông tin công khai). Chặng kế tiếp: viền vàng. Chặng sau: mờ. Kèm dòng "Chặng kế tiếp: …".
   - Nằm trong `DiscussionSection`, thành một `GlassPanel` riêng ngay dưới nút sẵn sàng. `PlayerPanel` thêm prop tuỳ chọn `roomId` (`AvalonBoard` truyền `room.id`, Preview truyền `'preview'`).
7. **2.11:** `RoleEmblem` thêm prop `tone: 'team' | 'neutral'` (mặc định `team`). Bản trung tính: viền vàng, lòng khiên màu mực, icon giấy da.
   - Dùng ở `RoleReveal`, `RoleCard`, phần "Vai của bạn" trong `RolePreviewPopup`, và `RoleIntroCard` — **cả biến thể `other`**: người giữ vai thấy `self` trong khi người khác thấy `other`, nếu chỉ một bản trung tính thì nhìn màu là biết ai đang giữ vai.
   - Chỗ công khai giữ màu phe: chip lineup, danh sách Phe Quỷ ở màn ám sát, overlay ám sát, màn kết thúc (kể cả "Vai của bạn", lúc đó đã công khai), `RoleGuide`, `RoomSettings`.
8. **Chỗ lộ mới, tìm ra khi đo cặp ảnh:** ở 375px tên "Minion of Mordred" (cỡ 36px) xuống 2 dòng trong `RoleReveal`, nên **chỉ thẻ của Tay sai cao hơn** (cặp Hiệp sĩ | Tay sai lệch 9,99). Tên vai ở `RoleReveal` / `RoleCard` nay luôn một dòng, cỡ `min(2.25rem, 8.2vw)` (vừa cả màn 320px).
9. **Tương phản:** nhãn tên dưới ghế trên `RoundTable` đổi từ `bg-black/50` sang `bg-black/75` (cả nhãn "bạn", vẫn giữ chữ và viền giấy da). Trên nền bình minh của `end-good`, tên ở ghế trên cùng trước đó chỉ đạt 3,45:1.
10. **Preview:** ô "Cảnh" bỏ chữ "(chưa vẽ)"; chế độ "Theo phase" truyền cả `gloom`; có `SceneTitle` (khoá theo lần "Phát lại").

**Kết quả kiểm thử:**
- `npx tsc --noEmit` sạch; `npm run build` thành công (build lại sạch sau khi xoá harness).
- `npx eslint src/components/games/avalon`: 2 lỗi `react-hooks/set-state-in-effect` có sẵn (`AvalonBoard.tsx:155` — trước là 145, lệch do thêm import và `withScene`; `QuestPlaySection.tsx:28`) + 2 cảnh báo có sẵn trong `useAvalon.ts`. Không có vấn đề mới.
- Đếm emoji = 0; regex màu phe = 0; không còn `placeholder` / `.av-storm-placeholder`.
- **Ảnh** ở `.claude/gd2b-shots/` (mở `index.html`), chụp bằng Chrome headless qua DevTools Protocol trên harness tạm:
  - `bare/`: 14 cảnh trần × 1440 và 375; bão trên `forest`, `sea`, `mountain`, `cave` (khung thường + khung chớp đứng hình);
  - `preview/`: 46 cảnh Preview × (375 phần trên + phần dưới khi cuộn, 1440) = 135 ảnh. 0 lỗi JS, `[data-phase-section]` ≤ 1, cảnh của mọi phase khớp `getScene`;
  - `title/`: tiêu đề cảnh ở 5 phase × 2 cỡ; `pairs/`: ảnh ghép các cặp riêng tư; `game/`: ván thật.
- **`SceneTitle` (Preview, 5 phase × 2 cỡ):** phase cũ (mock bắt đầu 5–480 s trước) không hiện tiêu đề; "Phát lại" thì hiện đúng chữ (ví dụ "QUEST I · Đầm lầy sương · …", "TRƯỚC QUEST II · Dựng trại trước Hang rồng · …"); sau 3,1 s đã tắt.
- **`JourneyStrip`:** 3 cảnh thảo luận × 4 `seatOrder` (nút "Ván khác"): thứ tự khớp dòng hành trình của Preview, trạng thái từng chặng đúng, "Chặng kế tiếp" = `journey[currentQuest]` = địa điểm trong tiêu đề trại.
- **Không lộ phe từ xa** (thu còn 10%, độ lệch điểm ảnh trung bình 0–255; ảnh ghép ở `pairs/`). Thẻ vai đo ở khung thẻ (`RoleReveal` sau 2,2 s; modal `RoleCard`; `RoleIntroCard`):

  | Cặp | 375 | 1440 |
  |---|---|---|
  | Lộ vai: Merlin \| Sát Thủ | 2,27 | 0,56 |
  | Lộ vai: Hiệp sĩ \| Tay sai | 2,54 (trước khi sửa mục 8: 9,99) | 0,63 |
  | Lộ vai: Percival \| Morgana | 1,80 | 0,44 |
  | *Lộ vai, cùng phe: Merlin \| Percival* | *2,08* | *0,50* |
  | *Lộ vai, cùng phe: Mordred \| Sát Thủ* | *1,64* | *0,42* |
  | Modal "Vai của tôi": Merlin \| Mordred | 2,13 (GĐ2a: 3,37) | 0,54 (GĐ2a: 0,85) |
  | Modal "Vai của tôi": Hiệp sĩ \| Tay sai | 2,33 | 0,61 |
  | Modal "Vai của tôi": Percival \| Morgana | 1,54 | 0,38 |
  | *Modal, cùng phe: Merlin \| Percival* | *1,82* | *0,47* |
  | *Modal, cùng phe: Mordred \| Sát Thủ* | *1,56* | *0,39* |
  | `RoleIntroCard`: Merlin \| Sát Thủ | 1,37 | 0,29 |
  | `RoleIntroCard`: Percival \| Morgana | 1,05 | 0,22 |
  | `RoleIntroCard`: Hiệp sĩ \| Tay sai | 1,71 | 0,35 |
  | *`RoleIntroCard`, cùng phe: Merlin \| Percival* | *2,79* | *0,25* |
  | *`RoleIntroCard`, cùng phe: Mordred \| Sát Thủ* | *2,55* | *0,23* |
  | Popup "Các vai" (phần "Vai của bạn"): Merlin \| Mordred | 1,59 (GĐ2a: 1,94) | 0,43 |
  | Đặt lá, chưa chọn: Người \| Quỷ | 0,18 | 0,43 |
  | Lady thấy: Người \| Quỷ | 1,27 | 1,10 |
  | Bị soi: Người \| Quỷ | 1,38 | 1,34 |
  | *Đối chứng trung tính — Đã bầu: Đồng ý \| Từ chối* | *0,02* | *0,02* |
  | *Đối chứng — 2 phase khác nhau* | *23,08* | *11,88* |

  Khiên giờ giống hệt nhau ở mọi vai. Ở 1440 mọi cặp ≤ 0,63. Ở 375 các cặp thẻ vai còn 1,5–2,5 vì **chữ của mỗi vai khác nhau** (độ rộng tên, số dòng mô tả, hình icon trong khiên). Phần này **không phụ thuộc phe**: cặp cùng phe lệch ngang cặp khác phe (thẻ đêm cùng phe 2,55–2,79 còn cao hơn khác phe 1,05–1,71). Nên nhìn từ xa không phân biệt được phe, nhưng con số tuyệt đối ở 375 chưa xuống ≤ 1,5. GĐ4 (thư niêm phong, nhấn giữ để xem) sẽ giải quyết dứt điểm.
- **Tương phản chữ** (đo trên điểm ảnh thật như GĐ2a): 10 cảnh mới (6 địa điểm × 4 phase, có bão, hồ, trăng máu, 2 cảnh kết thúc), trại có `JourneyStrip`, và tiêu đề cảnh trên cảnh sáng nhất; 375 (phần trên + phần dưới) và 1440. Bỏ qua chữ bị phủ che (kiểm bằng `elementFromPoint`).
  - Chữ thân ≥ 11 px: **5261/5261 đạt ≥ 4,5:1**, thấp nhất 4,56. Chữ < 11 px: 1165/1165 đạt.
  - Tách riêng chữ nằm trong phần tử `animate-pulse` (ô Quest hiện tại, avatar đang trong đội): 217/247 đạt, thấp nhất 2,87 ở đáy nhịp — xem "Còn tồn".
- **Ván thật** (bản production; 5 origin `localhost`, `127.0.0.1`, `a.localhost`, `b.localhost`, `c.localhost`; bot tự chơi):
  - Ván chạy đủ: lobby → lineup → lộ vai → đêm → Quest I → trại → Quest II → trại → Quest III → ám sát → kết thúc (Phe Quỷ đoán trúng Merlin), khoảng 2,5 phút.
  - **5 tab cùng chuỗi cảnh:** `hall` → `night` → `forest` → `camp` → `marsh` → `camp` → `cave` → `blood-moon` → `end-evil`.
  - **Tiêu đề cảnh cùng chữ trên cả 5 tab**, và **cùng tắt một lúc** (lệch ≤ 1 nhịp lấy mẫu, khoảng 0,17–0,35 s), tức chạy theo `phaseStartedAt`.
  - Reload tab `b.localhost` 4,5 s sau khi vào Quest I: vào thẳng `forest`, **không** hiện tiêu đề. Reload ngay lúc đổi sang trại: tiêu đề **có** hiện ("Trước Quest II · Dựng trại trước Đầm lầy sương · …").
  - `JourneyStrip` giống hệt trên 5 tab và khớp chuỗi đã chơi (`forest:success marsh:success cave:next …`).
  - 0 lỗi JS ở cả 5 tab. Phòng test đã xoá (mở lại link báo "Room Not Found").
- **Reduced motion** (giả lập): ở 10 cảnh mới có bão, 0 animation đang chạy, 0 hạt hiện, chớp `opacity 0`, mưa đứng yên. Tiêu đề cảnh vẫn hiện (không chuyển động) và tắt sau 2,6 s. Đổi cảnh thay ngay (chỉ 1 lớp cảnh).
- **CPU chậm 4×** (đổi cảnh trong Preview rồi đo 4,7 s, 10 cảnh mới + 2 cảnh có bão, ở 375 và 1440): p95 = 7 ms. Mỗi lần có đúng **1 khung 83–118 ms**: đó là khung đổi cảnh, khi React dựng lại toàn bộ Preview một cách đồng bộ (riêng việc phát sự kiện `change` đã mất 86–98 ms). Sau đó mọi khung khoảng 7 ms, crossfade và mưa không giật.

**Còn tồn / gợi ý cho GĐ sau:**
- **GĐ3:** `animate-pulse` ở ô Quest hiện tại và avatar đang trong đội làm mờ **cả chữ** xuống 50%. Ở đáy nhịp, chữ "×2", "I", "người" chỉ còn khoảng 2,9–3,5:1. Lỗi này có từ trước và không phụ thuộc cảnh (ô nằm trên mặt bàn đặc). Đề nghị chỉ cho viền hoặc ánh sáng nhấp nháy.
- **GĐ4:** cặp thẻ vai ở 375 (xem bảng trên). Thư niêm phong / nhấn giữ để xem sẽ làm mọi màn giống nhau khi chưa giữ.
- Tiêu đề cảnh ở 375 nằm đè lên bàn tròn khoảng 2,6 s (không chặn bấm). Nếu GĐ3 thêm `ActionDock` thì nên kiểm lại vị trí.
- Nút Xoá/Rời đè top bar ở 375 (đã biết, GĐ3).

**Dọn dẹp:** harness `src/app/avtest` đã xoá (không có trong commit), `.next` build lại sạch, phòng test ván thật đã xoá. Các script kiểm thử (CDP) nằm ở scratchpad của session, không có trong repo.

### Ghi chú của người thực thi GĐ3

**Đã làm:** toàn bộ mục GĐ3 và "Bổ sung cho GĐ3". Không sửa logic-core: `useAvalon.ts`, `types.ts`, `constants.ts` không có trong diff; ở `AvalonBoard.tsx` chỉ bỏ khối nút Xoá/Rời `absolute right-4 top-4` (handler giữ nguyên, nay truyền qua `onLeaveRoom` có sẵn). Không thêm dependency, không tải icon mới, không sửa `globals.css`, không đụng game khác.

**Cấu trúc mới:**
- `table/TableTokens.tsx` (vương miện, Lady, token đề cử), `table/CardPile.tsx` (chồng bài úp giữa bàn), `table/timelines.ts` (mọi mốc thời gian của vòng Quest, `questRevealOrder`).
- `hooks/useCue.ts` + `ui/Cued.tsx` (animation-delay theo giờ server), `hooks/useArrivals.ts` (chuyển tiếp trang trí "vừa xuất hiện"), `hooks/useTableReveal.ts` (`useShownRejectStreak`, `useHiddenQuest`).
- `ui/ActionDock.tsx`, `ui/QuestCard.tsx` (`CardBack` / `CardFace`).
- `avalon.css`: khối "Vòng Quest (GĐ3)", token `--av-approve-light`.

**Lệch / quyết định nhỏ so với kế hoạch (nhạc trưởng nên liếc qua):**
1. **Cách đồng bộ animation:**
   - `useCue(startedAt)` trả `cue(at)` = `at − (thời gian đã trôi lúc component mount)`. Giá trị cố định cho tới khi `startedAt` đổi, nên render lại không làm lệch animation đang chạy.
   - Phần tử mount theo stage dùng `<Cued>`, tự lấy mốc lúc chính nó mount.
   - Quy ước: style tĩnh = khung cuối, keyframes chỉ tả đoạn trước đó (fill `both`). Nhờ vậy reduced motion hiện ngay trạng thái cuối mà không cần nhánh riêng.
   - `usePhaseTimeline` chỉ dùng cho phần DOM phải đổi: nến, ô Quest, chip nến, `aria-live`, `data-anim-stage`.
   - **Độ trễ dựng chưa bù:** animation chạy từ lần vẽ đầu, muộn hơn mốc lấy lúc render đúng bằng thời gian render (bản dev: 0,1–0,2 s khi mount nặng). Mỗi máy lệch theo thời gian render của chính nó; đo ở prod, 5 tab lệch nhau ≤ 42 ms. Hệ quả nhỏ: reload sau khi một hiệu ứng vừa xong có thể thấy đuôi ≤ 0,2 s của nó (ví dụ vòng niêm phong mờ đi).
2. **Token trên bàn** chỉ dùng `transform`:
   - Vương miện quay quanh tâm bàn, luôn theo chiều kim đồng hồ (góc cộng dồn). Lady đi đường ngắn. Token đề cử bay thẳng từ ghế Leader.
   - Dùng neo kích thước 0 và đơn vị `cqw` (`RoundTable` thành `@container`).
   - **Lỗi tìm ra khi đo, đã sửa:** bản đầu xoay/tịnh tiến một lớp `inset-0` to bằng cả bàn. Hộp đã xoay thò ra ngoài trang, nên ở 375px layout viewport thành 423px (điện thoại tự thu nhỏ trang) và dock rơi khỏi màn hình. Đã đổi cách làm; ghi chú cảnh báo trong code và `avalon.css`.
3. **Ghế trên bàn canh giữa theo avatar** (nhãn tên treo `absolute` bên dưới), để token rơi đúng điểm ghế. Avatar thấp xuống khoảng 11px so với trước. Huy hiệu Leader / Lady không còn là con của `PlayerAvatar` mà do `TableTokens` vẽ; `title` của ghế ghi thêm "· Leader / · Lady of the Lake".
4. **Token đề cử:** icon `team` (kiếm chéo, vốn là nghĩa "đội"), đặt giữa phía trên avatar; vòng cam của `PlayerAvatar` vẫn giữ.
5. **Chồng bài** đặt ở (50 %, 73 %), dưới hàng nến. Phía trên hàng ô Quest nó chạm nhãn tên ghế trên cùng ở 375px.
   - Có ô trống viền đứt kèm chip "x/y". Lá bay từ ghế của người đặt, lá nào cũng giống nhau (mặt lưng, màu, đường bay).
   - Ở `quest-result`, chồng bài ở lại tới lúc đóng dấu rồi mờ đi. Việc xáo và lật diễn ra trong panel `QuestResultSection`; trên bàn chỉ niêm phong ô Quest.
6. **Mốc thời gian** (`table/timelines.ts`):
   - `team-vote-result`: tiêu đề 0–0,6 s; hai bộ đếm 0,6–2,6 s (cột số lăn lên, ease-out, chỉ `transform`); dấu ĐƯỢC DUYỆT / BỊ BÁC lúc 2,8 s; nến tắt lúc 3,5 s (lửa giật kèm làn khói 1,1 s). Xong ≤ 4,6 s. Màu kết quả của panel và chip nến ở top bar đổi cùng mốc. Icon kết quả to ở đầu panel trước đây lộ kết quả ngay giây 0, nay nằm trong con dấu.
   - `quest-result`: xáo và chia bài 0–0,8 s; lá i lật lúc 0,8 + 0,6·i (mỗi lá 0,4 s); dấu đóng sau lá cuối 0,4 s (2 lá: 2,2 s; 3 lá: 2,8 s; 5 lá: 4,0 s). Xong ≤ 4,6 s với 5 lá. Tiêu đề panel đổi thành "Lật bài" (trung tính) thay cho "Quest thành công" hiện ngay từ đầu.
7. **Không lộ kết quả trước con dấu** (ngoài kế hoạch, phát hiện khi làm): ô Quest trên bàn, chip "Quest N" tô màu kết quả trong `PlayerRoster`, và lớp phủ tối `gloom` của cảnh đều chờ tới mốc dấu. Riêng `getScene` không tính Quest đang lật vào `gloom`; cảnh tối đi khi phase kế tiếp bắt đầu.
8. **"Rung" khi còn 1 ngọn nến** là rung hình: hàng nến lắc 0,6 s, không rung máy (mục 1). Ngọn cuối nhấp nháy viền đỏ cho tới khi có đội được duyệt; panel có thêm dòng cảnh báo.
9. **`team-vote`:**
   - Lá phiếu úp nằm trong dock, lật xuống bằng `rotateX`. Chuyển động giống nhau cho cả hai phiếu; chỉ còn một dòng nhỏ "Phiếu của bạn".
   - 10 giây cuối: đồng hồ và cụm hai nút nhấp nháy viền cam.
   - Dấu tích trong lưới "Tiến độ bầu phiếu" cũng nảy, giống chấm trên bàn.
10. **`ActionDock`:** `fixed` kèm một spacer đo bằng `ResizeObserver` (spacer `order-last`, luôn ở cuối cột flex). Desktop dùng `lg:relative`, nằm trong cột phải.
    - Nút trong dock: Trình đội; Đồng ý / Từ chối (bầu xong thì thành lá phiếu úp); Xác nhận đặt lá (hai lá để chọn vẫn ở section); Xác nhận soi và Hoàn tất (Lady); Xác nhận đâm; Tôi sẵn sàng (desktop: ngay dưới đồng hồ).
    - **Không** đưa vào dock: "Đã đọc" ở lineup; các nút "Đã xem" ban đêm (mỗi vai một kiểu, nên dock chỉ hiện với vài người là lộ vai; để GĐ4 làm cùng lớp phủ "nhắm mắt"); nút cuối ván (GĐ5).
    - Toast "Phe Người không được đặt lá Phe Quỷ" neo ngay trên dock.
11. **Nút Xoá / Rời trong top bar** (`data-room-exit`, dưới `sm` chỉ hiện icon). Top bar vì thế chật hơn:
    - Top bar là `@container`; chip phase đổi theo bề rộng nội dung: dưới 19,25rem chỉ icon; tới 40rem nhãn ngắn ("Kết quả", "Đêm", "Quest"); rộng hơn thì nhãn đầy đủ. Nhãn đầy đủ luôn có trong `title` / `aria-label`. Bớt vài px padding ở chip và nút.
    - Đo bằng bề rộng thật trong ván (trang phòng còn bọc `px-4`): ở 343px (máy 375) mọi nhãn ngắn hiện đủ; ở 328px (máy 360) chỉ icon; không còn nhãn bị cắt "…". Khi GĐ4 bỏ `px-4` thì top bar có thêm chỗ.
12. **`animate-pulse`** thay bằng `.av-pulse-ring` (một `::after`, chỉ nhấp nháy `opacity` của viền / ánh sáng) cho: ô Quest hiện tại, avatar trong đội, avatar bị Sát Thủ ngắm, đồng hồ sắp hết giờ (TeamBuild, TeamVote, Lady, Assassin). `animate-pulse` chỉ còn trên icon không có chữ (đồng hồ cát, trăng, chấm "chưa bầu").
13. **Tương phản:** nút "Trình đội" chữ trắng trên nền cam (~2,1:1) đổi sang chữ mực. Thêm `--av-approve-light` cho nhãn nhỏ "Đồng ý" (từ 4,3 lên ≥ 6).
14. **Đồng hồ vòng ở thảo luận:** SVG cập nhật mỗi giây theo `usePhaseClock`, không chạy animation liên tục suốt 10 phút.
15. **Preview:**
    - Cảnh mới: `team-vote-result-rejected-last`, `quest-result-q4-one-fail`, `quest-result-five` (mock 5 lá).
    - Các cảnh kết quả phát chuỗi ngay khi chọn. `quest-play-not-on-team` có sẵn 1 lá trong chồng.
    - Nút "Người khác làm" (đề cử / bầu / đặt lá / sẵn sàng) và "Leader kế". Hành động của người xem (chọn đội, bầu, đặt lá, sẵn sàng) chạy cục bộ để xem các chuyển tiếp.
16. **Thuộc tính cho kiểm thử:** `data-phase`, `data-phase-started-at` (gốc `PlayerPanel`), `data-anim-stage`, `data-stamp`, `data-candle`, `data-quest-tile`, `data-card-pile`, `data-token`, `data-action-dock`, `data-ballot`, `data-reject-chip`, `data-room-exit`.

**Kết quả kiểm thử:**
- `npx tsc --noEmit` sạch; `npm run build` thành công (build lại sạch sau khi xoá harness).
- `npx eslint src/components/games/avalon`: 2 lỗi `react-hooks/set-state-in-effect` có sẵn (`AvalonBoard.tsx:155`, `QuestPlaySection.tsx:43`; trước là dòng 28, lệch do thêm `PlayedCount`) cùng 2 cảnh báo có sẵn trong `useAvalon.ts`. Không có vấn đề mới.
- Đếm emoji = 0; regex màu phe = 0.
- Gói JS của Avalon: 285 KB thô, 84,5 KB gzip (GĐ2b: 265 / 78).
- **Ảnh** ở `.claude/gd3-shots/` (mở `index.html`), chụp bằng Chrome headless qua DevTools Protocol trên harness tạm:
  - `preview/`: 24 cảnh vòng Quest × (375 phần trên và phần dưới, 1440). Mỗi cảnh đúng 1 `[data-phase-section]`, dock có mặt đúng ở các phase có nút chính, 0 lỗi JS;
  - `seq/`: 4 chuỗi × 8 khung × 2 cỡ; `flights/`: 6 chuyển tiếp × 5 khung × 2 cỡ;
  - `pairs/`, `reduced/`, `game/`.
- **Reload giữa chuỗi:** harness dựng màn kết quả "đã trôi `ago` ms" (như khi reload), so với mount ở 0 rồi chờ. 15 mẫu (quest 5 lá và 2 lá, vote): trạng thái nhìn thấy (stage, lá úp/đang lật/ngửa, con dấu, bộ đếm, nến, ô Quest) khớp mô hình `timelines.ts` trong 1 nhịp lấy mẫu ở mọi mẫu.
- **Reduced motion** (giả lập): 0 animation ở cả 24 cảnh, kể cả sau khi bấm "Người khác làm" / "Leader kế". Màn kết quả vào thẳng stage `done`: lá ngửa, dấu đã hiện, số cuối, nến đã tắt, ô đã niêm phong.
- **Không lộ phe từ xa.** Thu còn 10 %, đo trên khung nhìn 375×812 và 1440×900. Cùng ghế p1, chỉ khác Merlin | Morgana; người Phe Người đặt lá Người / bầu Đồng ý, người Phe Quỷ đặt lá Quỷ / bầu Từ chối. Mọi animation bị đóng băng ở cùng thời điểm:

  | Thời điểm | 375 | 1440 |
  |---|---|---|
  | `quest-play`, chưa đặt | 0,19 | 0,43 |
  | `quest-play`, lá đang bay (300 ms) | 0,19 | 0,43 |
  | `quest-play`, đã đặt | 0,19 | 0,43 |
  | `team-vote`, chưa bầu | 0,19 | 0,27 |
  | `team-vote`, lá phiếu đang úp (150 ms) | 0,26 | 0,28 |
  | `team-vote`, đã bầu | 0,26 | 0,28 |
  | *Đối chứng: cùng phe chụp 2 lần* | *0* | *0* |

  Phần lệch còn lại là huy hiệu gợi ý cỡ icon (Merlin thấy Quỷ, Quỷ thấy đồng đội), có từ trước. Animation của GĐ3 thêm ≤ 0,07. Ngoài phạm vi: ảnh cả trang `team-vote` ở 375 của hai phe cao chênh nhau 25px, do chip gợi ý trong `PlayerRoster` bản mobile xuống dòng khác nhau (có từ trước).
- **Tương phản chữ** (đo trên điểm ảnh thật như GĐ2a): 24 cảnh vòng Quest + 5 cảnh sáng (`chapel`, `sea`, `mountain`), 375 (phần trên và dưới) và 1440.
  - Chữ ≥ 11px: 2247/2247 đạt ≥ 4,5:1, thấp nhất 4,59.
  - Chữ < 11px: 751/756. Sau khi thêm `--av-approve-light`, đo lại các cảnh bỏ phiếu: 242/242.
  - Không còn chữ nào nằm trong phần tử `animate-pulse`.
- **Bố cục:**
  - Không tràn ngang (trang và khung cuộn của Preview), đáy dock = 812; popup chi tiết Quest vẫn phủ toàn màn hình (`@container` không thành containing block của `fixed`).
  - `SceneTitle` không chồng lên nút nào của dock: 6 cỡ (375×812, 360×640, 320×568, 812×375, 1024×600, 1440×900) × 4 phase.
- **CPU chậm 4×** (bản dev):
  - chuỗi kết quả: p95 = 7 ms; `team-vote-result` 0 khung > 50 ms; `quest-result` 1 khung 56–76 ms đúng lúc đóng dấu (bàn, danh sách và panel cùng render);
  - chuyển tiếp (lá bay, vương miện, đề cử, phiếu): khung dài nhất 14–32 ms, riêng 1 khung 63 ms khi đề cử ở 1440 (React render lại Preview);
  - trước khi tách chip nến khỏi `PlayerPanel`, mỗi chuỗi có 2 khung 56–83 ms.
- **Ván thật** (bản production; 5 origin `localhost`, `127.0.0.1`, `a/b/c.localhost`; **mỗi tab một cửa sổ CDP** để tab nào cũng vẽ; bot tự chơi):
  - Ván chạy đủ: lobby → … → Quest I (đề xuất đầu bị bác có chủ ý, đề xuất 2 được duyệt) → Quest II → Quest III → ám sát → Phe Người thắng, khoảng 2,5 phút. 0 lỗi JS ở cả 5 tab; mỗi tab lấy mẫu khoảng 31 ms một lần.
  - Mốc lần đầu thấy (giây, tính từ `phaseStartedAt`; khoảng lệch giữa các tab):

    | Lượt | Thấy con dấu | Xong cả chuỗi | Lệch giữa các tab (dấu / xong) |
    |---|---|---|---|
    | `team-vote-result` Q I, bị bác (tab 4 reload) | 2,82–2,85 (4 tab) | ≤ 4,66 (4 tab); tab reload ≤ 4,91 | 32 / 34 ms |
    | `team-vote-result` Q I, duyệt | 2,82–2,84 | ≤ 4,23 | 29 / 6 ms |
    | `quest-result` Q I, 2 lá (tab 3 reload) | 2,22–2,26 (4 tab) | ≤ 2,93 (4 tab); tab reload ≤ 3,31 | 42 / 5 ms |
    | `team-vote-result` Q II | 2,85–2,86 | ≤ 4,25 | 9 / 42 ms |
    | `quest-result` Q II, 3 lá | 2,82–2,85 | ≤ 3,53 | 35 / 7 ms |
    | `team-vote-result` Q III | 2,82–2,84 | ≤ 4,23 | 28 / 6 ms |
    | `quest-result` Q III, 2 lá | 2,22–2,25 | ≤ 2,94 | 33 / 7 ms |

    Ngân sách ≤ 5 s / ≤ 5,5 s đều đạt. Các tab lệch nhau ≤ 42 ms, tức khoảng 1 nhịp lấy mẫu. Chip nến chuyển 0 → 1 cùng lúc với ngọn nến tắt ở cả 5 tab.
  - **Reload** tab `c.localhost` 1,5 s sau khi vào `team-vote-result`: app dựng lại ở 2,7 s, vào đúng khung (đang đếm, chưa có dấu); dấu và nến tắt cùng lúc với các tab khác.
  - **Reload** tab `b.localhost` 2,0 s sau khi vào `quest-result`: dựng lại ở 2,96 s, vào thẳng khung đã lật hết và đã có dấu, không phát lại.
  - Phòng test đã xoá bằng nút Xoá mới trên top bar (mở lại link báo "Room Not Found").

**Còn tồn / gợi ý cho GĐ sau:**
- **GĐ4:** đưa nút "Đã đọc" ở lineup và các nút ban đêm vào dock, cùng lúc làm lớp phủ "nhắm mắt". Bỏ `px-4` của trang phòng thì top bar ở máy 360 có chỗ hiện nhãn phase. Chip gợi ý trong `PlayerRoster` bản mobile làm danh sách cao khác nhau theo vai (25px, xem mục riêng tư).
- **GĐ5:** đưa nút cuối ván vào dock. Màn tổng kết có thể dùng lại `useCue` / `<Cued>` và quy ước "style tĩnh = khung cuối".
- **GĐ6:** token Lady bay tới người bị ngắm (`TableTokens` đã có token Lady trượt khi đổi người cầm).
- Nếu cần khớp chính xác hơn khi reload, bù độ trễ dựng bằng cách đặt `currentTime` của animation trong layout effect.

**Dọn dẹp:** harness `src/app/avtest` đã xoá (không có trong commit), `.next` build lại sạch, phòng test đã xoá. Các script kiểm thử (CDP) nằm ở scratchpad của session, không có trong repo.

### Ghi chú của người thực thi GĐ4

**Đã làm:** toàn bộ mục GĐ4 và "Bổ sung cho GĐ4". Không sửa logic-core: `useAvalon.ts`, `types.ts`, `constants.ts` không có trong diff. Ở `AvalonBoard.tsx` chỉ đổi JSX và props: khoảng đệm của lobby, `LobbyNotices`, màn chia bài, `startedAt` cho `RoleReveal`, `joinOrder` cho `PlayerPanel`, một dòng `export` cho `AvalonJoinScreen`; khối auto-progression và các handler giữ nguyên. Ngoài thư mục Avalon chỉ sửa `page.tsx`: nhánh `gameType === 'avalon'` (trang vào phòng + bỏ `px-4 py-6`). Không thêm dependency, không tải icon mới, không sửa `globals.css`, không đụng game khác.

**Cấu trúc mới:**
- `AvalonJoinScreen.tsx` (trang vào phòng).
- `hooks/useHold.ts` (nhấn giữ để xem), `hooks/useRosterChanges.ts` (`useDepartures`, `useRosterNotices`).
- `ui/RoleLetter.tsx` (thư niêm phong), `ui/DealingCards.tsx` (bộ bài xoè), `ui/LobbyNotices.tsx` (thông báo vào / rời).
- `table/timelines.ts` thêm `LINEUP` và `NIGHT`.
- `avalon.css`: khối "Vào phòng, lobby, mở đầu ván (GĐ4)", token `--av-good-ink` / `--av-evil-ink` (màu phe cho chữ trên giấy da).

**Lệch / quyết định nhỏ so với kế hoạch (nhạc trưởng nên liếc qua):**
1. **Bàn tròn hiện cả ở `role-reveal`**, không chỉ `lineup-preview`. Lý do: từ lineup trở đi bố cục không còn nhảy (nhánh "chưa có bàn" của `PlayerPanel` đã bỏ). Trên desktop, panel lineup nằm ở cột phải.
2. **Lineup** (`LINEUP` trong `timelines.ts`, theo `phaseStartedAt`):
   - ghế trượt từ thứ tự vào phòng (`joinOrder` = `players` của `AvalonBoard`, xếp theo `joinedAt`) sang `seatOrder` trong 0–1,2 s. Mỗi ghế tự `transform` (đơn vị `cqw`), không dịch lớp to bằng bàn;
   - vương miện hiện ở ghế 0 lúc 1,2 s, quay theo chiều kim đồng hồ đúng 2 vòng + số ghế của Leader, chậm dần (ease-out), dừng lúc 3,2 s. Hai nút xoay của `OrbitToken` chạy cùng một animation (`av-crown-spin` / `-back`) nên huy hiệu luôn đứng thẳng;
   - token Lady rơi xuống lúc 3,2 s (khi có Lady);
   - cuộn giấy da mở ra bằng `scaleY` (0–0,6 s), chip vai đáp xuống từ 0,6 s, cách nhau 80 ms (10 người: xong khoảng 1,8 s);
   - tổng cộng ≤ 3,65 s, trong ngân sách ~4 s.
3. **Cuộn giấy da:** chữ mực trên nền giấy; tên phe dùng bản đậm `--av-good-ink` / `--av-evil-ink`; `RoleLineChip` thêm `surface="parchment"`. Đồng hồ + tiến độ để trong `GlassPanel` riêng; nút "Đã xem — Sẵn sàng nhận vai" vào dock.
4. **Thư niêm phong** (`RoleLetter`, dùng cho cả `RoleReveal` và `RoleCard`):
   - Nhấn giữ thì nắp mở, dấu sáp vỡ, trang thư trồi lên; thả tay là gấp lại.
   - Khi chưa giữ, trang thư `visibility: hidden` nên không vẽ gì: mọi vai giống nhau tới từng điểm ảnh (cặp ảnh = 0).
   - **Bỏ bước "Đang lật bài…" 1,2 s** (trước đây dùng `setTimeout` tính từ lúc mount, trái mục 2.2). Thay bằng màn thư rơi xuống (0–0,7 s) và dấu sáp ấn xuống (0,6–1,05 s), theo `phaseStartedAt`: reload không phát lại.
   - Dấu sáp màu vàng hổ phách, **không đỏ** (đỏ là màu Phe Quỷ). Tiêu đề màn: "Thư mật — Chỉ mình bạn được đọc".
   - Nút "Đã đọc — Sẵn sàng" luôn bấm được (không bắt phải nhấn giữ trước). Ngữ nghĩa `onDone` giữ nguyên.
5. **Nhấn giữ** (`useHold`):
   - giữ bằng ngón tay / chuột (có `setPointerCapture`) hoặc phím Space / Enter;
   - thả tay, mất focus, tab bị ẩn, hoặc sang phase mới là che lại;
   - chặn menu khi nhấn lâu; class `.av-hold` tắt cuộn, chọn chữ và callout.
6. **Đêm:**
   - "Lớp phủ nhắm mắt" là một đĩa tối phủ lên mặt bàn, mang lời gọi công khai ("Phe Quỷ mở mắt…" + một câu + "Mọi người khác nhắm mắt"), hiện theo `phaseStartedAt`. Ghế mờ còn 60 % với mọi người.
   - Dock giống hệt nhau cho mọi người: một **thẻ nhấn giữ** (cao cố định `h-32`) và nút "✓ Đã xem — Tiếp tục". Thẻ chính là vùng nhấn giữ, không có nút riêng.
   - Khi giữ: người được gọi thấy đồng đội / Phe Quỷ / Merlin & Morgana (chip cỡ chữ), và các ghế đó **sáng vàng** trên bàn (màu vàng, không phải màu phe). Người không được gọi thấy "Lượt này không gọi bạn" kèm tên vai của mình. Oberon thấy "đơn độc".
   - "Tiếp tục" của người được gọi ghi `roleAcks` như cũ. Của người **không** được gọi chỉ đổi màn hình của chính họ, không ghi Firestore, nên không thêm dữ liệu và không làm sai điều kiện kết thúc lượt.
   - Bỏ `RoleIntroCard` ("Bạn là…" hiện công khai ở đêm). Vai xem lại qua nút "Vai của tôi" (cũng là thư nhấn giữ). Không rung máy.
7. **Trang vào phòng** (`AvalonJoinScreen`):
   - Gồm cảnh `hall`, người mời, mã phòng, những người đã ngồi (avatar, chìa khoá chủ phòng), ô tên (`#display-name-input` giữ nguyên id), nút "Vào bàn".
   - Lỗi tiếng Anh của `useRoom.joinRoomById` được dịch sang tiếng Việt. Nếu ván đang diễn ra hoặc phòng đã đủ người thì nói ngay và ẩn ô nhập.
   - `page.tsx` nạp màn này **từ module `AvalonBoard`** (`import('…/AvalonBoard').then((m) => m.AvalonJoinScreen)`), nên dùng chung chunk với bàn chơi. Bản đầu nạp file riêng: người được mời phải tải một chunk gần trùng (108 KB thô / 44 KB gzip), rồi vào lobby lại tải phần cảnh và icon lần nữa.
8. **Lobby:**
   - mỗi ghế là một neo kích thước 0 dịch bằng `cqw`, nên đổi chỗ là `transform` trượt;
   - người vào: `av-seat-in` (`useArrivals`); người rời: bóng mờ dần tại ghế cũ (`useDepartures`, 700 ms) trong khi các ghế sau trượt lên;
   - thông báo "<Tên> đã vào / rời phòng": tối đa 3, mỗi cái khoảng 3 s, `aria-live`;
   - số ghế không bao giờ ít hơn số người (trước đây người vượt quá `maxPlayers` bị ẩn);
   - nút kick 20 px (vùng chạm nới bằng `::before`), nhãn "Mời X ra khỏi phòng";
   - tên ghế tối đa 80 px; dấu "+" của ghế trống sáng hơn và `aria-hidden`.
9. **Top bar:** chip phase là một dòng 24 px có `flex-wrap` + `overflow: hidden`, không còn `truncate`. Nhãn không vừa cạnh icon thì rơi xuống dòng 2 (bị ẩn), **không bao giờ hiện "…"**. Ngưỡng container query giữ nguyên (19,25rem / 40rem). Khi bỏ `px-4` của trang phòng: ở 320 chỉ icon, ở 340–640 nhãn ngắn, từ 768 nhãn đầy đủ. Thêm `data-phase-chip`.
10. **`PlayerRoster`:** điều người xem biết riêng (Đồng đội Quỷ, Quỷ bạn thấy, Merlin/Morgana) nay là **một icon 16 px cạnh tên**, không còn chip xuống dòng. Danh sách cao như nhau với mọi vai.
11. **"Đang chia bài…"** (`DealingCards`): 5 lá úp xoè ra rồi gom lại (2,4 s, lặp), giảm chuyển động thì đứng yên ở thế xoè. Trong ván thật màn này hầu như không kịp hiện (vai được ghi trước `gameState`); đã xem trong Preview.
12. Sửa kèm vì đo tương phản: nút "Xem lại role" (chữ trắng trên cam, 2,5:1) → "Xem lại vai", chữ mực; "Bạn chưa xác nhận đã đọc vai".
13. **Preview:**
    - cảnh mới: `join`, `join-closed`, `dealing`;
    - lobby có nút "Người vào" / "Người rời" (và kick) để xem ghế ngồi xuống / mờ đi cùng thông báo;
    - lineup dùng thứ tự vào phòng khác `seatOrder`, nên thấy ghế xáo;
    - thư lộ vai nhận `startedAt`, "Phát lại" phát lại cảnh thư rơi.
14. **Thuộc tính cho kiểm thử:** `data-letter`, `data-night-card`, `data-night-veil`, `data-seat`, `data-lobby-seat`, `data-lobby-notice`, `data-lobby-count`, `data-lineup-scroll`, `data-phase-chip`.

**Kết quả kiểm thử:**
- `npx tsc --noEmit` sạch; `npm run build` thành công (build lại sau khi xoá harness).
- ESLint:
  - `npx eslint src/components/games/avalon`: vẫn 2 lỗi `react-hooks/set-state-in-effect` có sẵn (`AvalonBoard.tsx:160` — trước là 155, lệch do thêm import và hook; `QuestPlaySection.tsx:43`) cùng 2 cảnh báo có sẵn trong `useAvalon.ts`.
  - `page.tsx`: 6 lỗi đều có từ trước (5 lỗi `<a>` thay vì `<Link>` ở các màn lỗi, 1 lỗi "Cannot create components during render"); đã lint bản gốc để đối chiếu. `npx eslint src`: 47 lỗi / 34 cảnh báo. Không có vấn đề mới.
- Đếm emoji = 0; regex màu phe = 0.
- Gói JS của Avalon: **293,9 KB thô, 88,1 KB gzip** (GĐ3: 285 / 84,5). Trang vào phòng dùng chung chunk này.
- **Ảnh** ở `.claude/gd4-shots/` (mở `index.html`), chụp bằng Chrome headless qua DevTools Protocol:
  - `screens/`: 17 màn × 320 / 360 / 375 (cả trang) và 1440: trang vào phòng (mở / đóng), lobby, chia bài, lineup, thư (niêm phong / đang giữ), chờ lộ vai, 3 lượt đêm (chưa giữ / đang giữ: Quỷ, Người, Merlin, Percival, Oberon), "Vai của tôi", bỏ phiếu (danh sách mobile). Không màn nào cuộn ngang; đáy dock = đáy màn hình;
  - `seq/`: chuỗi khung hình đóng băng tại T ms (lineup 10 khung, thư 6, lớp phủ đêm 5, lobby vào / rời 4 + 4) ở 375 và 1440;
  - `pairs/`, `motion/`, `game/` (ván thật).
- **Không lộ thông tin từ xa** (harness: cùng ghế p1, cùng Leader, chỉ khác vai của p1; mọi animation đóng băng cùng lúc; thu còn 10 %, độ lệch điểm ảnh trung bình 0–255; đối chứng = chụp lại cùng một bên):

  | Cặp | 375 | 1440 |
  |---|---|---|
  | Đêm Phe Quỷ: Sát Thủ (được gọi) \| Trung thần (không), chưa giữ | **0** | **0** |
  | Đêm Merlin: Merlin \| Percival, chưa giữ | **0** | **0** |
  | Đêm Percival: Percival \| Sát Thủ, chưa giữ | **0** | **0** |
  | Thư lộ vai: Merlin \| Sát Thủ · Trung thần \| Tay sai · Percival \| Morgana | **0 · 0 · 0** | **0 · 0 · 0** |
  | "Vai của tôi": Merlin \| Mordred · Trung thần \| Tay sai | **0 · 0** | **0 · 0** |
  | Bỏ phiếu, cả trang (danh sách mobile): Merlin \| Trung thần · Sát Thủ \| Percival | 0,20 · 0,31 (cao 1360 = 1360) | — |
  | *Đang giữ — đêm Quỷ / Merlin / Percival (máy đang giữ hiện thông tin, có chủ ý)* | *3,35 / 3,16 / 3,09* | *0,87 / 0,82 / 0,81* |
  | *Đang giữ — thư lộ vai Merlin \| Sát Thủ* | *1,38* | *0,33* |
  | *Đối chứng (mọi cặp)* | *0* | *0* |

  Chưa giữ thì mọi màn riêng tư lệch đúng 0. Phần lệch của danh sách là icon gợi ý 16 px. GĐ3 ghi chênh 25 px chiều cao giữa hai phe, nay bằng nhau.
- **Top bar** (harness, `PlayerPanel` toàn bề rộng như trang phòng mới; 14 phase × 10 bề rộng 320–1024): 0 nhãn bị cắt, 0 nhãn phải rơi xuống dòng ẩn, 0 tràn. Trong ván thật đo 139 lần (mỗi phase, mỗi tab; tab 375 đo thêm ở 390): 0 lỗi. 320 chỉ icon (riêng "Vai trong ván", "Lộ vai" hiện đủ vì lúc đó chưa có nút vai); 360 / 375 / 390 nhãn ngắn; 1440 nhãn đầy đủ.
- **Tương phản chữ** (đo trên điểm ảnh thật như GĐ2a; 15 màn GĐ4 × 375 phần trên và dưới + 1440, có cả lúc đang giữ):
  - chữ ≥ 11 px: **720/720 đạt ≥ 4,5:1**, thấp nhất 4,64;
  - chữ < 11 px: **151/151 đạt**;
  - lần đo đầu có 3 chỗ trượt, đã sửa: badge "×2" trên giấy da (4,07, nay nền đậm chữ giấy), nút "Xem lại role" (2,52, có từ trước), dấu "+" ghế trống (1,9).
- **Giảm chuyển động** (giả lập; lineup, thư, đêm, "Vai của tôi", lobby vào / rời, chia bài, trang vào phòng):
  - 0 animation đang chạy, 0 hạt hiệu ứng;
  - lineup vào thẳng khung cuối: vương miện cách ghế Leader 3 px, Lady và cuộn giấy hiện đủ;
- **CPU chậm 4×** (đo 4,6 s từ lúc màn hiện hoặc lúc bấm, 375 và 1440): lineup, thư, đêm, lobby vào / rời: p95 = 7 ms, khung dài nhất 8–49 ms, **0 khung > 50 ms**.
- **Ván thật** (bản production; 5 origin `localhost`, `127.0.0.1`, `a/b/c.localhost`; mỗi tab một cửa sổ CDP; cỡ 1440 / 375 / 375 / 320 / 360; bot tự chơi):
  - Ván chạy đủ, khoảng 2,5 phút: 4 người vào qua **trang vào phòng mới** (cảnh `hall`, nút "Vào bàn") → P5 rời lobby rồi vào lại → lineup → thư → 2 lượt đêm (5 người nên không có Percival; lượt Percival đã kiểm trong harness) → 3 Quest → ám sát → Phe Người thắng. **0 lỗi JS ở cả 5 tab.**
  - Lobby của chủ phòng hiện lần lượt "P2 / P3 / P4 / P5 đã vào phòng", "P5 đã rời phòng", "P5 đã vào phòng"; lúc P5 rời có bóng ghế mờ dần (`.av-seat-out`).
  - Lineup, mốc xong của từng phần (giây kể từ `phaseStartedAt`; "lần cuối còn chạy → lần đầu thấy xong", mỗi tab lấy mẫu khoảng 33 ms một lần):

    | Tab | Ghế xáo (mô hình 1,2) | Cuộn mở (0,6) | Chip cuối (1,29) | Vương miện dừng (3,2) |
    |---|---|---|---|---|
    | 0 (1440) | 1,212 → 1,244 | 0,617 → 0,650 | 1,306 → 1,336 | 3,212 → 3,242 |
    | 1 (375) | 1,213 → 1,246 | 0,618 → 0,652 | 1,307 → 1,337 | 3,214 → 3,244 |
    | 2 (375) | 1,215 → 1,248 | 0,620 → 0,653 | 1,309 → 1,339 | 3,215 → 3,246 |
    | 3 (320, reload lúc 2,04 s) | 1,216 → 1,250 | 0,623 → 0,655 | 1,311 → 1,341 | 3,497 → 3,529 |
    | 4 (360) | 1,218 → 1,252 | 0,624 → 0,658 | 1,312 → 1,343 | 3,219 → 3,250 |

    Bốn tab không reload lệch nhau ≤ 8 ms. Tab reload giữa lúc vương miện đang quay thì vào đúng khung (đang quay, không phát lại từ đầu), nhưng dừng muộn khoảng 0,3 s: đây là độ trễ dựng đã biết từ GĐ3 (animation bắt đầu ở lần vẽ đầu, sau khi trang tải lại và nhận state).
  - Đêm: cả 5 tab cùng lớp phủ (`night-evils`, rồi `night-merlin`), cùng thẻ "Nhấn giữ để xem", cùng nút. Sau khi bấm, nút của ai cũng thành "✓ Xong — chờ lượt sau". Đang giữ: tab P2 (Merlin) thấy P5 sáng và "Phe Quỷ lộ diện trước bạn: P5" (Mordred ẩn), tab P3 thấy "Lượt này không gọi bạn".
  - Cặp ảnh giữa hai tab 375 của ván thật (P2 Merlin, đang làm Leader | P3 Trung thần): thư lộ vai 0,04; "Vai của tôi" chưa giữ 1,61 (trang phía sau lớp mờ khác nhau vì thanh "Bạn là Leader"); đêm chưa giữ 6,7 / 8,2. Hai cặp đêm bị chi phối bởi thanh "Bạn là Leader" (thông tin công khai, đẩy cả trang xuống 24 px) và ô "bạn" ở ghế khác nhau, nên không dùng làm thước đo; thước đo là bảng harness ở trên.
  - 5 tab cùng chuỗi cảnh `hall` → `night` → `forest` → `camp` → `chapel` → `camp` → `mountain` → `blood-moon` → `end-good`.
  - Phòng test đã xoá bằng nút Xoá (mở lại link báo "Room Not Found").
  - Kiểm lại sau khi gộp chunk (bản production, 2 tab): trang vào phòng hiện sau 1,4 s; bấm "Vào bàn" thì 0,6 s sau đã vào lobby (chunk bàn chơi tải một lần); 0 lỗi; phòng đã xoá.

**Còn tồn / gợi ý cho GĐ sau:**
- Độ trễ dựng khi reload (lần này 0,3 s ở vương miện lineup): như gợi ý GĐ3, có thể bù bằng cách đặt `currentTime` của animation trong layout effect.
- Đang nhấn giữ ban đêm, máy của người được gọi có ghế sáng (theo đúng yêu cầu). Ai nhìn thẳng vào màn hình người đang giữ thì vẫn thấy; màn hình **không** giữ thì giống hệt nhau.
- Thông báo vào / rời ở lobby nằm đè lên dòng tiêu đề khoảng 3 s (không chặn bấm).
- **GĐ5:** nút cuối ván vào dock (GĐ3 chuyển sang). Token `--av-good-ink` / `--av-evil-ink` và `RoleLetter` dùng lại được nếu màn tổng kết cần giấy da.

**Dọn dẹp:** harness `src/app/avtest` đã xoá (không có trong commit), `.next` build lại sạch, phòng test đã xoá. Các script kiểm thử (CDP) nằm ở scratchpad của session, không có trong repo.

### Ghi chú của người thực thi GĐ5

**Đã làm:** toàn bộ mục GĐ5 và "Bổ sung cho GĐ5". Không sửa logic-core: `useAvalon.ts`, `types.ts`, `constants.ts` không có trong diff. Ở `AvalonBoard.tsx` chỉ đổi phần hỏi xác nhận: `confirm(...)` → `await ask({...})` trong `handleLeave`, `handleDelete`, `handleNewGame`, `handleKickPlayer` (thêm `ask` vào mảng phụ thuộc), và render `{confirmDialog}`; thân handler, khối auto-progression giữ nguyên. Không thêm dependency, không tải icon mới, không sửa `globals.css`, không đụng file ngoài thư mục Avalon, không đụng game khác.

**Cấu trúc mới:**
- `hooks/useEndReveal.ts` (mốc lộ R dùng chung cho bàn và panel, kèm "bỏ qua" cục bộ), `hooks/useConfirm.tsx` (hỏi xác nhận dạng promise).
- `ui/ConfirmDialog.tsx`, `ui/EndSparks.tsx` (hạt mừng).
- `panel/endGame.ts` (`endReason`, `endReasonText`: 5 kiểu kết thúc).
- `table/timelines.ts` thêm `END` và `endTimeline(R)`.
- `avalon.css`: khối "Kết thúc ván (GĐ5)" (`av-seat-flip`, `av-banner-in`, `av-spark-*`, `av-dialog-*`).

**Lệch / quyết định nhỏ so với kế hoạch (nhạc trưởng nên liếc qua):**
1. **Mốc thời gian** (`END` trong `timelines.ts`, theo `phaseStartedAt`):
   - mốc lộ R = 7,95 s nếu có ám sát (hết overlay), ngược lại R = 0 (3 Quest thất bại, 5 lần bị bác, Sát Thủ hết giờ: banner hiện ngay);
   - từ R: banner trồi lên (0,6 s), tiêu đề "Bạn thắng!" đập vào (R+0,1 s); hạt mừng R … R+3 s; ghế lật từ R+0,3 s, mỗi ghế cách 150 ms theo thứ tự ghế (mỗi lần lật 0,5 s; 10 ghế xong ở R+2,15 s); thẻ "Sát Thủ đâm" R+0,5 s; hành trình R+0,7 s, mỗi chặng cách 120 ms; danh sách vai R+1,5 s; xong hẳn R+3 s;
   - cùng quy ước GĐ3: `useCue` / `<Cued>`, style tĩnh = khung cuối, `usePhaseTimeline` chỉ cho phần DOM phải đổi (overlay, hạt, `aria-live`, `data-anim-stage`).
2. **Chạm để bỏ qua overlay** (Phụ lục D, mục 2.3): chạm vào overlay hoặc nút "Chạm để bỏ qua" thì **chỉ máy đó** dời R về lúc chạm; banner, hạt, lật ghế chạy ngay từ đó (các phần tử được key theo R nên mount lại với mốc mới). Reload thì quay về đồng hồ chung.
3. **Thẻ kết quả tĩnh** "Sát Thủ đâm" (người bị đâm, vai thật, dấu "Trúng" / "Trật") nằm luôn trong màn kết thúc, không chỉ khi giảm chuyển động: nó là bản ghi của overlay. Giảm chuyển động thì overlay không hiện và thẻ này kể cùng nội dung.
4. **Câu dẫn truyện của cảnh `end-good` / `end-evil` chuyển vào banner**, `SceneTitle` bỏ qua hai cảnh này. Lý do: khi không có ám sát, dải tiêu đề (0–2,6 s) đè đúng các ghế phía trên đang lật ở 375; khi có ám sát thì tiêu đề chạy hết dưới overlay, không ai thấy.
5. **Lật vai trên bàn** (`RoundTable` prop `revealAll` = R): mỗi ghế lật như lá bài, mặt sau là avatar, mặt trước là `RoleEmblem` cỡ `md` (màu phe, vì đã công khai); nhãn tên vẫn ở dưới. Người bị đâm có dấu dao găm đỏ ở góc dưới. Ở màn kết thúc: gợi ý riêng của người xem không còn, vòng ngắm / nảy của Sát Thủ trên avatar tắt (trước đây còn 2 animation chạy mãi ở mặt sau đã úp).
6. **Ô Quest ở màn kết thúc:** không ô nào là "Quest hiện tại"; ô chưa chơi nền tối hơn, số La Mã `stone-500`, bỏ huy hiệu "≥2", `title` "không được chơi", `data-quest-tile="unplayed"`. Không dùng `opacity` cho cả ô, để số La Mã vẫn đủ tương phản của chữ lớn.
7. **Tổng kết:** `JourneyStrip` thêm `final` (không có chặng kế tiếp, chặng chưa đi mờ, bỏ dòng "Chặng kế tiếp"); bên dưới là từng Quest: địa điểm, Leader, tên người trong đội, số Đồng ý / Từ chối của đề xuất được duyệt, kết quả, số lá Quỷ. Chặng chưa chơi ghi "Chưa đi tới". Riêng ván thua vì 5 lần bị bác, Quest đang dở ghi "Đội bị bác 5 lần liên tiếp — không đi được" (lấy từ `voteRejectStreak`, không bịa đề xuất nào).
8. **Lý do thắng** (`endGame.ts`): 3 Quest thất bại / 5 lần bị bác / Sát Thủ đâm trúng Merlin (tên) / Sát Thủ đâm trật (tên không phải Merlin) / đủ 3 Quest và Sát Thủ hết giờ. Banner tô theo phe thắng (công khai); "Bạn thắng!" màu vàng, "Bạn thua…" màu sáng trung tính; có "Vai của bạn".
9. **Hạt mừng:** 26 lấp lánh vàng (Người thắng) hoặc 24 tàn lửa bay từ đáy (Quỷ thắng), vị trí xáo theo seed `phaseStartedAt` nên mọi máy giống nhau, chỉ mount trong 3 s, style tĩnh = vô hình.
10. **Dock cuối ván** (mỗi nút một dòng, dock cao 71 px): chủ phòng "Chơi ván mới" + "Xoá phòng" (trước ghi "Thoát phòng" nhưng thật ra là xoá phòng); người khác "Chờ chủ phòng" (không bấm được) + "Thoát phòng". Desktop: dock nằm ngay dưới banner. Màn hình thấp (< 700 px): banner bỏ icon to, tiêu đề nhỏ một cỡ, để dòng "Bạn thắng!" luôn nằm trên dock (đo ở 320×568, 360×640, 375×667, 375×812: đều thấy).
11. **`ConfirmDialog`** (`useConfirm` trả `ask()` dạng promise): bottom sheet trên điện thoại, giữa màn hình từ `sm`; focus vào "Huỷ"; Esc hoặc chạm ra ngoài là huỷ; Tab chỉ đi giữa 2 nút; `role="alertdialog"`. Màu nút: cam (rời / xoá / kick), đỏ phe Quỷ (đâm), vàng (ván mới). Câu hỏi đang mở mà component bị gỡ thì coi như "Huỷ". `alert()` báo lỗi (bắt đầu ván, kick lỗi) **chưa** đổi: ngoài phạm vi GĐ5.
12. **Lỗi tìm ra khi đo, đã sửa:** con dấu "Trúng / Trật" của thẻ "Sát Thủ đâm" nằm sát mép phải; trước khi đóng dấu nó ở khung đầu `scale(2.4)` (vô hình nhưng hộp to) nên thò ra ngoài trang 43 px. Điện thoại nở layout lên 418×906, dock `fixed` rơi khỏi màn hình suốt 0–11 s; lớp hạt `fixed inset-0` còn giữ bề rộng đã nở. Sửa: thẻ `overflow-hidden` (có ghi chú trong code).
13. **Preview:** cảnh `end-good-quests` đổi tên thành `end-good-timeout` (state đó đúng là "Sát Thủ hết giờ"); 5 cảnh kết thúc có hồ sơ Quest đầy đủ (Leader, đội, phiếu, lá Quỷ), mỗi cảnh một góc nhìn: Người thắng (Trung thần), Sát Thủ đâm trật, Merlin bị đâm trúng, Quỷ thắng 3 Quest (Mordred), Người thua vì 5 lần bác.
14. **Thuộc tính cho kiểm thử:** `data-anim-stage`, `data-end-reveal-at`, `data-end-banner`, `data-end-reason`, `data-end-stab`, `data-end-journey`, `data-end-roles`, `data-end-sparks`, `data-quest-log`, `data-seat-role`, `data-assassin-overlay`, `data-confirm-dialog`, `data-confirm`.

**Kết quả kiểm thử:**
- `npx tsc --noEmit` sạch; `npm run build` thành công (build lại sạch sau khi xoá harness).
- ESLint: `npx eslint src/components/games/avalon` vẫn 2 lỗi `react-hooks/set-state-in-effect` có sẵn (`AvalonBoard.tsx:163` — trước là 160, lệch do thêm import và `useConfirm`; `QuestPlaySection.tsx:43`) cùng 2 cảnh báo có sẵn trong `useAvalon.ts`. `npx eslint src`: 42 lỗi / 34 cảnh báo, không có cái nào từ GĐ5.
- Đếm emoji = 0; regex màu phe = 0.
- Gói JS của Avalon: **314,2 KB thô, 94,6 KB gzip** (GĐ4 ghi 293,9 / 88,1).
- **Ảnh** ở `.claude/gd5-shots/` (mở `index.html`; ảnh tổng hợp trong `sheets/`), chụp bằng Chrome headless qua DevTools Protocol trên harness tạm:
  - `screens/`: 5 kiểu kết thúc × (375 cả trang + màn đầu, 1440 + cột phải cuộn xuống); hộp xác nhận "Xoá phòng" và "Đâm" ở 375 / 1440; bàn 10 ghế ở 320 / 375 (0 huy hiệu đè nhau); máy thấp 320×568 … 375×812 (chủ phòng và người khác);
  - `seq/`: chuỗi khung hình đóng băng tại T ms — có ám sát (0,5 / 1,4 / 2,5 / 3,9 / 5,6 / 8,1 / 8,4 / 8,8 / 9,3 / 9,9 / 10,6 / 12 s) và không ám sát (0 / 0,15 / 0,4 / 0,7 / 1 / 1,4 / 2 / 2,6 / 3,5 s), ở 375 và 1440. Khung 3,9 s ("chớp trắng") trông tối là do cách đóng băng các animation gắn theo stage của overlay cũ; chụp thời gian thực thì trắng đúng;
  - `checks/` (giảm chuyển động, tương phản, CPU), `game/` (ván thật). Ảnh `checks/reduced-*` chụp trước khi đổi nhãn nút dock (còn "Chơi tiếp ván mới").
- **Khung cuối** (5 kiểu × 375 / 1440, mount sau 30 s): đúng 1 `[data-phase-section]`, `data-anim-stage="done"`, 0 overlay, 7/7 ghế đã lật, ô Quest `success,fail,…,unplayed` đúng dữ liệu, 0 animation còn chạy, không tràn ngang, đáy dock = đáy màn hình.
- **Bố cục trong cả chuỗi** (375×812, lấy mẫu ~40 ms trong 12,5 s, có ám sát và không): bề rộng layout luôn 375, đáy dock luôn 812 (trước khi sửa mục 12: 418×906 suốt 0–11 s).
- **Reload / mount muộn** (harness): mount ở 12 s (có ám sát) và 4 s (không) → vào thẳng khung cuối, không overlay, 0 hạt, 0 animation chạy. Mount ở 3 s → overlay đúng stage `split`; ở 9 s → 2 ghế đã lật, các ghế sau lật tiếp đúng nhịp, 1,5 s sau 7/7.
- **Bỏ qua overlay** (harness, chạm ở 2,2 s): overlay biến mất, R = 2227 ms, banner trồi lên ngay, 24 hạt, 2,6 s sau 7/7 ghế đã lật.
- **Giảm chuyển động** (giả lập; 5 kiểu kết thúc mount ở giây 0): `stage = done`, 0 overlay, thẻ "Sát Thủ đâm" có mặt ở 2 kiểu ám sát, 7/7 ghế hiện vai, 0 hạt, **0 animation**.
- **Tương phản chữ** (đo trên điểm ảnh thật như GĐ2a; 5 kiểu kết thúc + bản người không phải chủ phòng + 2 hộp xác nhận; 375 ở đầu / giữa / cuối trang, 1440 ở đầu / cuối cột phải): chữ ≥ 11 px **1704/1704 đạt ≥ 4,5:1** (thấp nhất 4,64), chữ < 11 px **408/408 đạt**. Lần đo đầu trượt 1 chỗ: nút "Xoá phòng" ở desktop nằm thẳng trên trời bình minh (3,58), đã đổi nền sang kính tối.
- **CPU chậm 4×** (bản production, đo 4,6 s, 375 và 1440): màn kết không ám sát, quanh mốc R sau overlay, và overlay: p95 = 17 ms, khung dài nhất 17–33 ms, **0 khung > 50 ms**. (Bản dev có 1–2 khung 67–83 ms đúng lúc gỡ overlay và mount hạt.)
- **Ván thật** (bản production; 5 origin `localhost`, `127.0.0.1`, `a/b/c.localhost`; mỗi tab một cửa sổ CDP; cỡ 1440 / 375 / 375 / 320 / 360; bot tự chơi; Sát Thủ đâm qua `ConfirmDialog`). Chạy 2 ván, **0 lỗi JS ở cả 5 tab** mỗi ván:
  - ván 1: P2 là Sát Thủ, đâm trúng Merlin → Phe Quỷ thắng; ván 2: chủ phòng là Sát Thủ, đâm trật → Phe Người thắng. Banner đúng thắng / thua theo từng tab, lý do `merlin-found` / `merlin-missed`, cả 5 tab cùng chuỗi cảnh tới `end-evil` / `end-good`.
  - Mốc lần đầu thấy (giây, tính từ `phaseStartedAt`; "lần cuối chưa → lần đầu thấy", mỗi tab lấy mẫu ~19 ms một lần), ván 2:

    | Tab | Hết overlay (mô hình 7,95) | Banner hiện đủ (8,55) | 5 ghế lật xong (9,35) | Xong chuỗi (10,95) |
    |---|---|---|---|---|
    | 0 (1440) | 7,941 → 7,963 | 8,555 → 8,570 | 9,385 → 9,401 | 10,948 → 10,967 |
    | 1 (375) | 7,942 → 7,965 | 8,557 → 8,572 | 9,402 → 9,417 | 10,950 → 10,969 |
    | 2 (375) | 7,943 → 7,970 | 8,558 → 8,573 | 9,388 → 9,404 | 10,951 → 10,970 |
    | 3 (320, reload lúc 3,0 s) | 7,944 → 7,974 | 8,590 → 8,872 | 9,703 → 9,717 | 10,952 → 10,971 |
    | 4 (360) | 7,945 → 7,976 | 8,544 → 8,560 | 9,390 → 9,406 | 10,953 → 10,972 |

    Bốn tab không reload lệch nhau ≤ 16 ms (khoảng 1 nhịp lấy mẫu); ván 1 cho kết quả như vậy (≤ 18 ms). Ghế lật xong muộn hơn mô hình ~50 ms (độ trễ dựng đã biết từ GĐ3).
  - **Reload giữa overlay** (tab 3, lúc 3,0 s): dựng lại ở 4,28 s, vào đúng khung (đang "chớp trắng", 4,31 s sang "lộ vai"), không phát lại từ đầu; ghế lật xong muộn ~0,3 s (độ trễ dựng sau khi tải lại, như GĐ4).
  - **Reload sau khi chuỗi xong** (tab 4, lúc 14,0 s): 51 mẫu trong 3 s, chỉ một stage `done`, overlay không hiện lần nào, banner hiện đủ ngay mẫu đầu, 0 animation chạy, 0 hạt, 5/5 ghế đã lật. Chủ phòng mở lại link sau ván 2 cũng vào thẳng khung cuối.
  - **ConfirmDialog trong ván thật:** "Đâm" (bot bấm qua hộp); chủ phòng "Chơi ván mới" → hộp "Bắt đầu ván mới?" → cả 5 tab về lobby; kick P5 → hộp "Mời P5 ra khỏi phòng?" → còn 4 người; "Xoá" → hộp "Xoá phòng?" → chủ phòng về trang chủ, mở lại link báo "Room Not Found". Phòng test của cả hai ván đã xoá.

**Còn tồn / gợi ý cho GĐ sau:**
- `alert()` gốc còn ở `handleStartGame` và lỗi kick (`AvalonBoard`): có thể đổi sang thông báo trong app ở GĐ6 (trợ năng).
- Ở 320 px với 10 ghế, huy hiệu vai (cũng như avatar trước đó) chạm mép ô Quest I và V — có từ trước, do vị trí ghế; GĐ6 có thể thu nhỏ ghế khi bàn hẹp.
- Gói Avalon tăng ~6,5 KB gzip; nếu GĐ6 tăng tiếp thì lazy-load từng cảnh như kế hoạch.
- Độ trễ dựng khi reload (≤ 0,3 s) vẫn như GĐ3 / GĐ4; có thể bù bằng `currentTime` trong layout effect ở GĐ6.

**Dọn dẹp:** harness `src/app/avtest` đã xoá (không có trong commit), `.next` build lại sạch, phòng test đã xoá. Các script kiểm thử (CDP) nằm ở scratchpad của session, không có trong repo.

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
