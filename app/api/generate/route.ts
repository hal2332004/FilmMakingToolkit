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
      prompt,
      format = "9:16",
      style = "cinematic",
      scenesCount = 1,
      voiceProvider = "elevenlabs",
      elevenVoiceId = "21m00Tcm4TlvDq8ikWAM",
    } = body;

    addLog("API", `Nhận yêu cầu tạo video: "${prompt.substring(0, 50)}..." | Định dạng: ${format} | Phong cách: ${style} | Số cảnh: ${scenesCount}`);

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      addLog("API", "Lỗi: Ý tưởng kịch bản (prompt) trống.", "error");
      return NextResponse.json(
        { error: "Vui lòng nhập ý tưởng kịch bản (prompt)." },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!openaiApiKey) {
      addLog("API", "Lỗi: Chưa cấu hình OPENAI_API_KEY trong .env", "error");
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

    // ==========================================
    // BƯỚC 1: Lên kịch bản 10 giây & phân cảnh (GPT-4o-mini)
    // ==========================================
    addLog("OPENAI", "Đang gửi prompt đến GPT-4o-mini để tạo kịch bản 10 giây và phân cảnh...");

    const scriptSystemPrompt = `Bạn là đạo diễn AI chuyên sản xuất video ngắn viral 10 giây (TikTok, Shorts, Reels).
Nhiệm vụ: Dựa vào ý tưởng của người dùng, hãy tạo kịch bản video đúng 10 giây với:
1. Lời thoại voiceover: Độ dài khoảng 25-30 từ (nói trong 9-10 giây), cuốn hút, cô đọng, ngôn ngữ tự nhiên theo cùng ngôn ngữ với prompt (nếu tiếng Việt thì viết tiếng Việt).
2. Đúng ${scenesCount} phân cảnh (scene). Mỗi cảnh có 1 prompt tiếng Anh chi tiết để gửi cho DALL-E 3, phong cách ${style}, chất lượng 8k cinematic photorealistic, ánh sáng đẹp, KHÔNG chứa chữ/text/watermark trên ảnh.
3. Chuyển động camera cho mỗi cảnh: "zoom-in" hoặc "zoom-out".

Trả về JSON đúng cấu trúc sau:
{
  "title": "Tiêu đề ngắn",
  "voiceover": "Toàn bộ lời thoại đọc trong 10 giây...",
  "scenes": [
    {
      "scene_number": 1,
      "image_prompt": "Cinematic visual prompt in English...",
      "motion": "zoom-in"
    }
  ]
}`;

    const scriptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: scriptSystemPrompt },
        { role: "user", content: `Ý tưởng: ${prompt}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
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
      `GPT-4o-mini hoàn thành! Token sử dụng: ${tokenUsage.total_tokens} tokens (Prompt: ${tokenUsage.prompt_tokens}, Output: ${tokenUsage.completion_tokens}) ~ $${tokenUsage.estimated_cost_usd} USD`
    );

    const scriptJsonText = scriptResponse.choices[0]?.message?.content || "{}";
    const scriptData = JSON.parse(scriptJsonText);
    const voiceoverText = scriptData.voiceover || prompt;
    const scenes = scriptData.scenes || [
      {
        scene_number: 1,
        image_prompt: `A stunning cinematic shot depicting: ${prompt}, ultra high quality, photorealistic, 8k, volumetric lighting`,
        motion: "zoom-in",
      },
    ];

    addLog("OPENAI", `Kịch bản: "${voiceoverText}" (${scenes.length} cảnh)`);

    // ==========================================
    // BƯỚC 2: Tạo giọng đọc AI (ElevenLabs hoặc OpenAI TTS)
    // ==========================================
    const audioPath = path.join(outputDir, `${id}_audio.mp3`);
    let audioGenerated = false;

    if (voiceProvider === "elevenlabs" && elevenLabsApiKey) {
      try {
        const elVoice = elevenVoiceId || "21m00Tcm4TlvDq8ikWAM";
        addLog("ELEVENLABS", `Đang gửi text sang ElevenLabs API (Voice ID: ${elVoice}, Model: eleven_multilingual_v2)...`);

        const elRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${elVoice}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": elevenLabsApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: voiceoverText,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          }
        );

        if (elRes.ok) {
          const audioBuffer = Buffer.from(await elRes.arrayBuffer());
          fs.writeFileSync(audioPath, audioBuffer);
          audioGenerated = true;
          addLog("ELEVENLABS", `Tạo giọng đọc thành công (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
        } else {
          const errDetail = await elRes.text();
          addLog("ELEVENLABS", `ElevenLabs trả về lỗi (${elRes.status}): ${errDetail}. Đang tự động chuyển sang OpenAI TTS fallback.`, "warn");
        }
      } catch (err: any) {
        addLog("ELEVENLABS", `Lỗi kết nối ElevenLabs: ${err.message}. Đang chuyển sang OpenAI TTS...`, "warn");
      }
    }

    // Fallback sang OpenAI TTS nếu ElevenLabs không dùng được
    if (!audioGenerated) {
      addLog("OPENAI", "Đang sử dụng OpenAI TTS-1 (voice: nova) để tạo audio...");
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: voiceoverText,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      fs.writeFileSync(audioPath, buffer);
      audioGenerated = true;
      addLog("OPENAI", `OpenAI TTS thành công! Dung lượng: ${(buffer.length / 1024).toFixed(1)} KB`);
    }

    // Lấy thời lượng chính xác của audio bằng ffprobe
    let duration = 10;
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
      );
      const parsedDuration = parseFloat(stdout.trim());
      if (!isNaN(parsedDuration) && parsedDuration > 2) {
        duration = parsedDuration;
      }
      addLog("FFMPEG", `Thời lượng file audio: ${duration.toFixed(2)}s`);
    } catch (e) {
      addLog("FFMPEG", `Không đọc được thời lượng từ ffprobe, mặc định: ${duration}s`, "warn");
    }

    // ==========================================
    // BƯỚC 3: Sinh hình ảnh AI
    // ==========================================
    const isVertical = format === "9:16";
    const width = isVertical ? 720 : 1280;
    const height = isVertical ? 1280 : 720;

    const sceneImages: string[] = [];
    const sceneClips: string[] = [];
    const durationPerScene = duration / scenes.length;

    addLog("OPENAI", `Bắt đầu sinh ${scenes.length} ảnh cảnh với OpenAI (Độ phân giải video: ${width}x${height})...`);

    // Helper tạo ảnh tự động thích ứng với model có sẵn trên API key (gpt-image-1-mini, chatgpt-image-latest, dall-e-3)
    const generateSceneImage = async (imgPrompt: string) => {
      const candidateModels = ["gpt-image-1-mini", "chatgpt-image-latest", "dall-e-3"];
      let lastError: any = null;

      for (const m of candidateModels) {
        try {
          addLog("OPENAI", `Đang gọi model sinh ảnh: ${m}...`);
          const imgRes = await openai.images.generate({
            model: m,
            prompt: `${imgPrompt}, style: ${style}, cinematic lighting, photorealistic, 8k, no text, no watermark`,
            n: 1,
          });

          const item = imgRes.data?.[0];
          if (item?.b64_json) {
            return Buffer.from(item.b64_json, "base64");
          }
          if (item?.url) {
            const dl = await fetch(item.url);
            return Buffer.from(await dl.arrayBuffer());
          }
        } catch (err: any) {
          lastError = err;
          addLog("OPENAI", `Model ${m} báo lỗi (${err.message}). Đang thử model kế tiếp...`, "warn");
        }
      }
      throw lastError || new Error("Không thể sinh ảnh từ các mô hình OpenAI có sẵn.");
    };

    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];
      addLog("OPENAI", `Đang tạo ảnh cảnh ${i + 1}/${scenes.length}: "${sc.image_prompt.substring(0, 70)}..."`);

      const imgBuffer = await generateSceneImage(sc.image_prompt);
      const imagePath = path.join(outputDir, `${id}_scene_${i}.png`);
      fs.writeFileSync(imagePath, imgBuffer);
      sceneImages.push(`/outputs/${id}_scene_${i}.png`);
      addLog("OPENAI", `Ảnh cảnh ${i + 1} đã được lưu thành công!`);

      // ==========================================
      // BƯỚC 4: Tạo clip hiệu ứng Ken Burns (FFmpeg)
      // ==========================================
      const clipPath = path.join(outputDir, `${id}_clip_${i}.mp4`);
      const fps = 25;
      const totalFrames = Math.ceil(durationPerScene * fps);

      let zoomFilter = `zoompan=z='min(zoom+0.0015,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=${fps}`;
      if (sc.motion === "zoom-out") {
        zoomFilter = `zoompan=z='if(lte(zoom,1.0),1.25,max(1.001,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=${fps}`;
      }

      addLog("FFMPEG", `Render chuyển động Ken Burns cho cảnh ${i + 1} (${durationPerScene.toFixed(1)}s, ${totalFrames} frames)...`);
      const renderClipCmd = `ffmpeg -y -loop 1 -i "${imagePath}" -vf "${zoomFilter}" -c:v libx264 -t ${durationPerScene} -pix_fmt yuv420p "${clipPath}"`;
      await execAsync(renderClipCmd);
      sceneClips.push(clipPath);
    }

    // ==========================================
    // BƯỚC 5: Ghép các cảnh & lồng tiếng hoàn chỉnh
    // ==========================================
    const finalVideoPath = path.join(outputDir, `${id}_final.mp4`);

    if (sceneClips.length === 1) {
      addLog("FFMPEG", "Ghép luồng video với giọng đọc lồng tiếng audio...");
      const mergeCmd = `ffmpeg -y -i "${sceneClips[0]}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${finalVideoPath}"`;
      await execAsync(mergeCmd);
    } else {
      addLog("FFMPEG", `Ghép nối ${sceneClips.length} cảnh và hòa trộn audio...`);
      const concatListFile = path.join(outputDir, `${id}_concat.txt`);
      const concatContent = sceneClips
        .map((clip) => `file '${clip.replace(/\\/g, "/")}'`)
        .join("\n");
      fs.writeFileSync(concatListFile, concatContent);

      const mergedClipsPath = path.join(outputDir, `${id}_merged_video.mp4`);
      const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListFile}" -c copy "${mergedClipsPath}"`;
      await execAsync(concatCmd);

      const mergeCmd = `ffmpeg -y -i "${mergedClipsPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${finalVideoPath}"`;
      await execAsync(mergeCmd);
    }

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    addLog("API", `🎉 Hoàn thành xuất video thành công sau ${totalSeconds} giây! File: /outputs/${id}_final.mp4`);

    return NextResponse.json({
      success: true,
      title: scriptData.title || "AI Generated Video",
      videoUrl: `/outputs/${id}_final.mp4`,
      audioUrl: `/outputs/${id}_audio.mp3`,
      images: sceneImages,
      script: voiceoverText,
      duration: Math.round(duration * 10) / 10,
      scenes: scenes,
      tokenUsage: {
        ...tokenUsage,
        image_count: scenes.length,
        image_cost_usd: (scenes.length * 0.08).toFixed(2),
        total_estimated_usd: (
          parseFloat(tokenUsage.estimated_cost_usd) +
          scenes.length * 0.08
        ).toFixed(4),
      },
    });
  } catch (error: any) {
    addLog("API", `❌ Lỗi nghiêm trọng khi tạo video: ${error.message || error}`, "error");
    return NextResponse.json(
      {
        error: error.message || "Đã xảy ra lỗi trong quá trình tạo video AI.",
      },
      { status: 500 }
    );
  }
}
