import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export interface GalleryItem {
  id: string;
  filename: string;
  videoUrl: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  sizeMB: string;
  createdAt: string;
  duration?: number;
  type: "shorts" | "reviewed" | "studio";
}

export async function GET() {
  try {
    const outputsDir = path.join(process.cwd(), "public", "outputs");

    if (!fs.existsSync(outputsDir)) {
      return NextResponse.json({ videos: [] });
    }

    const files = fs.readdirSync(outputsDir);

    // Lọc ra các video thành phẩm kết thúc bằng _final.mp4
    const finalVideoFiles = files.filter(
      (file) => file.endsWith("_final.mp4") && !file.includes("clip")
    );

    const items: GalleryItem[] = [];

    for (const file of finalVideoFiles) {
      const filePath = path.join(outputsDir, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2) + " MB";
      const createdAt = new Date(stats.mtime).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Tách ID tiền tố (ví dụ 1794070964591)
      const prefix = file.split("_")[0];

      // Tìm ảnh đại diện thumbnail tương ứng
      const matchingImg = files.find(
        (f) =>
          f.startsWith(prefix) &&
          (f.endsWith(".png") || f.endsWith(".jpg")) &&
          !f.includes("clip")
      );

      // Tìm audio tương ứng
      const matchingAudio = files.find(
        (f) => f.startsWith(prefix) && f.endsWith(".mp3")
      );

      let type: GalleryItem["type"] = "studio";
      if (file.includes("shorts")) type = "shorts";
      if (file.includes("reviewed")) type = "reviewed";

      items.push({
        id: prefix,
        filename: file,
        videoUrl: `/outputs/${file}`,
        thumbnailUrl: matchingImg ? `/outputs/${matchingImg}` : undefined,
        audioUrl: matchingAudio ? `/outputs/${matchingAudio}` : undefined,
        sizeMB,
        createdAt,
        type,
      });
    }

    // Sắp xếp video mới nhất lên đầu
    items.sort((a, b) => parseInt(b.id) - parseInt(a.id));

    return NextResponse.json({ videos: items });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách gallery:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi đọc thư mục outputs" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { error: "Thiếu tên file cần xóa." },
        { status: 400 }
      );
    }

    const outputsDir = path.join(process.cwd(), "public", "outputs");
    const filePath = path.join(outputsDir, path.basename(filename));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Xóa kèm các file liên quan cùng ID
    const prefix = path.basename(filename).split("_")[0];
    if (prefix && prefix.length > 5) {
      const allFiles = fs.readdirSync(outputsDir);
      allFiles.forEach((f) => {
        if (f.startsWith(prefix)) {
          try {
            fs.unlinkSync(path.join(outputsDir, f));
          } catch (e) {
            // ignore
          }
        }
      });
    }

    return NextResponse.json({ success: true, message: "Đã xóa video." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Lỗi khi xóa file." },
      { status: 500 }
    );
  }
}

