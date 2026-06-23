import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { getProjects, createProject, updateProject } from '@/api/project.api';
import { createTask } from '@/api/task.api';
import type { ProjectStatus } from '@/api/types';
import { Button, Modal, useToast, SkeletonCard } from '@/components/ui';
import ProjectCard from './ProjectCard';
import type { Project } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
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
  Rocket,
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
    color: 'bg-orange-50 text-orange-600 border-orange-200',
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
    color: 'bg-amber-50 text-amber-600 border-amber-200',
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
    color: 'bg-orange-50 text-orange-600 border-orange-200',
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
    color: 'bg-amber-50 text-amber-600 border-amber-200',
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'progress'>('newest');

  const [createForm, setCreateForm] = useState({ name: '', subject: '', description: '', deadline: '' });
  const [editForm, setEditForm] = useState({ name: '', subject: '', description: '', deadline: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);

  const reloadProjects = async () => {
    const apiStatus: ProjectStatus | undefined = statusFilter === 'all' ? undefined : statusFilter;
    const res = await getProjects({ status: apiStatus, search: search.trim() || undefined, limit: 100 });
    setProjects(res.data);
  };

  const openCreateProject = () => {
    setSelectedTemplate(null);
    setCreateForm({ name: '', subject: '', description: '', deadline: '' });
    setShowCreateModal(true);
  };

  const applyTemplateToCreateForm = (templateId: string) => {
    const template = PROJECT_TEMPLATES.find((item) => item.id === templateId) ?? null;
    setSelectedTemplate(template);
    setCreateForm((prev) => ({
      ...prev,
      subject: template?.category ?? '',
      description: template?.description ?? prev.description,
    }));
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setEditForm({
      name: project.name,
      subject: project.subject ?? '',
      description: project.description ?? '',
      deadline: project.deadline ? project.deadline.slice(0, 10) : '',
    });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast('Tên dự án là bắt buộc', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const newProject = await createProject({
        name: createForm.name.trim(),
        subject: createForm.subject.trim(),
        description: createForm.description.trim(),
        deadline: createForm.deadline ? new Date(createForm.deadline).toISOString() : undefined,
      });

      if (selectedTemplate && selectedTemplate.tasks.length > 0) {
        await Promise.all(
          selectedTemplate.tasks.map((taskName) =>
            createTask(newProject.id, { title: taskName, priority: 'MEDIUM' }),
          ),
        );
      }

      toast('Tạo dự án thành công!', 'success');
      setShowCreateModal(false);
      setSelectedTemplate(null);
      setCreateForm({ name: '', subject: '', description: '', deadline: '' });
      await reloadProjects();
    } catch (err: any) {
      toast(err?.message || 'Có lỗi xảy ra khi tạo dự án', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editForm.name.trim()) {
      toast('Tên dự án là bắt buộc', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await updateProject(editingProject.id, {
        name: editForm.name.trim(),
        subject: editForm.subject.trim(),
        description: editForm.description.trim(),
        deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : undefined,
      });
      setProjects((prev) => prev.map((project) => (project.id === updated.id ? updated : project)));
      setEditingProject(null);
      toast('Cập nhật dự án thành công!', 'success');
    } catch (err: any) {
      toast(err?.message || 'Không thể cập nhật dự án', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      return new Date(b.createdAt ?? '').getTime() - new Date(a.createdAt ?? '').getTime();
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
          onClick={openCreateProject}
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
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <p className="col-span-full py-12 text-center text-sm text-red-500">{error}</p>
        ) : sortedProjects.length === 0 ? (
          <p className="col-span-full py-12 text-center text-sm text-ink-muted">
            Không có dự án phù hợp bộ lọc.
          </p>
        ) : (
          sortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              currentUserId={user?.id}
              onEdit={openEditProject}
            />
          ))
        )}
      </div>

      {/* ===== Template Library Modal ===== */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => { setShowTemplateModal(false); setSelectedTemplate(null); }}
        title="Chọn mẫu dự án"
        size="xl"
        panelClassName="!max-w-[1200px] !rounded-[2.5rem] !p-8 border-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]"
        bodyClassName="[&::-webkit-scrollbar]:hidden"
      >
        {selectedTemplate ? (
          /* Template detail view */
          <div className="flex flex-col lg:flex-row gap-12 mt-4">
            {/* Left Col: Info */}
            <div className="flex-1 space-y-10">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="group flex w-fit items-center gap-3 text-sm font-bold text-slate-500 hover:text-primary transition-colors"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 group-hover:bg-primary/10 transition-colors">
                  ←
                </span>
                Quay lại thư viện
              </button>

              <div className="flex items-start gap-6">
                <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] border-2 ${selectedTemplate.color} shadow-sm bg-white`}>
                  <selectedTemplate.icon className="h-12 w-12" strokeWidth={1.5} />
                </div>
                <div className="pt-2">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedTemplate.name}</h2>
                  <p className="mt-4 text-lg text-slate-600 leading-relaxed max-w-xl">{selectedTemplate.description}</p>
                </div>
              </div>

              {/* Stages Timeline */}
              <div className="pt-8">
                <p className="mb-8 text-sm font-black uppercase tracking-widest text-slate-400">Tiến trình chuẩn bị</p>
                <div className="relative flex items-center justify-between max-w-2xl">
                  <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-slate-100 rounded-full" />
                  {selectedTemplate.stages.map((stage, i) => (
                    <div key={stage} className="relative flex flex-col items-center gap-4 z-10 w-24">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border-[4px] border-primary text-base font-black text-primary shadow-sm">
                        {i + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-700 text-center bg-white px-2 leading-tight">{stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Tasks & CTA */}
            <div className="w-full lg:w-[460px] flex flex-col gap-6 shrink-0">
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <p className="font-black text-slate-900 text-xl">
                    Gợi ý công việc
                  </p>
                  <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
                    {selectedTemplate.tasks.length} tasks
                  </span>
                </div>
                <div className="space-y-4">
                  {selectedTemplate.tasks.map((task) => (
                    <div key={task} className="group flex items-start gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </div>
                      <span className="text-base font-bold text-slate-700 leading-snug">{task}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setShowTemplateModal(false);
                  setCreateForm({ name: selectedTemplate.name, subject: selectedTemplate.category, description: selectedTemplate.description, deadline: '' });
                  setShowCreateModal(true);
                }}
                className="w-full py-5 rounded-[1.5rem] text-lg font-black shadow-xl shadow-primary/20 hover:-translate-y-1 hover:shadow-primary/30 transition-all"
              >
                <Plus className="mr-2 h-6 w-6" strokeWidth={3} />
                Bắt đầu với mẫu này
              </Button>
            </div>
          </div>
        ) : (
          /* Template list view */
          <div className="space-y-10 mt-2 pb-4">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
              <div className="max-w-3xl">
                <p className="text-slate-500 text-lg font-medium leading-relaxed">
                  Bắt đầu dự án chuyên nghiệp ngay lập tức với các quy trình được thiết kế sẵn cho từng mục tiêu cụ thể.
                </p>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`relative overflow-hidden rounded-full px-8 py-3 text-base font-bold transition-all duration-300 ${
                    selectedCategory === cat
                      ? 'text-white shadow-xl shadow-primary/30 scale-[1.02]'
                      : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-2 border-slate-200 shadow-sm'
                  }`}
                >
                  {selectedCategory === cat && (
                    <span className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 -z-10" />
                  )}
                  {cat}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {/* Blank project option - Special Card */}
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false);
                  setSelectedTemplate(null);
                  setCreateForm({ name: '', subject: '', description: '', deadline: '' });
                  setShowCreateModal(true);
                }}
                className="group relative flex flex-col justify-center items-center gap-5 rounded-[2rem] border-2 border-dashed border-slate-300 bg-white/50 p-8 text-center transition-all duration-300 hover:border-primary/50 hover:bg-white hover:shadow-2xl hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]" />
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-slate-100 group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-10 w-10 text-slate-400 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                </div>
                <div className="relative">
                  <p className="font-black text-slate-800 group-hover:text-primary transition-colors text-xl">Trang trắng</p>
                  <p className="text-sm text-slate-500 mt-2 px-2 font-medium">Tự do sáng tạo cấu trúc theo cách của riêng bạn.</p>
                </div>
              </button>

              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template)}
                  className="group relative flex flex-col items-start gap-6 rounded-[2rem] border-2 border-slate-200/60 bg-white p-8 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:border-primary/30 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent to-transparent group-hover:from-primary/50 group-hover:to-blue-400/50 transition-colors duration-500" />
                  
                  <div className={`flex h-16 w-16 items-center justify-center rounded-[1.25rem] border-2 bg-white ${template.color} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                    <template.icon className="h-7 w-7" strokeWidth={2.5} />
                  </div>
                  
                  <div className="min-w-0 flex-1 z-10 w-full">
                    <p className="font-black text-slate-900 text-xl group-hover:text-primary transition-colors">{template.name}</p>
                    <p className="mt-2.5 text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium">{template.description}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {template.stages.slice(0, 3).map((stage) => (
                        <span
                          key={stage}
                          className="rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm"
                        >
                          {stage}
                        </span>
                      ))}
                      {template.stages.length > 3 && (
                        <span className="rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 shadow-sm">
                          +{template.stages.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ===== Create Project Modal ===== */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Khởi tạo dự án"
        size="lg"
        panelClassName="!max-w-[800px] !rounded-[2.5rem] !p-8 border-0 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.3)] overflow-hidden"
        bodyClassName="[&::-webkit-scrollbar]:hidden !p-0 mt-6"
      >
        <div className="flex flex-col md:flex-row gap-8 lg:gap-10">
          {/* Decorative Left Side */}
          <div className="hidden md:flex flex-col w-[280px] shrink-0 bg-gradient-to-br from-primary/10 via-primary/5 to-blue-500/10 rounded-[2rem] p-8 relative overflow-hidden border border-white/60 shadow-inner">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-8 border border-slate-100">
                <Rocket className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3 leading-tight">Bắt đầu <br/>hành trình mới</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Thiết lập thông tin cơ bản để không gian làm việc của bạn trở nên chuyên nghiệp và rõ ràng nhất.
              </p>
            </div>
            
            {/* Minimal mockup illustration */}
            <div className="relative z-10 mt-auto pt-10">
              <div className="w-full h-32 bg-white/70 rounded-2xl border border-white shadow-sm p-4 backdrop-blur-md flex flex-col gap-3">
                <div className="w-1/2 h-2.5 bg-slate-200/80 rounded-full" />
                <div className="w-3/4 h-2 bg-slate-200/80 rounded-full" />
                <div className="w-full h-2 bg-slate-200/80 rounded-full" />
                <div className="mt-auto flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20" />
                  <div className="w-6 h-6 rounded-full bg-blue-400/20" />
                </div>
              </div>
            </div>
          </div>

          {/* Form Right Side */}
          <form onSubmit={handleCreateProject} className="flex-1 flex flex-col space-y-6 min-w-0 py-2">
            <div className="space-y-2.5">
              <label className="text-sm font-black text-slate-800 ml-1">Mẫu dự án</label>
              <select
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-base font-bold text-slate-800 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                value={selectedTemplate?.id ?? ''}
                onChange={(e) => applyTemplateToCreateForm(e.target.value)}
              >
                <option value="">Dự án trống</option>
                {PROJECT_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <p className="ml-1 text-xs font-medium text-slate-500">
                  Sẽ tạo kèm {selectedTemplate.tasks.length} công việc gợi ý từ mẫu này.
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <label className="text-sm font-black text-slate-800 ml-1">Tên dự án <span className="text-rose-500">*</span></label>
              <input
                autoFocus
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-base font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                placeholder="VD: Phát triển ứng dụng Web"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2.5">
              <label className="text-sm font-black text-slate-800 ml-1">Lĩnh vực / Môn học</label>
              <input
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-base font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                placeholder="VD: Trí tuệ nhân tạo"
                value={createForm.subject}
                onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-sm font-black text-slate-800 ml-1">Mô tả ngắn</label>
              <textarea
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-base font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all resize-none outline-none leading-relaxed"
                placeholder="Mục tiêu của dự án này là gì..."
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-sm font-black text-slate-800 ml-1">Ngày đến hạn (Deadline)</label>
              <input
                type="date"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-base font-bold text-slate-700 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                value={createForm.deadline}
                onChange={(e) => setCreateForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>

            <div className="pt-8 mt-auto flex justify-end gap-3 border-t border-slate-100/80">
              <Button type="button" variant="secondary" size="lg" onClick={() => setShowCreateModal(false)} className="rounded-2xl font-bold px-8 hover:bg-slate-100 transition-colors">
                Hủy bỏ
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={isSubmitting || !createForm.name.trim()} className="rounded-2xl font-black px-10 shadow-xl shadow-primary/20 hover:-translate-y-1 hover:shadow-primary/30 transition-all">
                {isSubmitting ? 'Đang khởi tạo...' : 'Tạo dự án ngay'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ===== Edit Project Modal ===== */}
      <Modal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        title="Chỉnh sửa dự án"
        size="lg"
        panelClassName="!max-w-[720px] !rounded-[2rem] !p-7 border-0 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.28)]"
        bodyClassName="!p-0 mt-6"
      >
        <form onSubmit={handleUpdateProject} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2.5">
              <label className="text-sm font-black text-slate-800 ml-1">
                Tên dự án <span className="text-rose-500">*</span>
              </label>
              <input
                autoFocus
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-base font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nhập tên dự án"
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-sm font-black text-slate-800 ml-1">Lĩnh vực / Môn học</label>
              <input
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-base font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                value={editForm.subject}
                onChange={(e) => setEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="VD: Trí tuệ nhân tạo"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-sm font-black text-slate-800 ml-1">Mô tả dự án</label>
            <textarea
              className="w-full resize-none rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-base font-medium leading-relaxed text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              rows={4}
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Mục tiêu, phạm vi hoặc ghi chú chính của dự án..."
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-sm font-black text-slate-800 ml-1">Ngày đến hạn</label>
            <input
              type="date"
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-base font-bold text-slate-700 focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              value={editForm.deadline}
              onChange={(e) => setEditForm((prev) => ({ ...prev, deadline: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setEditingProject(null)}
              className="rounded-2xl font-bold px-8"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || !editForm.name.trim()}
              className="rounded-2xl font-black px-10 shadow-xl shadow-primary/20"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
