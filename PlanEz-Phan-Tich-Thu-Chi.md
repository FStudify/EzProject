# Kế hoạch Thu – Chi & Phân tích lợi nhuận (EzProject)

> Mục tiêu tài liệu: giải thích **vì sao** mức giá Pro `99.000đ/tháng` và Premium `219.000đ/tháng` là hợp lý, bằng cách bóc tách từng khoản chi phí (vận hành hạ tầng, AI, marketing, phát triển) và đối chiếu với doanh thu dự kiến theo từng giai đoạn.

> **Giả định tỷ giá dùng trong toàn bộ tài liệu:** 1 USD ≈ 26.000 đ (tỷ giá tham khảo giữa năm 2026).

---

## 1. Cơ cấu chi phí vận hành hàng tháng

### 1.1 Hạ tầng kỹ thuật (Infrastructure)

| Khoản mục | Mô tả | Chi phí ước tính / tháng |
|---|---|---|
| Server ứng dụng (Backend + Socket.io) | VPS/Cloud (2–4 vCPU, 4–8GB RAM) chạy API, real-time chat, cron job nhắc lịch | 800.000 – 1.500.000 đ |
| Cơ sở dữ liệu (Database) | PostgreSQL/MongoDB managed, backup tự động | 400.000 – 700.000 đ |
| Lưu trữ file & ảnh đại diện (Object Storage/CDN) | S3-compatible (Cloudflare R2, Wasabi...) + CDN phân phối | 200.000 – 400.000 đ |
| Dịch vụ gửi Email (xác thực, quên MK, mời thành viên) | SendGrid/Resend/Mailgun gói theo lượng gửi | 250.000 – 400.000 đ |
| Domain, SSL, DNS | Gia hạn tên miền + chứng chỉ bảo mật (phân bổ theo tháng) | 50.000 đ |
| Giám sát & log hệ thống (Monitoring) | Sentry/Better Stack gói cơ bản | 200.000 đ |
| **Tổng hạ tầng** | | **≈ 1.900.000 – 3.250.000 đ/tháng** |

> Chi phí hạ tầng gần như **cố định**, không tăng tuyến tính theo số user trả phí ở quy mô vài nghìn người dùng đầu tiên — đây là lợi thế biên lợi nhuận tăng dần khi user tăng.

### 1.2 Chi phí AI — Gemini API

**Cơ sở tính toán:** Gemini 2.5 Flash (mô hình dùng cho tạo dự án/task tự động) có giá **$0,30 / 1 triệu token đầu vào** và **$2,50 / 1 triệu token đầu ra**. Với một lượt "AI tạo dự án" điển hình (prompt + ngữ cảnh dự án ở đầu vào, danh sách task sinh ra ở đầu ra), giả định trung bình:

- Đầu vào: ~8.000 token/lượt → 8.000/1.000.000 × $0,30 = **$0,0024**
- Đầu ra: ~3.000 token/lượt → 3.000/1.000.000 × $2,50 = **$0,0075**
- **Tổng ≈ $0,0099/lượt ≈ 257 đ/lượt** (làm tròn 260 đ/lượt)

| Nhóm người dùng | Số lượt AI/tháng cấp phép | Tỷ lệ dùng thực tế | Chi phí AI ước tính |
|---|---|---|---|
| Free (dùng thử trọn đời) | 2 lượt/tài khoản mới | Giả định 200 tài khoản mới/tháng × 2 lượt | 200 × 2 × 260 đ ≈ **104.000 đ** |
| Pro | 20 lượt/tháng | Giả định dùng ~60% hạn mức = 12 lượt | (số user Pro) × 12 × 260 đ |
| Premium | 100 lượt/tháng | Giả định dùng ~50% hạn mức = 50 lượt | (số user Premium) × 50 × 260 đ |

> Ví dụ với **50 user Pro + 10 user Premium**: chi phí AI Pro = 50×12×260 = 156.000 đ; Premium = 10×50×260 = 130.000 đ → **tổng chi phí AI ≈ 390.000 đ/tháng** cho quy mô này. Đây là lý do gói Pro/Premium vẫn giữ biên lợi nhuận cao dù có cấp hạn mức AI hào phóng.

### 1.3 Phí cổng thanh toán

| Khoản mục | Tỷ lệ | Ghi chú |
|---|---|---|
| MoMo / VietQR | ~1,5% – 2% giá trị giao dịch | Thu qua từng lượt gia hạn tháng |

### 1.4 Chi phí Marketing

