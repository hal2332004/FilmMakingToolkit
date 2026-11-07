# 🎬 CreativeAI - AI Video Studio & Shorts Generator

Ứng dụng web tự động tạo video ngắn AI (Shorts/TikTok/Reels) từ ý tưởng ban đầu với quy trình **Review Kịch Bản & Góp Ý Tương Tác** (Interactive Feedback Loop).

---

## 🌟 Tính năng nổi bật

### 1. 🎭 Quy trình 2 bước: Lên kịch bản ➔ Review & Feedback ➔ Duyệt sản xuất
* **Bước 1 - Lên kịch bản nháp**: Chi phí siêu rẻ (~$0.0001 USD qua GPT-4o-mini).
* **Tự tay sửa chữ**: Bấm thẳng vào ô kịch bản để chỉnh sửa từng từ ngữ theo ý thích.
* **Hộp Feedback cho AI**: Gõ góp ý (ví dụ: *"Hãy viết đoạn kết tăm tối hơn"*, *"Đổi lời thoại sang giọng điệu lạnh lùng hơn"*) và AI sẽ viết lại tức thì.
* **Bước 2 - Duyệt & Sản xuất**: Chỉ khi bạn ưng ý kịch bản và bấm duyệt, hệ thống mới tiến hành tạo audio, sinh ảnh và render video (tiết kiệm ngân sách tối đa).

### 2. 🧠 Các chủ đề chuyên sâu (Niche Topics)
* **Mặt tối Giàu & Nghèo**: Phơi bày sự phân hóa giai cấp, đồng tiền và số phận nhân sinh.
* **Tâm lý học thao túng & Bản chất con người (Dark Psychology)**: Góc tối tiềm thức, các hiệu ứng tâm lý và lòng người trước lợi ích.
* **Đạo lý & Triết học cuộc sống**: Chiêm nghiệm thâm thúy, thức tỉnh người xem.
* **Kinh dị tâm lý & Bí ẩn kỳ quái (Uncanny Horror)**: Cảm giác ngột ngạt, hiện tượng rùng rợn, giật gân.

### 3. 🔊 Hiệu ứng âm thanh kỳ dị TikTok (Eerie Audio Effects)
* **Dark Drone 50Hz + Eerie Hallway Echo**: Tạo dải âm trầm rền rĩ u ám, nghẹt thở phía sau giọng đọc kết hợp tiếng vang ma mị.
* **Tiếng vang ma mị (Creepy Reverb Echo)**: Tạo không gian bí ẩn, huyền hoặc.
* **Giọng đọc**: Tùy chọn giọng nam trầm tối (`onyx`) hoặc nữ bí ẩn (`nova`).

### 4. 🟡 Khắc phụ đề tự động (Burn-in Captions)
* **TikTok Gold**: Chữ vàng rực rỡ viền đen dày - chuẩn phong cách triệu view.
* **Classic White**: Chữ trắng viền đen dày - thanh lịch, tin tức.
* **Neon Cyber**: Xanh dạ quang - công nghệ, khoa học.

---

## 🚀 Khởi chạy ứng dụng

Ứng dụng được viết bằng **Next.js 14**, **Tailwind CSS**, và **FFmpeg** nội bộ trên máy:

```bash
# Chạy chế độ phát triển
npm run dev
```

Mở trình duyệt tại: [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Cấu hình API trong `.env`

File `.env` nằm tại thư mục gốc (không commit file này lên Git):

```env
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk_...
```

---

## 💰 Quản lý chi phí dùng thử (Trial Budget Optimization)

1. **Lên kịch bản & Sửa feedback**: Sử dụng GPT-4o-mini siêu rẻ (~$0.0001 mỗi lần). Bạn có thể sửa đổi và tạo lại kịch bản thoải mái mà không lo tốn tiền.
2. **Hình ảnh**: Sử dụng `gpt-image-1-mini` thế hệ mới nhanh và tối ưu chi phí. Khuyên dùng **1 cảnh** (ảnh zoom cinematic) để giữ chi phí mỗi video ở mức ~**$0.08**.
3. **Hiệu ứng âm thanh & Render**: Xử lý 100% bằng **FFmpeg trực tiếp trên máy tính của bạn** (hoàn toàn miễn phí, không tốn credit).
