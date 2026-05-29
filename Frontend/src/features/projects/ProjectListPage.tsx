import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { getProjects } from '@/api/project.api';
import type { ProjectStatus } from '@/api/types';
import type { Project } from '@/api/types';
import { Button, Modal } from '@/components/ui';
import ProjectCard from './ProjectCard';
import {
  BarChart3,
  Clock3,
  Plus,
  BookOpen,
  Code2,
  Lightbulb,
  TrendingUp,
  FileText,
  Presentation,
  FlaskConical,
  BarChart,
  Check,
} from 'lucide-react';

// ===== Template Library Data =====
interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: typeof BookOpen;
  color: string;
  stages: string[];
  tasks: string[];
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    category: 'Môn học',
    description: 'Quy trình hoàn chỉnh cho dự án marketing từ nghiên cứu đến triển khai chiến dịch.',
    icon: TrendingUp,
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    stages: ['Nghiên cứu', 'Brief', 'Chiến dịch', 'Đánh giá'],
    tasks: [
      'Phân tích thị trường mục tiêu',
      'Xây dựng customer persona',
      'Viết creative brief',
      'Thiết kế nội dung chiến dịch',
      'Lên lịch đăng bài',
      'Theo dõi và đo lường KPI',
    ],
  },
  {
    id: 'it',
    name: 'Dự án IT / Lập trình',
    category: 'Môn học',
    description: 'Quy trình phát triển phần mềm từ setup đến deploy, phù hợp đồ án lập trình.',
    icon: Code2,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    stages: ['Setup', 'Phát triển', 'Kiểm thử', 'Deploy'],
    tasks: [
      'Thiết kế kiến trúc hệ thống',
      'Cài đặt môi trường phát triển',
      'Xây dựng database schema',
      'Phát triển tính năng core',
      'Viết unit test',
      'Review code và merge',
      'Deploy lên server',
    ],
  },
  {
    id: 'philosophy',
    name: 'Tiểu luận / Nghiên cứu',
    category: 'Môn học',
    description: 'Quy trình viết tiểu luận nhóm cho các môn Triết học, Xã hội học, Văn học.',
    icon: BookOpen,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    stages: ['Đề cương', 'Nghiên cứu', 'Viết', 'Chỉnh sửa'],
    tasks: [
      'Xác định chủ đề và câu hỏi nghiên cứu',
      'Lập đề cương chi tiết',
      'Thu thập tài liệu tham khảo',
      'Phân công viết từng phần',
      'Tổng hợp và chỉnh sửa',
      'Kiểm tra trích dẫn và format',
    ],
  },
  {
    id: 'economics',
    name: 'Phân tích Kinh tế',
    category: 'Môn học',
    description: 'Quy trình phân tích kinh tế từ thu thập dữ liệu đến báo cáo kết quả.',
    icon: BarChart,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    stages: ['Phân tích', 'Mô hình', 'Báo cáo'],
    tasks: [
      'Xác định vấn đề kinh tế cần nghiên cứu',
      'Thu thập dữ liệu thống kê',
      'Xây dựng mô hình phân tích',
      'Chạy phân tích và diễn giải kết quả',
      'Viết báo cáo kết quả',
      'Chuẩn bị slide thuyết trình',
    ],
  },
  {
    id: 'thesis',
    name: 'Đồ án cuối kỳ',
    category: 'Loại bài',
    description: 'Mẫu tổng quát cho đồ án cuối kỳ với đầy đủ các giai đoạn từ đề xuất đến bảo vệ.',
    icon: FlaskConical,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    stages: ['Đề xuất', 'Thực hiện', 'Hoàn thiện', 'Bảo vệ'],
    tasks: [
      'Viết đề xuất đề tài',
      'Tổng quan tài liệu liên quan',
      'Xây dựng phương pháp nghiên cứu',
      'Thực hiện nghiên cứu / phát triển',
      'Phân tích kết quả',
      'Viết báo cáo đồ án',
      'Chuẩn bị bảo vệ',
    ],
  },
  {
    id: 'presentation',
    name: 'Bài thuyết trình nhóm',
    category: 'Loại bài',
    description: 'Quy trình chuẩn bị bài thuyết trình nhóm từ phân công đến luyện tập.',
    icon: Presentation,
    color: 'bg-sky-50 text-sky-600 border-sky-200',
    stages: ['Chuẩn bị', 'Thiết kế', 'Luyện tập'],
    tasks: [
      'Phân công nội dung từng người',
      'Nghiên cứu và thu thập thông tin',
      'Thiết kế slide',
      'Viết script thuyết trình',
      'Luyện tập cá nhân',
      'Luyện tập nhóm và góp ý',
    ],
  },
  {
    id: 'essay',
    name: 'Tiểu luận nhóm',
    category: 'Loại bài',
    description: 'Mẫu đơn giản cho bài tiểu luận nhóm với phân công rõ ràng.',
    icon: FileText,
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    stages: ['Lên kế hoạch', 'Viết', 'Hoàn thiện'],
    tasks: [
      'Chọn đề tài và phân công',
      'Lập outline bài viết',
      'Viết nháp từng phần',
      'Ghép và chỉnh sửa',
      'Kiểm tra lỗi chính tả và format',
      'Nộp bài',
    ],
  },
  {
    id: 'fieldresearch',
    name: 'Nghiên cứu thực địa',
    category: 'Loại bài',
    description: 'Quy trình nghiên cứu thực địa với khảo sát, phỏng vấn và phân tích dữ liệu.',
    icon: Lightbulb,
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    stages: ['Thiết kế', 'Thu thập', 'Phân tích', 'Báo cáo'],
    tasks: [
      'Xác định câu hỏi nghiên cứu',
      'Thiết kế bảng khảo sát / phỏng vấn',
      'Liên hệ và thu thập dữ liệu',
      'Nhập liệu và làm sạch dữ liệu',
      'Phân tích và tổng hợp kết quả',
      'Viết báo cáo nghiên cứu',
    ],
  },
];

