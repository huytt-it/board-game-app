# Luật Ma Sói — bản app, không quản trò (v1)

> Nguồn sự thật cho `engine/` và cho màn "Luật chơi" trong app. Sửa luật thì sửa file này **trước**, rồi sửa engine + test cho khớp.
> Các ca biên ở mục 10 mang mã `E<số>`; mỗi mã phải có ít nhất một test trong `engine/*.test.ts` (tên test ghi mã đó).

---

## 1. Tóm tắt

Trong làng có Ma Sói ẩn mình. **Ban đêm** Sói cắn một người, các vai đặc biệt dùng năng lực. **Ban ngày** cả làng nói chuyện **ngoài đời** rồi bỏ phiếu trên điện thoại để treo một người.

App là quản trò: tự gọi từng bước, đếm giờ, nhận lựa chọn và công bố kết quả. Chủ phòng cũng chơi như mọi người, chỉ có thêm quyền cài đặt, bắt đầu ván, mời ra và xoá phòng.

## 2. Phe và điều kiện thắng

| Phe | Thắng khi |
|---|---|
| **Dân làng** (mọi vai trừ Sói) | Không còn Sói nào sống. |
| **Ma Sói** | Số Sói còn sống **≥** số người còn sống không phải Sói. |

- Kiểm tra thắng thua sau **mỗi lượt có người chết**: ở bình minh, sau khi treo, sau phát bắn của Thợ săn, và khi chủ phòng cho một người rời làng.
- Nếu Sói đã hết thì Dân thắng, kể cả khi không còn ai sống.
- Khi ván có vai mở rộng, có thêm phe **Kẻ chán đời** và phe **Tình nhân**. Thứ tự kiểm tra thắng thua lúc đó theo mục 11.8.

## 3. Các vai (v1)

| Vai | Phe | Ban đêm (bước ①) | Ghi chú |
|---|---|---|---|
| **Ma Sói** | Sói | Cả bầy chọn **một** người để cắn (mục 5.3). | Biết đồng đội từ đầu ván. Không được chọn Sói (kể cả mình). |
| **Dân làng** | Dân | Chọn "người mình nghi" (người còn sống khác mình). Lựa chọn này **không ảnh hưởng luật**, chỉ hiện trong tổng kết cuối ván. | Bước này có để màn hình ai cũng giống nhau. |
| **Tiên tri** | Dân | Soi một người còn sống khác mình, thấy ngay **"Là Sói" / "Không phải Sói"**. | Kết quả chỉ mình xem (giữ để xem). Xem lại được trong "Vai của tôi". |
| **Bảo vệ** | Dân | Che một người còn sống, được tự che. | **Không được che cùng một người hai đêm liên tiếp.** Che chặn được Sói cắn, không chặn độc, không chặn treo hay phát bắn. |
| **Phù thủy** | Dân | Bước ①: chọn "người mình nghi" như Dân. Bước ② là của Phù thủy (mục 5.4). | Cả ván có **1 bình cứu** và **1 bình độc**. Được tự cứu, không được tự độc. Được dùng cả hai bình trong một đêm. |
| **Thợ săn** | Dân | Chọn "người mình nghi" như Dân. | Khi chết thì bắn ngay một người (mục 5.7). Chết vì **độc** thì **không** được bắn, trừ khi chủ phòng bật tuỳ chọn. |

## 4. Phân vai

**Số người: 5–12.** (v1 là 5–10; người dùng nâng lên 12 ngày 2026-10-17, cùng lúc thêm vai mở rộng ở mục 11.) Mặc định như bảng dưới. Chủ phòng có thể chỉnh số lượng từng vai, app hiện điểm cân bằng.

| Người | Sói | Tiên tri | Bảo vệ | Phù thủy | Thợ săn | Dân | Điểm |
|---|---|---|---|---|---|---|---|
| 5 | 1 | 1 | 1 | – | – | 2 | +6 |
| 6 | 2 | 1 | 1 | 1 | – | 1 | +3 |
| 7 | 2 | 1 | 1 | 1 | – | 2 | +4 |
| 8 | 2 | 1 | 1 | 1 | – | 3 | +5 |
| 9 | 3 | 1 | 1 | 1 | 1 | 2 | +1 |
| 10 | 3 | 1 | 1 | 1 | 1 | 3 | +2 |
| 11 | 3 | 1 | 1 | 1 | 1 | 4 | +3 |
| 12 | 3 | 1 | 1 | 1 | 1 | 5 | +4 |

