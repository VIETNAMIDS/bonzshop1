import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { PageWrapper } from '@/components/layout/PageWrapper';
import {
  User, Mail, Lock, Store, Coins, Loader2,
   ArrowLeft, Edit2, Save, X, CheckCircle, AlertCircle, Wallet, History, Phone, Camera
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
 import { ReferralCodeInput } from '@/components/referral/ReferralCodeInput';

interface UserProfileData {
  display_name: string;
  email: string;
}

export default function UserProfile() {
  const { user, isAdmin, sellerProfile, refreshSellerProfile, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
   
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userCoinBalance, setUserCoinBalance] = useState(0);
  const [showSellerRegistration, setShowSellerRegistration] = useState(false);
  const [registeringSeller, setRegisteringSeller] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
   const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [emailOtpStep, setEmailOtpStep] = useState<'old' | 'new'>('old');
  const [emailOtp, setEmailOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [pendingEmailChange, setPendingEmailChange] = useState('');
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    phone: '',
    avatar_url: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserCoinBalance();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  const fetchUserProfile = async () => {
    try {
      const email = user?.email || '';

      // Fetch from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, phone')
        .eq('user_id', user?.id)
        .maybeSingle();

      const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

      setFormData({
        display_name: displayName,
        email: email,
        phone: profile?.phone || '',
        avatar_url: profile?.avatar_url || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Không thể tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCoinBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching coin balance:', error);
      } else if (data) {
        setUserCoinBalance(data.balance);
      } else {
        setUserCoinBalance(0);
      }
    } catch (err) {
      console.error('Error fetching coin balance:', err);
      setUserCoinBalance(0);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedDisplayName = formData.display_name.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedDisplayName) {
      toast.error('Vui lòng nhập tên hiển thị');
      return;
    }

    if (!trimmedEmail) {
      toast.error('Vui lòng nhập email hợp lệ');
      return;
    }

    // If email is changing, require OTP verification on old email first
    if (trimmedEmail !== user?.email) {
      setPendingEmailChange(trimmedEmail);
      setShowEmailOtp(true);
      setEmailOtp('');
      return;
    }

    await saveProfileData(trimmedDisplayName, trimmedEmail);
  };

  const saveProfileData = async (displayName: string, newEmail: string, emailChanged = false) => {
    setSaving(true);
    try {
      const updatePayload: {
        email?: string;
        password?: string;
        data: Record<string, string>;
      } = {
        data: { display_name: displayName }
      };

      if (emailChanged) {
        updatePayload.email = newEmail;
      }

      // Update basic profile info (name/email) in auth
      const { error } = await supabase.auth.updateUser(updatePayload);
      if (error) throw error;

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          phone: formData.phone.trim() || null,
          avatar_url: formData.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (profileError) {
        console.error('Error updating profile table:', profileError);
      }

      // If changing password
      if (formData.new_password) {
        if (formData.new_password !== formData.confirm_password) {
          toast.error('Mật khẩu xác nhận không khớp');
          setSaving(false);
          return;
        }

        if (formData.new_password.length < 6) {
          toast.error('Mật khẩu phải có ít nhất 6 ký tự');
          setSaving(false);
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.new_password
        });

        if (passwordError) throw passwordError;
      }

      toast.success(emailChanged ? 'Đã cập nhật hồ sơ! Email mới sẽ được cập nhật sau khi xác nhận.' : 'Đã cập nhật hồ sơ!');
      setEditing(false);
      await refreshUserProfile();
       
      setFormData(prev => ({
        ...prev,
        display_name: displayName,
        email: emailChanged ? user?.email || '' : newEmail,
        current_password: '',
        new_password: '',
        confirm_password: '',
      }));
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Không thể cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmailOtp = async () => {
    const targetEmail = emailOtpStep === 'old' ? user?.email : pendingEmailChange;
    if (!targetEmail) return;
    setOtpSending(true);
    try {
      const response = await supabase.functions.invoke('send-otp', {
        body: { email: targetEmail, action: 'send' }
      });

      if (response.error) throw response.error;
      const data = response.data;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(emailOtpStep === 'old' 
        ? 'Đã gửi mã xác thực đến email hiện tại của bạn' 
        : 'Đã gửi mã xác thực đến email mới');
      setOtpCooldown(60);
      const interval = setInterval(() => {
        setOtpCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Không thể gửi mã xác thực');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const targetEmail = emailOtpStep === 'old' ? user?.email : pendingEmailChange;
    if (!targetEmail || !emailOtp) return;
    setOtpVerifying(true);
    try {
      const response = await supabase.functions.invoke('send-otp', {
        body: { email: targetEmail, action: 'verify', otp: emailOtp }
      });

      if (response.error) throw response.error;
      const data = response.data;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.verified) {
        if (emailOtpStep === 'old') {
          // Step 1 done - move to step 2: verify new email
          setEmailOtpStep('new');
          setEmailOtp('');
          setOtpCooldown(0);
          toast.success('Xác thực email cũ thành công! Bây giờ hãy xác thực email mới.');
        } else {
          // Step 2 done - both verified, update email
          setShowEmailOtp(false);
          setEmailOtp('');
          toast.success('Xác thực thành công! Đang cập nhật email...');
          await saveProfileData(formData.display_name.trim(), pendingEmailChange, true);
        }
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Không thể xác thực mã OTP');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleCancel = () => {
    fetchUserProfile(); // Reset form data
    setEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ảnh không được vượt quá 2MB');
      return;
    }

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(`avatars/${fileName}`, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(`avatars/${fileName}`);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Đã tải ảnh lên thành công!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Không thể tải ảnh lên');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSellerRegistration = async () => {
    const SELLER_REGISTRATION_COST = 10;

    if (userCoinBalance < SELLER_REGISTRATION_COST) {
      toast.error(`Không đủ xu! Bạn cần ${SELLER_REGISTRATION_COST} xu để đăng ký seller.`);
      navigate('/buy-coins');
      return;
    }

    setRegisteringSeller(true);
    try {
      // Check if seller profile already exists
      const { data: existingSeller, error: checkError } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSeller) {
        toast.error('Bạn đã đăng ký làm seller rồi!');
        setShowSellerRegistration(false);
        return;
      }

      // Check if user has enough coins
      const { data: userCoins, error: coinsError } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (coinsError) {
        console.error('Error checking user coins:', coinsError);
        throw new Error('Không thể kiểm tra số dư xu');
      }

      if (!userCoins) {
        toast.error('Tài khoản chưa có số dư xu. Vui lòng nạp xu trước.');
        navigate('/buy-coins');
        return;
      }

      if (userCoins.balance < SELLER_REGISTRATION_COST) {
        toast.error(`Không đủ xu! Bạn cần ${SELLER_REGISTRATION_COST} xu để đăng ký seller.`);
        navigate('/buy-coins');
        return;
      }

      // Create seller profile first - try with minimal required fields
      const sellerData = {
        user_id: user?.id,
        display_name: formData.display_name || user?.email?.split('@')[0] || 'Seller',
      };

      console.log('Creating seller profile with data:', sellerData);

      const { error: sellerError } = await supabase
        .from('sellers')
        .insert(sellerData);

      if (sellerError) {
        console.error('Error creating seller profile:', sellerError);
        toast.error(`Lỗi tạo hồ sơ seller: ${sellerError.message}`);
        throw sellerError;
      }

      // Then deduct coins from user balance
      const { error: coinError } = await supabase
        .from('user_coins')
        .update({
          balance: userCoins.balance - SELLER_REGISTRATION_COST,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (coinError) throw coinError;

       // Log to coin_history
       await supabase.from('coin_history').insert({
         user_id: user?.id,
         amount: -SELLER_REGISTRATION_COST,
         type: 'seller_registration',
         description: 'Phí đăng ký trở thành Seller'
       });
 
      // Update local balance
      setUserCoinBalance(prev => prev - SELLER_REGISTRATION_COST);

      toast.success(`Đăng ký seller thành công! Đã trừ ${SELLER_REGISTRATION_COST} xu.`);
      setShowSellerRegistration(false);

      // Refresh auth context to update seller status
      await refreshSellerProfile();

      // Redirect to seller setup
      navigate('/seller-setup');
    } catch (error: any) {
      console.error('Error registering seller:', error);
      toast.error('Không thể đăng ký seller. Vui lòng thử lại.');
    } finally {
      setRegisteringSeller(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSeller = !!sellerProfile;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageWrapper>
      <div className="container mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Hồ sơ của tôi</h1>
            <p className="text-sm text-muted-foreground">Quản lý thông tin cá nhân và tài khoản</p>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="shrink-0">
              <Edit2 className="h-4 w-4 mr-2" />
              Chỉnh sửa
            </Button>
          )}
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Status Card */}
          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="h-16 w-16 rounded-full object-cover border-2 border-primary/30" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  {editing && (
                    <label className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors">
                      <Camera className="h-3 w-3 text-primary-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                    </label>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{formData.display_name || 'Người dùng'}</h2>
                  <p className="text-sm text-muted-foreground">{formData.email}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {isAdmin && (
                    <Badge className="bg-red-500/20 text-red-500 border-red-500/50">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {isSeller && (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                      <Store className="h-3 w-3 mr-1" />
                      Seller
                    </Badge>
                  )}
                   <div 
                     className="flex items-center gap-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                     onClick={() => navigate('/coin-history')}
                   >
                    <Coins className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{userCoinBalance} xu</span>
                     <History className="h-3 w-3 text-muted-foreground ml-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Thông tin cá nhân
              </CardTitle>
              <CardDescription>
                Thông tin cơ bản của tài khoản
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Tên hiển thị *</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="Nhập tên hiển thị"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email đăng nhập *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Nhập email của bạn"
                    />
                    <p className="text-xs text-muted-foreground">
                      Hệ thống sẽ gửi email xác nhận khi bạn thay đổi địa chỉ đăng nhập.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium mb-3">Đổi mật khẩu (tùy chọn)</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="new_password">Mật khẩu mới</Label>
                        <Input
                          id="new_password"
                          type="password"
                          value={formData.new_password}
                          onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                          placeholder="Nhập mật khẩu mới"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          value={formData.confirm_password}
                          onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                          placeholder="Nhập lại mật khẩu mới"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tên hiển thị</p>
                      <p className="font-medium">{formData.display_name || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{formData.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Số điện thoại</p>
                      <p className="font-medium">{formData.phone || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mật khẩu</p>
                      <p className="font-medium">••••••••</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

           {/* Referral Code Input */}
           <ReferralCodeInput />
 
          {/* Seller Registration */}
          {isSeller ? (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Store className="h-5 w-5" />
                  Bạn đã đăng ký Seller
                </CardTitle>
                <CardDescription>
                  Bạn có thể truy cập khu vực Seller để đăng bài và quản lý sản phẩm.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex flex-col gap-3">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Chúc mừng! Tài khoản của bạn đã trở thành Seller. Tiếp tục đăng tải sản phẩm để kiếm thêm thu nhập.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate('/seller-accounts')}
                    >
                      <Store className="h-4 w-4 mr-2" />
                      Quản lý sản phẩm
                    </Button>
                    <Button
                      variant="gradient"
                      className="flex-1"
                      onClick={() => navigate('/seller-wallet')}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Ví của tôi
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            !isAdmin && (
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    Trở thành Seller
                  </CardTitle>
                  <CardDescription>
                    Đăng ký làm người bán để có thể đăng tải sản phẩm trên Bonz Shop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Coins className="h-6 w-6 text-orange-500" />
                      <div>
                        <p className="font-medium text-orange-600">Phí đăng ký: 10 xu (10.000 VNĐ)</p>
                        <p className="text-sm text-muted-foreground">Một lần duy nhất</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Quyền lợi khi trở thành Seller:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                      <li>• Đăng bán tài khoản game/dịch vụ</li>
                      <li>• Quản lý sản phẩm của mình</li>
                      <li>• Nhận thanh toán trực tiếp</li>
                      <li>• Không thấy sản phẩm của seller khác</li>
                    </ul>
                    <Button
                      onClick={() => setShowSellerRegistration(true)}
                      className="w-full"
                      variant="gradient"
                    >
                      <Store className="h-4 w-4 mr-2" />
                      Đăng ký làm Seller
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Edit Actions */}
          {editing && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Hủy
              </Button>
              <Button variant="gradient" className="flex-1" onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Seller Registration Confirmation Dialog */}
      <Dialog open={showSellerRegistration} onOpenChange={setShowSellerRegistration}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Xác nhận đăng ký Seller
            </DialogTitle>
            <DialogDescription>
              Bạn muốn trở thành Seller với chi phí 10 xu?
            </DialogDescription>
          </DialogHeader>

            <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <div className="flex justify-between px-2 mb-2">
                <div className="text-sm text-muted-foreground">Phí đăng ký:</div>
                <div className="font-medium">10 xu (10.000 VNĐ)</div>
              </div>
              <div className="flex justify-between px-2 mb-2">
                <div className="text-sm text-muted-foreground">Số dư hiện tại:</div>
                <div className="font-medium">{userCoinBalance} xu ({(userCoinBalance * 1000).toLocaleString('vi-VN')} VNĐ)</div>
              </div>
              <div className="flex justify-between px-2">
                <div className="text-sm text-muted-foreground">Số dư sau đăng ký:</div>
                <div className="font-medium">{userCoinBalance - 10} xu ({((userCoinBalance - 10) * 1000).toLocaleString('vi-VN')} VNĐ)</div>
              </div>
            </div>

            {userCoinBalance < 10 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Bạn không đủ xu để đăng ký seller. Vui lòng nạp thêm xu.
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-600">
              Sau khi đăng ký, bạn sẽ được chuyển đến trang thiết lập hồ sơ seller.
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowSellerRegistration(false)} className="w-full sm:w-auto">
              Hủy
            </Button>
            {userCoinBalance >= 10 ? (
              <Button
                onClick={handleSellerRegistration}
                disabled={registeringSeller}
                className="w-full sm:w-auto"
              >
                {registeringSeller ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Xác nhận đăng ký
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setShowSellerRegistration(false);
                  navigate('/buy-coins');
                }}
                className="w-full sm:w-auto"
              >
                <Coins className="h-4 w-4 mr-2" />
                Nạp xu
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Change OTP Dialog */}
      <Dialog open={showEmailOtp} onOpenChange={setShowEmailOtp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {emailOtpStep === 'old' ? 'Bước 1: Xác thực email hiện tại' : 'Bước 2: Xác thực email mới'}
            </DialogTitle>
            <DialogDescription>
              {emailOtpStep === 'old' 
                ? 'Để bảo mật, chúng tôi cần xác thực qua email hiện tại của bạn trước khi thay đổi.'
                : 'Nhập mã xác thực được gửi đến email mới để xác nhận quyền sở hữu.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 justify-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${emailOtpStep === 'old' ? 'bg-primary text-primary-foreground' : 'bg-green-500 text-white'}`}>
                {emailOtpStep === 'old' ? '1' : '✓'}
              </div>
              <div className="w-8 h-0.5 bg-muted" />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${emailOtpStep === 'new' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email hiện tại:</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email mới:</span>
                <span className="font-medium text-primary">{pendingEmailChange}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{emailOtpStep === 'old' ? 'Mã xác thực (gửi đến email cũ)' : 'Mã xác thực (gửi đến email mới)'}</Label>
              <div className="flex gap-2">
                <Input
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  placeholder="Nhập mã 6 số"
                  maxLength={6}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleSendEmailOtp}
                  disabled={otpSending || otpCooldown > 0}
                  className="shrink-0"
                >
                  {otpSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : otpCooldown > 0 ? (
                    `${otpCooldown}s`
                  ) : (
                    'Gửi mã'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {emailOtpStep === 'old' 
                  ? 'Nhấn "Gửi mã" để nhận mã xác thực qua email hiện tại.'
                  : 'Nhấn "Gửi mã" để nhận mã xác thực qua email mới.'}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEmailOtp(false)} className="w-full sm:w-auto">
              Hủy
            </Button>
            <Button
              onClick={handleVerifyEmailOtp}
              disabled={otpVerifying || emailOtp.length < 6}
              className="w-full sm:w-auto"
            >
              {otpVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Đang xác thực...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {emailOtpStep === 'old' ? 'Xác nhận & Tiếp tục' : 'Xác nhận thay đổi'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageWrapper>
    </div>
  );
}
