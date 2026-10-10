// Narration shown under a scene's title when the scene changes (SceneTitle).
// Voice (ux-plan Phụ lục E): short (≤ 90 characters), third person, never
// hints at anyone's role, a little dark, no clichés. Each game picks one line
// per scene from its seed, so every device shows the same line.
import { hashString } from './journey';
import type { SceneId } from './types';

export const SCENE_LINES_VI: Record<SceneId, readonly string[]> = {
  hall: [
    'Bàn Tròn đã đủ người. Ai cũng thề trung thành — và ít nhất một kẻ đang nói dối.',
    'Đuốc cháy dọc đại sảnh. Bóng trên tường nhiều hơn số người ngồi quanh bàn.',
    'Camelot mở tiệc đón các hiệp sĩ. Rượu thì ngọt, ánh mắt thì không.',
  ],
  night: [
    'Đêm buông xuống Camelot. Có những ánh mắt chỉ mở ra khi mọi người đã nhắm.',
    'Lâu đài im phăng phắc. Trong bóng tối, kẻ phản bội nhận ra đồng bọn.',
    'Ngọn nến cuối cùng tắt. Những bí mật bắt đầu thì thầm.',
  ],
  camp: [
    'Lửa trại bập bùng. Đêm nay, lời nói cũng sắc như kiếm.',
    'Đoàn hiệp sĩ quây quần bên lửa. Ai cũng kể chuyện, nhưng không ai kể hết.',
    'Củi nổ lách tách. Trong bóng lều, có người đang tính nước đi kế tiếp.',
  ],
  lake: [
    'Mặt hồ Avalon lặng như gương — và gương thì không biết nói dối.',
    'Một cánh tay giơ cao thanh kiếm giữa hồ. Nữ thần Hồ đang dõi theo một người.',
    'Sương phủ mặt hồ. Ở đây, sự thật chỉ hiện ra cho người biết hỏi.',
  ],
  'blood-moon': [
    'Trăng nhuốm máu. Kẻ ám sát chỉ có một nhát duy nhất.',
    'Lũ quạ đậu kín cành cây chết. Chúng biết đêm nay sẽ có người ngã xuống.',
    'Trăng đỏ treo trên đồi. Một cái tên sắp được gọi ra trong bóng tối.',
  ],
  'end-good': [
    'Bình minh rọi xuống Camelot. Bóng tối đã bị đẩy lùi — ít nhất là lần này.',
    'Chuông Camelot ngân vang. Các hiệp sĩ trung thành đã giữ được vương quốc.',
  ],
  'end-evil': [
    'Camelot chìm trong biển lửa. Kẻ phản bội đã ngồi ngay tại Bàn Tròn.',
    'Khói đen che kín bầu trời. Vương quốc sụp đổ từ bên trong.',
  ],
  forest: [
    'Đoàn hiệp sĩ tiến vào rừng Broceliande. Trong sương, không ai chắc người bên cạnh là ai.',
    'Cây cổ thụ khép tán trên đầu. Ở Broceliande, lối mòn cũng biết đánh lừa.',
    'Đom đóm soi đường, nhưng không soi được lòng người.',
  ],
  mountain: [
    'Gió rít qua đèo tuyết. Một bước sai là cả đoàn cùng trượt xuống vực.',
    'Tuyết xoá dấu chân ngay sau lưng. Ai đã đi lối nào, chẳng còn ai biết.',
    'Đèo hẹp chỉ đủ cho từng người một. Phải chọn kỹ ai đi cùng.',
  ],
  sea: [
    'Sóng vỗ chân vách Tintagel. Lâu đài đổ nát này từng chứng kiến một cuộc phản bội.',
    'Mặt trời lặn trên biển. Đến đêm, thuỷ triều sẽ cuốn đi mọi dấu vết.',
    'Gió biển mặn chát. Lời thề ở đây cũng dễ tan như bọt sóng.',
  ],
  ruins: [
    'Cột đá gãy giữa đồng hoang. Nơi này sụp đổ vì một kẻ ở bên trong.',
    'Mây che kín trăng trên phế tích. Tiếng bước chân vọng lại, không rõ của ai.',
    'Mái vòm đã sập từ lâu. Chỉ còn những bức tường biết giữ bí mật.',
  ],
  chapel: [
    'Chén Thánh toả sáng trên bệ thờ. Chỉ kẻ có lòng trong sạch mới dám nhìn thẳng.',
    'Nhà nguyện lặng như tờ. Lời cầu nguyện nào ở đây cũng có người nghe trộm.',
    'Ánh sáng rọi xuống bệ thờ. Bóng tối dồn cả ra sau lưng các hiệp sĩ.',
  ],
  marsh: [
    'Ma trơi lập loè trên đầm lầy. Đi theo ánh sáng chưa chắc đã ra khỏi sương.',
    'Sương đặc quánh, nước đen ngòm. Mỗi bước chân đều phải tin người dẫn đường.',
    'Đầm lầy nuốt chửng kẻ đi lạc. Đừng rời tấm ván dưới chân.',
  ],
  cave: [
    'Trong hang tối, hai con mắt đỏ mở ra. Kho báu ở ngay đó — kẻ canh giữ cũng vậy.',
    'Vàng lấp lánh dưới chân con rồng. Lòng tham đã giết nhiều hiệp sĩ hơn lửa.',
    'Hơi nóng phả ra từ miệng hang. Lùi lại lúc này cũng là một lựa chọn.',
  ],
};

/** The line this game shows for a scene. `seedKey` identifies the game (the
 *  same key as the journey: the seat order, or the room id). */
export function sceneLine(id: SceneId, seedKey: string): string {
  const lines = SCENE_LINES_VI[id];
  return lines[hashString(`${seedKey}#${id}`) % lines.length];
}
