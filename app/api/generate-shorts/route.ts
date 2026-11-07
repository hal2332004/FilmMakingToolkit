import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { addLog } from "@/lib/logger";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      topic,
      mode = "story", // 'story' | 'news'
      category = "mystery", // story: 'mystery'|'history'|'motivation'|'fact' ; news: 'tech'|'space'|'finance'
      subtitleStyle = "tiktok_yellow", // 'tiktok_yellow' | 'classic_white' | 'neon_green'
      voiceProvider = "openai",
      elevenVoiceId = "21m00Tcm4TlvDq8ikWAM",
    } = body;

    addLog("API", `🎬 [Shorts Studio] Yêu cầu mới: Chế độ "${mode.toUpperCase()}" | Chủ đề: "${topic.substring(0, 50)}..."`);

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Vui lòng nhập chủ đề tin tức hoặc câu chuyện." },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình OPENAI_API_KEY trong file .env." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const id = Date.now().toString();
    const outputDir = path.join(process.cwd(), "public", "outputs");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // ========================================================
    // BƯỚC 1: Lên kịch bản Viral Hook & Phân cảnh & Phụ đề
    // ========================================================
    let roleDescription = "";
    if (mode === "news") {
      roleDescription = `Bạn là biên tập viên tin tức nhanh số 1 trên TikTok/Shorts.
Mục tiêu: Tóm tắt chủ đề thành bản tin giật gân, cuốn hút đúng 10 giây (khoảng 25-30 từ).
- 3s đầu: Tiêu đề nóng hổi (Breaking News).
- 4s tiếp: Chi tiết trọng tâm bất ngờ.
- 3s cuối: Nhận định hoặc câu hỏi thảo luận thu hút bình luận.`;
    } else {
      roleDescription = `Bạn là bậc thầy kể chuyện ngắn viral triệu view trên TikTok (Storytelling).
Mục tiêu: Kể một câu chuyện kịch tính, cuốn hút đúng 10 giây (khoảng 25-30 từ) thuộc thể loại ${category}.
- 3s đầu: HOOK gây tò mò tột độ ("Bạn có biết...", "Sự thật rùng rợn...", "Bí mật mà người giàu giấu bạn...").
- 4s tiếp: Tình tiết cao trào hấp dẫn.
- 3s cuối: Cú twist bất ngờ hoặc thông điệp đáng suy ngẫm.`;
    }

    const systemPrompt = `${roleDescription}

Hãy trả về JSON theo đúng định dạng sau (KHÔNG kèm markdown \`\`\`json):
{
  "title": "Tiêu đề ngắn dưới 6 từ",
  "hook": "Câu hook mở đầu 3 giây",
  "voiceover": "Toàn bộ lời thoại đọc trong 10 giây (khoảng 25-30 từ tiếng Việt tự nhiên, súc tích)",
  "subtitles": [
    { "text": "CÂU PHỤ ĐỀ 1 IN HOA", "start_ratio": 0.0, "end_ratio": 0.33 },
    { "text": "CÂU PHỤ ĐỀ 2 IN HOA", "start_ratio": 0.33, "end_ratio": 0.66 },
    { "text": "CÂU PHỤ ĐỀ 3 IN HOA", "start_ratio": 0.66, "end_ratio": 1.0 }
  ],
  "image_prompt": "Prompt tiếng Anh cực kỳ chi tiết, cinematic 8k, ánh sáng điện ảnh, phong cách phù hợp nội dung để sinh ảnh dọc 9:16, no text or watermark"
}`;

    addLog("OPENAI", "Đang viết kịch bản Viral Shorts với công thức Hook 3 giây...");
    const scriptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Chủ đề: ${topic}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
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
      `Kịch bản hoàn thành! Token: ${tokenUsage.total_tokens} (~$${tokenUsage.estimated_cost_usd} USD)`
    );

    const scriptData = JSON.parse(scriptResponse.choices[0]?.message?.content || "{}");
    const voiceoverText = scriptData.voiceover || topic;
    const subtitlesData = scriptData.subtitles || [
      { text: voiceoverText.toUpperCase(), start_ratio: 0.0, end_ratio: 1.0 },
    ];
    const imagePrompt =
      scriptData.image_prompt ||
      `A dramatic cinematic shot of: ${topic}, 8k photorealistic, volumetric lighting, vertical composition`;

    addLog("OPENAI", `Lời thoại: "${voiceoverText}"`);

    // ========================================================
    // BƯỚC 2: Thu âm lồng tiếng (ElevenLabs hoặc OpenAI TTS)
    // ========================================================
    const audioPath = path.join(outputDir, `${id}_shorts_audio.mp3`);
    let audioGenerated = false;

    if (voiceProvider === "elevenlabs" && elevenLabsApiKey) {
      try {
        addLog("ELEVENLABS", "Đang gọi ElevenLabs TTS...");
        const elRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": elevenLabsApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: voiceoverText,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.45, similarity_boost: 0.8 },
            }),
          }
        );
        if (elRes.ok) {
          const audioBuffer = Buffer.from(await elRes.arrayBuffer());
          fs.writeFileSync(audioPath, audioBuffer);
          audioGenerated = true;
          addLog("ELEVENLABS", "Tạo audio ElevenLabs thành công!");
        } else {
          addLog("ELEVENLABS", "ElevenLabs không khả dụng, chuyển sang OpenAI TTS...", "warn");
        }
      } catch (err: any) {
        addLog("ELEVENLABS", `Lỗi: ${err.message}. Chuyển sang OpenAI TTS.`, "warn");
      }
    }

    if (!audioGenerated) {
      addLog("OPENAI", "Đang tạo giọng đọc với OpenAI TTS-1 (voice: nova)...");
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: mode === "news" ? "onyx" : "nova",
        input: voiceoverText,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      fs.writeFileSync(audioPath, buffer);
      audioGenerated = true;
      addLog("OPENAI", `Tạo giọng đọc thành công (${(buffer.length / 1024).toFixed(1)} KB)`);
    }

    // Lấy thời lượng audio chính xác
    let duration = 9.5;
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
      );
      const parsed = parseFloat(stdout.trim());
      if (!isNaN(parsed) && parsed > 2) duration = parsed;
      addLog("FFMPEG", `Thời lượng video: ${duration.toFixed(2)} giây`);
    } catch (e) {
      addLog("FFMPEG", `Thời lượng mặc định: ${duration}s`, "warn");
    }

    // ========================================================
    // BƯỚC 3: Tạo file phụ đề SRT đồng bộ theo thời gian
    // ========================================================
    const formatTime = (seconds: number) => {
      const pad = (n: number, z = 2) => ("00" + n).slice(-z);
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
    };

    let srtContent = "";
    subtitlesData.forEach((sub: any, idx: number) => {
      const startSec = (sub.start_ratio || 0) * duration;
      const endSec = (sub.end_ratio || 1) * duration;
      srtContent += `${idx + 1}\n${formatTime(startSec)} --> ${formatTime(endSec)}\n${sub.text}\n\n`;
    });

    const srtPath = path.join(outputDir, `${id}.srt`);
    fs.writeFileSync(srtPath, srtContent, "utf8");
    addLog("SYSTEM", `Tạo file phụ đề SRT (${subtitlesData.length} phân đoạn khớp audio)`);

    // ========================================================
    // BƯỚC 4: Sinh ảnh cảnh (gpt-image-1-mini / DALL-E)
    // ========================================================
    addLog("OPENAI", `Đang sinh hình ảnh dọc 9:16 với OpenAI Image Model...`);
    const candidateModels = ["gpt-image-1-mini", "chatgpt-image-latest", "dall-e-3"];
    let imgBuffer: Buffer | null = null;

    for (const m of candidateModels) {
      try {
        addLog("OPENAI", `Gọi model sinh ảnh: ${m}...`);
        const imgRes = await openai.images.generate({
          model: m,
          prompt: `${imagePrompt}, vertical aspect ratio 9:16, masterpiece, 8k, photorealistic, cinematic lighting, no text, no watermark`,
          n: 1,
        });
        const item = imgRes.data?.[0];
        if (item?.b64_json) {
          imgBuffer = Buffer.from(item.b64_json, "base64");
          break;
        } else if (item?.url) {
          const dl = await fetch(item.url);
          imgBuffer = Buffer.from(await dl.arrayBuffer());
          break;
        }
      } catch (err: any) {
        addLog("OPENAI", `Model ${m} báo lỗi, chuyển sang model kế tiếp...`, "warn");
      }
    }

    if (!imgBuffer) {
      throw new Error("Không thể sinh hình ảnh từ OpenAI.");
    }

    const imagePath = path.join(outputDir, `${id}_shorts_scene.png`);
    fs.writeFileSync(imagePath, imgBuffer);
    addLog("OPENAI", "Hình ảnh phân cảnh đã tải về thành công!");

    // ========================================================
    // BƯỚC 5: Render Video Ken Burns + Burn-in Phụ đề Viral (FFmpeg)
    // ========================================================
    const finalVideoPath = path.join(outputDir, `${id}_shorts_final.mp4`);
    const fps = 25;
    const totalFrames = Math.ceil(duration * fps);
    const width = 720;
    const height = 1280;

    // Filter style phụ đề
    // &H0000FFFF = Vàng rực rỡ, &H00FFFFFF = Trắng tinh khôi, &H0000FF00 = Xanh neon
    let primaryColour = "&H0000FFFF"; // TikTok Yellow
    if (subtitleStyle === "classic_white") primaryColour = "&H00FFFFFF";
    if (subtitleStyle === "neon_green") primaryColour = "&H0000FF00";

    const srtRelative = `public/outputs/${id}.srt`.replace(/\\/g, "/");

    // Bộ lọc kép: Zoompan Ken Burns + Burn Subtitles
    const zoomFilter = `zoompan=z='min(zoom+0.0016,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=${fps}`;
    const subtitleFilter = `subtitles=${srtRelative}:force_style='FontName=Arial,FontSize=24,Bold=1,PrimaryColour=${primaryColour},OutlineColour=&H00000000,BorderStyle=3,Outline=2.8,Shadow=1.2,Alignment=2,MarginV=75'`;

    const combinedFilter = `${zoomFilter},${subtitleFilter}`;

    addLog("FFMPEG", `Render video 9:16 Ken Burns kèm phụ đề viền đậm phong cách TikTok (${duration.toFixed(1)}s, ${totalFrames} frames)...`);

    const renderCmd = `ffmpeg -y -loop 1 -i "${imagePath}" -i "${audioPath}" -vf "${combinedFilter}" -c:v libx264 -c:a aac -b:a 192k -t ${duration} -pix_fmt yuv420p -shortest -movflags +faststart "${finalVideoPath}"`;
    await execAsync(renderCmd);

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    addLog("API", `🎉 Xuất bản Shorts/TikTok thành công sau ${totalSeconds}s!`);

    return NextResponse.json({
      success: true,
      title: scriptData.title || "Viral Shorts Video",
      hook: scriptData.hook,
      videoUrl: `/outputs/${id}_shorts_final.mp4`,
      audioUrl: `/outputs/${id}_shorts_audio.mp3`,
      imageUrl: `/outputs/${id}_shorts_scene.png`,
      script: voiceoverText,
      subtitles: subtitlesData,
      duration: Math.round(duration * 10) / 10,
      tokenUsage: {
        ...tokenUsage,
        total_estimated_usd: (parseFloat(tokenUsage.estimated_cost_usd) + 0.08).toFixed(4),
      },
    });
  } catch (error: any) {
    addLog("API", `❌ Lỗi Shorts Studio: ${error.message || error}`, "error");
    return NextResponse.json(
      { error: error.message || "Lỗi trong quá trình tạo video Shorts." },
      { status: 500 }
    );
  }
}

