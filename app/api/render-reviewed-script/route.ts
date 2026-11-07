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
      title = "AI Video",
      voiceover,
      scenes = [],
      subtitles = [],
      audioEffect = "eerie_dark", // 'eerie_dark' | 'creepy_reverb' | 'none'
      voiceProvider = "openai",
      openaiVoice = "onyx", // 'onyx' (trầm tối, uy quyền) | 'nova' (bí ẩn)
      subtitleStyle = "tiktok_yellow", // 'tiktok_yellow' | 'classic_white' | 'neon_green'
    } = body;

    if (!voiceover || typeof voiceover !== "string" || voiceover.trim().length === 0) {
      return NextResponse.json(
        { error: "Kịch bản lời thoại không được để trống." },
        { status: 400 }
      );
    }

    addLog("API", `🎬 [Sản Xuất Video Đã Duyệt] Bắt đầu dựng video: "${title}" | Audio Effect: ${audioEffect}`);

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
    // BƯỚC 1: Thu âm lồng tiếng (Voiceover)
    // ========================================================
    const rawAudioPath = path.join(outputDir, `${id}_raw_audio.mp3`);
    let audioGenerated = false;

    if (voiceProvider === "elevenlabs" && elevenLabsApiKey) {
      try {
        addLog("ELEVENLABS", "Đang gọi ElevenLabs TTS...");
        const elRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB`, // Adam (trầm ấm)
          {
            method: "POST",
            headers: {
              "xi-api-key": elevenLabsApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: voiceover,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.55, similarity_boost: 0.8 },
            }),
          }
        );
        if (elRes.ok) {
          const audioBuffer = Buffer.from(await elRes.arrayBuffer());
          fs.writeFileSync(rawAudioPath, audioBuffer);
          audioGenerated = true;
          addLog("ELEVENLABS", "Tạo audio ElevenLabs thành công!");
        } else {
          addLog("ELEVENLABS", "ElevenLabs không khả dụng, chuyển sang OpenAI TTS fallback...", "warn");
        }
      } catch (err: any) {
        addLog("ELEVENLABS", `Lỗi: ${err.message}. Chuyển sang OpenAI TTS.`, "warn");
      }
    }

    if (!audioGenerated) {
      addLog("OPENAI", `Đang tạo giọng đọc với OpenAI TTS-1 (voice: ${openaiVoice})...`);
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: openaiVoice,
        input: voiceover,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      fs.writeFileSync(rawAudioPath, buffer);
      audioGenerated = true;
      addLog("OPENAI", `Tạo giọng đọc thành công (${(buffer.length / 1024).toFixed(1)} KB)`);
    }

    // Lấy thời lượng audio chính xác
    let duration = 9.5;
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${rawAudioPath}"`
      );
      const parsed = parseFloat(stdout.trim());
      if (!isNaN(parsed) && parsed > 2) duration = parsed;
      addLog("FFMPEG", `Thời lượng gốc của lời thoại: ${duration.toFixed(2)}s`);
    } catch (e) {
      addLog("FFMPEG", `Thời lượng mặc định: ${duration}s`, "warn");
    }

    // ========================================================
    // BƯỚC 2: Xử lý hiệu ứng âm thanh rùng rợn / kỳ dị (Audio Effect)
    // ========================================================
    const finalAudioPath = path.join(outputDir, `${id}_processed_audio.mp3`);

    if (audioEffect === "eerie_dark") {
      addLog("FFMPEG", "Áp dụng hiệu ứng âm thanh rùng rợn TikTok (Dark Drone 50Hz + Eerie Hallway Echo)...");
      // Tạo âm drone u ám 50Hz lồng phía sau và vang vọng giọng đọc
      const rawAudioEscaped = rawAudioPath.replace(/\\/g, "/");
      const finalAudioEscaped = finalAudioPath.replace(/\\/g, "/");
      const audioCmd = `ffmpeg -y -i "${rawAudioEscaped}" -f lavfi -i "sine=frequency=50:duration=${Math.ceil(duration + 1)}" -filter_complex "[0:a]aecho=0.8:0.7:40|80:0.3|0.15[v];[1:a]flanger=speed=0.2,lowpass=f=150,volume=0.32[d];[v][d]amix=inputs=2:duration=first[aout]" -map "[aout]" -c:a libmp3lame -b:a 192k "${finalAudioEscaped}"`;
      await execAsync(audioCmd);
    } else if (audioEffect === "creepy_reverb") {
      addLog("FFMPEG", "Áp dụng hiệu ứng âm vang ma mị (Creepy Reverb Echo)...");
      const rawAudioEscaped = rawAudioPath.replace(/\\/g, "/");
      const finalAudioEscaped = finalAudioPath.replace(/\\/g, "/");
      const audioCmd = `ffmpeg -y -i "${rawAudioEscaped}" -af "aecho=0.8:0.75:50|100:0.35|0.2" -c:a libmp3lame -b:a 192k "${finalAudioEscaped}"`;
      await execAsync(audioCmd);
    } else {
      // Giữ nguyên file audio gốc
      fs.copyFileSync(rawAudioPath, finalAudioPath);
    }

    // ========================================================
    // BƯỚC 3: Tạo file phụ đề SRT
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
    const activeSubtitles = subtitles.length > 0
      ? subtitles
      : [{ text: voiceover.toUpperCase(), start_ratio: 0.0, end_ratio: 1.0 }];

    activeSubtitles.forEach((sub: any, idx: number) => {
      const startSec = (sub.start_ratio || 0) * duration;
      const endSec = (sub.end_ratio || 1) * duration;
      srtContent += `${idx + 1}\n${formatTime(startSec)} --> ${formatTime(endSec)}\n${sub.text}\n\n`;
    });

    const srtPath = path.join(outputDir, `${id}.srt`);
    fs.writeFileSync(srtPath, srtContent, "utf8");
    addLog("SYSTEM", `Tạo file phụ đề SRT (${activeSubtitles.length} phân đoạn)`);

    // ========================================================
    // BƯỚC 4: Sinh hình ảnh cảnh đã duyệt (gpt-image-1-mini / DALL-E)
    // ========================================================
    const candidateModels = ["gpt-image-1-mini", "chatgpt-image-latest", "dall-e-3"];
    const targetScene = scenes[0] || {
      image_prompt: `A psychological cinematic scene representing: ${title}, dark chiaroscuro lighting, moody atmosphere, 8k vertical 9:16`,
      motion: "zoom-in",
    };

    addLog("OPENAI", `Đang sinh hình ảnh dọc 9:16 cho cảnh duyệt: "${targetScene.image_prompt.substring(0, 60)}..."`);
    let imgBuffer: Buffer | null = null;

    for (const m of candidateModels) {
      try {
        addLog("OPENAI", `Gọi model sinh ảnh: ${m}...`);
        const imgRes = await openai.images.generate({
          model: m,
          prompt: `${targetScene.image_prompt}, vertical 9:16, masterpiece, cinematic chiaroscuro, atmospheric haze, moody colors, photorealistic, no text, no watermark`,
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

    const imagePath = path.join(outputDir, `${id}_scene.png`);
    fs.writeFileSync(imagePath, imgBuffer);
    addLog("OPENAI", "Hình ảnh đã lưu thành công!");

    // ========================================================
    // BƯỚC 5: Render Video Ken Burns + Phụ đề TikTok (FFmpeg)
    // ========================================================
    const finalVideoPath = path.join(outputDir, `${id}_reviewed_final.mp4`);
    const fps = 25;
    const totalFrames = Math.ceil(duration * fps);
    const width = 720;
    const height = 1280;

    let primaryColour = "&H0000FFFF"; // TikTok Yellow
    if (subtitleStyle === "classic_white") primaryColour = "&H00FFFFFF";
    if (subtitleStyle === "neon_green") primaryColour = "&H0000FF00";

    const srtRelative = `public/outputs/${id}.srt`.replace(/\\/g, "/");
    const imagePathEscaped = imagePath.replace(/\\/g, "/");
    const finalAudioEscaped = finalAudioPath.replace(/\\/g, "/");
    const finalVideoEscaped = finalVideoPath.replace(/\\/g, "/");

    const zoomFilter = `zoompan=z='min(zoom+0.0016,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${width}x${height}:fps=${fps}`;
    const subtitleFilter = `subtitles=${srtRelative}:force_style='FontName=Arial,FontSize=24,Bold=1,PrimaryColour=${primaryColour},OutlineColour=&H00000000,BorderStyle=3,Outline=2.8,Shadow=1.2,Alignment=2,MarginV=75'`;
    const combinedFilter = `${zoomFilter},${subtitleFilter}`;

    addLog("FFMPEG", `Render video MP4 9:16 với âm thanh rùng rợn & phụ đề nổi bật (${duration.toFixed(1)}s, ${totalFrames} frames)...`);

    const renderCmd = `ffmpeg -y -loop 1 -i "${imagePathEscaped}" -i "${finalAudioEscaped}" -vf "${combinedFilter}" -c:v libx264 -c:a aac -b:a 192k -t ${duration} -pix_fmt yuv420p -shortest -movflags +faststart "${finalVideoEscaped}"`;
    await execAsync(renderCmd);

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    addLog("API", `🎉 Video đã duyệt hoàn tất xuất bản sau ${totalSeconds}s! File: /outputs/${id}_reviewed_final.mp4`);

    return NextResponse.json({
      success: true,
      title: title,
      videoUrl: `/outputs/${id}_reviewed_final.mp4`,
      audioUrl: `/outputs/${id}_processed_audio.mp3`,
      imageUrl: `/outputs/${id}_scene.png`,
      script: voiceover,
      duration: Math.round(duration * 10) / 10,
    });
  } catch (error: any) {
    addLog("API", `❌ Lỗi khi render video đã duyệt: ${error.message || error}`, "error");
    return NextResponse.json(
      { error: error.message || "Lỗi trong quá trình render video." },
      { status: 500 }
    );
  }
}

