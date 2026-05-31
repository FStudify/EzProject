# EZProject — Design System Specification

## 1. Concept & Vision

**EZProject** là một nền tảng quản lý dự án nhóm dành cho sinh viên FPT University. Phong cách thiết kế có thể gọi là **"Warm Academic Professional"** — kết hợp giữa sự ấm áp, thân thiện của giao diện warm-tone (cam socola) với sự chuyên nghiệp rõ ràng của một công cụ học thuật. Trải nghiệm mang lại cảm giác như một "notebook kỹ thuật số cao cấp": có tổ chức, trực quan, và dễ chịu khi sử dụng hàng ngày. Website tập trung vào khả năng cộng tác nhóm và quản lý công việc với AI assistant tích hợp.

---

## 2. Color Palette

### 2.1 Brand / Primary Colors

| Token | Hex | Sử dụng |
|---|---|---|
| `--color-primary` | `#0651A0` | Nút chính (primary button), avatar text, link active |
| `--color-primary-light` | `#008DDE` | Secondary accent |
| `--color-primary-dark` | `#053d7a` | Primary button hover state |
| `--color-primary-50` | `#e6f2fa` | Light tint cho badge/background |
| `--color-primary-100` | `#b3d9f2` | Lighter tint |

### 2.2 Warm Accent Colors (Đặc trưng chính của website)

| Token / Variable | Hex | Sử dụng |
|---|---|---|
| `--color-accent` | `#F37124` | Warning, accent actions |
| `--color-secondary` | `#008DDE` | Secondary blue |
| `#D97853` | — | Nút accent chính (primary CTA trên warm bg), form inputs |
| `#C96B48` | — | Accent button hover |
| `#8B4A2F` | — | Active nav text color (sidebar) |
| `#B6653F` | — | Logo icon color (sidebar) |
| `#E8B185` | — | Icon accent trên dark overlay (login page) |

### 2.3 Semantic Colors

| Token | Hex | Sử dụng |
|---|---|---|
| `--color-success` | `#53B848` | Success states, hoàn thành, online indicator |
| `--color-warning` | `#F37124` | Warning, overdue, deadline |
| `--color-danger` | `#ef4444` | Danger actions, HIGH priority |
| `#89D364` | — | Green pulse accent (floating badges) |

### 2.4 Surface & Background

| Token / Variable | Hex | Sử dụng |
|---|---|---|
| `--color-surface` | `#ffffff` | Card backgrounds |
| `--color-surface-alt` | `#F4F8FC` | Body background (mặc định) |
| `#FFF8F3` | — | Warm cream (login shell, task cards) |
| `#FFFDFB` | — | Near-white warm (topbar, task cards) |
| `#FFF5EC` | — | Active nav highlight background (sidebar) |
| `#FFF7F0` | — | Sub-nav active background |
| `#FFF7F1` | — | Status pill background (project card) |
| `#F8F3EE` | — | Search input background (topbar) |
| `#FCF5EF` | — | View mode toggle background |
| `#F5E7DD` / `#F0E1D8` | — | Border dividers warm |
| `#E8D8CF` | — | Card border warm |
| `#E6C8B5` | — | Sidebar toggle border |

### 2.5 Sidebar Colors

| Variable | Hex | Sử dụng |
|---|---|---|
| `--color-sidebar` | `#042E5C` | Sidebar base (dark blue) |
| `--color-sidebar-hover` | `#053d7a` | Sidebar hover |
| Gradient | `#C8774D` → `#B86843` → `#A75C3A` | Sidebar background gradient |
| `#BA724B` | — | Sidebar right border |
| `#FFF8F2` / `#FFFDF9` / `#FFFDFB` | — | Sidebar text colors |

### 2.6 Text Colors

| Token / Variable | Hex | Sử dụng |
|---|---|---|
| `--color-text-primary` | `#0f172a` | Body text |
| `--color-text-secondary` | `#64748b` | Muted text |
| `#1F1F1F` | — | Headings (primary dark) |
| `#2C2825` / `#2A2725` | — | Input text, form labels |
| `#6B7280` / `#635648` | — | Secondary body text |
| `#8E857D` | — | Placeholder text (search) |
| `#A0816E` | — | Label uppercase |
| `#7E7A76` | — | Search icon |
| `#4F637F` | — | Notification bell |
| `#163B72` / `#274C7D` | — | Deep blue (AI chat button) |

### 2.7 Border Colors

