"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Video,
  Play,
  Download,
  Volume2,
  Image as ImageIcon,
  Clock,
  Layers,
  CheckCircle2,
  Loader2,
  Settings2,
  Tv,
  Smartphone,
  Flame,
  Terminal,
  Trash2,
  RefreshCw,
  Coins,
  Check,
  AlertCircle,
  Newspaper,
  BookOpen,
  Subtitles,
  TrendingUp,
  Zap,
  Globe2,
  Cpu,
  Ghost,
  Compass,
  Lightbulb,
  Edit3,
  MessageSquareText,
  RotateCcw,
  VolumeX,
  Radio,
  Skull,
  Brain,
  Scale,
} from "lucide-react";

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: string;
  image_count?: number;
  image_cost_usd?: string;
  total_estimated_usd: string;
}

interface DraftScript {
  title: string;
  hook: string;
  voiceover: string;
  word_count: number;
  estimated_seconds: number;
  eerie_sound_effect?: string;
  subtitles: { text: string; start_ratio: number; end_ratio: number }[];
  scenes: { scene_number: number; image_prompt: string; motion: string }[];
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "cmd";
  module: "SYSTEM" | "OPENAI" | "ELEVENLABS" | "FFMPEG" | "API";
  message: string;
  metadata?: any;
}