- **Điểm cân bằng** (thang kiểu Ultimate Werewolf): Sói −6, Tiên tri +7, Phù thủy +4, Bảo vệ +3, Thợ săn +3, Dân +1. Gần 0 là cân, dương là lợi cho Dân, âm là lợi cho Sói. App luôn hiện điểm. App **cảnh báo khi điểm lệch quá ±6** (nhỏ hơn −6 hoặc lớn hơn +6), không chặn bắt đầu ván. Bộ mặc định cao nhất là +6 nên không bao giờ bị cảnh báo (người dùng chốt 2026-10-11).
- Bảng trên là đề xuất, sẽ chỉnh lại sau khi chơi thử (GĐ6). Bộ mặc định chỉ dùng 6 vai gốc. Vai mở rộng (mục 11) do chủ phòng bật thêm.
- **Ràng buộc khi bắt đầu ván** (vi phạm thì không cho bắt đầu):
  - tổng số vai = số người;
  - có ít nhất 1 Sói (Sói = Ma Sói + Sói con, mục 11.1);
  - 2 × số Sói < số người, vì nếu không thì Sói thắng ngay từ đầu;
  - mỗi vai đặc biệt có tối đa 1 người: Tiên tri, Bảo vệ, Phù thủy, Thợ săn và cả 6 vai mở rộng (Già làng, Người hoá sói, Tay sai, Kẻ chán đời, Cupid, Sói con).
- Ghế ngồi được xáo ngẫu nhiên mỗi ván. Danh sách vai trong ván chỉ lưu **số lượng** từng vai, **không lưu theo thứ tự ghế**.

## 5. Diễn biến một ván

```
Xem vai → ĐÊM ① → [ĐÊM ② Phù thủy] → Bình minh → [Thợ săn] → (kiểm tra thắng)
       → Thảo luận → Bỏ phiếu → Kết quả → [Thợ săn] → (kiểm tra thắng) → ĐÊM ① …
```

Mỗi bước có đồng hồ. Thời lượng do chủ phòng đặt (mục 8.3) và **cố định từ lúc bắt đầu ván**. Hết giờ thì app tự sang bước sau. Nhiều bước kết thúc sớm khi mọi người đã xong.

### 5.1 Xem vai
- Mỗi người **giữ** thẻ để xem vai của mình. Sói thấy thêm đồng đội.
- Kết thúc khi mọi người bấm "Đã xem" hoặc hết giờ.

### 5.2 Đêm ① — ai cũng chọn một người
- **Mọi người còn sống** đều chọn một người rồi bấm **Xác nhận**. Ý nghĩa của lựa chọn tuỳ theo vai (bảng ở mục 3).
- Bố cục màn hình và thời lượng như nhau với mọi vai, nên nhìn ai đang bấm thì không đoán ra vai. Phần riêng của vai (chữ hướng dẫn, đồng đội Sói, kết quả soi) phải giữ mới xem được.
- Ai chưa bấm Xác nhận thì vẫn đổi được lựa chọn.
  - Tiên tri, Bảo vệ, Dân: Xác nhận là chốt. **Chọn mà chưa Xác nhận khi hết giờ thì coi như chưa làm gì**: Tiên tri không soi, Bảo vệ không che (người dùng chốt 2026-10-11). Vì vậy màn phải hiện rõ "Chưa xác nhận".
  - Sói: sau khi Xác nhận vẫn **đổi được**; đổi thì mất Xác nhận và phải bấm lại.
- **Kết thúc sớm** khi mọi người còn sống đã Xác nhận **và** bầy Sói đã thống nhất (mục 5.3). Nếu không thì chạy đến hết giờ.

### 5.3 Bầy Sói thống nhất mục tiêu
- Mỗi Sói còn sống chọn một mục tiêu trong số người còn sống không phải Sói. Cả bầy **thấy lựa chọn của nhau ngay lập tức**, giữ để xem.
- **Thống nhất** nghĩa là mọi Sói còn sống đang chọn cùng một người. Khi chưa thống nhất, màn của Sói hiện ví dụ "Bầy chưa thống nhất: Lan (1) · Minh (1)". Sói đổi lựa chọn để đi đến thống nhất.
- Hết giờ mà chưa thống nhất thì chọn người được nhiều Sói chọn nhất. Mọi lựa chọn đang có đều được tính, đã Xác nhận hay chưa.
- **Hoà** thì theo cài đặt "Sói hoà phiếu":
  - **Ngẫu nhiên** (mặc định): chọn ngẫu nhiên một người trong số những người bằng phiếu;
  - **Không cắn**: đêm đó không ai bị cắn.
