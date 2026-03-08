import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Key, Loader2, ToggleLeft, ToggleRight, Eye, EyeOff, Bot, RefreshCw } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface BotApiKey {
  id: string;
  label: string;
  provider: string;
  api_key: string;
  model: string;
  base_url: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
}

const PROVIDER_PRESETS: Record<string, { model: string; base_url: string }> = {
  gemini: {
    model: 'gemini-2.0-flash',
    base_url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  },
  openai: {
    model: 'gpt-4o-mini',
    base_url: 'https://api.openai.com/v1/chat/completions',
  },
  groq: {
    model: 'llama-3.3-70b-versatile',
    base_url: 'https://api.groq.com/openai/v1/chat/completions',
  },
  openrouter: {
    model: 'google/gemini-2.0-flash-exp:free',
    base_url: 'https://openrouter.ai/api/v1/chat/completions',
  },
  custom: {
    model: '',
    base_url: '',
  },
};

export default function AdminBotKeys() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [keys, setKeys] = useState<BotApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formProvider, setFormProvider] = useState('gemini');
  const [formApiKey, setFormApiKey] = useState('');
  const [formModel, setFormModel] = useState(PROVIDER_PRESETS.gemini.model);
  const [formBaseUrl, setFormBaseUrl] = useState(PROVIDER_PRESETS.gemini.base_url);

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').limit(1);
    if (!data || data.length === 0) {
      navigate('/');
      return;
    }
    setIsAdmin(true);
    await loadKeys();
  };

  const loadKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bot_api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } else {
      setKeys((data as any[]) || []);
    }
    setLoading(false);
  };

  const handleProviderChange = (provider: string) => {
    setFormProvider(provider);
    const preset = PROVIDER_PRESETS[provider];
    if (preset) {
      setFormModel(preset.model);
      setFormBaseUrl(preset.base_url);
    }
  };

  const handleAdd = async () => {
    if (!formApiKey.trim()) {
      toast({ title: 'Vui lòng nhập API key', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { error } = await supabase.from('bot_api_keys').insert({
      label: formLabel || `${formProvider} key`,
      provider: formProvider,
      api_key: formApiKey.trim(),
      model: formModel,
      base_url: formBaseUrl,
      created_by: user?.id,
    });

    if (error) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Đã thêm API key' });
      setShowAddDialog(false);
      resetForm();
      await loadKeys();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormLabel('');
    setFormProvider('gemini');
    setFormApiKey('');
    setFormModel(PROVIDER_PRESETS.gemini.model);
    setFormBaseUrl(PROVIDER_PRESETS.gemini.base_url);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('bot_api_keys').update({ is_active: !currentActive }).eq('id', id);
    if (error) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } else {
      setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: !currentActive } : k));
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Xóa API key này?')) return;
    const { error } = await supabase.from('bot_api_keys').delete().eq('id', id);
    if (error) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } else {
      setKeys(prev => prev.filter(k => k.id !== id));
      toast({ title: '🗑️ Đã xóa' });
    }
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => key.slice(0, 8) + '•'.repeat(Math.min(key.length - 12, 20)) + key.slice(-4);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Bot className="h-6 w-6 text-cyan-500" />
          <div>
            <h1 className="text-xl font-bold">Quản lý API Key Bot AI</h1>
            <p className="text-sm text-muted-foreground">
              Thêm nhiều API key để bot dùng xoay vòng • Tối đa 10,000 key
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">{keys.length}</div>
            <div className="text-xs text-muted-foreground">Tổng key</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{keys.filter(k => k.is_active).length}</div>
            <div className="text-xs text-muted-foreground">Đang hoạt động</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {keys.reduce((s, k) => s + (k.usage_count || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">Tổng lượt dùng</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Thêm API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" /> Thêm API Key mới
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nhãn (tùy chọn)</Label>
                  <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="VD: Gemini key #1" />
                </div>
                <div>
                  <Label>Provider</Label>
                  <Select value={formProvider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Google Gemini (Miễn phí)</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="groq">Groq (Miễn phí)</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="custom">Tùy chỉnh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>API Key *</Label>
                  <Input
                    value={formApiKey}
                    onChange={e => setFormApiKey(e.target.value)}
                    placeholder="Nhập API key..."
                    type="password"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input value={formModel} onChange={e => setFormModel(e.target.value)} placeholder="gemini-2.0-flash" />
                </div>
                <div>
                  <Label>Base URL</Label>
                  <Input value={formBaseUrl} onChange={e => setFormBaseUrl(e.target.value)} placeholder="https://..." />
                </div>
                <Button onClick={handleAdd} disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Thêm
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={loadKeys}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Key list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có API key nào</p>
            <p className="text-sm mt-1">Bot sẽ dùng Lovable AI mặc định (có giới hạn)</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map(key => (
              <div key={key.id} className={`bg-card border rounded-lg p-4 ${key.is_active ? 'border-green-500/30' : 'border-border opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{key.label || 'Unnamed'}</span>
                      <Badge variant={key.is_active ? 'default' : 'secondary'} className="text-xs">
                        {key.provider}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {key.model}
                      </Badge>
                      {key.is_active && (
                        <Badge className="bg-green-500/20 text-green-500 text-xs">Hoạt động</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {visibleKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                      </code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleVisibility(key.id)}>
                        {visibleKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Đã dùng: {key.usage_count || 0} lần</span>
                      {key.last_used_at && (
                        <span>Lần cuối: {new Date(key.last_used_at).toLocaleString('vi-VN')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => toggleActive(key.id, key.is_active)}
                      title={key.is_active ? 'Tắt' : 'Bật'}
                    >
                      {key.is_active
                        ? <ToggleRight className="h-5 w-5 text-green-500" />
                        : <ToggleLeft className="h-5 w-5" />
                      }
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => deleteKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <h3 className="font-semibold">📌 Hướng dẫn:</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><strong>Google Gemini</strong>: Lấy key miễn phí tại <a href="https://aistudio.google.com/apikey" target="_blank" className="text-primary underline">aistudio.google.com</a> (15 RPM free)</li>
            <li><strong>Groq</strong>: Lấy key miễn phí tại <a href="https://console.groq.com" target="_blank" className="text-primary underline">console.groq.com</a></li>
            <li><strong>OpenRouter</strong>: Nhiều model miễn phí tại <a href="https://openrouter.ai" target="_blank" className="text-primary underline">openrouter.ai</a></li>
            <li>Bot sẽ <strong>xoay vòng</strong> các key (round-robin) - key ít dùng nhất sẽ được chọn trước</li>
            <li>Nếu key lỗi (401/403), sẽ tự động <strong>tắt</strong> và chuyển key khác</li>
            <li>Nếu không có key nào → fallback về Lovable AI (có giới hạn)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
