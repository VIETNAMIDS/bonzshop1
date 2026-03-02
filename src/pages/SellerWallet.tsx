import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { 
  Wallet, ArrowLeft, Loader2, Coins, TrendingUp, 
  Upload, Send, Clock, CheckCircle, XCircle, Image as ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SellerCoins {
  balance: number;
  total_earned: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_qr_url: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function SellerWallet() {
  const { user, sellerProfile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sellerCoins, setSellerCoins] = useState<SellerCoins | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_qr_url: '',
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (!sellerProfile) {
        navigate('/user-profile');
        return;
      }
      fetchData();
    }
  }, [user, sellerProfile, authLoading, navigate]);

  const fetchData = async () => {
    if (!sellerProfile?.id) return;
    
    try {
      // Fetch seller coins
      const { data: coinsData, error: coinsError } = await supabase
        .from('seller_coins')
        .select('balance, total_earned')
        .eq('seller_id', sellerProfile.id)
        .maybeSingle();

      if (coinsError) throw coinsError;
      
      setSellerCoins(coinsData || { balance: 0, total_earned: 0 });

      // Fetch withdrawal history
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('seller_id', sellerProfile.id)
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;
      setWithdrawals(withdrawalsData || []);

      // Pre-fill bank info from seller profile
      if (sellerProfile.bank_name) {
        setFormData(prev => ({
          ...prev,
          bank_name: sellerProfile.bank_name || '',
          bank_account_name: sellerProfile.bank_account_name || '',
          bank_account_number: sellerProfile.bank_account_number || '',
          bank_qr_url: sellerProfile.bank_qr_url || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File quá lớn (tối đa 5MB)');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `withdrawals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bank-qr')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('bank-qr')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, bank_qr_url: urlData.publicUrl }));
      toast.success('Đã upload mã QR');
    } catch (error) {
      console.error('Error uploading QR:', error);
      toast.error('Không thể upload ảnh');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseInt(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Vui lòng nhập số xu hợp lệ');
      return;
    }

    if (!sellerCoins || amount > sellerCoins.balance) {
      toast.error('Số dư không đủ để rút');
      return;
    }

    if (!formData.bank_name.trim() || !formData.bank_account_name.trim() || !formData.bank_account_number.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin ngân hàng');
      return;
    }

    if (!formData.bank_qr_url) {
      toast.error('Vui lòng upload mã QR ngân hàng');
      return;
    }

    setSubmitting(true);
    try {
      // Create withdrawal request (coins will be deducted when admin approves)
      const { data: withdrawal, error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          seller_id: sellerProfile?.id,
          amount: amount,
          status: 'pending',
          bank_name: formData.bank_name.trim(),
          bank_account_name: formData.bank_account_name.trim(),
          bank_account_number: formData.bank_account_number.trim(),
          bank_qr_url: formData.bank_qr_url,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Send Telegram notification
      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            type: 'withdrawal_request',
            sellerName: sellerProfile?.display_name,
            userEmail: user?.email,
            amount: amount,
            bankName: formData.bank_name,
            bankAccountName: formData.bank_account_name,
            bankAccountNumber: formData.bank_account_number,
            bankQrUrl: formData.bank_qr_url,
            withdrawalId: withdrawal?.id,
          }
        });
      } catch (teleErr) {
        console.log('Telegram notification failed:', teleErr);
      }

      toast.success('Đã gửi yêu cầu rút tiền! Admin sẽ xử lý sớm.');
      setShowWithdrawForm(false);
      setFormData(prev => ({ ...prev, amount: '' }));
      fetchData();
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast.error('Không thể gửi yêu cầu rút tiền');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50"><Clock className="h-3 w-3 mr-1" /> Đang chờ</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50"><CheckCircle className="h-3 w-3 mr-1" /> Đã duyệt</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/50"><XCircle className="h-3 w-3 mr-1" /> Từ chối</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/user-profile')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Ví của tôi
            </h1>
            <p className="text-sm text-muted-foreground">Quản lý thu nhập và rút tiền</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Balance Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="glass border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <Coins className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Số dư hiện tại</p>
                    <p className="text-2xl font-bold text-primary">
                      {(sellerCoins?.balance || 0).toLocaleString('vi-VN')}
                    </p>
                    <p className="text-xs text-muted-foreground">xu</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng thu nhập</p>
                    <p className="text-2xl font-bold text-green-500">
                      {(sellerCoins?.total_earned || 0).toLocaleString('vi-VN')}
                    </p>
                    <p className="text-xs text-muted-foreground">xu</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Withdraw Button */}
          {!showWithdrawForm && (
            <Button 
              variant="gradient" 
              className="w-full h-14 text-lg"
              onClick={() => setShowWithdrawForm(true)}
              disabled={(sellerCoins?.balance || 0) <= 0}
            >
              <Send className="h-5 w-5 mr-2" />
              Rút tiền
            </Button>
          )}

          {/* Withdraw Form */}
          {showWithdrawForm && (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Yêu cầu rút tiền
                </CardTitle>
                <CardDescription>
                  Điền thông tin để rút xu về tài khoản ngân hàng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Số xu cần rút *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder={`Tối đa: ${sellerCoins?.balance || 0}`}
                      max={sellerCoins?.balance || 0}
                      min={1}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Tối đa: {sellerCoins?.balance || 0} xu
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Tên ngân hàng *</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="VD: MB Bank, Vietcombank..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_account_name">Tên chủ tài khoản *</Label>
                    <Input
                      id="bank_account_name"
                      value={formData.bank_account_name}
                      onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                      placeholder="NGUYEN VAN A"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_account_number">Số tài khoản *</Label>
                    <Input
                      id="bank_account_number"
                      value={formData.bank_account_number}
                      onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                      placeholder="1234567890"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mã QR ngân hàng *</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleQrUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {formData.bank_qr_url ? (
                      <div className="relative">
                        <img 
                          src={formData.bank_qr_url} 
                          alt="Bank QR" 
                          className="w-full max-w-[200px] rounded-lg border border-border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          Đổi ảnh
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-24 border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Upload mã QR</span>
                          </div>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowWithdrawForm(false)}
                    >
                      Hủy
                    </Button>
                    <Button 
                      type="submit" 
                      variant="gradient" 
                      className="flex-1"
                      disabled={submitting || !formData.bank_qr_url}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Gửi yêu cầu
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Withdrawal History */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Lịch sử rút tiền
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Chưa có yêu cầu rút tiền nào
                </p>
              ) : (
                <div className="space-y-3">
                  {withdrawals.map((w) => (
                    <div 
                      key={w.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                    >
                      <div>
                        <p className="font-medium">{w.amount.toLocaleString('vi-VN')} xu</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(w.created_at).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {w.admin_note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ghi chú: {w.admin_note}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(w.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