| Khoản mục | Mô tả | Chi phí / tháng |
|---|---|---|
| Quảng cáo Facebook/TikTok Ads nhắm sinh viên | Chạy quảng cáo tuyển sinh, nhóm học tập, fanpage trường | 3.000.000 – 6.000.000 đ |
| Nội dung & Affiliate với KOL sinh viên/giảng viên | Bài review, hợp tác giới thiệu trong CLB học thuật | 1.000.000 – 2.000.000 đ |
| Công cụ email marketing / automation | Gửi email chăm sóc, nhắc dùng thử hết hạn | 200.000 đ |
| **Tổng marketing** | | **≈ 4.200.000 – 8.200.000 đ/tháng** |

> Với ngân sách ~5.000.000 đ/tháng, mục tiêu **CAC (chi phí trên 1 user Free mới)** ở mức 15.000 – 25.000 đ/tài khoản → thu về khoảng 200–300 tài khoản Free mới/tháng ở giai đoạn đầu.

### 1.5 Chi phí phát triển & duy trì sản phẩm (Development)

| Giai đoạn | Nội dung | Chi phí |
|---|---|---|
| **Xây dựng ban đầu (one-time)** | 2–3 lập trình viên làm việc bán thời gian/full-time trong 3 tháng để hoàn thiện MVP (đã có sẵn theo Feature Audit) | 60.000.000 – 120.000.000 đ (một lần) |
| **Duy trì & phát triển tiếp (hàng tháng)** | 1 dev bán thời gian/retainer để sửa lỗi, tối ưu, phát triển tính năng mới (Burndown chart, tích hợp GitHub…) | 8.000.000 – 15.000.000 đ/tháng |
| **Thiết kế UI/UX bổ sung** | Freelance theo từng đợt cập nhật giao diện | 1.000.000 – 2.000.000 đ/tháng (phân bổ) |

> Chi phí xây dựng ban đầu là **chi phí chìm (sunk cost)**, không tính vào P&L vận hành hàng tháng nhưng cần đưa vào bài toán hoàn vốn (xem mục 4).

---

## 2. Tổng hợp chi phí vận hành hàng tháng (không gồm chi phí xây dựng ban đầu)

| Nhóm chi phí | Mức thấp | Mức cao |
|---|---|---|
| Hạ tầng kỹ thuật | 1.900.000 đ | 3.250.000 đ |
| AI (Gemini API, quy mô 50 Pro + 10 Premium) | 390.000 đ | 390.000 đ |
| Phí cổng thanh toán (~2% doanh thu, xem mục 3) | biến đổi | biến đổi |
| Marketing | 4.200.000 đ | 8.200.000 đ |
| Duy trì & phát triển (dev retainer + thiết kế) | 9.000.000 đ | 17.000.000 đ |
| **Tổng chi phí cố định + biến đổi ước tính** | **≈ 15.500.000 đ** | **≈ 28.840.000 đ** |

---

## 3. Doanh thu dự kiến theo từng giai đoạn

Giả định phễu chuyển đổi freemium điển hình của SaaS giáo dục: **3–6% Free → Pro**, **0,5–1% Free → Premium** (Premium nhắm giảng viên/nhóm lớn nên tỷ lệ thấp hơn nhiều).

### Giai đoạn 1 — Khởi động (Tháng 1–3)

| Chỉ số | Giá trị |
|---|---|
| Tổng tài khoản Free tích lũy | 500 |
| User Pro (4% chuyển đổi) | 20 người |
| User Premium (1% chuyển đổi) | 5 người |
| Doanh thu Pro | 20 × 99.000 đ = 1.980.000 đ |
| Doanh thu Premium | 5 × 219.000 đ = 1.095.000 đ |
| **Tổng doanh thu/tháng** | **≈ 3.075.000 đ** |
| Tổng chi phí vận hành (mức thấp) | ≈ 15.500.000 đ |
| **Lợi nhuận** | **Âm (~ -12.400.000 đ)** — giai đoạn đốt vốn để lấy dữ liệu & người dùng |

### Giai đoạn 2 — Tăng trưởng (Tháng 4–12)

| Chỉ số | Giá trị |
|---|---|
| Tổng tài khoản Free tích lũy | 3.000 |
| User Pro (5%) | 150 người |
| User Premium (1%) | 30 người |
| Doanh thu Pro | 150 × 99.000 đ = 14.850.000 đ |
| Doanh thu Premium | 30 × 219.000 đ = 6.570.000 đ |
| **Tổng doanh thu/tháng** | **≈ 21.420.000 đ** |
| Chi phí AI (quy mô lớn hơn ~3x) | ≈ 1.170.000 đ |
| Phí thanh toán (~2%) | ≈ 430.000 đ |
| Tổng chi phí vận hành (hạ tầng + AI + marketing + dev, mức trung bình) | ≈ 22.000.000 đ |
| **Lợi nhuận** | **Xấp xỉ hoà vốn, dao động ±2.000.000 đ/tháng** |