- Không Sói nào chọn thì đêm đó không ai bị cắn.
- Chỉ còn một Sói thì Sói đó chọn ai là người đó.

### 5.4 Đêm ② — Phù thủy
- Bước này **có trong mọi đêm của ván nếu ván có vai Phù thủy**, kể cả khi Phù thủy đã chết hay đã hết bình. Mục đích là để độ dài đêm không lộ gì.
- Phù thủy còn sống thấy **người bị Sói nhắm đêm nay**, hoặc "Đêm nay Sói không cắn ai". Phù thủy không biết người đó có được Bảo vệ che hay không. Các lựa chọn:
  - **Cứu** người đó, nếu còn bình cứu và có người bị nhắm;
  - **Độc** một người còn sống khác mình, nếu còn bình độc. Không được độc người mình vừa chọn cứu;
  - **Không làm gì**.
- Những người còn sống khác thấy màn **cùng bố cục**, "Đoán xem Sói nhắm ai" (người còn sống, được chọn cả mình). Lựa chọn này chỉ hiện trong tổng kết cuối ván.
- Nếu UI để lọt một quyết định vừa cứu X vừa độc X (E5), engine giữ phần cứu, bỏ phần độc, bình độc còn nguyên.
- Kết thúc sớm khi mọi người còn sống đã Xác nhận, hoặc hết giờ. Phù thủy hết giờ mà chưa Xác nhận thì coi như không làm gì.
- Ở Đêm ②, Xác nhận là chốt với **mọi người, kể cả Phù thủy** (như Tiên tri và Bảo vệ ở Đêm ①). Không cần chọn ai cũng Xác nhận được.

### 5.5 Tính kết quả đêm (theo thứ tự)
1. **Người bị nhắm** = kết quả của bầy Sói (mục 5.3), được chốt khi Đêm ① kết thúc.
2. Người bị nhắm **sống sót** nếu được Bảo vệ che **hoặc** được Phù thủy cứu. Nếu không thì chết, nguyên nhân là "Sói".
3. Người bị Phù thủy độc **chết**, nguyên nhân là "độc". Bảo vệ không chặn được. Nếu người đó cũng là người bị nhắm mà không được cứu thì chỉ chết một lần, nguyên nhân tính là "độc".
4. Cập nhật bình của Phù thủy và người Bảo vệ đã che đêm nay.
   - Bình **mất khi được dùng lên một người còn sống lúc tính đêm**, kể cả khi người được cứu vốn đã được Bảo vệ che (E2).
   - Nếu người đó đã rời làng trong đêm thì bình không có tác dụng và vẫn còn.

### 5.6 Bình minh
- Công bố những người chết đêm qua, xếp **theo thứ tự ghế** chứ không theo nguyên nhân, và **không nói nguyên nhân**. Không ai chết thì công bố "Đêm qua bình yên".
- Nếu bật "Lộ vai khi chết" thì lật thẻ vai của người chết.
- Thời lượng cố định 8 giây (đi kèm hoạt cảnh).
- Sau bình minh:
  1. Nếu không còn Sói thì Dân thắng.
  2. Nếu Thợ săn vừa chết và được bắn thì sang bước Thợ săn.
  3. Nếu không thì kiểm tra thắng rồi sang Thảo luận.

### 5.7 Thợ săn
- Thợ săn vừa chết (bị cắn, bị treo, hoặc bị độc khi tuỳ chọn cho phép) chọn **một người còn sống** để bắn, hoặc **không bắn**. Hết giờ thì coi như không bắn.
- Người bị bắn chết ngay, nguyên nhân là "Thợ săn", lộ vai theo cài đặt. Bảo vệ không chặn được.
- Mọi người thấy chữ "Thợ săn đang ngắm…" (vai Thợ săn lộ ra ở bước này là đương nhiên).
- Kiểm tra thắng **sau** phát bắn. Phát bắn có thể phá điều kiện thắng của Sói.
- Sau đó quay về luồng bình thường: sau bình minh thì sang **Thảo luận**, sau khi treo thì sang **Đêm**.

### 5.8 Thảo luận
- Cả làng nói chuyện **ngoài đời**. App đếm giờ và hiện danh sách người còn sống / đã chết.
- Nút **"Sẵn sàng bỏ phiếu"**. Kết thúc sớm khi mọi người còn sống đã bấm, hoặc hết giờ.