| Variable | Hex | Sử dụng |
|---|---|---|
| `--color-border` | `#e2e8f0` | Default borders |
| `#E8D8CF` | — | Card borders (warm) |
| `#E8C7AE` | — | Form input borders |
| `#E6D6CC` | — | Icon button border |
| `#E6D7CC` | — | Select/dropdown border |
| `#E5D6CB` | — | View toggle border |
| `#D5E1F0` | — | AI chat window border |
| `#D97853` | — | Focus ring (form inputs, search) |

### 2.8 Progress Theme Colors (Project Card)

| Progress | Accent / Bar | Track | Percent Text | Status Pill |
|---|---|---|---|---|
| **>= 70%** (Tốt) | `#8BD66A` → `#6DBE45` | `#EAF7E2` | `#4E9D33` | `#EFF9E8` border `#CDE8BF` text `#4B9331` |
| **40-69%** (Đang thực hiện) | `#E89B78` → `#D97853` | `#F5E7DD` | `#B76442` | `#FDF0E8` border `#EFC8B4` text `#B76442` |
| **< 40%** (Cần tập trung) | `#4D668D` → `#274C7D` | `#E8EEF6` | `#31527F` | `#EDF3FB` border `#C9D6E8` text `#31527F` |

---

## 3. Typography

### 3.1 Font Families

| Font | Usage | Import |
|---|---|---|
| **Inter** | Default body font | `font-family: 'Inter', system-ui, -apple-system, sans-serif` |
| **Be Vietnam Pro** | Login page only | `font-family: 'Be Vietnam Pro', 'Inter', system-ui, -apple-system, sans-serif` |

### 3.2 Font Sizes

| Element | Size | Weight | Tracking |
|---|---|---|---|
| Sidebar logo "EZProject" | 28px / 48px | `font-extrabold` | `tracking-[-0.02em]` |
| Page title (Topbar) | 30px / 32px | `font-extrabold` | `tracking-[-0.02em]` |
| Section heading (h2) | 26px | `font-extrabold` | `tracking-[-0.01em]` |
| Card title (ProjectCard) | 22px | `font-extrabold` | `tracking-[-0.018em]` |
| Form heading (Login) | 34px | `font-extrabold` | `tracking-tight` |
| Login slogan (branding) | 26-31px | `font-extrabold` | `tracking-[-0.012em]` |
| Modal title | 18px | `font-semibold` | — |
| AI Chat header | 18px | `font-semibold` | — |
| Card title (TaskCard) | 15px | `font-semibold` | — |
| Nav item | 14px | `font-semibold` | — |
| Body text | 15px / 14px | `font-medium` / `font-normal` | — |
| Sub-nav label | 13px | `font-medium` | — |
| Badge text | 11px / 12px | `font-semibold` / `font-medium` | `tracking-[0.03em]` |
| Label uppercase | 11px | `font-semibold` | `tracking-[0.12em]` |

### 3.3 Text Colors Hierarchy

- **Primary headings:** `#1F1F1F` (near-black)
- **Secondary headings:** `#2B2826` / `#2A2725`
- **Body text:** `#635648` / `#6B7280` (warm gray)
- **Muted text:** `#64748b` / `#7D6F66`
- **Placeholder:** `#A38A77` / `#A98F80` / `#B7A79C`

---

## 4. Spacing System

Website sử dụng Tailwind CSS spacing scale, kết hợp với một số giá trị tùy chỉnh:

| Token | Value | Usage |
|---|---|---|
| Sidebar width (expanded) | `w-64` (256px) | Sidebar navigation |
| Sidebar width (collapsed) | `w-[72px]` | Collapsed sidebar |
| Topbar height | `h-[72px]` | Fixed header |
| Card padding | `p-5` / `p-6` | ProjectCard, stats, overview |
| Button padding | `px-3-6` / `py-1.5-3` | Tùy size |
| Card gap | `gap-4` / `gap-6` | Grid layouts |
| Section gap | `space-y-4` / `space-y-6` | Stacked sections |

---

## 5. Border Radius

| Element | Radius | Class |
|---|---|---|
| Cards | 16px (xl) | `rounded-2xl` |
| Buttons (primary/secondary) | 12px | `rounded-xl` / `rounded-lg` |
| Form inputs | 12px | `rounded-2xl` |
| Modal panel | 12px | `rounded-xl` |
| AI Chat window | 16px | `rounded-2xl` |
| AI floating button | 16px | `rounded-2xl` |
| Badges | Full circle | `rounded-full` |
| Avatars | Full circle | `rounded-full` |
| Status pills | Full circle | `rounded-full` |
| Chat message bubbles | 12px | `rounded-2xl` |
| Search input | 12px | `rounded-xl` |

