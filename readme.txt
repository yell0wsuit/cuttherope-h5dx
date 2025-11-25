HƯỚNG DẪN TRIỂN KHAI DỰ ÁN VITE/TYPESCRIPT

Tên Repository (Giả định): cuttherope
Vấn đề cốt lõi: Sửa Base Path trong vite.config.js để tránh lỗi màn hình trắng (404 Not Found).

==================================================
PHẦN CHUẨN BỊ: SỬA FILE VITE.CONFIG.JS
==================================================

Bạn PHẢI commit file vite.config.js tương ứng với mục tiêu deploy của mình trước khi thực hiện deploy.

A. NẾU TRIỂN KHAI LÊN CLOUDFLARE PAGES (HOẶC VERCEL/NETLIFY)

Mục tiêu: Base Path = "/" (Root directory)

Nội dung sửa trong vite.config.js:

    const isDev = mode === "development";
    // Cloudflare Pages luôn deploy ra thư mục gốc
    const base = process.env.VITE_BASE_NETLIFY || (isDev ? "/" : "/"); 

B. NẾU TRIỂN KHAI LÊN GITHUB PAGES

Mục tiêu: Base Path = "/tên-repo-của-bạn/"

Nội dung sửa trong vite.config.js (Giả định tên repo là cuttherope):

    const isDev = mode === "development";
    // GitHub Pages cần tên repo làm Base Path
    const base = process.env.VITE_BASE_NETLIFY || (isDev ? "/" : "/cuttherope/"); 

--------------------------------------------------
LƯU Ý: Sau khi sửa file, bạn cần: git add . -> git commit -> git push
--------------------------------------------------


==================================================
PHẦN 1: TRIỂN KHAI LÊN CLOUDFLARE PAGES
==================================================

Mục tiêu: Triển khai lên Cloudflare Pages (dùng Base Path là "/")

BƯỚC 1: Sửa vite.config.js (đặt Base Path là "/") và Push code lên GitHub.

BƯỚC 2: Thiết lập trên Cloudflare Dashboard

1. Truy cập Cloudflare Dashboard, chọn Workers & Pages -> Create application -> Pages -> Connect to Git.
2. Chọn repository của bạn (cuttherope).
3. Thiết lập Build Settings:
    * Framework preset: None hoặc Other
    * Build command: npm run build
    * Build output directory: dist
    * Root directory (advanced): (Để trống)
4. Nhấn Save and Deploy.
5. Kiểm tra kết quả tại URL .pages.dev của bạn.


==================================================
PHẦN 2: TRIỂN KHAI LÊN GITHUB PAGES (Dùng GitHub Actions)
==================================================

Mục tiêu: Triển khai lên GitHub Pages (dùng Base Path là "/cuttherope/")

BƯỚC 1: Sửa vite.config.js (đặt Base Path là "/cuttherope/") và Push code lên GitHub.

BƯỚC 2: Kích hoạt GitHub Pages (nếu chưa kích hoạt)

1. Truy cập Repository trên GitHub.
2. Vào Settings -> Pages.
3. Ở mục "Build and deployment", đảm bảo Source là "GitHub Actions".

BƯỚC 3: Theo dõi Actions

1. Vào tab Actions trong repo của bạn.
2. Action có tên "Deploy static content to Pages" sẽ tự động chạy (do bạn vừa Push code).
3. Chờ đợi Action hoàn thành (Success).
4. Truy cập URL dự án: https://<username>.github.io/cuttherope/