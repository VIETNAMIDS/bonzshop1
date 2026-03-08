import { Ban, ShieldAlert, AlertTriangle } from 'lucide-react';

interface BanScreenProps {
  reason?: string;
}

export function BanScreen({ reason }: BanScreenProps) {
  return (
    <div className="fixed inset-0 bg-background z-[99999] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="glass rounded-2xl p-8 border border-destructive/30">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <Ban className="w-12 h-12 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold text-destructive mb-2">
            TÀI KHOẢN ĐÃ BỊ KHÓA
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-sm">Bạn không thể truy cập website này</span>
          </div>

          {reason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-xs font-medium text-destructive mb-1">Lý do:</p>
                  <p className="text-sm text-foreground">{reason}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Tài khoản và địa chỉ IP của bạn đã bị cấm.</p>
            <p>Bạn không thể đăng nhập, đăng ký hoặc sử dụng bất kỳ tính năng nào.</p>
            <p className="mt-4">Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ quản trị viên.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
