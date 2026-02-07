import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Store, Building2, CreditCard, User, Phone, Loader2, QrCode, Upload, X, Coins, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const SELLER_REGISTRATION_FEE = 10; // 10 xu để đăng ký seller

export default function SellerSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userCoinBalance, setUserCoinBalance] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isNewSeller, setIsNewSeller] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    phone: '',
    bank_qr_url: '',
  });
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkSellerProfile();
      fetchUserCoinBalance();
    }
  }, [user]);

  const fetchUserCoinBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (!error && data) {
        setUserCoinBalance(data.balance);
      }
    } catch (err) {
      console.error('Error fetching coin balance:', err);
    }
  };

  const checkSellerProfile = async () => {
    try {
      const { data: seller, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking seller profile:', error);
        return;
      }

      if (seller) {
        // If profile is complete, redirect to seller accounts
        if (seller.is_profile_complete) {
          navigate('/seller/accounts');
          return;
        }
        
        // Existing seller updating profile
        setIsNewSeller(false);
        
        // Pre-fill form with existing data
        setFormData({
          display_name: seller.display_name || '',
          bank_name: seller.bank_name || '',
          bank_account_name: seller.bank_account_name || '',
          bank_account_number: seller.bank_account_number || '',
          phone: seller.phone || '',
          bank_qr_url: seller.bank_qr_url || '',
        });
        if (seller.bank_qr_url) {
          setQrPreview(seller.bank_qr_url);
        }
      } else {
        // New seller - need to pay registration fee
        setIsNewSeller(true);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn file hình ảnh');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File quá lớn. Tối đa 5MB');
        return;
      }
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const removeQrImage = () => {
    setQrFile(null);
    setQrPreview(null);
    setFormData({ ...formData, bank_qr_url: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.display_name.trim()) {
      toast.error('Vui lòng nhập tên hiển thị');
      return;
    }

    if (!formData.bank_name.trim() || !formData.bank_account_name.trim() || !formData.bank_account_number.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin ngân hàng');
      return;
    }

    // If new seller, show confirmation dialog first
    if (isNewSeller) {
      if (userCoinBalance < SELLER_REGISTRATION_FEE) {
        toast.error(`Bạn cần có ít nhất ${SELLER_REGISTRATION_FEE} xu để đăng ký làm người bán`);
        return;
      }
      setShowConfirmDialog(true);
      return;
    }

    await saveSellerProfile();
  };

  const saveSellerProfile = async () => {
    setSaving(true);
    try {
      let qrUrl = formData.bank_qr_url;

      // Upload QR if new file selected
      if (qrFile) {
        setUploading(true);
        const fileExt = qrFile.name.split('.').pop();
        const fileName = `${user?.id}/bank-qr.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('bank-qr')
          .upload(fileName, qrFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('bank-qr')
          .getPublicUrl(fileName);

        qrUrl = urlData.publicUrl;
        setUploading(false);
      }

      // If new seller, deduct coins first
      if (isNewSeller) {
        // Deduct registration fee
        const { error: coinError } = await supabase
          .from('user_coins')
          .update({ 
            balance: userCoinBalance - SELLER_REGISTRATION_FEE,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);

        if (coinError) {
          throw new Error('Không thể trừ xu. Vui lòng thử lại.');
        }

        // Create new seller record
        const { error: insertError } = await supabase
          .from('sellers')
          .insert({
            user_id: user?.id,
            display_name: formData.display_name.trim(),
            bank_name: formData.bank_name.trim(),
            bank_account_name: formData.bank_account_name.trim(),
            bank_account_number: formData.bank_account_number.trim(),
            phone: formData.phone.trim() || null,
            bank_qr_url: qrUrl || null,
            is_profile_complete: true,
          });

        if (insertError) throw insertError;

        // Add seller role
        await supabase
          .from('user_roles')
          .insert({ user_id: user?.id, role: 'seller' });

        toast.success(`Đăng ký thành công! Đã trừ ${SELLER_REGISTRATION_FEE} xu`);
      } else {
        // Update existing seller
        const { error } = await supabase
          .from('sellers')
          .update({
            display_name: formData.display_name.trim(),
            bank_name: formData.bank_name.trim(),
            bank_account_name: formData.bank_account_name.trim(),
            bank_account_number: formData.bank_account_number.trim(),
            phone: formData.phone.trim() || null,
            bank_qr_url: qrUrl || null,
            is_profile_complete: true,
          })
          .eq('user_id', user?.id);

        if (error) throw error;
        toast.success('Đã hoàn tất hồ sơ người bán!');
      }

      navigate('/seller/accounts');
    } catch (error: any) {
      console.error('Error saving seller profile:', error);
      toast.error(error.message || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
      setUploading(false);
      setShowConfirmDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg glass border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Thiết lập hồ sơ người bán</CardTitle>
          <CardDescription>
            Hoàn tất thông tin để bắt đầu đăng bán sản phẩm trên Bonz Shop
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Registration Fee Notice for New Sellers */}
          {isNewSeller && (
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-3 mb-2">
                <Coins className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Phí đăng ký người bán</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Để trở thành người bán, bạn cần trả phí <span className="text-primary font-bold">{SELLER_REGISTRATION_FEE} xu</span>
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm">Số dư của bạn:</span>
                <span className={`font-bold ${userCoinBalance >= SELLER_REGISTRATION_FEE ? 'text-green-500' : 'text-destructive'}`}>
                  {userCoinBalance} xu
                </span>
              </div>
              {userCoinBalance < SELLER_REGISTRATION_FEE && (
                <div className="mt-3 flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Bạn cần nạp thêm xu để đăng ký</span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display_name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Tên hiển thị <span className="text-destructive">*</span>
              </Label>
              <Input
                id="display_name"
                placeholder="Tên shop hoặc tên của bạn"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Tên này sẽ hiển thị cho người mua thấy
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Số điện thoại
              </Label>
              <Input
                id="phone"
                placeholder="0912345678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Thông tin thanh toán
              </h3>
              
              {/* Bank Name */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="bank_name" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Tên ngân hàng <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bank_name"
                  placeholder="VD: Vietcombank, MB Bank, Techcombank..."
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  required
                />
              </div>

              {/* Bank Account Name */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="bank_account_name">
                  Tên chủ tài khoản <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bank_account_name"
                  placeholder="NGUYEN VAN A"
                  value={formData.bank_account_name}
                  onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                  required
                />
              </div>

              {/* Bank Account Number */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="bank_account_number">
                  Số tài khoản <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bank_account_number"
                  placeholder="1234567890"
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  required
                />
              </div>

              {/* Bank QR Code */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  Mã QR ngân hàng (tùy chọn)
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  {qrPreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={qrPreview} 
                        alt="QR Preview" 
                        className="max-h-48 rounded-lg mx-auto"
                      />
                      <button
                        type="button"
                        onClick={removeQrImage}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        id="qr-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleQrFileChange}
                        className="hidden"
                      />
                      <label htmlFor="qr-upload" className="cursor-pointer block py-4">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click để upload mã QR ngân hàng
                        </p>
                      </label>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Người dùng sẽ thấy mã QR này khi nạp xu
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              variant="gradient" 
              disabled={saving || uploading || (isNewSeller && userCoinBalance < SELLER_REGISTRATION_FEE)}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Đang upload QR...' : 'Đang lưu...'}
                </>
              ) : isNewSeller ? (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  Đăng ký ({SELLER_REGISTRATION_FEE} xu)
                </>
              ) : (
                'Hoàn tất thiết lập'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Xác nhận đăng ký người bán
            </DialogTitle>
            <DialogDescription>
              Bạn sẽ được trừ <span className="text-primary font-bold">{SELLER_REGISTRATION_FEE} xu</span> để đăng ký làm người bán.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số dư hiện tại:</span>
              <span className="font-bold">{userCoinBalance} xu</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phí đăng ký:</span>
              <span className="font-bold text-destructive">-{SELLER_REGISTRATION_FEE} xu</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-muted-foreground">Còn lại:</span>
              <span className="font-bold text-green-500">{userCoinBalance - SELLER_REGISTRATION_FEE} xu</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Hủy
            </Button>
            <Button variant="gradient" onClick={saveSellerProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận đăng ký'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
