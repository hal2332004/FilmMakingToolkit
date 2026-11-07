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

interface VideoResult {
  title: string;
  videoUrl: string;
  audioUrl: string;
  images: string[];
  script: string;
  duration: number;
  prompt: string;
  tokenUsage?: TokenUsage;
}

interface ShortsResult {
  title: string;
  hook?: string;
  videoUrl: string;
  audioUrl: string;
  imageUrl: string;
  script: string;
  subtitles: { text: string; start_ratio: number; end_ratio: number }[];
  duration: number;
  tokenUsage?: TokenUsage;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "cmd";
  module: "SYSTEM" | "OPENAI" | "ELEVENLABS" | "FFMPEG" | "API";
  message: string;
  metadata?: any;
}

const SAMPLE_PROMPTS = [
  "Khám phá bí ẩn đại dương sâu thẳm cùng loài sứa phát sáng kỳ ảo",
  "Một tiệm cà phê cổ điển giữa Tokyo tương lai rực rỡ ánh đèn neon cyberpunk",
  "Bài học 10 giây: Bạn chỉ cần tốt hơn 1% mỗi ngày để thay đổi cuộc đời",
  "Tàu thám hiểm vũ trụ chuẩn bị du hành qua hố giun thiên hà",
];

const ELEVEN_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Nữ truyền cảm hứng)", desc: "Giọng nữ Mỹ truyền cảm" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Nam trầm ấm)", desc: "Giọng nam sâu lắng, kể chuyện" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Nữ trẻ trung)", desc: "Giọng nữ nhẹ nhàng, tự nhiên" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Nam tự tin)", desc: "Giọng nam rõ ràng, thuyết minh" },
];

// Presets cho Tab Shorts (Tin Tức & Kể Chuyện)
const NEWS_PRESETS = [
  {
    category: "tech",
    icon: Cpu,
    title: "Đột phá Siêu AI mới",
    prompt: "OpenAI chính thức thử nghiệm mô hình trí tuệ nhân tạo thế hệ mới có khả năng tự tư duy và lập trình độc lập, mở ra kỷ nguyên AGI.",
  },
  {
    category: "space",
    icon: Globe2,
    title: "Kính James Webb & Ngoại hành tinh",
    prompt: "Kính viễn vọng James Webb vừa phát hiện dấu hiệu phân tử nước và khí quyển tương tự Trái Đất trên một hành tinh cách chúng ta 120 năm ánh sáng.",
  },
  {
    category: "finance",
    icon: TrendingUp,
    title: "Cơn sốt chip bán dẫn",
    prompt: "Cuộc đua sản xuất chip bán dẫn toàn cầu đạt đỉnh điểm với hàng trăm tỷ đô la đổ vào các trung tâm dữ liệu AI thế hệ mới.",
  },
];