### 5.9 Bỏ phiếu và kết quả
- Mỗi người còn sống bầu **một người còn sống khác mình**, hoặc **"Bỏ qua"**. Được đổi phiếu đến khi bước kết thúc. Không bầu thì tính là Bỏ qua.
- Ai đã bầu thì mọi người thấy, nhưng **bầu ai thì ẩn** đến khi có kết quả.
- Kết thúc sớm khi mọi người còn sống đã bầu, hoặc hết giờ.
- **Kết quả** (cố định 8 giây):
  - Công khai ai bầu ai.
  - Gọi M là số phiếu cao nhất của một người, B là số Bỏ qua.
  - Nếu M = 0, hoặc có từ hai người cùng đạt M, hoặc B ≥ M thì **không ai bị treo**.
  - Ngược lại, người đạt M bị treo (lật vai theo cài đặt).
- Sau kết quả:
  1. Nếu Thợ săn bị treo thì sang bước Thợ săn.
  2. Nếu không thì kiểm tra thắng rồi sang **Đêm** mới.

### 5.10 Kết thúc
- Công bố phe thắng và lý do, lật vai của **mọi người**.
- **"Diễn biến ván"**: từng đêm Sói nhắm ai, Bảo vệ che ai, Tiên tri soi ai và kết quả, Phù thủy dùng bình gì cho ai, ai chết vì nguyên nhân gì. Thêm "người mình nghi" của từng người cho vui.
- Chủ phòng có thể **chơi lại** với cùng phòng.

## 6. Người chết và hồn ma
- Người chết không chọn, không bầu, và không còn là mục tiêu của bất kỳ lựa chọn nào.
- **Ngoài đời, người chết không được nói hay ra hiệu.**
- Cài đặt **"Hồn ma xem hết vai"** (chủ phòng bật/tắt, mặc định **bật**):
  - **Bật**: người chết thấy vai của mọi người và các lựa chọn ban đêm theo thời gian thực.
  - **Tắt**: người chết chỉ thấy thông tin công khai và vai của mình.
- Những gì hồn ma được xem **chỉ hiện khi giữ thẻ**. Nhìn từ xa, màn của hồn ma giống màn của một người chết bình thường, để người còn sống ngồi cạnh không liếc thấy (người dùng chốt 2026-10-16).
- **Thợ săn đã chết nhưng chưa xong lượt bắn thì chưa phải hồn ma.** Thợ săn chỉ thành hồn ma sau khi đã bắn, đã chọn không bắn, hoặc hết giờ. Nếu không, Thợ săn sẽ thấy hết vai rồi mới bắn (người dùng chốt 2026-10-16).

## 7. Mất kết nối, rời phòng
- Mất mạng hay tắt máy **không** làm người chơi chết. Mở lại link phòng là vào lại đúng chỗ.
- Hết giờ mà một người chưa làm gì thì coi như **không hành động**:
  - Sói không chọn thì không được tính phiếu;
  - Bảo vệ không chọn, hoặc chọn mà chưa Xác nhận, thì không che (Tiên tri và Phù thủy cũng vậy);
  - Tiên tri không chọn thì không soi;
  - Phù thủy không chọn thì không dùng bình;
  - Thợ săn không chọn thì không bắn;
  - phiếu ban ngày tính là Bỏ qua.
- Chủ phòng có thể **"Cho rời làng"** một người bỏ về hẳn, ở bất kỳ bước nào:
  - người đó tính là chết, nguyên nhân "rời làng", lộ vai theo cài đặt;
  - Thợ săn rời làng thì **không** được bắn;
  - áp dụng ngay và kiểm tra thắng ngay;
  - chủ phòng không tự cho mình rời làng được (tránh bấm nhầm).

## 8. Cài đặt phòng (chủ phòng, ở sảnh)

### 8.1 Bộ vai
Bộ vai mặc định theo số người (mục 4). Chủ phòng chỉnh được số Sói và từng vai đặc biệt. Dân làng là phần còn lại, tự tính theo số người trong phòng.

Sảnh luôn hiện điểm cân bằng kèm nhãn:
- "cân" khi |điểm| ≤ 2;
- "lợi Dân" khi điểm > +2;
- "lợi Sói" khi điểm < −2.

Lệch quá ±6 thì có thêm cảnh báo (người dùng chốt 2026-10-11).

**Vai mở rộng** (mục 11):
- mặc định tắt;
- chủ phòng thêm từng vai ở mục "Vai mở rộng", mỗi vai tối đa 1 người;
- Dân làng tự giảm tương ứng, điểm cân bằng tự cập nhật.

