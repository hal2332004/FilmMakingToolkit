import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { addLog } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      topic,
      genre = "psychology", // 'rich_poor' | 'psychology' | 'philosophy' | 'horror'
      targetSeconds = 15, // Số giây do người dùng tự nhập (ví dụ: 10, 15, 20, 30, 45, 60...)
      feedback = "",
      currentScript = null,
    } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Vui lòng nhập ý tưởng chủ đề câu chuyện." },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình OPENAI_API_KEY trong file .env." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Chuẩn hóa số giây mục tiêu (tối thiểu 6s, tối đa 90s)
    const validTargetSec = Math.max(6, Math.min(90, Number(targetSeconds) || 15));
    // Tốc độ đọc tiếng Việt tự nhiên kịch tính: ~2.5 đến 2.7 từ/giây (có ngắt nghỉ)
    const minWords = Math.round(validTargetSec * 2.3);
    const maxWords = Math.round(validTargetSec * 2.85);
    const targetWordCount = Math.round(validTargetSec * 2.55);

    let genreDirective = "";
    if (genre === "rich_poor") {
      genreDirective = `CHỦ ĐỀ: MẶT TỐI GIAI CẤP & SỰ THẬT TÀN NHẪN VỀ TIỀN BẠC (Class Divide & Harsh Wealth).
- Phong cách: Phơi bày sự tàn khốc của đồng tiền, sự phân hóa giai cấp không khoan nhượng, góc khuất của giới thượng lưu xa hoa và nỗi đau thầm lặng của người nghèo.
- Tông giọng: Sắc lạnh, gai góc, châm biếm sâu cay, không giáo điều sáo rỗng. Đánh thẳng vào những bất công trần trụi mà xã hội thường né tránh.`;
    } else if (genre === "psychology") {
      genreDirective = `CHỦ ĐỀ: TÂM LÝ HỌC ĐEN TỐI & BẢN CHẤT NHÂN SINH (Dark Psychology & Human Manipulation).
- Phong cách: Khám phá những góc tối tiềm thức con người: tâm lý thao túng, hội chứng bầy đàn, lòng ghen tị ngấm ngầm, sự đạo đức giả và bản năng sinh tồn ích kỷ khi đối diện nghịch cảnh.
- Tông giọng: Lạnh lùng, thấu thị, như một bác sĩ tâm thần mổ xẻ từng tế bào tâm lý của người xem. Làm người xem giật mình nhận ra mặt tối của chính mình.`;
    } else if (genre === "philosophy") {
      genreDirective = `CHỦ ĐỀ: ĐẠO LÝ HIỆN SINH & TRIẾT HỌC THỨC TỈNH (Existential Philosophy & Harsh Realities).
- Phong cách: Chiêm nghiệm sâu sắc về kiếp người, ảo tưởng của danh vọng, cái bẫy của sự bận rộn vô nghĩa, sự cô độc tuyệt đối và quy luật đào thải tàn nhẫn của thời gian.
- Tông giọng: Trầm mặc, uy quyền, mang âm hưởng của một lời thức tỉnh đanh thép, khiến người xem sững sờ suy ngẫm.`;
    } else {
      genreDirective = `CHỦ ĐỀ: KINH DỊ TÂM LÝ & BÍ ẨN KỲ DỊ (Psychological Horror & Creepy Dread).
- Phong cách: Gieo rắc sự bất an sâu thẳm, hiệu ứng thung lũng kỳ lạ (Uncanny Valley), ảo giác lúc nửa đêm, những thứ quen thuộc bỗng trở nên sai lệch ghê rợn. Không dùng jump-scare rẻ tiền, tạo cảm giác lạnh sống lưng tột độ.
- Tông giọng: Thì thầm ma mị, ngột ngạt, nhịp thở đứt quãng, căng thẳng nghẹt thở.`;
    }

    // Xác định số phân cảnh theo thời lượng
    const sceneCount = validTargetSec <= 12 ? 2 : validTargetSec <= 25 ? 3 : 4;

    const systemPrompt = `Bạn là đạo diễn điện ảnh và nhà biên kịch bậc thầy chuyên sản xuất video ngắn viral TikTok / YouTube Shorts mang tính nghệ thuật cao, sâu cay và đầy ám ảnh.

${genreDirective}

THÔNG SỐ THỜI LƯỢNG BẮT BUỘC:
- Thời lượng mục tiêu: Đúng ${validTargetSec} GIÂY.
- Số lượng từ tiếng Việt cho toàn bộ lời thoại (voiceover): BẮT BUỘC từ ${minWords} đến ${maxWords} từ (lý tưởng: ~${targetWordCount} từ).
- Tuyệt đối KHÔNG viết quá ngắn (gây đơn điệu, hụt hẫng) và KHÔNG viết quá dài (người đọc bị vấp, chạy chữ không kịp).

YÊU CẦU NGHỆ THUẬT & CẤU TRÚC KỊCH BẢN (CHỐNG ĐƠN ĐIỆU TUYỆT ĐỐI):
1. CẤU TRÚC 4 PHA KỊCH TÍNH (NARRATIVE ARC):
   - Pha 1 (0s - 3s): HOOK CỰC MẠNH. Đánh một đòn tâm lý choáng váng, nêu một nghịch lý gây sốc hoặc một câu hỏi lạnh người.
   - Pha 2 (Dẫn nhập & Leo thang kịch tính): Đưa ra thực tế trần trụi, chi tiết đắt giá, bóc trần sự thật.
   - Pha 3 (Cú twist / Cao trào): Điểm xoay lật ngược vấn đề, khiến người xem nhận ra họ cũng là nạn nhân hoặc kẻ đồng lõa.
   - Pha 4 (Cú đấm triết lý / Punchline): Câu kết đanh thép, lạnh lùng, ám ảnh, để lại dư chấn lâu dài.

2. BẢNG PHÂN CẢNH TIMELINE CHI TIẾT THEO TỪNG GIÂY (Detailed Timeline):
   - Chia toàn bộ ${validTargetSec} giây thành đúng ${sceneCount} phân đoạn thời gian kế tiếp nhau từ giây 0 đến giây ${validTargetSec}.
   - Mỗi phân đoạn PHẢI có:
     + time_range: Khoảng thời gian cụ thể (ví dụ: "00:00 - 00:04", "00:04 - 00:09"...).
     + stage: Tên pha ("HOOK", "DẪN NHẬP & LEO THANG", "CÚ LẬT NHẬN THỨC", "CÚ ĐẤM TRIẾT LÝ").
     + acting_cue: Chỉ đạo đạo diễn cho giọng đọc (ví dụ: "[Giọng trầm, thì thầm đe dọa, ngắt 1 nhịp thở]").
     + spoken_text: Lời thoại đọc trong khoảng thời gian này (phải đủ dài để đọc vừa vặn khoảng giây đó).
     + subtitle: Phụ đề ngắn gọn, viết HOA (để khắc lên video).
     + visual_description: Mô tả hình ảnh chi tiết bằng tiếng Việt (bối cảnh, góc máy, ánh sáng, diễn xuất nhân vật).
     + cinematic_prompt: Prompt tiếng Anh cực kỳ chi tiết chuẩn điện ảnh Hollywood (8k cinematic photography, vertical 9:16, dark chiaroscuro lighting, David Fincher / Denis Villeneuve atmosphere, moody color grading, no text, no watermark).

3. LỜI THOẠI ĐỌC HOÀN CHỈNH (voiceover):
   - BẮT BUỘC là sự kết hợp liền mạch của TẤT CẢ các câu "spoken_text" trong bảng timeline (từ Hook cho đến Kết), không chứa bất kỳ dấu ngoặc chỉ dẫn nào, để đưa thẳng vào TTS đọc mượt mà đúng ${validTargetSec} giây (${minWords} - ${maxWords} từ).

4. PHIÊN BẢN LỜI THOẠI ĐẠO DIỄN (voiceover_with_cues):
   - Bản kết hợp lời thoại có lồng ghép các chỉ dẫn [Ngắt nhịp], [Thì thầm], [Nhấn mạnh] để người dùng review phong cách diễn xuất.

Định dạng JSON trả về bắt buộc chuẩn xác (KHÔNG kèm markdown \`\`\`json):
{
  "title": "Tiêu đề ấn tượng, sâu cay",
  "target_seconds": ${validTargetSec},
  "word_count": ${targetWordCount},
  "estimated_seconds": ${validTargetSec},
  "hook": "Câu mở đầu 3 giây gây sốc",
  "core_message": "Thông điệp cốt lõi cay đắng / thức tỉnh",
  "voiceover": "Toàn bộ lời thoại đọc liên tục thuần khiết kết hợp từ tất cả các cảnh, độ dài khoảng ${targetWordCount} từ",
  "voiceover_with_cues": "Lời thoại có kèm chỉ dẫn [Hạ giọng], [Ngắt 1 nhịp]...",
  "timeline": [
    {
      "time_range": "00:00 - 00:04",
      "stage": "HOOK (GÂY SỐC)",
      "acting_cue": "Giọng thì thầm lạnh lùng, dứt khoát",
      "spoken_text": "...",
      "subtitle": "CÂU PHỤ ĐỀ 1 IN HOA",
      "visual_description": "Cận cảnh ánh mắt...",
      "cinematic_prompt": "Cinematic 8k close up shot, chiaroscuro, 9:16 vertical..."
    }
  ],
  "subtitles": [
    { "text": "CÂU PHỤ ĐỀ 1 IN HOA", "start_ratio": 0.0, "end_ratio": 0.35 }
  ],
  "scenes": [
    {
      "scene_number": 1,
      "image_prompt": "Prompt tiếng Anh cho phân cảnh chính tạo ảnh AI...",
      "motion": "zoom-in"
    }
  ]
}`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (feedback && currentScript) {
      addLog(
        "OPENAI",
        `Nhận feedback người dùng: "${feedback}". Đang viết lại kịch bản chuyên sâu cho mốc thời gian ${validTargetSec}s...`
      );
      messages.push({
        role: "assistant",
        content: JSON.stringify(currentScript),
      });
      messages.push({
        role: "user",
        content: `Người dùng muốn viết lại kịch bản trên với phản hồi: "${feedback}". Thời lượng mục tiêu xác định: ${validTargetSec} giây (${minWords} - ${maxWords} từ). Hãy tối ưu lại kịch bản cực kỳ chi tiết, kịch tính, chống đơn điệu!`,
      });
    } else {
      addLog(
        "OPENAI",
        `Đang khởi tạo kịch bản chuyên sâu [${genre.toUpperCase()}] với thời lượng xác định: ${validTargetSec} giây (~${targetWordCount} từ)...`
      );
      messages.push({
        role: "user",
        content: `Chủ đề ý tưởng: ${topic}\nThời lượng yêu cầu: Đúng ${validTargetSec} giây.`,
      });
    }

    const scriptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.85,
    });

    const tokenUsage = {
      prompt_tokens: scriptResponse.usage?.prompt_tokens || 0,
      completion_tokens: scriptResponse.usage?.completion_tokens || 0,
      total_tokens: scriptResponse.usage?.total_tokens || 0,
      estimated_cost_usd: (
        ((scriptResponse.usage?.prompt_tokens || 0) * 0.15) / 1000000 +
        ((scriptResponse.usage?.completion_tokens || 0) * 0.60) / 1000000
      ).toFixed(6),
    };

    const scriptData = JSON.parse(
      scriptResponse.choices[0]?.message?.content || "{}"
    );

    // Chuẩn hóa và đếm từ voiceover
    const actualWords = scriptData.voiceover
      ? scriptData.voiceover.trim().split(/\s+/).length
      : targetWordCount;
    scriptData.word_count = actualWords;
    scriptData.target_seconds = validTargetSec;

    // Đảm bảo subtitles có đủ từ timeline nếu model chưa format đầy đủ
    if ((!scriptData.subtitles || scriptData.subtitles.length === 0) && scriptData.timeline?.length > 0) {
      const totalSeg = scriptData.timeline.length;
      scriptData.subtitles = scriptData.timeline.map((item: any, idx: number) => ({
        text: item.subtitle || item.spoken_text?.substring(0, 45)?.toUpperCase() || "PHỤ ĐỀ",
        start_ratio: idx / totalSeg,
        end_ratio: (idx + 1) / totalSeg,
      }));
    }

    // Đảm bảo scenes có ít nhất 1 cảnh chính từ timeline
    if ((!scriptData.scenes || scriptData.scenes.length === 0) && scriptData.timeline?.length > 0) {
      scriptData.scenes = scriptData.timeline.map((item: any, idx: number) => ({
        scene_number: idx + 1,
        image_prompt: item.cinematic_prompt,
        motion: "zoom-in",
      }));
    }

    addLog(
      "OPENAI",
      `Đã lên kịch bản chi tiết (${validTargetSec}s, ${actualWords} từ, ${scriptData.timeline?.length || 1} phân cảnh)! Lượng token: ${tokenUsage.total_tokens} (~$${tokenUsage.estimated_cost_usd} USD)`
    );

    return NextResponse.json({
      success: true,
      script: scriptData,
      tokenUsage,
    });
  } catch (error: any) {
    addLog("API", `Lỗi tạo kịch bản nháp: ${error.message || error}`, "error");
    return NextResponse.json(
      { error: error.message || "Lỗi trong quá trình tạo kịch bản." },
      { status: 500 }
    );
  }
}
