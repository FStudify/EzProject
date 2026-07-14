import { useEffect, useState } from 'react';
import { Card, Button, useToast, Badge, Modal } from '@/components/ui';
import {
  fetchAdminPricingData,
  createAdminPlan,
  updateAdminPlan,
  deleteAdminPlan,
  createAdminVoucher,
  updateAdminVoucher,
  deleteAdminVoucher,
} from '@/api/payment.api';
import type { Plan, Voucher, AdminPricingData } from '@/api/types';
import { Loader2, Plus, Trash2, Gift, Settings, Edit } from 'lucide-react';

export default function AdminPricingPage() {
  const { toast } = useToast();
  const [data, setData] = useState<AdminPricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PLANS' | 'PROMOTIONS' | 'VOUCHERS'>('PLANS');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchAdminPricingData();
      setData(res);
    } catch (err: any) {
      toast(err.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-2rem)] bg-slate-50/50 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-200 px-8 py-6 flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-500">
              Quản lý bảng giá & Khuyến mãi
            </h1>
            <p className="text-slate-500 font-medium mt-1">Quản lý các gói dịch vụ, sale gói, và voucher mã giảm giá.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <TabButton active={activeTab === 'PLANS'} onClick={() => setActiveTab('PLANS')} icon={Settings} label="Gói dịch vụ" />
          <TabButton active={activeTab === 'VOUCHERS'} onClick={() => setActiveTab('VOUCHERS')} icon={Gift} label="Mã giảm giá (Voucher)" />
        </div>
      </div>

      <div className="p-8 max-w-[1400px] w-full flex-1">
        {activeTab === 'PLANS' && <PlanManager plans={data.plans} onRefresh={loadData} />}
        {activeTab === 'VOUCHERS' && <VoucherManager vouchers={data.vouchers} onRefresh={loadData} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all duration-300 ${
        active 
          ? 'bg-orange-100 text-orange-700 shadow-sm' 
          : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-orange-600' : ''}`} />
      {label}
      {active && (
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-orange-500/20 pointer-events-none" />
      )}
    </button>
  );
}

// ── PLAN MANAGER ─────────────────────────────────────────────────────────────

function PlanManager({ plans, onRefresh }: { plans: Plan[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const handleDelete = async (planKey: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa gói này vĩnh viễn?')) return;
    try {
      await deleteAdminPlan(planKey);
      toast('Đã xóa gói', 'success');
      onRefresh();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsAdding(true)} className="gap-2"><Plus className="w-4 h-4" /> Thêm Gói Mới</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <PlanEditorCard key={plan.id} plan={plan} onRefresh={onRefresh} onDelete={() => handleDelete(plan.key)} />
        ))}
      </div>

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Thêm Gói Mới">
        <AddPlanForm onComplete={() => { setIsAdding(false); onRefresh(); }} onCancel={() => setIsAdding(false)} />
      </Modal>
    </div>
  );
}