const STORY_PRESETS = [
  {
    category: "mystery",
    icon: Ghost,
    title: "Bí mật tàu ma Mary Celeste",
    prompt: "Năm 1872, tàu Mary Celeste được tìm thấy trôi dạt giữa biển khơi: đồ đạc nguyên vẹn, bàn ăn vẫn còn ấm nhưng toàn bộ thủy thủ đoàn đã biến mất không dấu vết.",
  },
  {
    category: "history",
    icon: Compass,
    title: "Kế sách lừa 10 vạn quân",
    prompt: "Gia Cát Lượng ngồi gảy đàn trên cổng thành trống không một bóng lính, chỉ bằng ánh mắt tĩnh lặng đã khiến Tư Mã Ý hoảng sợ rút 10 vạn đại quân.",
  },
  {
    category: "motivation",
    icon: Lightbulb,
    title: "Quy luật 5 giây thay đổi số phận",
    prompt: "Nếu bạn có một ý tưởng nhưng không hành động trong vòng 5 giây, bộ não của bạn sẽ tự động tìm lý do để từ bỏ. Hãy đếm 5-4-3-2-1 và bước đi ngay!",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"studio" | "shorts" | "terminal" | "pricing">("shorts");

  // Tab 1 (Studio) state
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<"9:16" | "16:9">("9:16");
  const [style, setStyle] = useState("cinematic");
  const [scenesCount, setScenesCount] = useState<1 | 2>(1);
  const [voiceProvider, setVoiceProvider] = useState<"elevenlabs" | "openai">("openai");
  const [elevenVoiceId, setElevenVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<VideoResult | null>(null);
  const [history, setHistory] = useState<VideoResult[]>([]);

  // Tab Shorts (Tin tức & Kể chuyện) state
  const [shortsMode, setShortsMode] = useState<"story" | "news">("story");
  const [shortsCategory, setShortsCategory] = useState<string>("mystery");
  const [shortsTopic, setShortsTopic] = useState<string>(
    "Năm 1872, tàu Mary Celeste được tìm thấy trôi dạt giữa biển khơi: đồ đạc nguyên vẹn, bàn ăn vẫn còn ấm nhưng toàn bộ thủy thủ đoàn đã biến mất không dấu vết."
  );
  const [shortsSubtitleStyle, setShortsSubtitleStyle] = useState<"tiktok_yellow" | "classic_white" | "neon_green">("tiktok_yellow");
  const [shortsVoiceProvider, setShortsVoiceProvider] = useState<"openai" | "elevenlabs">("openai");
  const [isShortsLoading, setIsShortsLoading] = useState(false);
  const [shortsLoadingStep, setShortsLoadingStep] = useState(0);
  const [shortsResult, setShortsResult] = useState<ShortsResult | null>(null);
  const [shortsError, setShortsError] = useState<string | null>(null);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>("ALL");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Poll logs from server
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
    const interval = setInterval(fetchLogs, isLoading || isShortsLoading ? 1500 : 3000);
    return () => clearInterval(interval);
  }, [isLoading, isShortsLoading]);

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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Vui lòng nhập ý tưởng kịch bản.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingStep(1);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 7000);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          format,
          style,
          scenesCount,
          voiceProvider,
          elevenVoiceId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Tạo video thất bại.");
      }

      const result: VideoResult = {
        title: data.title,
        videoUrl: data.videoUrl,
        audioUrl: data.audioUrl,
        images: data.images,
        script: data.script,
        duration: data.duration,
        prompt: prompt,
        tokenUsage: data.tokenUsage,
      };

      setCurrentResult(result);
      setHistory((prev) => [result, ...prev]);
      fetchLogs();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi kết nối.");
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  // Tạo video Shorts (Tin tức / Kể chuyện kèm phụ đề tự động)
  const handleGenerateShorts = async () => {
    if (!shortsTopic.trim()) {
      setShortsError("Vui lòng nhập chủ đề tin tức hoặc câu chuyện.");
      return;
    }

    setShortsError(null);
    setIsShortsLoading(true);
    setShortsLoadingStep(1);

    const stepInterval = setInterval(() => {
      setShortsLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 7000);

    try {
      const response = await fetch("/api/generate-shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: shortsTopic,
          mode: shortsMode,
          category: shortsCategory,
          subtitleStyle: shortsSubtitleStyle,
          voiceProvider: shortsVoiceProvider,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Tạo video Shorts thất bại.");
      }

      setShortsResult({
        title: data.title,
        hook: data.hook,
        videoUrl: data.videoUrl,
        audioUrl: data.audioUrl,
        imageUrl: data.imageUrl,
        script: data.script,
        subtitles: data.subtitles || [],
        duration: data.duration,
        tokenUsage: data.tokenUsage,
      });

      fetchLogs();
    } catch (err: any) {
      setShortsError(err.message || "Lỗi xử lý tạo video Shorts.");
    } finally {
      clearInterval(stepInterval);
      setIsShortsLoading(false);
      setShortsLoadingStep(0);
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
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              CreativeAI • Studio Tự Động 10s
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AI Video Generator
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Biến ý tưởng thành video ngắn 10 giây hoàn chỉnh với GPT-4o, ElevenLabs và FFmpeg.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 shadow-inner">
            {/* TAB SHORTS MỚI */}
            <button
              onClick={() => setActiveTab("shorts")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === "shorts"
                  ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-900/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Flame className="w-4 h-4 text-pink-400" />
              <span>Shorts & TikTok Viral</span>
              <span className="px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold">
                MỚI
              </span>
            </button>

            <button
              onClick={() => setActiveTab("studio")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "studio"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Studio Chung</span>
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
              {(isLoading || isShortsLoading) && (
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
        {/* TAB MỚI: SHORTS & TIKTOK VIRAL (Tin tức, Kể chuyện, Phụ đề) */}
        {/* ======================================================== */}
        {activeTab === "shorts" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Cột trái: Cấu hình kịch bản & phụ đề */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-xl space-y-5">
                {/* Mode Switch: Tin tức vs Kể chuyện */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Chọn thể loại nội dung
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShortsMode("story");
                        setShortsTopic(STORY_PRESETS[0].prompt);
                      }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
                        shortsMode === "story"
                          ? "bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-pink-500 text-pink-200"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-pink-400" />
                      <div className="text-left">
                        <div>Kể Chuyện Viral</div>
                        <div className="text-[11px] font-normal text-slate-400">Kỳ bí, lịch sử, triết lý</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShortsMode("news");
                        setShortsTopic(NEWS_PRESETS[0].prompt);
                      }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
                        shortsMode === "news"
                          ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500 text-blue-200"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Newspaper className="w-4 h-4 text-blue-400" />
                      <div className="text-left">
                        <div>Tin Tức Nhanh</div>
                        <div className="text-[11px] font-normal text-slate-400">Breaking news, công nghệ</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Preset Suggestions */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Mẫu kịch bản triệu view</span>
                    <span className="text-[11px] text-pink-400 font-normal">Công thức Hook 3 giây</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {(shortsMode === "story" ? STORY_PRESETS : NEWS_PRESETS).map((p, idx) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setShortsCategory(p.category);
                            setShortsTopic(p.prompt);
                          }}
                          className="flex items-center gap-3 p-2.5 bg-slate-950/60 hover:bg-slate-800/50 border border-slate-800 hover:border-pink-500/40 rounded-xl text-left transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-200 group-hover:text-pink-300">
                              {p.title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {p.prompt}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Input Topic / Text */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                    <span>{shortsMode === "story" ? "Cốt truyện của bạn" : "Nội dung bản tin"}</span>
                    <span className="text-xs text-slate-500 font-mono">10s (~25 từ)</span>
                  </label>
                  <textarea
                    value={shortsTopic}
                    onChange={(e) => setShortsTopic(e.target.value)}
                    placeholder={
                      shortsMode === "story"
                        ? "Ví dụ: Năm 1872, tàu Mary Celeste trôi dạt giữa biển khơi..."
                        : "Ví dụ: Trí tuệ nhân tạo vừa giải mã được ngôn ngữ của cá voi..."
                    }
                    rows={4}
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Subtitle Style Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Subtitles className="w-3.5 h-3.5 text-yellow-400" /> Kiểu phụ đề tự động (Burn-in Captions)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setShortsSubtitleStyle("tiktok_yellow")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        shortsSubtitleStyle === "tiktok_yellow"
                          ? "bg-yellow-500/15 border-yellow-500 text-yellow-300"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-sm font-black text-yellow-400">TIKTOK</div>
                      <div className="text-[10px] text-slate-400">Vàng viền đen</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShortsSubtitleStyle("classic_white")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        shortsSubtitleStyle === "classic_white"
                          ? "bg-white/10 border-white text-white"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-sm font-black text-white">CLASSIC</div>
                      <div className="text-[10px] text-slate-400">Trắng thanh lịch</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShortsSubtitleStyle("neon_green")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        shortsSubtitleStyle === "neon_green"
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-sm font-black text-emerald-400">NEON</div>
                      <div className="text-[10px] text-slate-400">Xanh dạ quang</div>
                    </button>
                  </div>
                </div>

                {/* Voice Selection */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-purple-400" /> Giọng đọc thuyết minh
                    </label>
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShortsVoiceProvider("openai")}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                          shortsVoiceProvider === "openai"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        OpenAI (Nova / Onyx)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShortsVoiceProvider("elevenlabs")}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                          shortsVoiceProvider === "elevenlabs"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        ElevenLabs
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error Notice */}
                {shortsError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{shortsError}</span>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateShorts}
                  disabled={isShortsLoading}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-900/30 transition-all flex items-center justify-center gap-2 group"
                >
                  {isShortsLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang sản xuất video kèm phụ đề...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-5 h-5 text-yellow-300 group-hover:scale-125 transition-transform" />
                      <span>Sản Xuất Video Shorts Kèm Phụ Đề</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Cột phải: Xem trước Video Shorts & Chi tiết kịch bản */}
            <div className="lg:col-span-7 space-y-6">
              {/* Loading Indicator */}
              {isShortsLoading && (
                <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100">Đang sản xuất Shorts triệu view...</h3>
                        <p className="text-xs text-slate-400">
                          Tự động căn chỉnh phụ đề khớp chính xác với giọng đọc (~25 giây).
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("terminal")}
                      className="text-xs text-pink-400 hover:underline flex items-center gap-1"
                    >
                      <Terminal className="w-3.5 h-3.5" /> Xem CMD Log
                    </button>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center gap-3 text-xs">
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          shortsLoadingStep >= 1 ? "text-emerald-400" : "text-slate-600"
                        }`}
                      />
                      <span className={shortsLoadingStep >= 1 ? "text-slate-200 font-medium" : "text-slate-500"}>
                        1. Lên kịch bản Hook 3s & phân chia phụ đề từng đoạn
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          shortsLoadingStep >= 2 ? "text-emerald-400" : "text-slate-600"
                        }`}
                      />
                      <span className={shortsLoadingStep >= 2 ? "text-slate-200 font-medium" : "text-slate-500"}>
                        2. Thu âm lồng tiếng biểu cảm cao (Voiceover)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          shortsLoadingStep >= 3 ? "text-emerald-400" : "text-slate-600"
                        }`}
                      />
                      <span className={shortsLoadingStep >= 3 ? "text-slate-200 font-medium" : "text-slate-500"}>
                        3. Vẽ hình ảnh khung dọc 9:16 sắc nét (OpenAI Image)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          shortsLoadingStep >= 4 ? "text-emerald-400" : "text-slate-600"
                        }`}
                      />
                      <span className={shortsLoadingStep >= 4 ? "text-slate-200 font-medium" : "text-slate-500"}>
                        4. Dựng chuyển động Ken Burns & Burn-in phụ đề chữ to (FFmpeg)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Result */}
              {shortsResult ? (
                <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[11px] font-semibold mb-1">
                        <Flame className="w-3 h-3" /> TikTok & Shorts Ready
                      </div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {shortsResult.title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {shortsResult.duration}s
                        </span>
                        <span>•</span>
                        <span>Khung dọc 9:16</span>
                        {shortsResult.tokenUsage && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-mono">
                              {shortsResult.tokenUsage.total_tokens} tokens (~${shortsResult.tokenUsage.total_estimated_usd})
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <a
                      href={shortsResult.videoUrl}
                      download="viral_shorts_video.mp4"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white text-xs font-semibold shadow-md transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Tải Video MP4
                    </a>
                  </div>

                  {/* Vertical Video Container */}
                  <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[520px]">
                    <video
                      src={shortsResult.videoUrl}
                      controls
                      autoPlay
                      loop
                      className="max-h-[520px] w-auto mx-auto rounded-lg shadow-2xl"
                    />
                  </div>

                  {/* Viral Hook Highlight */}
                  {shortsResult.hook && (
                    <div className="p-3.5 bg-gradient-to-r from-pink-950/40 to-purple-950/40 border border-pink-500/30 rounded-xl space-y-1">
                      <div className="text-[11px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-yellow-400" /> Hook gây tò mò 3 giây đầu:
                      </div>
                      <div className="text-sm font-semibold text-white">
                        &quot;{shortsResult.hook}&quot;
                      </div>
                    </div>
                  )}

                  {/* Script & Subtitles Breakdown */}
                  <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Subtitles className="w-3.5 h-3.5 text-yellow-400" /> Các phân đoạn phụ đề đã gắn vào video
                      </span>
                      <audio src={shortsResult.audioUrl} controls className="h-6 w-36 scale-90" />
                    </div>

                    <div className="space-y-1.5">
                      {shortsResult.subtitles.map((sub, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2 bg-slate-900/60 rounded-lg text-xs border border-slate-800/80"
                        >
                          <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-mono text-[10px] font-bold shrink-0">
                            Đoạn {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-200 tracking-wide">
                            {sub.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                !isShortsLoading && (
                  <div className="bg-slate-900/40 rounded-2xl p-12 border border-slate-800/60 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-600/20 to-purple-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                      <Flame className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-200">Sẵn sàng sản xuất Shorts & TikTok</h3>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Chọn một tin tức hoặc câu chuyện ở bên trái, chọn kiểu phụ đề và bấm &quot;Sản Xuất Video Shorts Kèm Phụ Đề&quot;.
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STUDIO CHUNG (TỰ DO) */}
        {activeTab === "studio" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800/80 shadow-xl space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                    <span>Ý tưởng video của bạn</span>
                    <span className="text-xs text-slate-500 font-normal">Kịch bản chuẩn ~10 giây</span>
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: Giới thiệu một hòn đảo bay kỳ bí lơ lửng giữa những đám mây ngũ sắc..."
                    rows={4}
                    className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" /> Gợi ý nhanh:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SAMPLE_PROMPTS.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPrompt(sample)}
                          className="text-[11px] bg-slate-800/60 hover:bg-purple-900/30 hover:border-purple-500/40 border border-slate-700/50 rounded-lg px-2.5 py-1 text-slate-300 transition-all text-left"
                        >
                          {sample.length > 35 ? sample.substring(0, 35) + "..." : sample}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Định dạng hiển thị
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormat("9:16")}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                        format === "9:16"
                          ? "bg-purple-600/15 border-purple-500 text-purple-200"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-purple-400" />
                      <div className="text-left">
                        <div className="font-semibold text-slate-200">Dọc (9:16)</div>
                        <div className="text-[11px] text-slate-400">TikTok, Shorts, Reels</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat("16:9")}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                        format === "16:9"
                          ? "bg-purple-600/15 border-purple-500 text-purple-200"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Tv className="w-5 h-5 text-purple-400" />
                      <div className="text-left">
                        <div className="font-semibold text-slate-200">Ngang (16:9)</div>
                        <div className="text-[11px] text-slate-400">YouTube, Web Video</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Phong cách hình ảnh
                    </label>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="cinematic">Cinematic (Điện ảnh)</option>
                      <option value="cyberpunk">Cyberpunk (Viễn tưởng)</option>
                      <option value="anime">Anime (Hoạt hình)</option>
                      <option value="digital-art">Digital Art (Kỳ ảo)</option>
                      <option value="photorealistic">Photorealistic (Chân thực)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Số lượng cảnh (10s)
                    </label>
                    <select
                      value={scenesCount}
                      onChange={(e) => setScenesCount(Number(e.target.value) as 1 | 2)}
                      className="w-full bg-slate-950/80 border border-slate-700/60 rounded-xl p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={1}>1 cảnh (Zoom 10s - Tiết kiệm)</option>
                      <option value={2}>2 cảnh (Đổi cảnh sau 5s)</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 transition-all flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Đang sản xuất video...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span>Tạo Video 10 Giây Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              {currentResult ? (
                <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Video className="w-5 h-5 text-purple-400" />
                        {currentResult.title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {currentResult.duration} giây
                        </span>
                        <span>•</span>
                        <span>{currentResult.images.length} phân cảnh</span>
                      </div>
                    </div>
                    <a
                      href={currentResult.videoUrl}
                      download="creative_ai_video.mp4"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all"
                    >
                      <Download className="w-4 h-4" /> Tải Video MP4
                    </a>
                  </div>

                  <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[500px]">
                    <video
                      src={currentResult.videoUrl}
                      controls
                      autoPlay
                      loop
                      className="max-h-[500px] w-auto mx-auto rounded-lg shadow-2xl"
                    />
                  </div>

                  <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-purple-400" /> Lời thoại lồng tiếng
                      </span>
                      <audio src={currentResult.audioUrl} controls className="h-6 w-36 scale-90" />
                    </div>
                    <p className="text-sm text-slate-200 italic leading-relaxed">
                      &quot;{currentResult.script}&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/40 rounded-2xl p-12 border border-slate-800/60 flex flex-col items-center justify-center text-center space-y-4">
                  <Video className="w-8 h-8 text-purple-400" />
                  <h3 className="text-lg font-semibold text-slate-200">Sẵn sàng sản xuất video</h3>
                  <p className="text-xs text-slate-400 max-w-sm">Nhập ý tưởng bên trái để bắt đầu tạo video.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TERMINAL / CMD LOGS */}
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

        {/* TAB 4: PRICING & TOKEN BREAKDOWN */}
        {activeTab === "pricing" && (
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-800 shadow-xl space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                Bảng Chi Phí & Token Cho 1 Video 10 Giây
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Phân tích chi tiết lượng token và số tiền tiêu hao cho mỗi video sản xuất.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                    Kịch Bản (OpenAI)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                    GPT-4o-mini
                  </span>
                </div>
                <div className="text-2xl font-black text-white">~350 - 500 <span className="text-sm font-normal text-slate-400">tokens</span></div>
                <div className="pt-2 border-t border-slate-800 text-xs flex justify-between text-slate-300">
                  <span>Chi phí ước tính:</span>
                  <span className="font-mono text-emerald-400 font-semibold">~$0.0002 USD (~5 VNĐ)</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-purple-400 tracking-wider">
                    Hình Ảnh (OpenAI)
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
                  <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
                    Phụ Đề & Render
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                    FFmpeg Local
                  </span>
                </div>
                <div className="text-2xl font-black text-white">Burn-in <span className="text-sm font-normal text-slate-400">phụ đề vàng</span></div>
                <div className="pt-2 border-t border-slate-800 text-xs flex justify-between text-slate-300">
                  <span>Chi phí ước tính:</span>
                  <span className="font-mono text-amber-400 font-semibold">$0.00 USD (Miễn phí)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