### 8.2 Luật tuỳ chọn
| Cài đặt | Mặc định | Lựa chọn |
|---|---|---|
| Lộ vai khi chết | Bật | Bật / Tắt (tắt thì chỉ lật vai lúc kết thúc ván) |
| Hồn ma xem hết vai | Bật | Bật / Tắt |
| Sói hoà phiếu | Ngẫu nhiên | Ngẫu nhiên / Không cắn |
| Thợ săn bị độc vẫn được bắn | Tắt | Bật / Tắt |

### 8.3 Thời gian các bước
Chỉnh bằng nút −/+, cố định khi bắt đầu ván (giống Avalon GĐ8).

| Bước | Mặc định | Tối thiểu | Tối đa | Bước nhảy |
|---|---|---|---|---|
| Xem vai | 60 giây | 30 giây | 180 giây | 15 giây |
| Đêm ① | 45 giây | 20 giây | 120 giây | 5 giây |
| Đêm ② (Phù thủy) | 20 giây | 10 giây | 60 giây | 5 giây |
| Thợ săn | 30 giây | 10 giây | 60 giây | 5 giây |
| Thảo luận | 3 phút | 1 phút | 20 phút | 30 giây |
| Bỏ phiếu | 45 giây | 15 giây | 120 giây | 15 giây |
| Bình minh, Kết quả phiếu | 8 giây | — | — | cố định (đi kèm hoạt cảnh) |

## 9. Phép lịch sự ngoài đời (hiện ở màn "Luật chơi")
- Cầm máy sát người, không nhìn màn hình người khác, không chụp màn hình.
- Không đọc to kết quả soi hay vai của mình. Nói dối về vai là được, đó là một phần của trò chơi.
- Người chết giữ im lặng đến hết ván.

## 10. Ca biên (mỗi mã ≥ 1 test)

| Mã | Tình huống | Kết quả đúng |
|---|---|---|
| E1 | Bảo vệ che đúng người bị nhắm | Người đó sống. Phù thủy vẫn thấy người đó bị nhắm. |
| E2 | Phù thủy cứu người đã được Bảo vệ che | Người đó sống, bình cứu vẫn **mất**. |
| E3 | Phù thủy độc người được Bảo vệ che | Người đó **chết** (che không chặn độc). |
| E4 | Phù thủy độc chính người bị nhắm (không cứu) | Chết một lần, nguyên nhân "độc". |
| E5 | Phù thủy chọn cứu X rồi độc X | Không hợp lệ (engine từ chối, UI không cho chọn). Nếu lọt qua UI thì chỉ cứu, bình độc còn nguyên. |
| E6 | Phù thủy bị nhắm và tự cứu | Hợp lệ, sống. Tự độc thì không hợp lệ. |
| E7 | Phù thủy dùng cả cứu và độc trong một đêm | Hợp lệ, cả hai có hiệu lực. |
| E8 | Bảo vệ che cùng một người hai đêm liên tiếp | Không hợp lệ. Đêm trước không che ai thì đêm nay che ai cũng được. |
| E9 | Bảo vệ tự che và bị nhắm | Sống. |
| E10 | Sói chọn khác nhau, hết giờ, có đa số | Người nhiều phiếu nhất bị nhắm. |
| E11 | Sói hoà phiếu | "Ngẫu nhiên": một trong những người hoà (rng). "Không cắn": không ai bị nhắm. |
| E12 | Không Sói nào chọn | Không ai bị nhắm. |
| E13 | Chỉ còn một Sói | Lựa chọn của Sói đó là thống nhất. |
| E14 | Sói chọn một Sói khác hoặc người đã chết | Không hợp lệ. |
| E15 | Tiên tri soi đêm nay rồi bị cắn chết | Vẫn có kết quả soi của đêm đó (ghi lúc Xác nhận). |
| E16 | Thợ săn bị cắn | Bắn sau bình minh. Kiểm tra thắng sau phát bắn. |
| E17 | Thợ săn bị độc | Không bắn (tuỳ chọn tắt) / bắn (tuỳ chọn bật). |
| E18 | Thợ săn bị treo | Bắn sau kết quả phiếu, rồi kiểm tra thắng, rồi sang Đêm. |
| E19 | Sói đạt điều kiện thắng ở bình minh nhưng Thợ săn chết và bắn trúng Sói | Kiểm tra sau phát bắn: nếu hết điều kiện thắng thì ván tiếp tục. |
| E20 | Phù thủy độc trúng con Sói cuối cùng | Dân thắng ở bình minh, bỏ qua bước Thợ săn nếu có. |
| E21 | Hai người chết cùng đêm | Công bố theo thứ tự ghế, không theo nguyên nhân. |
| E22 | Phiếu ngày: hoà M, hoặc B ≥ M, hoặc M = 0 | Không ai bị treo. |
| E23 | Người không bầu | Tính là Bỏ qua. Không được tự bầu mình. |
| E24 | Hết giờ, các vai chưa hành động | Coi như không hành động (mục 7). Tiên tri, Bảo vệ, Phù thủy chọn mà chưa Xác nhận cũng vậy. Riêng Sói thì lựa chọn chưa Xác nhận vẫn được tính. |
| E25 | Chủ phòng cho rời làng | Tính là chết, Thợ săn không bắn, kiểm tra thắng ngay. Nếu là Sói thì lựa chọn đêm nay của người đó không còn được tính. |
| E26 | Phù thủy đã chết hoặc hết bình | Đêm ② vẫn diễn ra, kết thúc theo luật thường, không ai bị cứu hay độc. |
| E27 | Mọi người cùng chết, không còn Sói | Dân thắng. |
| E28 | Bộ vai vi phạm ràng buộc ở mục 4 | Không cho bắt đầu ván, báo lỗi bằng tiếng Việt. |
| E29–E55 | Vai mở rộng | Xem mục 11.9. |