### Giai đoạn 3 — Ổn định (Năm 2, quy mô 10.000 Free)

| Chỉ số | Giá trị |
|---|---|
| User Pro (5%) | 500 người |
| User Premium (1,2%) | 120 người |
| Doanh thu Pro | 500 × 99.000 đ = 49.500.000 đ |
| Doanh thu Premium | 120 × 219.000 đ = 26.280.000 đ |
| **Tổng doanh thu/tháng** | **≈ 75.780.000 đ** |
| Chi phí hạ tầng (scale lên) | ≈ 6.000.000 đ |
| Chi phí AI | ≈ 3.900.000 đ |
| Phí thanh toán (~2%) | ≈ 1.500.000 đ |
| Marketing | ≈ 8.000.000 đ |
| Duy trì & phát triển (team lớn hơn) | ≈ 20.000.000 đ |
| **Tổng chi phí** | **≈ 39.400.000 đ** |
| **Lợi nhuận ròng** | **≈ 36.380.000 đ/tháng (biên lợi nhuận ~48%)** |

---

## 4. Bài toán hoàn vốn (Break-even trên chi phí xây dựng ban đầu)

- Giả định chi phí xây dựng ban đầu: **90.000.000 đ** (mức trung bình).
- Từ Giai đoạn 2, lợi nhuận dao động quanh mức hoà vốn; đến Giai đoạn 3, lợi nhuận ròng ổn định **~36.000.000 đ/tháng**.
- Với tốc độ tích lũy lợi nhuận tăng dần qua các quý, **thời gian hoàn vốn ước tính rơi vào khoảng tháng thứ 14–18** kể từ ngày ra mắt (tính cả giai đoạn lỗ ở Giai đoạn 1).

---

## 5. Vì sao con số 99.000đ (Pro) và 219.000đ (Premium) là hợp lý

1. **Biên lợi nhuận trên từng user rất cao:** chi phí biến đổi thực sự trên 1 user Pro chỉ khoảng **3.000–4.000 đ/tháng** (AI + phí thanh toán), trong khi giá bán 99.000 đ — biên đóng góp (contribution margin) trên 95%. Phần chênh lệch dùng để bù chi phí cố định (hạ tầng, dev, marketing).
2. **Giá vẫn thấp hơn đáng kể so với đối thủ quốc tế** (Trello, Notion, ClickUp ~125.000–200.000 đ/user/tháng) trong khi EzProject tính theo *workspace* chứ không theo *đầu người*, nên nhóm 5–10 người chia ra chỉ 10.000–20.000 đ/người/tháng.
3. **Premium cao gấp ~2,2 lần Pro** vì phục vụ đối tượng khác (giảng viên/nhóm lớn) với chi phí AI + hỗ trợ kỹ thuật ưu tiên cao hơn nhiều lần (hạn mức AI gấp 5 lần, hỗ trợ 24/7), nên chênh lệch giá phản ánh đúng chênh lệch chi phí phục vụ.
4. **Không có gói năm nghĩa là mất đi dòng tiền trả trước** — mức giá tháng hiện tại đã được giữ ở mức đủ để duy trì biên lợi nhuận dương ngay từ Giai đoạn 2, không cần phụ thuộc vào dòng tiền ứng trước theo năm để bù đắp.

---

## 6. Rủi ro tài chính cần theo dõi

- **Chi phí AI có thể vượt dự kiến** nếu người dùng Premium dùng hết 100%/tháng thay vì 50% giả định — cần theo dõi sát usage thực tế trong 3 tháng đầu để hiệu chỉnh lại hạn mức hoặc giá.
- **Tỷ lệ chuyển đổi Free → Pro thấp hơn giả định (dưới 3%)** sẽ kéo dài thời gian hoà vốn — cần chuẩn bị kịch bản marketing bổ sung hoặc điều chỉnh điểm chạm nâng cấp (xem phần *Chiến lược nâng cấp* trong `PlanEz.md` gốc).
- **Biến động tỷ giá USD/VND** ảnh hưởng trực tiếp đến chi phí AI (tính bằng USD) — nên có biên an toàn ±10% trong ngân sách AI hàng tháng.
