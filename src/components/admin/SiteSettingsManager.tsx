import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Video, Type, FileText, Send, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface Setting {
  key: string;
  value: string | null;
}

export function SiteSettingsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [fetchingChatId, setFetchingChatId] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'unknown' | 'set' | 'not_set'>('unknown');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach(item => {
        settingsMap[item.key] = item.value || '';
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: update.value, updated_at: update.updated_at, updated_by: update.updated_by })
          .eq('key', update.key);

        if (error) throw error;
      }

      toast({
        title: '✅ Đã lưu cài đặt!',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu cài đặt',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const fetchChatIdFromBot = async () => {
    const token = settings.telegram_bot_token;
    
    if (!token) {
      toast({
        title: 'Thiếu Bot Token',
        description: 'Vui lòng nhập Bot Token trước',
        variant: 'destructive'
      });
      return;
    }

    setFetchingChatId(true);
    try {
      // Call Telegram API to get updates
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      const data = await response.json();
      
      console.log('Telegram getUpdates response:', data);
      
      if (!data.ok) {
        throw new Error(data.description || 'Token không hợp lệ');
      }
      
      if (!data.result || data.result.length === 0) {
        toast({
          title: '⚠️ Chưa có tin nhắn',
          description: 'Hãy gửi một tin nhắn bất kỳ đến bot của bạn trước, sau đó bấm lại nút này',
          variant: 'destructive'
        });
        return;
      }
      
      // Get the most recent chat ID
      const lastMessage = data.result[data.result.length - 1];
      const chatId = lastMessage.message?.chat?.id || lastMessage.my_chat_member?.chat?.id;
      
      if (chatId) {
        updateSetting('telegram_chat_id', String(chatId));
        toast({
          title: '✅ Đã lấy Chat ID!',
          description: `Chat ID: ${chatId}`,
        });
      } else {
        toast({
          title: '⚠️ Không tìm thấy Chat ID',
          description: 'Hãy gửi tin nhắn đến bot và thử lại',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching chat ID:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể lấy Chat ID',
        variant: 'destructive'
      });
    } finally {
      setFetchingChatId(false);
    }
  };

  const testTelegramNotification = async () => {
    const token = settings.telegram_bot_token;
    const chatId = settings.telegram_chat_id;
    
    if (!token || !chatId) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng nhập Bot Token và lấy Chat ID trước khi test',
        variant: 'destructive'
      });
      return;
    }

    // Save settings first before testing
    await handleSave();

    setTestingSend(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
        body: {
          type: 'new_registration',
          userEmail: 'test@example.com',
          userName: 'Test User'
        }
      });

      if (error) throw error;

      toast({
        title: '✅ Thành công!',
        description: 'Đã gửi tin nhắn test tới Telegram',
      });
    } catch (error) {
      console.error('Telegram test error:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể gửi tin nhắn. Kiểm tra lại Token và Chat ID',
        variant: 'destructive'
      });
    } finally {
      setTestingSend(false);
    }
  };

  const setupTelegramWebhook = async () => {
    const token = settings.telegram_bot_token;
    
    if (!token) {
      toast({
        title: 'Thiếu Bot Token',
        description: 'Vui lòng nhập Bot Token trước',
        variant: 'destructive'
      });
      return;
    }

    // Save settings first
    await handleSave();

    setSettingWebhook(true);
    try {
      // Get the webhook URL from environment
      const webhookUrl = `https://ignqplyivhcjtkfiruec.supabase.co/functions/v1/telegram-webhook`;
      
      // Set webhook
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['callback_query', 'message']
        }),
      });

      const result = await response.json();
      console.log('Webhook setup result:', result);

      if (result.ok) {
        setWebhookStatus('set');
        toast({
          title: '✅ Thiết lập Webhook thành công!',
          description: 'Giờ bạn có thể duyệt đơn nạp xu trực tiếp từ Telegram',
        });
      } else {
        throw new Error(result.description || 'Không thể thiết lập webhook');
      }
    } catch (error) {
      console.error('Webhook setup error:', error);
      setWebhookStatus('not_set');
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể thiết lập webhook',
        variant: 'destructive'
      });
    } finally {
      setSettingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Telegram Settings */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Cài đặt Telegram Bot
          </CardTitle>
          <CardDescription>
            Nhận thông báo khi có người đăng ký mới hoặc nạp xu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="telegram_bot_token">Bot Token</Label>
            <div className="relative">
              <Input
                id="telegram_bot_token"
                type={showToken ? 'text' : 'password'}
                placeholder="Nhập Bot Token từ @BotFather"
                value={settings.telegram_bot_token || ''}
                onChange={(e) => updateSetting('telegram_bot_token', e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="telegram_chat_id">Chat ID</Label>
            <div className="flex gap-2">
              <Input
                id="telegram_chat_id"
                placeholder="Bấm nút bên cạnh để tự động lấy"
                value={settings.telegram_chat_id || ''}
                onChange={(e) => updateSetting('telegram_chat_id', e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={fetchChatIdFromBot}
                disabled={fetchingChatId || !settings.telegram_bot_token}
                className="shrink-0"
              >
                {fetchingChatId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-primary font-medium mb-2">📱 Hướng dẫn:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>1. Tạo bot tại <strong>@BotFather</strong> → lấy Token</li>
              <li>2. Nhập Token vào ô trên</li>
              <li>3. Gửi tin nhắn bất kỳ đến bot của bạn</li>
              <li>4. Bấm nút <RefreshCw className="h-3 w-3 inline" /> để tự động lấy Chat ID</li>
              <li>5. Bấm <strong>Lưu cài đặt</strong> → <strong>Thiết lập Webhook</strong> → <strong>Test</strong></li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={setupTelegramWebhook}
              disabled={settingWebhook || !settings.telegram_bot_token}
              className="w-full"
            >
              {settingWebhook ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang thiết lập...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Thiết lập Webhook
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={testTelegramNotification}
              disabled={testingSend || !settings.telegram_bot_token || !settings.telegram_chat_id}
              className="w-full"
            >
              {testingSend ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Test thông báo
                </>
              )}
            </Button>
          </div>
          {webhookStatus !== 'unknown' && (
            <div className={`text-xs p-2 rounded ${webhookStatus === 'set' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
              {webhookStatus === 'set' 
                ? '✅ Webhook đã được thiết lập - Có thể duyệt đơn từ Telegram' 
                : '⚠️ Webhook chưa thiết lập - Bấm "Thiết lập Webhook" để bật tính năng duyệt đơn'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hero Section Settings */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Cài đặt Hero Section
          </CardTitle>
          <CardDescription>
            Quản lý video nền và nội dung trang chủ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hero_video_url">URL Video nền</Label>
            <Input
              id="hero_video_url"
              placeholder="Link TikTok, YouTube hoặc MP4"
              value={settings.hero_video_url || ''}
              onChange={(e) => updateSetting('hero_video_url', e.target.value)}
            />
            <div className="mt-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary font-medium mb-1">✅ Hỗ trợ các loại link:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>TikTok:</strong> https://www.tiktok.com/@user/video/123...</li>
                <li>• <strong>YouTube:</strong> https://youtube.com/watch?v=...</li>
                <li>• <strong>MP4 trực tiếp:</strong> https://example.com/video.mp4</li>
              </ul>
            </div>
          </div>
          <div>
            <Label htmlFor="hero_title">Tiêu đề chính</Label>
            <Input
              id="hero_title"
              placeholder="Chào mừng đến với BonzShop"
              value={settings.hero_title || ''}
              onChange={(e) => updateSetting('hero_title', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="hero_subtitle">Phụ đề</Label>
            <Textarea
              id="hero_subtitle"
              placeholder="Nền tảng mua bán tài khoản..."
              value={settings.hero_subtitle || ''}
              onChange={(e) => updateSetting('hero_subtitle', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* About Section Settings */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nội dung giới thiệu
          </CardTitle>
          <CardDescription>
            Nội dung hiển thị trong phần "Về chúng tôi"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Mô tả về website của bạn..."
            value={settings.about_content || ''}
            onChange={(e) => updateSetting('about_content', e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Onboarding Settings */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            Nội dung Onboarding
          </CardTitle>
          <CardDescription>
            Nội dung hiển thị khi người dùng mới đăng ký
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="onboarding_welcome">Lời chào</Label>
            <Input
              id="onboarding_welcome"
              placeholder="Chào mừng bạn đến với BonzShop!"
              value={settings.onboarding_welcome || ''}
              onChange={(e) => updateSetting('onboarding_welcome', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="onboarding_step1">Bước 1</Label>
            <Input
              id="onboarding_step1"
              placeholder="Khám phá hàng nghìn sản phẩm"
              value={settings.onboarding_step1 || ''}
              onChange={(e) => updateSetting('onboarding_step1', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="onboarding_step2">Bước 2</Label>
            <Input
              id="onboarding_step2"
              placeholder="Mua sắm an toàn với xu"
              value={settings.onboarding_step2 || ''}
              onChange={(e) => updateSetting('onboarding_step2', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="onboarding_step3">Bước 3</Label>
            <Input
              id="onboarding_step3"
              placeholder="Chat và kết bạn với mọi người"
              value={settings.onboarding_step3 || ''}
              onChange={(e) => updateSetting('onboarding_step3', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Seller Commission Settings */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💰 Cài đặt hoa hồng Seller
          </CardTitle>
          <CardDescription>
            % hoa hồng trừ khi seller nhận xu từ đơn hàng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="seller_commission_percent">Phí hoa hồng (%)</Label>
            <Input
              id="seller_commission_percent"
              type="number"
              min="0"
              max="100"
              placeholder="10"
              value={settings.seller_commission_percent || '10'}
              onChange={(e) => updateSetting('seller_commission_percent', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              VD: Nếu đặt 10%, khi sản phẩm bán 100 xu, seller nhận 90 xu, hệ thống giữ 10 xu
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full bg-gradient-to-r from-primary to-accent"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Đang lưu...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Lưu cài đặt
          </>
        )}
      </Button>
    </div>
  );
}