## 11. Vai mở rộng (v2)

Người dùng chọn 2026-10-17. Mặc định **tắt**; chủ phòng bật từng vai ở sảnh. Ván có tối đa 12 người. Những điểm ghi "(đề xuất)" là cách hiểu của nhạc trưởng, người dùng có thể đổi trước GĐ5a.

| Vai | Phe | Điểm (tạm) | Ban đêm (Đêm ①) |
|---|---|---|---|
| **Già làng** | Dân | +3 | Chọn "người mình nghi" |
| **Người hoá sói** | Dân | −1 | Chọn "người mình nghi" |
| **Tay sai** | Sói | −6 | Chọn "người mình nghi" (không cắn, không ở trong bầy) |
| **Kẻ chán đời** | Riêng | −2 | Chọn "người mình nghi" |
| **Cupid** | Dân | −3 | Đêm 1: ghép cặp đôi (11.5). Các đêm sau: chọn "người mình nghi" |
| **Sói con** | Sói | −8 | Cắn cùng bầy như Ma Sói |

Điểm theo thang kiểu Ultimate Werewolf, tạm tính, chỉnh sau khi chơi thật. Mọi vai mở rộng đều làm "người mình nghi" ở Đêm ① (trừ Sói con), nên màn ban đêm vẫn giống hệt nhau. Phần riêng chỉ hiện khi giữ thẻ.

### 11.1 "Sói" và "phe Sói"
- **Sói** = Ma Sói và Sói con. Họ cắn cùng bầy, Tiên tri soi ra "Là Sói", được đếm khi xét "Sói đủ số", và còn ít nhất một Sói thì làng chưa thắng.
- **Phe Sói** = Sói + Tay sai. Tay sai thắng khi phe Sói thắng.

### 11.2 Già làng
- Có một **mạng phụ**, chỉ dùng với Sói cắn. Lần đầu bị cắn **trúng** (không được Bảo vệ che, không được Phù thủy cứu) thì không chết, nhưng mất mạng phụ. Lần bị cắn trúng sau thì chết.
- Được che hoặc được cứu thì mạng phụ còn nguyên (bình cứu vẫn mất, như E2).
- Bị độc, bị treo, bị bắn, chết theo người yêu hoặc rời làng thì chết ngay; mạng phụ không có tác dụng.
- Đêm Già làng mất mạng phụ, bình minh công bố "Đêm qua bình yên" (không ai biết). Già làng thấy "Bạn đã mất mạng phụ" trong thẻ giữ.

### 11.3 Người hoá sói
Phe Dân, giống Dân làng ở mọi mặt, trừ một điểm: Tiên tri soi ra **"Là Sói"**.

### 11.4 Tay sai
- Thuộc phe Sói. Từ bước Xem vai đã biết ai là Sói (Ma Sói, Sói con) qua thẻ giữ. Ngược lại, Sói **không** biết Tay sai là ai.
- Không cắn, không ở trong bầy. Ban đêm chọn "người mình nghi" như Dân. Sói có thể cắn Tay sai.
- Tiên tri soi ra **"Không phải Sói"**.
- Khi xét "Sói đủ số", Tay sai không tính là Sói mà tính vào "người còn lại". Tay sai còn sống cũng không ngăn làng thắng.

