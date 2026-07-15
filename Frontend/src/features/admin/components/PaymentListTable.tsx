import { useState } from 'react';
import { Card, Badge, Avatar, Button } from '@/components/ui';
import Drawer from '@/components/ui/Drawer';
import { format } from 'date-fns';
import { Download, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RevenuePaymentRow } from '@/api/types';
import { getExportCsvUrl } from '@/api/payment.api';

interface PaymentListTableProps {
  data: RevenuePaymentRow[];
  isLoading: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return <Badge variant="success">Paid</Badge>;
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'FAILED':
      return <Badge variant="danger">Failed</Badge>;
    case 'CANCELLED':
      return <Badge variant="danger">Thất bại</Badge>;
    case 'REFUNDED':
      return <Badge variant="warning">Hoàn tiền</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function getActionBadge(action: string) {
  switch (action) {
    case 'NEW':
      return <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">New</span>;
    case 'RENEW':
      return <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Renew</span>;
    case 'UPGRADE':
      return <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Upgrade</span>;
    default:
      return <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{action}</span>;
  }
}

export function PaymentListTable({ data, isLoading, page, totalPages, onPageChange }: PaymentListTableProps) {
  const [selectedPayment, setSelectedPayment] = useState<RevenuePaymentRow | null>(null);

  return (
    <Card className="flex flex-col border-none shadow-none">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-bold text-slate-800">Lịch sử giao dịch</h3>
        <a href={getExportCsvUrl({})} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" size="sm" className="h-8 gap-2">
            <Download className="w-4 h-4" />
            Xuất CSV
          </Button>
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] tracking-wider border-b">
            <tr>
              <th className="px-4 py-3">Mã đơn hàng</th>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Gói</th>
              <th className="px-4 py-3">Số tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
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
                <td colSpan={7} className="text-center py-8 text-slate-400">Không có giao dịch nào</td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.orderCode}</td>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{row.planName}</span>
                      {row.action && getActionBadge(row.action)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{formatVnd(row.amount)}</td>
                  <td className="px-4 py-3">{getStatusBadge(row.status)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {format(new Date(row.createdAt), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPayment(row)}>
                      Chi tiết
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
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Chi tiết giao dịch"
      >
        {selectedPayment && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Số tiền</p>
                <p className="text-3xl font-bold text-slate-900">{formatVnd(selectedPayment.amount)}</p>
              </div>
              <div>{getStatusBadge(selectedPayment.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Mã đơn hàng</p>
                <p className="font-mono text-sm font-medium text-slate-800">{selectedPayment.orderCode}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Mã giao dịch</p>
                <p className="font-mono text-sm font-medium text-slate-800">{selectedPayment.transactionId || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Thông tin khách hàng</h4>
              {selectedPayment.user ? (
                <div className="flex items-center gap-3">
                  <Avatar name={selectedPayment.user.fullName} className="w-10 h-10" />
                  <div>
                    <p className="font-medium text-slate-900">{selectedPayment.user.fullName}</p>
                    <p className="text-sm text-slate-500">{selectedPayment.user.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Người dùng không tồn tại</p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Thông tin gói</h4>
              <div className="bg-white border rounded-lg p-4 space-y-3 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Tên gói</span>
                  <span className="font-medium text-slate-900">{selectedPayment.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Loại giao dịch</span>
                  <span>{selectedPayment.action && getActionBadge(selectedPayment.action)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Cổng thanh toán</span>
                  <span className="font-medium text-slate-900">{selectedPayment.provider}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Lịch sử thời gian</h4>
              <div className="bg-white border rounded-lg p-4 space-y-4 shadow-sm relative">
                
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-full bg-slate-100 text-slate-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Khởi tạo</p>
                    <p className="text-xs text-slate-500">{format(new Date(selectedPayment.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                </div>{selectedPayment.paidAt && (
                  <div className="relative">
                    <div className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full -left-[21.5px] top-1 border border-white"></div>
                    <p className="text-sm font-medium text-emerald-700">Đã thanh toán</p>
                    <p className="text-xs text-emerald-600/80">{format(new Date(selectedPayment.paidAt), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                )}
                {selectedPayment.cancelledAt && (
                  <div className="relative">
                    <div className="absolute w-2.5 h-2.5 bg-slate-500 rounded-full -left-[21.5px] top-1 border border-white"></div>
                    <p className="text-sm font-medium text-slate-700">Đã huỷ</p>
                    <p className="text-xs text-slate-500">{format(new Date(selectedPayment.cancelledAt), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                )}
              </div>
            </div>


          </div>
        )}
      </Drawer>
    </Card>
  );
}