---

## 6. Shadows

### 6.1 Card Shadows

| State | Shadow |
|---|---|
| Default card | `shadow-[0_18px_30px_-24px_rgba(38,24,16,0.6)]` |
| Card hover | `shadow-[0_22px_36px_-24px_rgba(38,24,16,0.55)]` |
| Stats card | `shadow-sm` → hover `shadow-md` |
| Modal | `shadow-xl` |
| AI Chat window | `shadow-[0_30px_48px_-24px_rgba(22,59,114,0.45)]` |
| AI floating button | `shadow-[0_18px_34px_-14px_rgba(22,59,114,0.8)]` |

### 6.2 Sidebar Shadows

| Element | Shadow |
|---|---|
| Sidebar container | `shadow-[0_16px_34px_-20px_rgba(59,27,13,0.68)]` |
| Active nav item | `shadow-[0_16px_24px_-18px_rgba(45,18,4,0.55)]` |
| Sidebar toggle button | `shadow-[0_10px_18px_-14px_rgba(68,34,18,0.56)]` |
| Logo icon | `shadow-[0_14px_24px_-18px_rgba(31,12,3,0.7)]` |

### 6.3 Form Shadows

| Element | Shadow |
|---|---|
| Input default | `shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]` (inner light) |
| Input focus | `focus:ring-4 focus:ring-[#D97853]/16` (warm ring) |

### 6.4 Floating Badges (Login)

| Element | Shadow |
|---|---|
| Container | `shadow-[0_22px_36px_-24px_rgba(10,5,4,0.95)]` + `backdrop-blur-lg` |

---

## 7. Component Specifications

### 7.1 Sidebar Navigation

- **Background:** Linear gradient `#C8774D` (0%) → `#B86843` (34%) → `#A75C3A` (100%)
- **Active nav item:** `bg-[#FFF5EC]`, text `#8B4A2F`, shadow `rgba(45,18,4,0.55)`
- **Hover nav item:** `bg-white/18`, text white
- **Collapsed state:** Icon-only, centered, same active/hover colors
- **Sub-nav (project pages):** Left border `white/16`, indented `ml-4`

### 7.2 Topbar

- **Background:** `bg-[#FFFDFB]/95` + `backdrop-blur-sm`
- **Border:** `border-b border-[#E8D8CF]`
- **Search input:** Warm `bg-[#F8F3EE]`, focus `ring-4 ring-[#D97853]/16`
- **Notification bell:** Border `border-[#E6D6CC]`, hover border `border-[#D8C8BE]`
- **User menu:** Ring `ring-[#DDE7F4]`, hover `ring-[#C8DAEE]`

### 7.3 Button Variants

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| `primary` | `bg-primary` → hover `bg-primary-dark` | white | `shadow-sm` | ring `focus:ring-primary` |
| `accent` | `bg-[#D97853]` → hover `bg-[#C96B48]` | white | `shadow-sm` | ring `focus:ring-[#D97853]` |
| `secondary` | transparent | slate-700 | `border-2 border-slate-300` | `bg-slate-50 border-slate-400` |
| `ghost` | transparent | slate-700 | none | `bg-slate-100` |
| `danger` | `bg-red-600` → hover `bg-red-700` | white | `shadow-sm` | ring `focus:ring-red-500` |

Button sizes: `sm` (`px-3 py-1.5`), `md` (`px-4 py-2`), `lg` (`px-6 py-3`)

### 7.4 Badge Variants

| Variant | Background | Text |
|---|---|---|
| `default` | `bg-slate-200` | `text-slate-800` |
| `primary` | `bg-primary-50` | `text-primary` |
| `success` | `bg-emerald-100` | `text-emerald-800` |
| `warning` | `bg-amber-100` | `text-amber-800` |
| `danger` | `bg-red-100` | `text-red-800` |
| `info` | `bg-blue-100` | `text-blue-800` |

Badge style: `rounded-full`, `text-xs font-medium`, padding `px-2.5 py-0.5`

### 7.5 Avatar

| Size | Dimension | Text Size | Usage |
|---|---|---|---|
| `sm` | `w-8 h-8` | 12px | Navbar user, member lists |
| `md` | `w-10 h-10` | 14px | Default |
| `lg` | `w-12 h-12` | 16px | Profile, large contexts |

- Initials fallback: `bg-primary-50 text-primary`
- Online ring: `ring-2 ring-emerald-500`
- Offline ring: `ring-2 ring-slate-300`
- Crown icon (owner): `bg-amber-400 text-amber-900`

