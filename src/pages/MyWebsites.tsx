import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Globe, 
  Plus, 
  Settings, 
  ExternalLink, 
  Coins, 
  Loader2, 
  Trash2, 
  Edit, 
  Eye,
  Palette,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ChildWebsite {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primary_color: string;
  secondary_color: string;
  banner_url: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  is_active: boolean;
  created_at: string;
}

const WEBSITE_COST = 200;

export default function MyWebsites() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [websites, setWebsites] = useState<ChildWebsite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<ChildWebsite | null>(null);
  
  // Form states
  const [websiteName, setWebsiteName] = useState('');
  const [websiteSlug, setWebsiteSlug] = useState('');
  const [websiteDescription, setWebsiteDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#8B5CF6');
  const [secondaryColor, setSecondaryColor] = useState('#D946EF');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch user websites
      const { data: websitesData, error: websitesError } = await supabase
        .from('child_websites')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (websitesError) throw websitesError;
      setWebsites(websitesData || []);

      // Fetch user coins
      const { data: coinsData } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user!.id)
        .single();
      
      setUserCoins(coinsData?.balance || 0);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
  };

  const handleNameChange = (value: string) => {
    setWebsiteName(value);
    if (!editingWebsite) {
      setWebsiteSlug(generateSlug(value));
    }
  };

  const createWebsite = async () => {
    if (!websiteName.trim() || !websiteSlug.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên và đường dẫn website',
        variant: 'destructive',
      });
      return;
    }

    if (userCoins < WEBSITE_COST) {
      toast({
        title: 'Không đủ xu',
        description: `Bạn cần ${WEBSITE_COST} xu để tạo website. Số dư hiện tại: ${userCoins} xu`,
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      // Check if slug already exists
      const { data: existingSlug } = await supabase
        .from('child_websites')
        .select('id')
        .eq('slug', websiteSlug.toLowerCase())
        .single();
      
      if (existingSlug) {
        toast({
          title: 'Đường dẫn đã tồn tại',
          description: 'Vui lòng chọn đường dẫn khác',
          variant: 'destructive',
        });
        setIsCreating(false);
        return;
      }

      // Deduct coins
      const { error: coinsError } = await supabase
        .from('user_coins')
        .update({ balance: userCoins - WEBSITE_COST })
        .eq('user_id', user!.id);
      
      if (coinsError) throw coinsError;

      // Record coin history
      await supabase.from('coin_history').insert({
        user_id: user!.id,
        amount: -WEBSITE_COST,
        type: 'purchase',
        description: `Tạo web con: ${websiteName}`,
      });

      // Create website
      const { data: newWebsite, error: websiteError } = await supabase
        .from('child_websites')
        .insert({
          owner_id: user!.id,
          name: websiteName.trim(),
          slug: websiteSlug.toLowerCase().trim(),
          description: websiteDescription.trim() || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          bank_name: bankName.trim() || null,
          bank_account_name: bankAccountName.trim() || null,
          bank_account_number: bankAccountNumber.trim() || null,
        })
        .select()
        .single();
      
      if (websiteError) throw websiteError;

      toast({
        title: '🎉 Tạo website thành công!',
        description: `Website "${websiteName}" đã được tạo. Trừ ${WEBSITE_COST} xu.`,
      });

      // Reset form
      setWebsiteName('');
      setWebsiteSlug('');
      setWebsiteDescription('');
      setPrimaryColor('#8B5CF6');
      setSecondaryColor('#D946EF');
      setBankName('');
      setBankAccountName('');
      setBankAccountNumber('');
      setIsCreateDialogOpen(false);
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error creating website:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo website',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateWebsite = async () => {
    if (!editingWebsite) return;
    
    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('child_websites')
        .update({
          name: websiteName.trim(),
          description: websiteDescription.trim() || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          bank_name: bankName.trim() || null,
          bank_account_name: bankAccountName.trim() || null,
          bank_account_number: bankAccountNumber.trim() || null,
        })
        .eq('id', editingWebsite.id);
      
      if (error) throw error;

      toast({
        title: 'Cập nhật thành công!',
        description: `Website "${websiteName}" đã được cập nhật.`,
      });

      setEditingWebsite(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error updating website:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật website',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteWebsite = async (website: ChildWebsite) => {
    if (!confirm(`Bạn có chắc muốn xóa website "${website.name}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('child_websites')
        .delete()
        .eq('id', website.id);
      
      if (error) throw error;

      toast({
        title: 'Đã xóa website',
        description: `Website "${website.name}" đã được xóa.`,
      });

      fetchData();
    } catch (error: any) {
      console.error('Error deleting website:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể xóa website',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (website: ChildWebsite) => {
    setEditingWebsite(website);
    setWebsiteName(website.name);
    setWebsiteSlug(website.slug);
    setWebsiteDescription(website.description || '');
    setPrimaryColor(website.primary_color);
    setSecondaryColor(website.secondary_color);
    setBankName(website.bank_name || '');
    setBankAccountName(website.bank_account_name || '');
    setBankAccountNumber(website.bank_account_number || '');
  };

  const resetForm = () => {
    setWebsiteName('');
    setWebsiteSlug('');
    setWebsiteDescription('');
    setPrimaryColor('#8B5CF6');
    setSecondaryColor('#D946EF');
    setBankName('');
    setBankAccountName('');
    setBankAccountNumber('');
  };

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 md:py-8 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Globe className="h-7 w-7 text-primary" />
              Web Con Của Tôi
            </h1>
            <p className="text-muted-foreground mt-1">
              Tạo và quản lý các website của riêng bạn
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-xl">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">{userCoins.toLocaleString()} xu</span>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gradient" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Tạo Web Con
                  <span className="text-xs opacity-80">({WEBSITE_COST} xu)</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Tạo Website Mới
                  </DialogTitle>
                  <DialogDescription>
                    Tạo một bản sao của BonzShop với thương hiệu riêng của bạn. Chi phí: {WEBSITE_COST} xu
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tên Website *</Label>
                    <Input
                      placeholder="VD: Shop Của Tôi"
                      value={websiteName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Đường dẫn (URL) *</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">/store/</span>
                      <Input
                        placeholder="ten-website"
                        value={websiteSlug}
                        onChange={(e) => setWebsiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        maxLength={50}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Website sẽ có địa chỉ: /store/{websiteSlug || 'ten-website'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      placeholder="Mô tả ngắn về website của bạn..."
                      value={websiteDescription}
                      onChange={(e) => setWebsiteDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Màu chính
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Màu phụ
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4" />
                      Thông tin thanh toán (tùy chọn)
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Tên ngân hàng</Label>
                        <Input
                          placeholder="VD: MB Bank"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tên chủ tài khoản</Label>
                        <Input
                          placeholder="VD: NGUYEN VAN A"
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Số tài khoản</Label>
                        <Input
                          placeholder="VD: 123456789"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    variant="gradient" 
                    onClick={createWebsite}
                    disabled={isCreating || !websiteName.trim() || !websiteSlug.trim()}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo Website ({WEBSITE_COST} xu)
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Websites Grid */}
        {websites.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Chưa có website nào</h3>
              <p className="text-muted-foreground mb-6">
                Tạo website đầu tiên của bạn để bắt đầu kinh doanh!
              </p>
              <Button 
                variant="gradient" 
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                Tạo Web Con ({WEBSITE_COST} xu)
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {websites.map((website) => (
              <Card 
                key={website.id} 
                className="hover:shadow-lg transition-all duration-300 overflow-hidden"
                style={{ borderColor: website.primary_color + '30' }}
              >
                <div 
                  className="h-2"
                  style={{ 
                    background: `linear-gradient(to right, ${website.primary_color}, ${website.secondary_color})` 
                  }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{website.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        /store/{website.slug}
                      </CardDescription>
                    </div>
                    <div 
                      className={`px-2 py-1 rounded-full text-xs ${
                        website.is_active 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {website.is_active ? 'Hoạt động' : 'Tắt'}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {website.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {website.description}
                    </p>
                  )}
                  
                  <div className="text-xs text-muted-foreground mb-4">
                    Tạo lúc: {format(new Date(website.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/store/${website.slug}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Xem
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(website)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Sửa
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWebsite(website)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingWebsite} onOpenChange={(open) => !open && setEditingWebsite(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Chỉnh sửa Website
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tên Website *</Label>
                <Input
                  placeholder="VD: Shop Của Tôi"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  maxLength={100}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Đường dẫn (không thể thay đổi)</Label>
                <Input value={websiteSlug} disabled />
              </div>
              
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  placeholder="Mô tả ngắn về website của bạn..."
                  value={websiteDescription}
                  onChange={(e) => setWebsiteDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Màu chính
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Màu phụ
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4" />
                  Thông tin thanh toán
                </h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Tên ngân hàng</Label>
                    <Input
                      placeholder="VD: MB Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tên chủ tài khoản</Label>
                    <Input
                      placeholder="VD: NGUYEN VAN A"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Số tài khoản</Label>
                    <Input
                      placeholder="VD: 123456789"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingWebsite(null)}>
                Hủy
              </Button>
              <Button 
                variant="gradient" 
                onClick={updateWebsite}
                disabled={isCreating || !websiteName.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
