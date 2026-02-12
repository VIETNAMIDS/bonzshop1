import { useState } from 'react';
import { Monitor, Smartphone, LogOut, LogIn } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface SessionInfo {
  deviceName: string;
  os: string;
  browser: string;
  lastActiveAt: string;
}

interface SessionConflictDialogProps {
  open: boolean;
  existingSession: SessionInfo | null;
  currentDevice: string;
  onKeepExisting: () => void;
  onUseThisDevice: () => void;
  isLoading?: boolean;
}

export default function SessionConflictDialog({
  open,
  existingSession,
  currentDevice,
  onKeepExisting,
  onUseThisDevice,
  isLoading,
}: SessionConflictDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5 text-primary" />
            Tài khoản đang đăng nhập nơi khác
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4">
            <p>
              Tài khoản của bạn hiện đang được sử dụng trên thiết bị khác. 
              Bạn chỉ có thể đăng nhập trên <strong>1 thiết bị</strong> cùng lúc.
            </p>

            {existingSession && (
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium text-foreground">📱 Thiết bị đang đăng nhập:</p>
                <p>• Tên: {existingSession.deviceName}</p>
                <p>• Hệ điều hành: {existingSession.os}</p>
                <p>• Trình duyệt: {existingSession.browser}</p>
                <p>• Hoạt động lần cuối: {new Date(existingSession.lastActiveAt).toLocaleString('vi-VN')}</p>
              </div>
            )}

            <div className="bg-primary/5 rounded-lg p-3 text-sm">
              <p className="font-medium text-foreground">💻 Thiết bị hiện tại:</p>
              <p>• {currentDevice}</p>
            </div>

            <p className="text-sm font-medium">Bạn muốn đăng nhập ở đâu?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={onUseThisDevice}
            disabled={isLoading}
            className="w-full"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Đăng nhập thiết bị này (đăng xuất thiết bị kia)
          </Button>
          <Button
            variant="outline"
            onClick={onKeepExisting}
            disabled={isLoading}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Giữ thiết bị cũ (hủy đăng nhập)
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