// Các chủ đề chuyên sâu: Đạo lý, Mặt tối, Tâm lý học, Kinh dị
const DEEP_TOPIC_PRESETS = [
  {
    genre: "rich_poor",
    genreLabel: "Mặt Tối Giàu & Nghèo",
    icon: Scale,
    title: "Sự thật tàn nhẫn về tiền bạc",
    prompt: "Khi bạn nghèo, sự chân thành bị coi là mưu mô. Khi bạn giàu, sự thô lỗ lại được ca tụng là cá tính. Tiền không làm thay đổi bản chất, nó chỉ phóng đại con người bạn.",
  },
  {
    genre: "psychology",
    genreLabel: "Tâm Lý Học Thao Túng",
    icon: Brain,
    title: "Bản chất nhân sinh trước lợi ích",
    prompt: "Đừng bao giờ thử thách lòng tốt của con người trước một món lợi quá lớn. Ác quỷ không mang sừng nhọn, chúng mang hình hài của những người bạn từng tin tưởng nhất.",
  },
  {
    genre: "philosophy",
    genreLabel: "Đạo Lý & Triết Học",
    icon: Lightbulb,
    title: "Ảo tưởng của sự quan trọng",
    prompt: "Trăm năm sau, không ai nhớ bạn từng kiếm được bao nhiêu tiền hay lái xe gì. Bạn bước vào thế giới với hai bàn tay trắng, và rời đi trong sự lãng quên tĩnh lặng.",
  },
  {
    genre: "horror",
    genreLabel: "Kinh Dị & Kỳ Bí",
    icon: Skull,
    title: "Tiếng gõ cửa lúc 3 giờ sáng",
    prompt: "Nếu nửa đêm bạn nghe thấy tiếng người thân gọi tên mình từ ngoài cửa sổ tầng 10, tuyệt đối đừng nhìn ra. Thứ đang bắt chước giọng nói đó không phải con người.",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"review_studio" | "shorts_quick" | "terminal" | "pricing">("review_studio");

  // ==========================================
  // STATE CHO TAB REVIEW & PHẢN HỒI KỊCH BẢN (MỚI)
  // ==========================================
  const [deepGenre, setDeepGenre] = useState<"rich_poor" | "psychology" | "philosophy" | "horror">("psychology");
  const [deepTopic, setDeepTopic] = useState<string>(DEEP_TOPIC_PRESETS[1].prompt);
  const [targetDuration, setTargetDuration] = useState<"short" | "medium" | "flexible">("short");
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Kịch bản đã được AI tạo và người dùng có thể tự do chỉnh sửa
  const [draftScript, setDraftScript] = useState<DraftScript | null>(null);
  const [userEditedVoiceover, setUserEditedVoiceover] = useState<string>("");
  const [feedbackPrompt, setFeedbackPrompt] = useState<string>("");
  const [isRevising, setIsRevising] = useState(false);

  // Cấu hình âm thanh & dựng video
  const [audioEffect, setAudioEffect] = useState<"eerie_dark" | "creepy_reverb" | "none">("eerie_dark");
  const [voiceChoice, setVoiceChoice] = useState<"onyx" | "nova">("onyx");
  const [subtitleStyle, setSubtitleStyle] = useState<"tiktok_yellow" | "classic_white" | "neon_green">("tiktok_yellow");

  // Trạng thái render video đã duyệt
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderStep, setRenderStep] = useState(0);
  const [renderedResult, setRenderedResult] = useState<any>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>("ALL");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Poll logs
  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, isDrafting || isRevising || isRenderingVideo ? 1500 : 3000);
    return () => clearInterval(interval);
  }, [isDrafting, isRevising, isRenderingVideo]);

  useEffect(() => {
    if (autoScroll && activeTab === "terminal") {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, activeTab]);

  const handleClearLogs = async () => {
    try {
      await fetch("/api/logs", { method: "DELETE" });
      setLogs([]);
    } catch (e) {
      // ignore
    }
  };

  // Bước 1: Yêu cầu AI lên kịch bản nháp
  const handleDraftScript = async () => {
    if (!deepTopic.trim()) {
      setDraftError("Vui lòng nhập chủ đề ý tưởng.");
      return;
    }

    setDraftError(null);
    setIsDrafting(true);

    try {
      const res = await fetch("/api/draft-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: deepTopic,
          genre: deepGenre,
          targetDuration,
          scenesCount: 1, // 1 cảnh để tiết kiệm chi phí DALL-E tối đa
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tạo kịch bản.");
      }

      setDraftScript(data.script);
      setUserEditedVoiceover(data.script.voiceover || "");
      setFeedbackPrompt("");
      fetchLogs();
    } catch (err: any) {
      setDraftError(err.message || "Lỗi khi tạo kịch bản.");
    } finally {
      setIsDrafting(false);
    }
  };

  // Bước 1.5: Yêu cầu AI sửa lại kịch bản theo feedback
  const handleReviseScript = async () => {
    if (!feedbackPrompt.trim()) {
      setDraftError("Vui lòng nhập nội dung góp ý cần sửa.");
      return;
    }

    setDraftError(null);
    setIsRevising(true);

    try {
      const res = await fetch("/api/draft-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: deepTopic,
          genre: deepGenre,
          targetDuration,
          scenesCount: 1,
          feedback: feedbackPrompt,
          currentScript: {
            ...draftScript,
            voiceover: userEditedVoiceover,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể sửa kịch bản.");
      }

      setDraftScript(data.script);
      setUserEditedVoiceover(data.script.voiceover || "");
      setFeedbackPrompt("");
      fetchLogs();
    } catch (err: any) {
      setDraftError(err.message || "Lỗi khi sửa kịch bản.");
    } finally {
      setIsRevising(false);
    }
  };

  // Bước 2: Duyệt kịch bản & Tiến hành sản xuất video
  const handleApproveAndRender = async () => {
    if (!userEditedVoiceover.trim()) {
      setRenderError("Lời thoại không được để trống.");
      return;
    }

    setRenderError(null);
    setIsRenderingVideo(true);
    setRenderStep(1);

    const stepInterval = setInterval(() => {
      setRenderStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 7000);

    try {
      const res = await fetch("/api/render-reviewed-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftScript?.title || "Video Đạo Lý",
          voiceover: userEditedVoiceover,
          scenes: draftScript?.scenes || [
            {
              scene_number: 1,
              image_prompt: `A dark moody cinematic chiaroscuro scene depicting: ${deepTopic}, psychological thriller atmosphere, 8k vertical 9:16`,
              motion: "zoom-in",
            },
          ],
          subtitles: draftScript?.subtitles || [],
          audioEffect,
          voiceProvider: "openai",
          openaiVoice: voiceChoice,
          subtitleStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Lỗi sản xuất video.");
      }

      setRenderedResult(data);
      fetchLogs();
    } catch (err: any) {
      setRenderError(err.message || "Lỗi khi render video.");
    } finally {
      clearInterval(stepInterval);
      setIsRenderingVideo(false);
      setRenderStep(0);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === "ALL") return true;
    return l.module === logFilter;
  });

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 p-4 md:p-8 selection:bg-purple-500 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-2">
              <Ghost className="w-3.5 h-3.5" />
              CreativeAI • Studio Đạo Lý, Mặt Tối & Kinh Dị
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AI Video Generator
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Quy trình thông minh: Nhập ý tưởng ➔ AI tạo kịch bản ➔ Bạn Review & Góp ý sửa ➔ Duyệt sản xuất video có âm thanh rùng rợn TikTok.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 shadow-inner">
            {/* TAB CHÍNH: REVIEW KỊCH BẢN & MẶT TỐI */}
            <button
              onClick={() => setActiveTab("review_studio")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === "review_studio"
                  ? "bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-red-900/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Skull className="w-4 h-4 text-red-400" />
              <span>Review Kịch Bản & Mặt Tối</span>
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                ƯU TIÊN
              </span>
            </button>

            <button
              onClick={() => setActiveTab("terminal")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === "terminal"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Nhật Ký CMD</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
                {logs.length}
              </span>
              {(isDrafting || isRevising || isRenderingVideo) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("pricing")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "pricing"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Chi Phí & Token</span>
            </button>
          </div>
        </header>

        {/* ======================================================== */}
        {/* TAB CHÍNH: REVIEW KỊCH BẢN & MẶT TỐI (THEO YÊU CẦU NGƯỜI DÙNG) */}
        {/* ======================================================== */}
        {activeTab === "review_studio" && (
          <div className="space-y-8">
            {/* GIAI ĐOẠN 1: NHẬP Ý TƯỞNG & CHỌN THỂ LOẠI */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Cột trái: Cấu hình ý tưởng */}
              <div className="lg:col-span-6 bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center text-xs">
                      1
                    </span>
                    <span>Chọn thể loại & Nhập ý tưởng</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                    Lên kịch bản: ~$0.0001 USD
                  </span>
                </div>

                {/* Thể loại chuyên sâu */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDeepGenre("rich_poor");
                      setDeepTopic(DEEP_TOPIC_PRESETS[0].prompt);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deepGenre === "rich_poor"
                        ? "bg-red-950/30 border-red-500 text-red-200"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Scale className="w-4 h-4 text-red-400 mb-1" />
                    <div className="text-xs font-bold text-slate-200">Mặt Tối Giàu Nghèo</div>
                    <div className="text-[10px] text-slate-400">Phân hóa giai cấp, đồng tiền</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeepGenre("psychology");
                      setDeepTopic(DEEP_TOPIC_PRESETS[1].prompt);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deepGenre === "psychology"
                        ? "bg-purple-950/30 border-purple-500 text-purple-200"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Brain className="w-4 h-4 text-purple-400 mb-1" />
                    <div className="text-xs font-bold text-slate-200">Tâm Lý & Nhân Sinh</div>
                    <div className="text-[10px] text-slate-400">Thao túng, bản chất con người</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeepGenre("philosophy");
                      setDeepTopic(DEEP_TOPIC_PRESETS[2].prompt);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deepGenre === "philosophy"
                        ? "bg-amber-950/30 border-amber-500 text-amber-200"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 text-amber-400 mb-1" />
                    <div className="text-xs font-bold text-slate-200">Đạo Lý & Triết Học</div>
                    <div className="text-[10px] text-slate-400">Chiêm nghiệm, thức tỉnh</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeepGenre("horror");
                      setDeepTopic(DEEP_TOPIC_PRESETS[3].prompt);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      deepGenre === "horror"
                        ? "bg-rose-950/30 border-rose-500 text-rose-200"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Skull className="w-4 h-4 text-rose-400 mb-1" />
                    <div className="text-xs font-bold text-slate-200">Kinh Dị & Kỳ Bí</div>
                    <div className="text-[10px] text-slate-400">Ám ảnh, hiện tượng rùng rợn</div>
                  </button>
                </div>

                {/* Textarea nhập ý tưởng */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Ý tưởng của bạn (hoặc chọn gợi ý mẫu bên phải)</span>
                  </label>
                  <textarea
                    value={deepTopic}
                    onChange={(e) => setDeepTopic(e.target.value)}
                    rows={4}
                    placeholder="Nhập ý tưởng câu chuyện đạo lý, mặt tối hoặc kinh dị..."
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                {/* Tùy chọn thời lượng (Không bị ràng buộc) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Thời lượng dự kiến (Không bị gò bó)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetDuration("short")}
                      className={`p-2 rounded-lg text-xs border text-center transition-all ${
                        targetDuration === "short"
                          ? "bg-red-600/20 border-red-500 text-red-200 font-semibold"
                          : "bg-slate-950/40 border-slate-800 text-slate-400"
                      }`}
                    >
                      Ngắn (~8-10s)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetDuration("medium")}
                      className={`p-2 rounded-lg text-xs border text-center transition-all ${
                        targetDuration === "medium"
                          ? "bg-red-600/20 border-red-500 text-red-200 font-semibold"
                          : "bg-slate-950/40 border-slate-800 text-slate-400"
                      }`}
                    >
                      Vừa (~15-18s)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetDuration("flexible")}
                      className={`p-2 rounded-lg text-xs border text-center transition-all ${
                        targetDuration === "flexible"
                          ? "bg-red-600/20 border-red-500 text-red-200 font-semibold"
                          : "bg-slate-950/40 border-slate-800 text-slate-400"
                      }`}
                    >
                      Tự nhiên theo truyện
                    </button>
                  </div>
                </div>

                {draftError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{draftError}</span>
                  </div>
                )}

                {/* Nút lên kịch bản nháp */}
                <button
                  type="button"
                  onClick={handleDraftScript}
                  disabled={isDrafting}
                  className="w-full py-3 px-5 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-purple-600 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
                >
                  {isDrafting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI đang lên kịch bản (chỉ tốn ~$0.0001)...</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      <span>Lên Kịch Bản Để Tôi Review</span>
                    </>
                  )}
                </button>
              </div>

              {/* Cột phải: Các mẫu cốt truyện có sẵn để bấm chọn nhanh */}
              <div className="lg:col-span-6 bg-slate-900/40 rounded-2xl p-6 border border-slate-800/80 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Cốt truyện mẫu viral (Bấm vào để chọn ngay)</span>
                </div>

                <div className="space-y-3">
                  {DEEP_TOPIC_PRESETS.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setDeepGenre(item.genre as any);
                          setDeepTopic(item.prompt);
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          deepTopic === item.prompt
                            ? "bg-slate-800/80 border-red-500/60 shadow-md"
                            : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400">
                            <Icon className="w-3.5 h-3.5" />
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {item.genreLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                          &quot;{item.prompt}&quot;
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* GIAI ĐOẠN 2: BẢNG REVIEW KỊCH BẢN & VIẾT FEEDBACK TẠO LẠI (LIVE REVIEW PANEL) */}
            {draftScript && (
              <div className="bg-slate-900/90 rounded-2xl p-6 border-2 border-red-500/50 shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-sm">
                      2
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        Bảng Review Kịch Bản: &quot;{draftScript.title}&quot;
                      </h2>
                      <p className="text-xs text-slate-400">
                        Bạn có thể <strong>sửa trực tiếp từng chữ</strong> trong ô lời thoại, hoặc <strong>gõ feedback</strong> để AI viết lại.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
                    <Clock className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Ước tính: ~{draftScript.estimated_seconds} giây ({draftScript.word_count} từ)</span>
                  </div>
                </div>

                {/* Hook mở đầu 3s */}
                <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-yellow-400" /> Hook 3 giây đầu (Gây tò mò / Rùng rợn):
                  </div>
                  <div className="text-sm font-semibold text-white">
                    &quot;{draftScript.hook}&quot;
                  </div>
                </div>

                {/* Ô chỉnh sửa trực tiếp lời thoại */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Edit3 className="w-3.5 h-3.5" /> Lời thoại lồng tiếng (Bạn có thể bấm vào để tự gõ sửa trực tiếp):
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">Chỉnh sửa tự do</span>
                  </label>
                  <textarea
                    value={userEditedVoiceover}
                    onChange={(e) => setUserEditedVoiceover(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all leading-relaxed font-sans"
                  />
                </div>

                {/* Phân cảnh & Phụ đề xem trước */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
                      <Subtitles className="w-3.5 h-3.5 text-yellow-400" /> Các phân đoạn phụ đề sẽ khắc lên video
                    </div>
                    <div className="space-y-1.5">
                      {draftScript.subtitles.map((sub, idx) => (
                        <div key={idx} className="p-2 bg-slate-900 rounded-lg text-xs font-bold text-yellow-300 border border-slate-800">
                          {sub.text}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> Mô tả hình ảnh điện ảnh u tối (AI Prompt)
                    </div>
                    <p className="text-xs text-slate-300 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      &quot;{draftScript.scenes[0]?.image_prompt}&quot;
                    </p>
                  </div>
                </div>

                {/* Hộp Feedback để AI sửa lại kịch bản */}
                <div className="p-4 bg-slate-950/90 rounded-xl border border-purple-500/30 space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <MessageSquareText className="w-3.5 h-3.5 text-purple-400" /> Bạn muốn AI viết lại? Nhập Feedback tại đây:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={feedbackPrompt}
                      onChange={(e) => setFeedbackPrompt(e.target.value)}
                      placeholder="Ví dụ: 'Hãy làm câu kết tăm tối hơn', 'Đổi lời thoại sang giọng điệu sắc lạnh hơn', 'Bớt từ lại'..."
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleReviseScript}
                      disabled={isRevising || !feedbackPrompt.trim()}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
                    >
                      {isRevising ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang sửa...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Yêu Cầu AI Viết Lại</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* TÙY CHỌN HIỆU ỨNG ÂM THANH KỲ DỊ & DUYỆT SẢN XUẤT */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Hiệu ứng âm thanh kỳ dị (Audio Effect TikTok) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-red-400" /> Hiệu ứng âm thanh kỳ dị TikTok
                      </label>
                      <select
                        value={audioEffect}
                        onChange={(e) => setAudioEffect(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="eerie_dark">🔊 Dark Drone 50Hz + Vang Vọng (Chuẩn TikTok)</option>
                        <option value="creepy_reverb">🔊 Tiếng vang ma mị (Creepy Reverb Echo)</option>
                        <option value="none">🔈 Âm thanh bình thường (Không hiệu ứng)</option>
                      </select>
                    </div>

                    {/* Giọng đọc */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-purple-400" /> Giọng đọc lồng tiếng
                      </label>
                      <select
                        value={voiceChoice}
                        onChange={(e) => setVoiceChoice(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="onyx">Nam trầm tối, uy quyền (Onyx)</option>
                        <option value="nova">Nữ bí ẩn, truyền cảm (Nova)</option>
                      </select>
                    </div>

                    {/* Màu phụ đề TikTok */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                        <Subtitles className="w-3.5 h-3.5 text-yellow-400" /> Màu phụ đề khắc lên video
                      </label>
                      <select
                        value={subtitleStyle}
                        onChange={(e) => setSubtitleStyle(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="tiktok_yellow">🟡 Chữ Vàng Viền Đen (TikTok Gold)</option>
                        <option value="classic_white">⚪ Chữ Trắng Viền Đen (Classic White)</option>
                        <option value="neon_green">🟢 Xanh Neon Dạ Quang (Neon Cyber)</option>
                      </select>
                    </div>
                  </div>

                  {renderError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{renderError}</span>
                    </div>
                  )}

                  {/* NÚT DUYỆT & SẢN XUẤT VIDEO */}
                  <button
                    type="button"
                    onClick={handleApproveAndRender}
                    disabled={isRenderingVideo}
                    className="w-full py-4 px-6 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-900/40 group"
                  >
                    {isRenderingVideo ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Đang sản xuất video đã duyệt (khắc phụ đề & hiệu ứng âm thanh)...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 group-hover:scale-125 transition-transform" />
                        <span>Tôi Duyệt Kịch Bản Này ➔ Tiến Hành Sản Xuất Video Ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* GIAI ĐOẠN 3: KẾT QUẢ VIDEO ĐÃ XUẤT RA */}
            {isRenderingVideo && (
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Đang sản xuất video theo đúng kịch bản bạn đã duyệt...</h3>
                    <p className="text-xs text-slate-400">
                      Đang xử lý: Thu âm ➔ Mix hiệu ứng âm thanh kỳ dị ➔ Sinh ảnh dọc 9:16 ➔ Khắc phụ đề viền đậm.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3 text-xs">
                    <CheckCircle2 className={`w-4 h-4 ${renderStep >= 1 ? "text-emerald-400" : "text-slate-600"}`} />
                    <span className={renderStep >= 1 ? "text-slate-200 font-medium" : "text-slate-500"}>
                      1. Thu âm lời thoại bạn đã duyệt (OpenAI TTS)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <CheckCircle2 className={`w-4 h-4 ${renderStep >= 2 ? "text-emerald-400" : "text-slate-600"}`} />
                    <span className={renderStep >= 2 ? "text-slate-200 font-medium" : "text-slate-500"}>
                      2. Lồng hiệu ứng âm thanh rùng rợn TikTok (Dark Drone + Eerie Reverb)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <CheckCircle2 className={`w-4 h-4 ${renderStep >= 3 ? "text-emerald-400" : "text-slate-600"}`} />
                    <span className={renderStep >= 3 ? "text-slate-200 font-medium" : "text-slate-500"}>
                      3. Vẽ hình ảnh điện ảnh u tối tỉ lệ 9:16 (OpenAI Image)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <CheckCircle2 className={`w-4 h-4 ${renderStep >= 4 ? "text-emerald-400" : "text-slate-600"}`} />
                    <span className={renderStep >= 4 ? "text-slate-200 font-medium" : "text-slate-500"}>
                      4. Render chuyển động Ken Burns & Khắc phụ đề viền đậm (FFmpeg)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {renderedResult && (
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border-2 border-emerald-500/40 shadow-2xl space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                      ✓ Đã Xuất Bản Video Theo Kịch Bản Duyệt
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">
                      {renderedResult.title}
                    </h2>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Thời lượng: {renderedResult.duration} giây • Khung dọc 9:16 • Kèm Audio Effect & Phụ đề
                    </div>
                  </div>

                  <a
                    href={renderedResult.videoUrl}
                    download="creative_ai_reviewed_video.mp4"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-purple-600 hover:opacity-90 text-white text-xs font-bold shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Tải Video MP4
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-6 flex justify-center bg-black rounded-xl overflow-hidden max-h-[500px]">
                    <video
                      src={renderedResult.videoUrl}
                      controls
                      autoPlay
                      loop
                      className="max-h-[500px] w-auto mx-auto rounded-lg shadow-2xl"
                    />
                  </div>

                  <div className="md:col-span-6 space-y-4">
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase flex items-center justify-between">
                        <span>Âm thanh rùng rợn đã xử lý</span>
                        <audio src={renderedResult.audioUrl} controls className="h-6 w-36 scale-90" />
                      </div>
                      <p className="text-xs text-slate-300 italic leading-relaxed">
                        &quot;{renderedResult.script}&quot;
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase">
                        Khung hình gốc AI đã vẽ
                      </div>
                      <img
                        src={renderedResult.imageUrl}
                        alt="Scene"
                        className="w-full h-44 object-cover rounded-lg border border-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TERMINAL / CMD LOGS */}
        {activeTab === "terminal" && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden font-mono">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Terminal Console & Server Logs</span>
                  <span className="text-slate-500 text-[11px]">• Real-time CMD</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="ALL">Tất cả module</option>
                  <option value="OPENAI">OpenAI (GPT/DALL-E)</option>
                  <option value="ELEVENLABS">ElevenLabs</option>
                  <option value="FFMPEG">FFmpeg</option>
                  <option value="API">API Gateway</option>
                </select>

                <button
                  type="button"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                    autoScroll
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  Auto-scroll: {autoScroll ? "BẬT" : "TẮT"}
                </button>

                <button
                  type="button"
                  onClick={fetchLogs}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  title="Làm mới"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 hover:text-red-400 text-slate-400 transition-all"
                  title="Xóa log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 h-[600px] overflow-y-auto space-y-1.5 text-xs text-slate-300 bg-[#090d16]">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 py-10 text-center">Chưa có nhật ký nào.</div>
              ) : (
                filteredLogs.map((log) => {
                  let moduleColor = "bg-slate-800 text-slate-300";
                  if (log.module === "OPENAI") moduleColor = "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30";
                  if (log.module === "ELEVENLABS") moduleColor = "bg-amber-950/80 text-amber-400 border border-amber-500/30";
                  if (log.module === "FFMPEG") moduleColor = "bg-purple-950/80 text-purple-400 border border-purple-500/30";
                  if (log.module === "API") moduleColor = "bg-cyan-950/80 text-cyan-400 border border-cyan-500/30";

                  let levelColor = "text-slate-200";
                  if (log.level === "error") levelColor = "text-red-400 font-bold bg-red-950/30 p-1 rounded";
                  if (log.level === "warn") levelColor = "text-yellow-400";

                  return (
                    <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/40 p-0.5 rounded">
                      <span className="text-slate-500 select-none text-[11px] shrink-0 font-mono">
                        [{log.timestamp}]
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${moduleColor}`}>
                        {log.module}
                      </span>
                      <span className={`break-all ${levelColor}`}>{log.message}</span>
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>

            <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Đang kết nối live log buffer</span>
              </div>
              <div>{filteredLogs.length} dòng log</div>
            </div>
          </div>
        )}

        {/* TAB 3: PRICING & TOKEN BREAKDOWN */}
        {activeTab === "pricing" && (
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-800 shadow-xl space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                Bảng Chi Phí & Token Khi Review Kịch Bản
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Lên kịch bản & feedback sửa lại chỉ tốn token GPT-4o-mini (~$0.0001). Chỉ khi duyệt sản xuất video mới tốn tiền sinh ảnh DALL-E/GPT-Image.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                    Lên Kịch Bản & Sửa Feedback
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                    GPT-4o-mini
                  </span>
                </div>
                <div className="text-2xl font-black text-white">~350 - 500 <span className="text-sm font-normal text-slate-400">tokens</span></div>
                <div className="pt-2 border-t border-slate-800 text-xs flex justify-between text-slate-300">
                  <span>Chi phí mỗi lần tạo/sửa:</span>
                  <span className="font-mono text-emerald-400 font-semibold">~$0.0001 USD (~2 VNĐ)</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-purple-400 tracking-wider">
                    Hình Ảnh (Sau Khi Duyệt)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">
                    gpt-image-1-mini
                  </span>
                </div>
                <div className="text-2xl font-black text-white">1 <span className="text-sm font-normal text-slate-400">ảnh dọc 9:16</span></div>
                <div className="pt-2 border-t border-slate-800 text-xs flex justify-between text-slate-300">
                  <span>Chi phí ước tính:</span>
                  <span className="font-mono text-purple-400 font-semibold">~$0.04 - $0.08 USD (~1.000 - 2.000 VNĐ)</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-red-400 tracking-wider">
                    Audio Effect Rùng Rợn & Phụ Đề
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-300 font-mono">
                    FFmpeg Local
                  </span>
                </div>
                <div className="text-2xl font-black text-white">Dark Drone 50Hz <span className="text-sm font-normal text-slate-400">& TikTok Sub</span></div>
                <div className="pt-2 border-t border-slate-800 text-xs flex justify-between text-slate-300">
                  <span>Chi phí xử lý:</span>
                  <span className="font-mono text-red-400 font-semibold">$0.00 USD (Miễn phí 100%)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
