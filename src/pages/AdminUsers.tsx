import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Users, Shield, User, ShieldPlus, ShieldMinus, Loader2, Crown, Ban, CheckCircle, Globe, Monitor, Wifi, Calendar, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminUsersApi, verifyAdminApi } from '@/hooks/useAdminApi';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface UserWithRoles {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  roles: string[];
  isAdmin: boolean;
  isRootAdmin?: boolean;
  isSeller?: boolean;
  isBanned?: boolean;
  ip_address?: string | null;
  browser?: string | null;
  os?: string | null;
  device_name?: string | null;
  last_active_at?: string | null;
}

export default function AdminUsers() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);
  const [banning, setBanning] = useState<string | null>(null);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [isRootAdmin, setIsRootAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<UserWithRoles | null>(null);
  const [banReason, setBanReason] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkBanDialogOpen, setBulkBanDialogOpen] = useState(false);
  const [bulkBanReason, setBulkBanReason] = useState('');

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user) { navigate('/auth'); return; }
      const isAdmin = await verifyAdminApi();
      if (!isAdmin) { toast.error('Không có quyền truy cập'); navigate('/'); return; }
      setIsVerifiedAdmin(true);
    };
    if (!isLoading) verifyAdmin();
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (isVerifiedAdmin) fetchUsers();
  }, [isVerifiedAdmin]);

  const fetchUsers = async () => {
    try {
      const result = await adminUsersApi.list();
      setUsers(result.data || []);
      setIsRootAdmin(result.currentUserIsRootAdmin || false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleEnsureRootAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'ensureRootAdmin', data: {} }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      toast.success('Đã đảm bảo Admin Gốc có quyền admin');
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể đảm bảo Admin Gốc');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) { toast.error('Không thể xóa tài khoản của chính bạn'); return; }
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    setDeleting(userId);
    try {
      await adminUsersApi.deleteUser(userId);
      toast.success('Đã xóa người dùng thành công');
      setUsers(users.filter(u => u.user_id !== userId));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi xóa người dùng';
      toast.error(errorMessage);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (userId === user?.id) { toast.error('Không thể thay đổi vai trò của chính bạn'); return; }
    const action = isCurrentlyAdmin ? 'xóa quyền admin của' : 'thêm quyền admin cho';
    if (!confirm(`Bạn có chắc muốn ${action} người dùng này?`)) return;
    setTogglingAdmin(userId);
    try {
      if (isCurrentlyAdmin) {
        await adminUsersApi.removeAdmin(userId);
        toast.success('Đã xóa quyền admin');
      } else {
        await adminUsersApi.addAdmin(userId);
        toast.success('Đã thêm quyền admin');
      }
      setUsers(users.map(u => u.user_id === userId ? { ...u, isAdmin: !isCurrentlyAdmin } : u));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi thay đổi vai trò';
      toast.error(errorMessage);
    } finally {
      setTogglingAdmin(null);
    }
  };

  const handleToggleSeller = async (userId: string, isCurrentlySeller: boolean) => {
    if (!confirm(`Bạn có chắc muốn ${isCurrentlySeller ? 'gỡ seller cho' : 'thêm seller cho'} người dùng này?`)) return;
    setTogglingAdmin(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const action = isCurrentlySeller ? 'removeSeller' : 'addSeller';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action, data: { userId } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      toast.success(isCurrentlySeller ? 'Đã gỡ seller' : 'Đã thêm seller');
      setUsers(users.map(u => u.user_id === userId ? { ...u, isSeller: !isCurrentlySeller } : u));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi thay đổi seller';
      toast.error(errorMessage);
    } finally {
      setTogglingAdmin(null);
    }
  };

  const openBanDialog = (u: UserWithRoles) => {
    setBanTargetUser(u);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const handleBanUser = async () => {
    if (!banTargetUser) return;
    setBanning(banTargetUser.user_id);
    try {
      await adminUsersApi.banUser(banTargetUser.user_id, banReason || 'Vi phạm quy định');
      toast.success('Đã ban người dùng');
      setUsers(users.map(u => u.user_id === banTargetUser.user_id ? { ...u, isBanned: true } : u));
      setBanDialogOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi ban người dùng';
      toast.error(errorMessage);
    } finally {
      setBanning(null);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!confirm('Bạn có chắc muốn gỡ ban người dùng này?')) return;
    setBanning(userId);
    try {
      await adminUsersApi.unbanUser(userId);
      toast.success('Đã gỡ ban người dùng');
      setUsers(users.map(u => u.user_id === userId ? { ...u, isBanned: false } : u));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi gỡ ban';
      toast.error(errorMessage);
    } finally {
      setBanning(null);
    }
  };

  // === Bulk selection helpers ===
  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.display_name?.toLowerCase().includes(q)) ||
      (u.email?.toLowerCase().includes(q)) ||
      (u.ip_address?.includes(q)) ||
      (u.user_id.toLowerCase().includes(q))
    );
  });

  // Only allow selecting users that are not root admin and not self
  const selectableUsers = filteredUsers.filter(u => !u.isRootAdmin && u.user_id !== user?.id);

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === selectableUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableUsers.map(u => u.user_id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedUsers = users.filter(u => selectedIds.has(u.user_id));

  // === Bulk actions ===
  const handleBulkBan = async () => {
    const targets = selectedUsers.filter(u => !u.isBanned && !u.isRootAdmin && u.user_id !== user?.id);
    if (targets.length === 0) { toast.error('Không có người dùng nào để ban'); return; }
    setBulkProcessing(true);
    let success = 0;
    for (const t of targets) {
      try {
        await adminUsersApi.banUser(t.user_id, bulkBanReason || 'Vi phạm quy định');
        success++;
      } catch {}
    }
    setUsers(prev => prev.map(u => selectedIds.has(u.user_id) && !u.isRootAdmin ? { ...u, isBanned: true } : u));
    toast.success(`Đã ban ${success}/${targets.length} người dùng`);
    setBulkProcessing(false);
    setBulkBanDialogOpen(false);
    clearSelection();
  };

  const handleBulkUnban = async () => {
    const targets = selectedUsers.filter(u => u.isBanned);
    if (targets.length === 0) { toast.error('Không có người dùng nào đang bị ban'); return; }
    if (!confirm(`Gỡ ban ${targets.length} người dùng?`)) return;
    setBulkProcessing(true);
    let success = 0;
    for (const t of targets) {
      try {
        await adminUsersApi.unbanUser(t.user_id);
        success++;
      } catch {}
    }
    setUsers(prev => prev.map(u => selectedIds.has(u.user_id) ? { ...u, isBanned: false } : u));
    toast.success(`Đã gỡ ban ${success}/${targets.length} người dùng`);
    setBulkProcessing(false);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const targets = selectedUsers.filter(u => !u.isRootAdmin && u.user_id !== user?.id && (isRootAdmin || !u.isAdmin));
    if (targets.length === 0) { toast.error('Không có người dùng nào để xóa'); return; }
    if (!confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN ${targets.length} người dùng? Hành động này không thể hoàn tác!`)) return;
    setBulkProcessing(true);
    let success = 0;
    const deletedIds = new Set<string>();
    for (const t of targets) {
      try {
        await adminUsersApi.deleteUser(t.user_id);
        success++;
        deletedIds.add(t.user_id);
      } catch {}
    }
    setUsers(prev => prev.filter(u => !deletedIds.has(u.user_id)));
    toast.success(`Đã xóa ${success}/${targets.length} người dùng`);
    setBulkProcessing(false);
    clearSelection();
  };

  const handleBulkAddAdmin = async () => {
    if (!isRootAdmin) { toast.error('Chỉ Admin Gốc mới có quyền'); return; }
    const targets = selectedUsers.filter(u => !u.isAdmin && !u.isRootAdmin);
    if (targets.length === 0) { toast.error('Không có người dùng nào để thêm admin'); return; }
    if (!confirm(`Thêm quyền admin cho ${targets.length} người dùng?`)) return;
    setBulkProcessing(true);
    let success = 0;
    for (const t of targets) {
      try {
        await adminUsersApi.addAdmin(t.user_id);
        success++;
      } catch {}
    }
    setUsers(prev => prev.map(u => selectedIds.has(u.user_id) && !u.isRootAdmin ? { ...u, isAdmin: true } : u));
    toast.success(`Đã thêm admin cho ${success}/${targets.length} người dùng`);
    setBulkProcessing(false);
    clearSelection();
  };

  const handleBulkRemoveAdmin = async () => {
    if (!isRootAdmin) { toast.error('Chỉ Admin Gốc mới có quyền'); return; }
    const targets = selectedUsers.filter(u => u.isAdmin && !u.isRootAdmin);
    if (targets.length === 0) { toast.error('Không có admin nào để gỡ'); return; }
    if (!confirm(`Gỡ quyền admin của ${targets.length} người dùng?`)) return;
    setBulkProcessing(true);
    let success = 0;
    for (const t of targets) {
      try {
        await adminUsersApi.removeAdmin(t.user_id);
        success++;
      } catch {}
    }
    setUsers(prev => prev.map(u => selectedIds.has(u.user_id) && !u.isRootAdmin ? { ...u, isAdmin: false } : u));
    toast.success(`Đã gỡ admin cho ${success}/${targets.length} người dùng`);
    setBulkProcessing(false);
    clearSelection();
  };

  const handleBulkAddSeller = async () => {
    if (!isRootAdmin) { toast.error('Chỉ Admin Gốc mới có quyền'); return; }
    const targets = selectedUsers.filter(u => !u.isSeller && !u.isRootAdmin);
    if (targets.length === 0) { toast.error('Không có người dùng nào để thêm seller'); return; }
    if (!confirm(`Thêm seller cho ${targets.length} người dùng?`)) return;
    setBulkProcessing(true);
    let success = 0;
    for (const t of targets) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'addSeller', data: { userId: t.user_id } }),
        });
        if (res.ok) success++;
      } catch {}
    }
    setUsers(prev => prev.map(u => selectedIds.has(u.user_id) && !u.isRootAdmin ? { ...u, isSeller: true } : u));
    toast.success(`Đã thêm seller cho ${success}/${targets.length} người dùng`);
    setBulkProcessing(false);
    clearSelection();
  };

  const handleBulkRemoveSeller = async () => {
    if (!isRootAdmin) { toast.error('Chỉ Admin Gốc mới có quyền'); return; }
    const targets = selectedUsers.filter(u => u.isSeller && !u.isRootAdmin);
    if (targets.length === 0) { toast.error('Không có seller nào để gỡ'); return; }
    if (!confirm(`Gỡ seller của ${targets.length} người dùng?`)) return;
    setBulkProcessing(true);
    let success = 0;
    for (const t of targets) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'removeSeller', data: { userId: t.user_id } }),
        });
        if (res.ok) success++;
      } catch {}
    }
    setUsers(prev => prev.map(u => selectedIds.has(u.user_id) && !u.isRootAdmin ? { ...u, isSeller: false } : u));
    toast.success(`Đã gỡ seller cho ${success}/${targets.length} người dùng`);
    setBulkProcessing(false);
    clearSelection();
  };

  if (isLoading || !isVerifiedAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Users className="w-6 sm:w-8 h-6 sm:h-8 text-primary" />
              Quản lý người dùng
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {users.length} người dùng • {users.filter(u => u.isBanned).length} đã bị ban
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              Quản lý sản phẩm
            </Button>
            {isRootAdmin && (
              <Button variant="default" size="sm" onClick={handleEnsureRootAdmin}>
                Đảm bảo Admin Gốc
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, email, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium mr-1">
              Đã chọn <strong className="text-primary">{selectedIds.size}</strong> người dùng
            </span>
            <Button variant="outline" size="sm" onClick={clearSelection} className="h-7 px-2 text-xs gap-1">
              <X className="w-3 h-3" /> Bỏ chọn
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button variant="destructive" size="sm" onClick={() => { setBulkBanReason(''); setBulkBanDialogOpen(true); }}
              disabled={bulkProcessing} className="h-7 text-xs gap-1">
              <Ban className="w-3 h-3" /> Ban
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkUnban}
              disabled={bulkProcessing} className="h-7 text-xs gap-1 text-green-500 border-green-500/30 hover:bg-green-500/10">
              <CheckCircle className="w-3 h-3" /> Gỡ ban
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}
              disabled={bulkProcessing} className="h-7 text-xs gap-1 bg-red-600 hover:bg-red-700">
              <Trash2 className="w-3 h-3" /> Xóa
            </Button>
            {isRootAdmin && (
              <>
                <div className="h-4 w-px bg-border" />
                <Button variant="outline" size="sm" onClick={handleBulkAddAdmin}
                  disabled={bulkProcessing} className="h-7 text-xs gap-1 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10">
                  <ShieldPlus className="w-3 h-3" /> +Admin
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkRemoveAdmin}
                  disabled={bulkProcessing} className="h-7 text-xs gap-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10">
                  <ShieldMinus className="w-3 h-3" /> -Admin
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkAddSeller}
                  disabled={bulkProcessing} className="h-7 text-xs gap-1 text-blue-500 border-blue-500/30 hover:bg-blue-500/10">
                  <User className="w-3 h-3" /> +Seller
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkRemoveSeller}
                  disabled={bulkProcessing} className="h-7 text-xs gap-1 text-indigo-500 border-indigo-500/30 hover:bg-indigo-500/10">
                  <User className="w-3 h-3" /> -Seller
                </Button>
              </>
            )}
            {bulkProcessing && <Loader2 className="w-4 h-4 animate-spin text-primary ml-2" />}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-0 sm:rounded-xl sm:border sm:border-border sm:overflow-hidden">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium w-10">
                      <Checkbox
                        checked={selectableUsers.length > 0 && selectedIds.size === selectableUsers.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Người dùng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Vai trò</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">IP / Thiết bị</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Ngày tạo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-xs font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => {
                    const isSelectable = !u.isRootAdmin && u.user_id !== user?.id;
                    const isSelected = selectedIds.has(u.user_id);
                    return (
                      <tr key={u.user_id} className={`hover:bg-muted/30 transition-colors ${u.isBanned ? 'opacity-60 bg-destructive/5' : ''} ${isSelected ? 'bg-primary/5' : ''}`}>
                        <td className="px-3 py-3">
                          {isSelectable ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(u.user_id)}
                            />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              u.isRootAdmin ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-primary/20'
                            }`}>
                              {u.isRootAdmin ? <Crown className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-primary" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm flex items-center gap-1.5 truncate">
                                {u.display_name || 'Chưa đặt tên'}
                                {u.isRootAdmin && (
                                  <span className="text-[9px] bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">ROOT</span>
                                )}
                                {u.isBanned && (
                                  <span className="text-[9px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full font-bold shrink-0">BANNED</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{u.email || u.user_id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              u.isRootAdmin ? 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-orange-500'
                                : u.isAdmin ? 'bg-yellow-500/20 text-yellow-500' : 'bg-primary/20 text-primary'
                            }`}>
                              {u.isRootAdmin ? 'Admin Gốc' : u.isAdmin ? 'Admin' : 'User'}
                            </span>
                            {u.isSeller && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-500">Seller</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs space-y-0.5">
                            {u.ip_address && (
                              <p className="flex items-center gap-1 text-muted-foreground">
                                <Wifi className="w-3 h-3 shrink-0" /> {u.ip_address}
                              </p>
                            )}
                            {(u.browser || u.os) && (
                              <p className="flex items-center gap-1 text-muted-foreground">
                                <Monitor className="w-3 h-3 shrink-0" /> {[u.browser, u.os].filter(Boolean).join(' • ')}
                              </p>
                            )}
                            {!u.ip_address && !u.browser && (
                              <p className="text-muted-foreground/50 italic">Chưa có dữ liệu</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-muted-foreground">
                            <p className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(u.created_at).toLocaleDateString('vi-VN')}
                            </p>
                            {u.last_active_at && (
                              <p className="text-muted-foreground/70 mt-0.5">
                                Online: {new Date(u.last_active_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {u.isBanned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-destructive/20 text-destructive">
                              <Ban className="w-3 h-3" /> Đã ban
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-green-500/20 text-green-500">
                              <CheckCircle className="w-3 h-3" /> Hoạt động
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {!u.isRootAdmin && u.user_id !== user?.id && (
                              u.isBanned ? (
                                <Button variant="ghost" size="sm" onClick={() => handleUnbanUser(u.user_id)}
                                  disabled={banning === u.user_id}
                                  className="text-green-500 hover:text-green-500 hover:bg-green-500/10"
                                  title="Gỡ ban">
                                  {banning === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => openBanDialog(u)}
                                  disabled={banning === u.user_id}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Ban người dùng">
                                  {banning === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                </Button>
                              )
                            )}
                            {isRootAdmin && !u.isRootAdmin && (
                              <Button variant="ghost" size="sm" onClick={() => handleToggleAdmin(u.user_id, u.isAdmin)}
                                disabled={togglingAdmin === u.user_id || u.user_id === user?.id}
                                className={u.isAdmin ? 'text-orange-500 hover:text-orange-500 hover:bg-orange-500/10' : 'text-green-500 hover:text-green-500 hover:bg-green-500/10'}
                                title={u.isAdmin ? 'Xóa quyền admin' : 'Thêm quyền admin'}>
                                {togglingAdmin === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : u.isAdmin ? <ShieldMinus className="w-4 h-4" /> : <ShieldPlus className="w-4 h-4" />}
                              </Button>
                            )}
                            {isRootAdmin && !u.isRootAdmin && (
                              <Button variant="ghost" size="sm" onClick={() => handleToggleSeller(u.user_id, !!u.isSeller)}
                                disabled={togglingAdmin === u.user_id || u.user_id === user?.id}
                                className={u.isSeller ? 'text-indigo-500 hover:text-indigo-500 hover:bg-indigo-500/10' : 'text-blue-500 hover:text-blue-500 hover:bg-blue-500/10'}
                                title={u.isSeller ? 'Gỡ seller' : 'Thêm seller'}>
                                {togglingAdmin === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="w-4 h-4" />}
                              </Button>
                            )}
                            {!u.isRootAdmin && u.user_id !== user?.id && (isRootAdmin || !u.isAdmin) && (
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.user_id)}
                                disabled={deleting === u.user_id}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                {deleting === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="sm:hidden space-y-3">
              {filteredUsers.map((u) => {
                const isSelectable = !u.isRootAdmin && u.user_id !== user?.id;
                const isSelected = selectedIds.has(u.user_id);
                return (
                  <div key={u.user_id} className={`glass rounded-xl p-4 ${u.isRootAdmin ? 'border border-orange-500/50' : ''} ${u.isBanned ? 'opacity-60 border-destructive/50' : ''} ${isSelected ? 'border-primary/50 bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                      {isSelectable && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(u.user_id)}
                          className="shrink-0"
                        />
                      )}
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                        u.isRootAdmin ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-primary/20'
                      }`}>
                        {u.isRootAdmin ? <Crown className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
                          {u.display_name || 'Chưa đặt tên'}
                          {u.isRootAdmin && <span className="text-[9px] bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">ROOT</span>}
                          {u.isBanned && <span className="text-[9px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full font-bold">BANNED</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email || u.user_id.slice(0, 8)}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            u.isRootAdmin ? 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-orange-500'
                              : u.isAdmin ? 'bg-yellow-500/20 text-yellow-500' : 'bg-primary/20 text-primary'
                          }`}>
                            {u.isRootAdmin ? 'Admin Gốc' : u.isAdmin ? 'Admin' : 'User'}
                          </span>
                          {u.isSeller && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-500">Seller</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 mb-3 pl-14">
                      {u.ip_address && (
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <Wifi className="w-3 h-3" /> {u.ip_address}
                        </p>
                      )}
                      {(u.browser || u.os) && (
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <Monitor className="w-3 h-3" /> {[u.browser, u.os].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3 h-3" /> Tạo: {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      {u.isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/20 text-destructive">
                          <Ban className="w-3 h-3" /> Đã ban
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-500">
                          <CheckCircle className="w-3 h-3" /> Hoạt động
                        </span>
                      )}
                      <div className="flex gap-1">
                        {!u.isRootAdmin && u.user_id !== user?.id && (
                          u.isBanned ? (
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleUnbanUser(u.user_id)} disabled={banning === u.user_id}>
                              {banning === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openBanDialog(u)} disabled={banning === u.user_id}>
                              {banning === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="w-4 h-4 text-destructive" />}
                            </Button>
                          )
                        )}
                        {isRootAdmin && !u.isRootAdmin && (
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleToggleAdmin(u.user_id, u.isAdmin)} disabled={togglingAdmin === u.user_id || u.user_id === user?.id}>
                            {togglingAdmin === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : u.isAdmin ? <ShieldMinus className="w-4 h-4 text-orange-500" /> : <ShieldPlus className="w-4 h-4 text-green-500" />}
                          </Button>
                        )}
                        {isRootAdmin && !u.isRootAdmin && (
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleToggleSeller(u.user_id, !!u.isSeller)} disabled={togglingAdmin === u.user_id || u.user_id === user?.id}>
                            {togglingAdmin === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className={`w-4 h-4 ${u.isSeller ? 'text-indigo-500' : 'text-blue-500'}`} />}
                          </Button>
                        )}
                        {!u.isRootAdmin && u.user_id !== user?.id && (isRootAdmin || !u.isAdmin) && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => handleDeleteUser(u.user_id)} disabled={deleting === u.user_id}>
                            {deleting === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'Không tìm thấy người dùng nào' : 'Chưa có người dùng nào'}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Single Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Ban người dùng
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ban <strong>{banTargetUser?.display_name || banTargetUser?.email}</strong>? Người dùng sẽ không thể truy cập website nữa.
            </p>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Lý do ban</label>
              <Textarea
                placeholder="Nhập lý do ban (VD: Vi phạm quy định, spam...)"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={banning !== null}>
              {banning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
              Xác nhận ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Ban Dialog */}
      <Dialog open={bulkBanDialogOpen} onOpenChange={setBulkBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Ban hàng loạt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ban <strong>{selectedUsers.filter(u => !u.isBanned).length}</strong> người dùng? Tất cả sẽ không thể truy cập website nữa.
            </p>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Lý do ban</label>
              <Textarea
                placeholder="Nhập lý do ban (VD: Vi phạm quy định, spam...)"
                value={bulkBanReason}
                onChange={(e) => setBulkBanReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkBanDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleBulkBan} disabled={bulkProcessing}>
              {bulkProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
              Xác nhận ban {selectedUsers.filter(u => !u.isBanned).length} người
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
