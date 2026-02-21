import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Save, X, Loader2, User, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { adminAccountsApi, verifyAdminApi } from '@/hooks/useAdminApi';
import { ImageUploadInput } from '@/components/ui/image-upload-input';

interface Account {
  id: string;
  title: string;
  description: string | null;
  account_username: string;
  account_password: string;
  account_email: string | null;
  account_phone: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_sold: boolean;
  seller_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Seller {
  id: string;
  display_name: string;
  bank_name: string | null;
  bank_account_number: string | null;
}

// Super admin email - can see all accounts
const SUPER_ADMIN_EMAIL = 'adminvip@gmail.com';

export default function AdminAccounts() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [currentSellerId, setCurrentSellerId] = useState<string | null>(null);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    account_username: '',
    account_password: '',
    account_email: '',
    account_phone: '',
    price: '',
    category: '',
    image_url: '',
    seller_id: '',
    requires_buyer_email: false,
  });

  // Verify admin status via backend - SECURE
  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      const isAdmin = await verifyAdminApi();
      if (!isAdmin) {
        toast({
          title: 'Không có quyền truy cập',
          description: 'Bạn không có quyền admin',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsVerifiedAdmin(true);
    };

    if (!authLoading) {
      verifyAdmin();
    }
  }, [user, authLoading, navigate, toast]);

  useEffect(() => {
    if (isVerifiedAdmin && user) {
      fetchCurrentSeller();
      fetchAccounts();
      fetchCategories();
      fetchSellers();
    }
  }, [isVerifiedAdmin, user]);

  const fetchCurrentSeller = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setCurrentSellerId(data.id);
      }
    } catch (err) {
      console.error('Error fetching current seller:', err);
    }
  };

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('id, display_name, bank_name, bank_account_number')
        .eq('is_profile_complete', true)
        .order('display_name');

      if (error) throw error;
      setSellers(data || []);
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      if (data && data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchAccounts = async () => {
    try {
      let query = supabase
        .from('accounts')
        .select('id, title, description, account_username, account_password, account_email, account_phone, price, category, image_url, is_sold, seller_id')
        .order('created_at', { ascending: false });

      // Non-super admins only see their own accounts
      if (!isSuperAdmin && currentSellerId) {
        query = query.eq('seller_id', currentSellerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when currentSellerId changes
  useEffect(() => {
    if (isVerifiedAdmin && currentSellerId !== null) {
      fetchAccounts();
    }
  }, [currentSellerId, isSuperAdmin]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      account_username: '',
      account_password: '',
      account_email: '',
      account_phone: '',
      price: '',
      category: categories[0]?.name || '',
      image_url: '',
      seller_id: '',
      requires_buyer_email: false,
    });
    setEditingAccount(null);
    setShowForm(false);
  };

  const handleEdit = async (account: Account) => {
    try {
      // Get full details including sensitive info via secure API
      const details = await adminAccountsApi.getDetails(account.id);
      setEditingAccount(details);
      setFormData({
        title: details.title,
        description: details.description || '',
        account_username: details.account_username,
        account_password: details.account_password,
        account_email: details.account_email || '',
        account_phone: details.account_phone || '',
        price: details.price.toString(),
        category: details.category,
        image_url: details.image_url || '',
        seller_id: details.seller_id || '',
        requires_buyer_email: details.requires_buyer_email || false,
      });
      setShowForm(true);
    } catch (err) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin tài khoản',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Validate seller selection
      if (!formData.seller_id) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn người đăng (Seller)',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const isActivationType = formData.requires_buyer_email;
      const accountData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        account_username: isActivationType ? 'activation' : formData.account_username.trim(),
        account_password: isActivationType ? 'activation' : formData.account_password,
        account_email: isActivationType ? undefined : (formData.account_email.trim() || undefined),
        account_phone: isActivationType ? undefined : (formData.account_phone.trim() || undefined),
        price: parseFloat(formData.price) || 0,
        category: formData.category,
        image_url: formData.image_url.trim() || undefined,
        seller_id: formData.seller_id,
        requires_buyer_email: formData.requires_buyer_email,
      };

      if (editingAccount) {
        await adminAccountsApi.update(editingAccount.id, accountData);
        toast({ title: 'Cập nhật thành công!' });
      } else {
        await adminAccountsApi.create(accountData);
        toast({ title: 'Thêm tài khoản thành công!' });
      }

      resetForm();
      fetchAccounts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast({
        title: 'Lỗi',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa tài khoản này?')) return;

    try {
      await adminAccountsApi.delete(id);
      toast({ title: 'Đã xóa tài khoản' });
      fetchAccounts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast({
        title: 'Lỗi khi xóa',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleMarkSold = async (id: string, isSold: boolean) => {
    try {
      await adminAccountsApi.markAsSold(id, isSold);
      toast({ title: isSold ? 'Đã đánh dấu đã bán' : 'Đã hủy trạng thái bán' });
      fetchAccounts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast({
        title: 'Lỗi',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const maskPassword = (password: string) => {
    return '•'.repeat(Math.min(password.length, 12));
  };

  if (authLoading || isLoading || !isVerifiedAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Quản lý Up Acc</h1>
              <p className="text-sm text-muted-foreground">Bán tài khoản game/dịch vụ</p>
            </div>
          </div>

          <Button 
            variant="gradient" 
            className="gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Thêm tài khoản
          </Button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="glass rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {editingAccount ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
                </h2>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tiêu đề *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Tài khoản Netflix Premium"
                    required
                    className="h-12"
                  />
                </div>

                {!formData.requires_buyer_email && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Tên đăng nhập *</label>
                        <Input
                          value={formData.account_username}
                          onChange={(e) => setFormData({ ...formData, account_username: e.target.value })}
                          placeholder="username"
                          required
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Mật khẩu *</label>
                        <Input
                          value={formData.account_password}
                          onChange={(e) => setFormData({ ...formData, account_password: e.target.value })}
                          placeholder="••••••••"
                          required
                          className="h-12"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Email TK</label>
                        <Input
                          type="email"
                          value={formData.account_email}
                          onChange={(e) => setFormData({ ...formData, account_email: e.target.value })}
                          placeholder="email@example.com"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">SĐT TK</label>
                        <Input
                          value={formData.account_phone}
                          onChange={(e) => setFormData({ ...formData, account_phone: e.target.value })}
                          placeholder="0123456789"
                          className="h-12"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Giá (VNĐ) *</label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="100000"
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Danh mục</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="flex h-12 w-full rounded-lg border border-border bg-secondary px-4 py-2 text-foreground focus:ring-2 focus:ring-primary"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Seller selection */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Người đăng (Seller) *</label>
                  <select
                    value={formData.seller_id}
                    onChange={(e) => setFormData({ ...formData, seller_id: e.target.value })}
                    className="flex h-12 w-full rounded-lg border border-border bg-secondary px-4 py-2 text-foreground focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">-- Chọn người đăng --</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.display_name} - {seller.bank_name || 'Chưa có NH'} ({seller.bank_account_number || 'N/A'})
                      </option>
                    ))}
                  </select>

                  {/* Hiển thị TK ngân hàng sau khi chọn */}
                  {formData.seller_id ? (() => {
                    const selected = sellers.find((s) => s.id === formData.seller_id);
                    if (!selected) return null;
                    return (
                      <div className="mt-2 grid gap-2">
                        <div className="grid gap-1">
                          <span className="text-xs text-muted-foreground">Ngân hàng</span>
                          <Input value={selected.bank_name || ''} readOnly className="h-11" />
                        </div>
                        <div className="grid gap-1">
                          <span className="text-xs text-muted-foreground">Số tài khoản</span>
                          <Input value={selected.bank_account_number || ''} readOnly className="h-11" />
                        </div>
                      </div>
                    );
                  })() : null}

                  {sellers.length === 0 && (
                    <p className="text-xs text-destructive">Chưa có seller nào hoàn tất hồ sơ.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả chi tiết về tài khoản..."
                    rows={2}
                    className="flex w-full rounded-lg border border-border bg-secondary px-4 py-2 text-foreground focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <ImageUploadInput
                  value={formData.image_url}
                  onChange={(value) => setFormData({ ...formData, image_url: value })}
                  label="Hình ảnh"
                  placeholder="https://..."
                  bucket="images"
                  folder="accounts"
                />

                {/* Requires buyer email checkbox */}
                <label 
                  htmlFor="requires_buyer_email" 
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/30 cursor-pointer select-none"
                  onClick={(e) => {
                    e.preventDefault();
                    setFormData(prev => ({ ...prev, requires_buyer_email: !prev.requires_buyer_email }));
                  }}
                >
                  <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${formData.requires_buyer_email ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {formData.requires_buyer_email && (
                      <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium">📧 Cần email kích hoạt</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Số lượng không giới hạn. Khách chỉ cần nhập Gmail + chọn số tháng, chờ 30p-1h để kích hoạt.
                    </p>
                  </div>
                </label>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 h-12">
                    Hủy
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-1 h-12" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        {editingAccount ? 'Cập nhật' : 'Thêm'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Accounts List */}
        <div className="space-y-3">
          {accounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Chưa có tài khoản nào
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className={`glass rounded-xl p-4 ${account.is_sold ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {account.image_url ? (
                    <img
                      src={account.image_url}
                      alt={account.title}
                      className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{account.title}</p>
                      {account.is_sold && (
                        <Badge variant="destructive" className="text-xs">ĐÃ BÁN</Badge>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">TK:</span>
                        <code className="bg-secondary px-2 py-0.5 rounded text-xs">{account.account_username}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">MK:</span>
                        <code className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">
                          {visiblePasswords.has(account.id) ? account.account_password : maskPassword(account.account_password)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => togglePasswordVisibility(account.id)}
                        >
                          {visiblePasswords.has(account.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {account.account_email && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="text-xs truncate">{account.account_email}</span>
                        </div>
                      )}
                      {account.account_phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">SĐT:</span>
                          <span className="text-xs">{account.account_phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{account.category}</Badge>
                      <span className="text-sm text-primary font-bold">{formatPrice(account.price)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button 
                      variant={account.is_sold ? "outline" : "default"} 
                      size="sm" 
                      className="h-8 text-xs gap-1"
                      onClick={() => handleMarkSold(account.id, !account.is_sold)}
                    >
                      {account.is_sold ? (
                        <>
                          <XCircle className="h-3 w-3" />
                          Hủy bán
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Đã bán
                        </>
                      )}
                    </Button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(account)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
