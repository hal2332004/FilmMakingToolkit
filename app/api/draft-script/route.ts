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
      targetDuration = "flexible", // 'short' (8-10s) | 'medium' (15-20s) | 'flexible'
      scenesCount = 1,
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

    let genrePrompt = "";
    if (genre === "rich_poor") {
      genrePrompt = `Thể loại: MẶT TỐI GIAI CẤP & GIÀU NGHÈO.
Phong cách: Phơi bày sự phân hóa tàn nhẫn, góc khuất của giới thượng lưu và số phận người lao động nghèo khó. Lời văn sắc lạnh, sâu cay, châm biếm hoặc đầy day dứt.`;
    } else if (genre === "psychology") {
      genrePrompt = `Thể loại: TÂM LÝ HỌC CON NGƯỜI & BẢN CHẤT NHÂN SINH (Dark Psychology).
Phong cách: Khám phá những góc tối tiềm thức, các hiệu ứng tâm lý thao túng, lòng dạ con người khi đối diện lòng tham, sự sợ hãi hoặc sự ghen tị. Lời văn cuốn hút, sắc sảo.`;
    } else if (genre === "philosophy") {
      genrePrompt = `Thể loại: ĐẠO LÝ & TRIẾT HỌC NHÂN SINH THÂM THÚY.
Phong cách: Chiêm nghiệm về kiếp người, sự vô thường, cái giá của danh vọng và ảo tưởng của hạnh phúc. Lời văn trầm lắng, ám ảnh, thức tỉnh người xem.`;
    } else {
      genrePrompt = `Thể loại: KINH DỊ TÂM LÝ & BÍ ẨN KỲ QUÁI (Uncanny Horror).
Phong cách: Đem lại cảm giác ớn lạnh, sợ hãi, những hiện tượng dị thường không thể giải thích. Không khí ngột ngạt, ám ảnh rùng mình.`;
    }

    let lengthInstruction = "Thời lượng linh hoạt tự nhiên, khoảng 25-35 từ (đọc trong khoảng 8 đến 12 giây để tối ưu giữ chân người xem TikTok).";
    if (targetDuration === "short") {
      lengthInstruction = "Thời lượng ngắn cô đọng khoảng 20-25 từ (đọc trong 8-10 giây).";
    } else if (targetDuration === "medium") {
      lengthInstruction = "Thời lượng vừa phải khoảng 35-50 từ (đọc trong 15-18 giây).";
    }

    const systemPrompt = `Bạn là đạo diễn và nhà biên kịch hàng đầu chuyên sản xuất video ngắn viral TikTok/Reels về các chủ đề sâu sắc, ám ảnh và kỳ bí.

${genrePrompt}

Yêu cầu kịch bản:
1. ${lengthInstruction}
2. Hook mở đầu 3 giây: Phải cực kỳ cuốn hút, gây tò mò, đánh thẳng vào tâm lý khiến người xem không thể lướt qua.
3. Cốt truyện: Từng câu chữ súc tích, nhịp điệu dồn dập hoặc trầm đục, dẫn dắt đến một cú twist hoặc bài học ám ảnh.
4. Chia kịch bản thành đúng ${scenesCount} cảnh hình ảnh. Mỗi cảnh có 1 prompt tiếng Anh chi tiết, phong cách điện ảnh u tối (Chiaroscuro, David Fincher / Denis Villeneuve lighting, atmospheric fog, moody, psychological tension, vertical 9:16, no text).
5. Phân đoạn phụ đề: Chia lời thoại thành 3-4 câu ngắn in hoa để khắc lên video.

Trả về JSON đúng cấu trúc sau (KHÔNG kèm markdown \`\`\`json):
{
  "title": "Tiêu đề ngắn sắc sảo",
  "hook": "Câu hook 3 giây mở đầu",
  "voiceover": "Toàn bộ lời thoại đọc hoàn chỉnh (tiếng Việt tự nhiên, ngắt nghỉ hợp lý)",
  "word_count": 28,
  "estimated_seconds": 10,
  "eerie_sound_effect": "eerie_dark",
  "subtitles": [
    { "text": "CÂU PHỤ ĐỀ 1 IN HOA", "start_ratio": 0.0, "end_ratio": 0.33 },
    { "text": "CÂU PHỤ ĐỀ 2 IN HOA", "start_ratio": 0.33, "end_ratio": 0.66 },
    { "text": "CÂU PHỤ ĐỀ 3 IN HOA", "start_ratio": 0.66, "end_ratio": 1.0 }
  ],
  "scenes": [
    {
      "scene_number": 1,
      "image_prompt": "Cinematic visual prompt in English describing dark moody atmosphere, chiaroscuro lighting...",
      "motion": "zoom-in"
    }
  ]
}`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (feedback && currentScript) {
      addLog("OPENAI", `Nhận feedback từ người dùng: "${feedback}". Đang viết lại kịch bản theo góp ý...`);
      messages.push({
        role: "assistant",
        content: JSON.stringify(currentScript),
      });
      messages.push({
        role: "user",
        content: `Người dùng muốn sửa đổi kịch bản trên với góp ý: "${feedback}". Hãy cập nhật và tối ưu lại kịch bản!`,
      });
    } else {
      addLog("OPENAI", `Đang phác thảo kịch bản thể loại [${genre.toUpperCase()}]: "${topic.substring(0, 50)}..."`);
      messages.push({
        role: "user",
        content: `Chủ đề ý tưởng: ${topic}`,
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

    addLog(
      "OPENAI",
      `Đã lên kịch bản thành công! Lượng token: ${tokenUsage.total_tokens} (~$${tokenUsage.estimated_cost_usd} USD) - Sẵn sàng cho người dùng review!`
    );

    const scriptData = JSON.parse(scriptResponse.choices[0]?.message?.content || "{}");

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