### 7.6 Project Card

- Border: `border-[#E8D8CF]`
- Background: gradient `rgba(255,255,255,0.98)` → `rgba(255,249,244,0.72)` (top white, bottom warm)
- Top accent bar: 1px, gradient theo progress theme
- Hover: `-translate-y-1`, deeper shadow, lighter border
- Status pill: rounded-full, border, colored theo progress

### 7.7 Task Card (Kanban)

- Border: `border-[#E8D8CC]`
- Background: `bg-[#FFFDFB]`
- Padding: `p-3`
- Hover: `border-[#DDC9B9]`, `shadow-md`
- Dragging: `opacity-50 scale-95`

### 7.8 Chat Message Bubbles

| Type | Background | Text |
|---|---|---|
| Own message | `bg-primary` (`#0651A0`) | white |
| AI message | `bg-violet-100` | `text-violet-900` |
| Other user | `bg-slate-100` | `text-slate-900` |
| Avatar (AI) | `bg-violet-100` | `text-violet-600` |

### 7.9 AI Chat Dialog

- **Floating button:** Gradient `bg-[linear-gradient(145deg,#163B72,#274C7D)]`, shadow deep blue
- **Window:** `bg-white/95`, `backdrop-blur-xl`, border `border-[#D5E1F0]`
- **Header:** Gradient `bg-[linear-gradient(135deg,#163B72,#274C7D)]` (matches button)
- **Input:** Focus `border-[#274C7D]`, ring `ring-[#274C7D]/20`
- **Online indicator:** Green pulse animation

### 7.10 Login Page

- **Shell background:** `#FFF8F3` (warm cream)
- **Video overlay:** Gradient overlay từ dark brown → orange tint → dark
- **Radial gradient overlays:** Multiple subtle accent circles (green, orange)
- **Form container:** `bg-[rgba(255,249,244,0.94)]`, `backdrop-blur-xl`, border `border-[#E8C7AE]/80`
- **Input fields:** `bg-[#FFFDF9]`, `focus:ring-4 ring-[#D97853]/22`
- **Submit button:** `bg-[#D97853]`, gradient shadow, hover `bg-[#C96B48]`
- **Remember checkbox:** Color `text-[#6DBE45]` (green check)

### 7.11 Progress Bar

| Value Range | Color | Track Background |
|---|---|---|
| > 66% | `bg-success` (`#53B848`) | `bg-slate-200` |
| 33-66% | `bg-accent` (`#F37124`) | `bg-slate-200` |
| < 33% | `bg-danger` (`#ef4444`) | `bg-slate-200` |

---

## 8. Animations

### 8.1 Custom Keyframes

| Name | Effect |
|---|---|
| `ez-fade-up` | Fade in + translateY(20px→0) + scale(0.98→1), 0.55s, `cubic-bezier(0.22, 1, 0.36, 1)` |
| `ez-float` | translateY oscillation (±7px), 7.2s infinite |
| `ez-green-pulse` | opacity 0.72→1, box-shadow pulse, 1.9s infinite |
| `ez-green-shimmer` | Linear gradient slide from -125% to 165%, 2.6s infinite |

### 8.2 Animation Usage

| Element | Animation | Duration | Timing |
|---|---|---|---|
| Login form container | `animate-ez-fade-up` | 0.55s | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Floating badges (login) | `animate-ez-float` | 7.2s | `ease-in-out infinite` |
| Green dot (AI online) | `animate-ez-pulse` | 1.9s | `ease-in-out infinite` |
| Shimmer bar (badge) | `animate-ez-green-shimmer` | 2.6s | `ease-in-out infinite` |
| Card hover | `-translate-y-1` | 200ms | `transition-all duration-200` |
| Button hover | `-translate-y-[1px]` | 200ms | `transition-all duration-200` |
| Modal open | `opacity-0 scale-95` → `opacity-100 scale-100` | 200ms | `ease-out` |
| Kanban scrollbar thumb | — | — | Custom gradient warm scrollbar |

### 8.3 Motion Safety

Tất cả animations có `@media (prefers-reduced-motion: reduce)` fallback set `animation: none`.

---

## 9. Scrollbars

### 9.1 Kanban Horizontal Scroll