const CATEGORIES = ['Tất cả', 'Môn học', 'Loại bài'];

type StatusFilter = 'all' | ProjectStatus;

export default function ProjectListPage() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'progress'>('newest');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const apiStatus: ProjectStatus | undefined =
      statusFilter === 'all' ? undefined : statusFilter;

    getProjects({ status: apiStatus, search: search.trim() || undefined, limit: 100 })
      .then((res) => {
        if (!cancelled) {
          setProjects(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Không thể tải danh sách dự án.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [statusFilter, search]);

  const avgProgress = useMemo(
    () => Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / Math.max(projects.length, 1)),
    [projects],
  );

  const dueSoonProjects = useMemo(() => {
    const now = Date.now();
    const inTwoWeeks = now + 14 * 24 * 60 * 60 * 1000;
    return projects.filter((p) => {
      if (!p.deadline) return false;
      const deadline = new Date(p.deadline).getTime();
      return deadline >= now && deadline <= inTwoWeeks;
    }).length;
  }, [projects]);

  const displayedProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.subject ?? '').toLowerCase().includes(q),
    );
  }, [projects, search]);

  const sortedProjects = useMemo(() => {
    return [...displayedProjects].sort((a, b) => {
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortBy === 'progress') {
        return a.progress - b.progress;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [displayedProjects, sortBy]);

  const filteredTemplates =
    selectedCategory === 'Tất cả'
      ? PROJECT_TEMPLATES
      : PROJECT_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[38px] font-extrabold tracking-[-0.03em] text-[#1F1F1F]">Dự án</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Quản lý ưu tiên, theo dõi tiến độ và đồng bộ cả nhóm.</p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowTemplateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl !bg-primary px-5 py-2.5 text-[16px] font-semibold text-white shadow-md hover:!bg-primary-dark"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} />
          Tạo dự án
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white/85 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.11em] text-[#9A8576]">Tiến độ trung bình</p>
              <p className="text-xl font-bold text-[#1F1F1F]">
                {loading ? '—' : `${avgProgress}%`}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white/85 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-dark">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.11em] text-[#9A8576]">Đến hạn trong 14 ngày</p>
              <p className="text-xl font-bold text-[#1F1F1F]">
                {loading ? '—' : dueSoonProjects}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên dự án..."
            className="ez-input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: 'ACTIVE', label: 'Đang hoạt động' },
              { id: 'COMPLETED', label: 'Hoàn thành' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                statusFilter === f.id
                  ? 'bg-primary text-white'
                  : 'border border-border bg-surface text-ink-secondary hover:bg-surface-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-ink-secondary"
            aria-label="Sắp xếp"
          >
            <option value="newest">Mới nhất</option>
            <option value="deadline">Deadline gần nhất</option>
            <option value="progress">Tiến độ thấp nhất</option>
          </select>
        </div>
      </div>

      {/* Project list */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="col-span-full py-12 text-center text-sm text-ink-muted">
            Đang tải dự án…
          </p>
        ) : error ? (
          <p className="col-span-full py-12 text-center text-sm text-red-500">{error}</p>
        ) : sortedProjects.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-ink-muted">
            Không có dự án phù hợp bộ lọc.
          </p>
        ) : (
          sortedProjects.map((project) => <ProjectCard key={project.id} project={project} />)
        )}
      </div>

      {/* ===== Template Library Modal ===== */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => { setShowTemplateModal(false); setSelectedTemplate(null); }}
        title="Chọn mẫu dự án"
        size="xl"
        panelClassName="!max-w-4xl"
      >
        {selectedTemplate ? (
          /* Template detail view */
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
            >
              ← Quay lại danh sách
            </button>

            <div className={`flex items-center gap-3 rounded-xl border p-4 ${selectedTemplate.color}`}>
              <selectedTemplate.icon className="h-8 w-8 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">{selectedTemplate.name}</p>
                <p className="text-sm text-slate-600">{selectedTemplate.description}</p>
              </div>
            </div>

            {/* Stages */}
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Các giai đoạn</p>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.stages.map((stage, i) => (
                  <div key={stage} className="flex items-center gap-1.5">
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-dark">
                      {i + 1}. {stage}
                    </span>
                    {i < selectedTemplate.stages.length - 1 && (
                      <span className="text-slate-300">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pre-built tasks */}
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Công việc gợi ý ({selectedTemplate.tasks.length} tasks)
              </p>
              <div className="space-y-1.5 rounded-xl border border-border bg-surface-muted p-3">
                {selectedTemplate.tasks.map((task) => (
                  <div key={task} className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 shadow-sm">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-sm text-slate-700">{task}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="secondary" size="md" onClick={() => setSelectedTemplate(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setShowTemplateModal(false);
                  setSelectedTemplate(null);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Tạo dự án với mẫu này
              </Button>
            </div>
          </div>
        ) : (
          /* Template list view */
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Chọn mẫu phù hợp để bắt đầu ngay — hệ thống sẽ tạo sẵn các giai đoạn và công việc gợi ý.
            </p>

            {/* Category filter */}
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-white'
                      : 'border border-border bg-surface-muted text-slate-600 hover:bg-primary-50 hover:text-primary-dark'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template)}
                  className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${template.color}`}
                >
                  <template.icon className="mt-0.5 h-6 w-6 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{template.name}</p>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{template.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.stages.map((stage) => (
                        <span
                          key={stage}
                          className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          {stage}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Blank project option */}
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-surface-muted p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary-50/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white">
                  <Plus className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Bắt đầu từ trang trắng</p>
                  <p className="text-xs text-slate-500">Tự tạo cấu trúc dự án theo ý muốn.</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