### 11.5 Cupid
- Thuộc phe Dân.
- **Ghép đôi (Đêm 1, trong Đêm ①):**
  - Cupid chọn **2 người khác nhau** còn sống làm cặp đôi, được chọn cả chính mình, rồi Xác nhận.
  - Màn của Cupid giống mọi người: chạm lưới khi không giữ là "người mình nghi"; việc ghép đôi làm trong thẻ giữ (giữ thẻ rồi chạm lưới, giống cách Phù thủy độc).
  - Hết giờ mà chưa chọn đủ 2 người hoặc chưa Xác nhận thì ván **không có cặp đôi**.
- **Ai biết gì:**
  - Từ Bình minh ngày 1, mỗi người trong cặp thấy trong thẻ giữ: "Bạn yêu X — X là ‹vai›" **(đề xuất: thấy cả vai của người kia, để biết mình có thành phe Tình nhân không)**.
  - Cupid thấy cặp mình đã ghép. Những người khác không biết.
- **Chết theo người yêu:**
  - Một người trong cặp chết, vì bất kỳ lý do gì kể cả rời làng, thì người kia **chết theo ngay** (nguyên nhân "chết theo người yêu"). Không ai che hay cứu được cái chết này.
  - Người chết theo là Thợ săn thì vẫn được bắn. Là Sói con thì vẫn kích hoạt 11.7. Là Kẻ chán đời thì thua.
- **Phe Tình nhân:**
  - Nếu hai người trong cặp **khác phe** (phe Sói / phe Dân / Kẻ chán đời), cả hai rời phe cũ và thành phe Tình nhân, mất điều kiện thắng cũ. Phe Tình nhân thắng khi chỉ còn đúng 2 người sống và đó là cặp đôi.
  - Sói trong cặp Tình nhân vẫn cắn cùng bầy, vẫn bị soi ra "Là Sói", và vẫn chặn làng thắng, nhưng **không** được đếm khi xét "Sói đủ số".
  - Hai người cùng phe thì vẫn thuộc phe cũ, chỉ thêm luật chết theo.

### 11.6 Kẻ chán đời
- Có phe riêng. Thắng khi **bị treo** ở bước Kết quả phiếu: ván kết thúc ngay, Kẻ chán đời thắng một mình, mọi người khác thua. Điều này đúng cả khi chính lần treo đó cũng làm Sói đủ số.
- Chết theo cách khác (bị cắn, độc, bắn, chết theo người yêu, rời làng) thì thua, và ván tiếp tục.
- Không phải Sói: Tiên tri soi ra "Không phải Sói". Khi xét "Sói đủ số", Kẻ chán đời tính vào "người còn lại". Còn sống cũng không ngăn làng thắng (lúc đó Kẻ chán đời thua).
- Kẻ chán đời ở trong cặp Tình nhân thì không còn thắng khi bị treo, vì đã rời phe cũ.

### 11.7 Sói con
- Là Sói (11.1), cắn cùng bầy.
- **Kích hoạt:**
  - Khi Sói con chết, vì bất kỳ lý do gì **trừ rời làng** **(đề xuất)**, thì **đêm kế tiếp** bầy Sói được cắn **2 người khác nhau**. Đêm kế tiếp là đêm có số bằng vòng Sói con chết + 1.
  - Đêm đó không còn Sói nào sống thì không có gì xảy ra.
- **Cách chọn 2 người:**
  - Mỗi Sói chọn 2 người. Bầy **thống nhất** khi mọi Sói còn sống chọn cùng một cặp 2 người.
  - Hết giờ mà chưa thống nhất thì lấy 2 người nhiều phiếu nhất. Nếu hoà ở ranh giới thì theo "Sói hoà phiếu": "Ngẫu nhiên" là bốc trong số người hoà; "Không cắn" là chỉ cắn những người đã chắc chắn lọt top.
  - Chỉ có 1 người được chọn thì chỉ cắn 1.
- **Phù thủy và Bảo vệ đêm đó:**
  - Phù thủy thấy cả hai người bị nhắm. Bình cứu chỉ có 1, nên phải chọn cứu **một** trong hai.
  - Bảo vệ vẫn chỉ che một người.

