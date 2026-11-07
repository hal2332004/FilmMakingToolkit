# 🎬 CreativeAI - AI Video Studio (10s Shorts/Reels Generator)

Ứng dụng web tự động tạo video ngắn AI (10 giây) từ ý tưởng ban đầu sử dụng:
* **OpenAI GPT-4o-mini**: Lên kịch bản cô đọng (~25-30 từ) và viết prompt phân cảnh hình ảnh chi tiết.
* **ElevenLabs API** (hoặc OpenAI TTS): Thu âm giọng đọc lồng tiếng sống động bằng AI.
* **OpenAI DALL-E 3**: Sinh hình ảnh chuẩn điện ảnh 8k chất lượng cao theo kịch bản.
* **FFmpeg**: Tự động ghép nối, tạo hiệu ứng chuyển động camera **Ken Burns** (zoom-in / zoom-out) mượt mà và xuất ra file MP4 chuẩn web.

---

## 🚀 Khởi chạy ứng dụng

Ứng dụng được viết bằng **Next.js 14**, **Tailwind CSS**, và **FFmpeg** nội bộ trên máy:

```bash
# Chạy chế độ phát triển
npm run dev
```

Sau đó mở trình duyệt tại: [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Cấu hình API trong `.env`

File `.env` nằm tại thư mục gốc:

```env
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk_...
```

---

## 💰 Quản lý chi phí dùng thử (Trial Budget Optimization)

Để tiết kiệm số dư vài đô dùng thử:
1. **GPT-4o-mini**: Sử dụng model mini siêu rẻ (~$0.0001 mỗi lần tạo kịch bản).
2. **Số lượng cảnh**: Chọn **1 cảnh** (ảnh zoom cinematic 10 giây). Chi phí tạo ảnh DALL-E 3 tiêu chuẩn chỉ khoảng **$0.04**.
3. **ElevenLabs**: Đã tích hợp sẵn chế độ fallback sang **OpenAI TTS** nếu tài khoản ElevenLabs hết quota hoặc muốn đổi giọng.
4. **Rendering**: Toàn bộ quá trình cắt ghép, zoompan và render MP4 được xử lý bởi **FFmpeg trực tiếp trên máy tính của bạn** (hoàn toàn miễn phí, không tốn credit bên thứ ba).

