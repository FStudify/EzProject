import { useState } from 'react';
import { Card, Badge, Avatar, Button } from '@/components/ui';
import Drawer from '@/components/ui/Drawer';
import { format } from 'date-fns';
import { Eye, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AdminSubscriptionRow } from '@/api/types';

interface SubscriptionListTableProps {
  data: AdminSubscriptionRow[];
  isLoading: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">Hoạt động</Badge>;
    case 'EXPIRED':
      return <Badge variant="danger">Hết hạn</Badge>;
    case 'CANCELLED':
      return <Badge variant="default">Đã huỷ</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

export function SubscriptionListTable({ data, isLoading, page, totalPages, onPageChange }: SubscriptionListTableProps) {
  const [selectedSub, setSelectedSub] = useState<AdminSubscriptionRow | null>(null);

  return (
    <Card className="flex flex-col h-full border-none shadow-none">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-bold text-slate-800">Lịch sử đăng ký</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] tracking-wider border-b">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Gói</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày bắt đầu</th>
              <th className="px-4 py-3">Ngày kết thúc</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">Đang tải dữ liệu...</td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">Không có gói đăng ký nào</td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.id.slice(-6)}</td>
                  <td className="px-4 py-3">
                    {row.user ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={row.user.fullName} className="w-6 h-6 text-[10px]" />
                        <span className="font-medium text-slate-700">{row.user.email}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.planName}</td>
                  <td className="px-4 py-3">{getStatusBadge(row.status)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {format(new Date(row.startedAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {format(new Date(row.expiresAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500 hover:text-blue-600" onClick={() => setSelectedSub(row)}>
                      <Eye className="w-4 h-4 mr-1" /> Chi tiết
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages && totalPages > 1 && page && onPageChange && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-500 bg-white rounded-b-xl">
          <span>
            Trang {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <Drawer
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title="Chi tiết gói đăng ký"
      >
        {selectedSub && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Tên gói</p>
                <p className="text-3xl font-bold text-slate-900 uppercase">{selectedSub.planName}</p>
              </div>
              <div>{getStatusBadge(selectedSub.status)}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-3 border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Started
                </span>
                <span className="font-medium text-slate-900">{format(new Date(selectedSub.startedAt), 'PPP')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Expires
                </span>
                <span className="font-medium text-slate-900">{format(new Date(selectedSub.expiresAt), 'PPP')}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Thông tin khách hàng</h4>
              {selectedSub.user ? (
                <div className="flex items-center gap-3">
                  <Avatar name={selectedSub.user.fullName} className="w-10 h-10" />
                  <div>
                    <p className="font-medium text-slate-900">{selectedSub.user.fullName}</p>
                    <p className="text-sm text-slate-500">{selectedSub.user.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Người dùng không tồn tại</p>
              )}
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Technical Details</h4>
              <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Subscription ID</span>
                  <span className="font-mono text-xs text-slate-800">{selectedSub.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Created At</span>
                  <span className="font-mono text-xs text-slate-800">{format(new Date(selectedSub.createdAt), 'PPP p')}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </Drawer>
    </Card>
  );
}