```css
/* Warm terracotta scrollbar for kanban board */
.kanban-scroll::-webkit-scrollbar { height: 12px; }
.kanban-scroll::-webkit-scrollbar-track { background: #f0e2d6; border-radius: 6px; }
.kanban-scroll::-webkit-scrollbar-thumb { background: #c99d81; border-radius: 6px; }
.kanban-scroll::-webkit-scrollbar-thumb:hover { background: #b68566; }
```

### 9.2 Task Scrollbar (Vertical)

```css
/* Gradient warm scrollbar for task lists */
.ez-task-scrollbar::-webkit-scrollbar { width/height: 10px; }
.ez-task-scrollbar::-webkit-scrollbar-track { background: #f5e9df; border-radius: 999px; }
.ez-task-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #d7a788 0%, #c98f6b 100%);
  border-radius: 999px; border: 2px solid #f5e9df;
}
```

---

## 10. Layout & Structure

### 10.1 Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR (fixed, left) │ TOPBAR (sticky, top)                │
│  w-64 / w-[72px]      │  h-[72px], full width              │
│  Gradient warm        │  bg-[#FFFDFB]/95 backdrop-blur      │
│                        ├─────────────────────────────────────┤
│                        │ CONTENT AREA                        │
│  [Logo]                │  bg-[#F4F8FC] (body)               │
│  [Nav items]           │  Padding: px-5 lg:px-7               │
│  [Tools section]       │  Max content: Dashboard, Project,  │
│  [User info]           │  Tasks, Chat, Documents, Members,   │
│                        │  Performance pages                 │
│                        │                                      │
│                        │  Chat panel (right side, task board)│
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Dashboard Layout

```
┌──────────────────────────────────────────────────────────┐
│ Stats Row (3 columns)                                     │
│  [Projects] [Tasks] [Completed]                           │
├─────────────────────────────────┬────────────────────────┤
│ Recent Projects (2/3 width)     │ Notifications (1/3)    │
│  [ProjectCard] × N               │  [Overdue table]         │
│                                 │  [Due soon table]        │
└─────────────────────────────────┴────────────────────────┘
```

### 10.3 Responsive Strategy

| Breakpoint | Behavior |
|---|---|
| Mobile | Sidebar hidden/overlay, single column, stacked layouts |
| Tablet (`sm`) | Grid adjusts, sidebar overlay |
| Desktop (`lg`) | Full sidebar, multi-column grids, side panels |
| Wide (`xl`) | BrandingPanel visible, larger fonts |

---

## 11. Icons

Website sử dụng **Lucide React** icon library với các quy tắc:

- Icon size thường: `h-4 w-4` (16px) — sub-nav, labels
- Icon size trung bình: `h-5 w-5` (20px) — nav items, buttons
- Icon size lớn: `h-6 w-6` (24px) — stats, feature icons
- Icon size hero: `h-7 w-7` (28px) — AI chatbot button
- Stroke width: thường `2` (default), một số `2.5` (crown icon)

---

## 12. AI Assistant Chatbot

- **Floating button position:** `bottom: 24px; right: 24px`
- **Window size:** `h-[500px] w-96`
- **Window position:** `bottom: 88px; right: 24px`
- **Draggable:** Yes, via pointer events with 4px threshold
- **Header:** Gradient deep blue, draggable header zone
- **Input:** Focus ring deep blue `ring-[#274C7D]/20`
- **Send button:** Deep blue `bg-[#163B72]`
- **Online indicator:** Green pulse on floating button

---

## 13. Summary of Design Personality

> **Warm Academic Professional** — Đây là điểm cốt lõi của toàn bộ hệ thống design.

- **Màu sắc:** Palette trung tính ấm (cream, sand, terracotta) làm nền, kết hợp với accent cam-socola `#D97853` cho các hành động chính và màu xanh dương FPT `#0651A0` cho brand identity. Màu xanh lá `#53B848` dùng cho success states tạo điểm nhấn tươi sáng.
- **Typography:** Inter làm font chính, với Be Vietnam Pro cho trang login nhấn mạnh bản sắc Việt Nam. Font weights mạnh (extrabold, bold) cho headings tạo sự rõ ràng.
- **Hình thức:** Border-radius lớn (12-16px) cho cards và buttons tạo cảm giác soft, friendly. Shadows ấm (brown-based) không phải gray-based.
- **Cảm giác:** Như một cuốn sổ ghi chép kỹ thuật số cao cấp — có tổ chức, trực quan, ấm áp, chuyên nghiệp nhưng không lạnh lẽo.
- **Điểm nhấn độc đáo:** Sidebar gradient cam-socola nổi bật, floating AI chatbot với animation pulse, warm scrollbars, floating badges có shimmer effect trên login page.