### 11.8 Thứ tự kiểm tra thắng (khi có vai mở rộng; thay cho mục 2)
Kiểm tra sau mỗi lượt có người chết, kể cả người chết theo người yêu, theo thứ tự sau:
1. Vừa treo Kẻ chán đời (không thuộc phe Tình nhân): **Kẻ chán đời thắng**.
2. Chỉ còn đúng 2 người sống và đó là cặp Tình nhân: **Tình nhân thắng**.
3. Không còn Sói nào sống (Ma Sói, Sói con, kể cả Sói trong cặp Tình nhân): **phe Dân thắng**. Tay sai, Kẻ chán đời và Tình nhân còn sống đều thua.
4. Số Sói còn sống **không thuộc** phe Tình nhân ≥ số người còn sống còn lại: **phe Sói thắng** (gồm Ma Sói, Sói con và Tay sai không thuộc phe Tình nhân).
5. Không thì ván tiếp tục.

Thợ săn vẫn theo mục 5.7: thắng thua kiểm tra sau phát bắn. Riêng bước 3 (hết Sói) vẫn kết thúc ngay ở bình minh, giống E20.

### 11.9 Ca biên vai mở rộng (mỗi mã ≥ 1 test)

| Mã | Tình huống | Kết quả đúng |
|---|---|---|
| E29 | Già làng bị cắn lần đầu, không ai che hay cứu | Sống, mất mạng phụ. Bình minh "bình yên". |
| E30 | Già làng bị cắn trúng lần thứ hai | Chết (nguyên nhân Sói). |
| E31 | Già làng bị cắn lần đầu nhưng được che hoặc được cứu | Sống, mạng phụ còn nguyên. |
| E32 | Già làng bị độc / treo / bắn / chết theo người yêu | Chết ngay. |
| E33 | Tiên tri soi Người hoá sói | "Là Sói". |
| E34 | Tiên tri soi Tay sai, Kẻ chán đời | "Không phải Sói". |
| E35 | Hết Sói, Tay sai còn sống | Dân thắng, Tay sai thua. |
| E36 | Còn 1 Sói, Tay sai, 1 Dân | Ván tiếp tục (Tay sai không tính là Sói: 1 < 2). |
| E37 | Kẻ chán đời bị treo | Kẻ chán đời thắng, ván kết thúc. |
| E38 | Treo Kẻ chán đời làm Sói đủ số | Kẻ chán đời thắng (bước 1 trước bước 4). |
| E39 | Kẻ chán đời bị cắn / độc / bắn | Kẻ chán đời thua, ván tiếp tục. |
| E40 | Cupid ghép cặp hợp lệ (gồm cả mình) | Lưu cặp đôi. Hai người thấy nhau (và vai) trong thẻ giữ. |
| E41 | Cupid chưa chọn đủ 2 người hoặc chưa Xác nhận | Ván không có cặp đôi. |
| E42 | Một người trong cặp bị cắn chết | Người kia chết theo, công bố cùng bình minh, theo thứ tự ghế. |
| E43 | Một người trong cặp bị treo | Người kia chết theo ngay ở Kết quả phiếu. |
| E44 | Người chết theo là Thợ săn | Được bắn (bước Thợ săn). |
| E45 | Thợ săn bắn một người trong cặp | Người kia chết theo. |
| E46 | Một người trong cặp rời làng | Người kia chết theo ("chết theo người yêu"). |
| E47 | Cặp khác phe là 2 người cuối còn sống | Tình nhân thắng. |
| E48 | Cặp Sói + Dân; các Sói khác đã chết; còn Sói-người-yêu, người yêu và 2 người khác | Ván tiếp tục (Sói-người-yêu chặn làng thắng, nhưng không được đếm khi xét "Sói đủ số"). |
| E49 | Sói con chết ban ngày ở vòng r | Đêm r + 1 cắn 2 người. |
| E50 | Sói con chết ban đêm ở vòng r (bị độc) | Đêm r + 1 cắn 2 người. |
| E51 | Sói con rời làng | Không kích hoạt cắn 2. |
| E52 | Đêm cắn 2: Phù thủy cứu một người, Bảo vệ che người kia | Cả hai sống. |
| E53 | Đêm cắn 2: Sói chọn 3 người khác nhau, hoà ở ranh giới | Theo "Sói hoà phiếu". |
| E54 | Đêm cắn 2 trúng Già làng (lần đầu) và một người khác | Già làng mất mạng phụ, người kia chết. |
| E55 | Bộ vai có vai mở rộng nhiều hơn 1 người, hoặc trên 12 người | Không cho bắt đầu ván. |