function AddPlanForm({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<{
    key: string;
    name: string;
    priceVnd: number | '';
    durationDays: number | '';
    description: string;
    isActive: boolean;
  }>({
    key: '', name: '', priceVnd: 0, durationDays: 30, description: '', isActive: true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.priceVnd === '' || formData.durationDays === '') return toast('Vui lòng nhập đầy đủ giá gốc và thời hạn', 'error');
    setLoading(true);
    try {
      await createAdminPlan({
        ...formData,
        priceVnd: Number(formData.priceVnd),
        durationDays: Number(formData.durationDays)
      });
      toast('Đã tạo gói mới', 'success');
      onComplete();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div><label className="text-sm font-medium">Tên Gói</label><input required className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
      <div><label className="text-sm font-medium">Key (Slug)</label><input required className="w-full border rounded p-2" value={formData.key} onChange={e => setFormData({ ...formData, key: e.target.value })} /></div>
      <div><label className="text-sm font-medium">Giá gốc (VND)</label><input type="number" required className="w-full border rounded p-2" value={formData.priceVnd} onChange={e => setFormData({ ...formData, priceVnd: e.target.value === '' ? '' : Number(e.target.value) })} onFocus={e => e.target.select()} /></div>
      <div><label className="text-sm font-medium">Thời hạn (ngày, 0 = vĩnh viễn)</label><input type="number" required className="w-full border rounded p-2" value={formData.durationDays} onChange={e => setFormData({ ...formData, durationDays: e.target.value === '' ? '' : Number(e.target.value) })} onFocus={e => e.target.select()} /></div>
      <div><label className="text-sm font-medium">Mô tả</label><textarea className="w-full border rounded p-2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
      <div className="flex gap-2 items-center"><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} /> <label>Bật (Active)</label></div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Hủy</Button>
        <Button type="submit" disabled={loading}>Lưu</Button>
      </div>
    </form>
  );
}

function PlanEditorCard({ plan, onRefresh, onDelete }: { plan: Plan; onRefresh: () => void; onDelete: () => void }) {
  const { toast } = useToast();
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [isEditingSale, setIsEditingSale] = useState(false);

  // Form states Base
  const [priceVnd, setPriceVnd] = useState<number | ''>(plan.priceVnd);
  const [isActive, setIsActive] = useState(plan.isActive);

  // Form states Sale
  const [saleIsActive, setSaleIsActive] = useState(plan.saleIsActive || false);
  const [saleType, setSaleType] = useState(plan.saleType || 'percent');
  const [saleValue, setSaleValue] = useState<number | ''>(plan.saleValue || 0);
  const [saleStartAt, setSaleStartAt] = useState(plan.saleStartAt ? plan.saleStartAt.split('T')[0] : '');
  const [saleEndAt, setSaleEndAt] = useState(plan.saleEndAt ? plan.saleEndAt.split('T')[0] : '');
  const [saleUsageLimit, setSaleUsageLimit] = useState<number | ''>(plan.saleUsageLimit || 0);

  const handleUpdateBase = async () => {
    if (priceVnd === '') return toast('Vui lòng nhập giá gốc hợp lệ', 'error');
    try {
      await updateAdminPlan(plan.key, { priceVnd, isActive });
      toast('Cập nhật gói thành công', 'success');
      setIsEditingBase(false);
      onRefresh();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handleUpdateSale = async () => {
    if (saleIsActive && (saleValue === '' || saleUsageLimit === '')) return toast('Vui lòng nhập đầy đủ thông số sale (giá trị, lượt dùng)', 'error');
    try {
      await updateAdminPlan(plan.key, {
        saleIsActive,
        saleType,
        saleValue: Number(saleValue),
        saleStartAt: saleStartAt || null,
        saleEndAt: saleEndAt || null,
        saleUsageLimit: Number(saleUsageLimit) || null,
      });
      toast('Cập nhật Sale thành công', 'success');
      setIsEditingSale(false);
      onRefresh();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  // Preview sale computation
  const pVnd = Number(priceVnd) || 0;
  const sVal = Number(saleValue) || 0;
  let previewSalePrice = pVnd;
  if (saleType === 'percent') {
    previewSalePrice = Math.max(0, pVnd - Math.floor(pVnd * (sVal / 100)));
  } else if (saleType === 'fixed_price') {
    previewSalePrice = Math.max(0, pVnd - sVal);
  }

  return (
    <Card className={`overflow-hidden p-0 border-0 shadow-lg ring-1 ring-gray-200/50 bg-white rounded-2xl flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${!plan.isActive ? 'opacity-70 grayscale' : ''}`}>
      <div className="bg-gradient-to-r from-orange-50 to-rose-50 border-b border-orange-100/50 p-5 flex justify-between items-center">
        <div>
          <span className="uppercase font-black text-gray-800 tracking-wide text-lg">{plan.name}</span>
          <span className="ml-2 text-xs text-orange-600/70 font-mono font-medium bg-orange-100/50 px-2 py-1 rounded-full">{plan.key}</span>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant={plan.isActive ? 'success' : 'default'} className="shadow-sm">{plan.isActive ? 'Active' : 'Inactive'}</Badge>
          <Button variant="ghost" size="sm" onClick={onDelete} className="hover:bg-red-100 hover:text-red-600 rounded-full w-8 h-8 p-0"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Base Info Block */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-700">Thông tin gốc</h3>
          {!isEditingBase && <Button variant="ghost" size="sm" onClick={() => setIsEditingBase(true)}><Edit className="w-4 h-4" /></Button>}
        </div>
        {!isEditingBase ? (
          <div className="text-sm space-y-1">
            <p>Giá: <span className="font-medium text-gray-900">{plan.priceVnd.toLocaleString('vi-VN')} đ</span></p>
          </div>
        ) : (
          <div className="space-y-3 bg-gray-50 p-3 rounded-md">
            <div><label className="text-xs">Giá gốc</label><input type="number" required className="w-full border rounded p-1 text-sm" value={priceVnd} onChange={e => setPriceVnd(e.target.value === '' ? '' : Number(e.target.value))} onFocus={e => e.target.select()} /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /><label className="text-xs">Active</label></div>
            <div className="flex justify-end gap-2 mt-2">
              <Button size="sm" variant="ghost" onClick={() => setIsEditingBase(false)}>Hủy</Button>
              <Button size="sm" onClick={handleUpdateBase}>Lưu</Button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Config Block */}
      <div className="p-4 flex-1">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-700">Cấu hình Sale</h3>
          {!isEditingSale && <Button variant="ghost" size="sm" onClick={() => setIsEditingSale(true)}><Edit className="w-4 h-4" /></Button>}
        </div>
        {!isEditingSale ? (
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={plan.saleIsActive ? 'success' : 'default'}>{plan.saleIsActive ? 'Đang bật Sale' : 'Không có Sale'}</Badge>
            </div>
            {plan.saleIsActive && (
              <>
                <p>Giảm: <span className="font-medium text-orange-600">{plan.saleValue} {plan.saleType === 'percent' ? '%' : 'đ'}</span></p>
                <p>Giá sau sale: <span className="font-bold text-orange-600">
                  {plan.saleType === 'percent' ? Math.floor(plan.priceVnd * (1 - (plan.saleValue||0)/100)).toLocaleString() : Math.max(0, plan.priceVnd - (plan.saleValue||0)).toLocaleString()} đ
                </span></p>
                {plan.saleUsageLimit ? <p>Lượt dùng: {plan.saleUsedCount || 0} / {plan.saleUsageLimit}</p> : null}
                {(plan.saleStartAt || plan.saleEndAt) && (
                  <p className="text-xs text-gray-500 mt-2">Hạn: {plan.saleStartAt ? new Date(plan.saleStartAt).toLocaleDateString() : 'Bất kỳ'} - {plan.saleEndAt ? new Date(plan.saleEndAt).toLocaleDateString() : 'Bất kỳ'}</p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 bg-gray-50 p-3 rounded-md text-sm">
            <div className="flex items-center gap-2"><input type="checkbox" checked={saleIsActive} onChange={e => setSaleIsActive(e.target.checked)} /><label className="font-bold text-orange-600">Bật tính năng Sale</label></div>
            {saleIsActive && (
              <>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="text-xs">Loại giảm</label><select className="w-full border rounded p-1" value={saleType} onChange={e => setSaleType(e.target.value as any)}><option value="percent">Theo %</option><option value="fixed_price">Tiền cố định</option></select></div>
                  <div className="flex-1"><label className="text-xs">Giá trị</label><input type="number" required className="w-full border rounded p-1" value={saleValue} onChange={e => setSaleValue(e.target.value === '' ? '' : Number(e.target.value))} onFocus={e => e.target.select()} /></div>
                </div>
                <div className="p-2 bg-orange-50 text-orange-700 text-xs font-medium rounded">
                  👉 Xem trước giá Sale: {previewSalePrice.toLocaleString('vi-VN')} đ
                </div>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="text-xs">Bắt đầu</label><input type="date" className="w-full border rounded p-1" value={saleStartAt} onChange={e => setSaleStartAt(e.target.value)} /></div>
                  <div className="flex-1"><label className="text-xs">Kết thúc</label><input type="date" className="w-full border rounded p-1" value={saleEndAt} onChange={e => setSaleEndAt(e.target.value)} /></div>
                </div>
                <div><label className="text-xs">Tổng số lượt được dùng (0 = vô hạn)</label><input type="number" required className="w-full border rounded p-1" value={saleUsageLimit} onChange={e => setSaleUsageLimit(e.target.value === '' ? '' : Number(e.target.value))} onFocus={e => e.target.select()} /></div>
              </>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <Button size="sm" variant="ghost" onClick={() => setIsEditingSale(false)}>Hủy</Button>
              <Button size="sm" onClick={handleUpdateSale}>Lưu</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}


// ── VOUCHER MANAGER ──────────────────────────────────────────────────────────

function VoucherManager({ vouchers, onRefresh }: { vouchers: Voucher[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [editingVoucher, setEditingVoucher] = useState<Voucher | Partial<Voucher> | null>(null);
  const [filterText, setFilterText] = useState('');

  const filteredVouchers = vouchers.filter(v => 
    v.code.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSave = async (data: any) => {
    try {
      if (data.id || data._id) {
        await updateAdminVoucher(data.id || data._id, data);
        toast('Cập nhật Voucher thành công', 'success');
      } else {
        await createAdminVoucher(data);
        toast('Tạo Voucher mới thành công', 'success');
      }
      setEditingVoucher(null);
      onRefresh();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa mã giảm giá này?')) return;
    try {
      await deleteAdminVoucher(id);
      toast('Đã xóa', 'success');
      onRefresh();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input 
          type="text" 
          placeholder="Tìm kiếm mã CODE..." 
          className="border rounded-md px-3 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-primary"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        <Button onClick={() => setEditingVoucher({ discountType: 'FIXED', discountValue: 50000, isActive: true, maxUsage: 0, usagePerUser: 1, stackableWithSale: false, minAmount: 0, applicablePlans: [] })} className="gap-2"><Plus className="w-4 h-4" /> Tạo Mới</Button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="p-4 font-medium">Mã CODE</th>
              <th className="p-4 font-medium">Giảm giá</th>
              <th className="p-4 font-medium">Lượt dùng</th>
              <th className="p-4 font-medium">Cộng dồn?</th>
              <th className="p-4 font-medium">Ngày tạo</th>
              <th className="p-4 font-medium">Trạng thái</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredVouchers.map(v => (
              <tr key={v.id || v._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="p-4 font-bold font-mono text-gray-800">{v.code}</td>
                <td className="p-4 text-orange-600 font-bold">
                  {v.discountType === 'PERCENT' ? `-${v.discountValue}%` : `-${v.discountValue.toLocaleString('vi-VN')} đ`}
                </td>
                <td className="p-4 text-xs text-gray-600">
                  Tổng: {v.currentUsage} / {v.maxUsage === 0 ? '∞' : v.maxUsage} <br/>
                  Mỗi user: {v.usagePerUser || '∞'}
                </td>
                <td className="p-4">
                  {v.stackableWithSale ? <Badge variant="success">Có</Badge> : <Badge variant="default">Không</Badge>}
                </td>
                <td className="p-4 text-gray-500">
                  {v.createdAt ? new Date(v.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                </td>
                <td className="p-4">
                  {!v.isActive ? (
                    <Badge variant="default">Đã tắt</Badge>
                  ) : (v.maxUsage > 0 && v.currentUsage >= v.maxUsage) ? (
                    <Badge variant="danger" className="bg-red-100 text-red-800 hover:bg-red-200">Hết Mã</Badge>
                  ) : (
                    <Badge variant="success">Hoạt động</Badge>
                  )}
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditingVoucher(v)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id || v._id!)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editingVoucher} onClose={() => setEditingVoucher(null)} title={editingVoucher?.id ? 'Sửa Voucher' : 'Tạo Voucher'}>
        {editingVoucher && <VoucherForm initial={editingVoucher} onSave={handleSave} onCancel={() => setEditingVoucher(null)} />}
      </Modal>
    </div>
  );
}

function VoucherForm({ initial, onSave, onCancel }: any) {
  const [data, setData] = useState(initial);
  return (
    <form className="space-y-4 pt-4" onSubmit={e => { e.preventDefault(); onSave(data); }}>
      <div><label className="text-sm font-medium">Mã CODE (Tự động in hoa)</label><input required className="w-full border rounded p-2 font-mono uppercase" value={data.code || ''} onChange={e => setData({...data, code: e.target.value.toUpperCase()})} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm font-medium">Loại giảm</label><select className="w-full border rounded p-2" value={data.discountType} onChange={e => setData({...data, discountType: e.target.value})}><option value="PERCENT">%</option><option value="FIXED">VNĐ</option></select></div>
        <div><label className="text-sm font-medium">Giá trị giảm</label><input required type="number" className="w-full border rounded p-2" value={data.discountValue ?? ''} onChange={e => setData({...data, discountValue: e.target.value === '' ? '' : Number(e.target.value)})} onFocus={e => e.target.select()} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm font-medium">Ngày bắt đầu</label><input required type="date" className="w-full border rounded p-2" value={data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : ''} onChange={e => setData({...data, startDate: e.target.value})} /></div>
        <div><label className="text-sm font-medium">Ngày kết thúc</label><input required type="date" className="w-full border rounded p-2" value={data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : ''} onChange={e => setData({...data, endDate: e.target.value})} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm font-medium">Tổng số lượt (0 = Vô hạn)</label><input required type="number" className="w-full border rounded p-2" value={data.maxUsage ?? ''} onChange={e => setData({...data, maxUsage: e.target.value === '' ? '' : Number(e.target.value)})} onFocus={e => e.target.select()} /></div>
        <div><label className="text-sm font-medium">Số lượt/User (0 = Vô hạn)</label><input required type="number" className="w-full border rounded p-2" value={data.usagePerUser ?? ''} onChange={e => setData({...data, usagePerUser: e.target.value === '' ? '' : Number(e.target.value)})} onFocus={e => e.target.select()} /></div>
      </div>
      <div><label className="text-sm font-medium">Đơn tối thiểu (VNĐ)</label><input required type="number" className="w-full border rounded p-2" value={data.minAmount ?? ''} onChange={e => setData({...data, minAmount: e.target.value === '' ? '' : Number(e.target.value)})} onFocus={e => e.target.select()} /></div>
      
      <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100 flex flex-col gap-2">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={data.stackableWithSale || false} onChange={e => setData({...data, stackableWithSale: e.target.checked})} />
          Cho phép áp dụng chung với Khuyến Mãi / Sale?
        </label>
        <p className="text-xs opacity-80">Nếu tắt, mã này sẽ bị từ chối nếu gói đang được giảm giá sẵn.</p>
      </div>

      <div className="flex gap-2 items-center"><input type="checkbox" checked={data.isActive} onChange={e => setData({...data, isActive: e.target.checked})} /><label>Đang kích hoạt</label></div>
      <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="ghost" onClick={onCancel}>Hủy</Button><Button type="submit">Lưu</Button></div>
    </form>
  );
}
