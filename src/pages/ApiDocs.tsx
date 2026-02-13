import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Copy, Key, Plus, Trash2, Eye, EyeOff, Code, Zap, Shield, BookOpen, BarChart3, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/public-api';

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  requests_today: number;
  requests_total: number;
  rate_limit: number;
  last_used_at: string | null;
  created_at: string;
}

interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  created_at: string;
}

const ENDPOINTS = [
  { endpoint: 'products.list', method: 'GET/POST', desc: 'Lấy danh sách sản phẩm', params: 'category, search, limit, offset', category: 'Products' },
  { endpoint: 'products.get', method: 'GET/POST', desc: 'Chi tiết sản phẩm theo ID', params: 'id', category: 'Products' },
  { endpoint: 'accounts.list', method: 'GET/POST', desc: 'Lấy danh sách tài khoản (public)', params: 'category, search, limit, offset', category: 'Accounts' },
  { endpoint: 'accounts.get', method: 'GET/POST', desc: 'Chi tiết tài khoản theo ID', params: 'id', category: 'Accounts' },
  { endpoint: 'categories.list', method: 'GET/POST', desc: 'Danh sách danh mục', params: '', category: 'Categories' },
  { endpoint: 'posts.list', method: 'GET/POST', desc: 'Danh sách bài viết', params: 'limit, offset', category: 'Posts' },
  { endpoint: 'posts.get', method: 'GET/POST', desc: 'Chi tiết bài viết', params: 'id', category: 'Posts' },
  { endpoint: 'sellers.list', method: 'GET/POST', desc: 'Danh sách người bán', params: 'limit, offset', category: 'Sellers' },
  { endpoint: 'sellers.get', method: 'GET/POST', desc: 'Chi tiết người bán', params: 'id', category: 'Sellers' },
  { endpoint: 'scam-reports.list', method: 'GET/POST', desc: 'Báo cáo lừa đảo', params: 'limit, offset', category: 'Reports' },
  { endpoint: 'free-resources.list', method: 'GET/POST', desc: 'Tài nguyên miễn phí', params: 'limit, offset', category: 'Resources' },
  { endpoint: 'bots.list', method: 'GET/POST', desc: 'Bot cho thuê', params: '', category: 'Bots' },
  { endpoint: 'daily-tasks.list', method: 'GET/POST', desc: 'Nhiệm vụ hàng ngày', params: '', category: 'Tasks' },
  { endpoint: 'discount.check', method: 'GET/POST', desc: 'Kiểm tra mã giảm giá', params: 'code', category: 'Discount' },
  { endpoint: 'stats.overview', method: 'GET/POST', desc: 'Thống kê tổng quan', params: '', category: 'Stats' },
];

export default function ApiDocs() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('docs');

  useEffect(() => {
    if (user) {
      fetchKeys();
      fetchLogs();
    }
  }, [user]);

  const fetchKeys = async () => {
    const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    if (data) setApiKeys(data as ApiKey[]);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('api_request_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setLogs(data as ApiLog[]);
  };

  const createKey = async () => {
    if (!user) return;
    setIsCreating(true);
    const { error } = await supabase.from('api_keys').insert({ user_id: user.id, name: newKeyName || 'Default' });
    if (error) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Đã tạo API Key!' });
      setNewKeyName('');
      fetchKeys();
    }
    setIsCreating(false);
  };

  const deleteKey = async (id: string) => {
    await supabase.from('api_keys').delete().eq('id', id);
    toast({ title: 'Đã xóa API Key' });
    fetchKeys();
  };

  const toggleKey = async (id: string, active: boolean) => {
    await supabase.from('api_keys').update({ is_active: !active }).eq('id', id);
    fetchKeys();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Đã copy!' });
  };

  const maskKey = (key: string) => key.slice(0, 6) + '•'.repeat(20) + key.slice(-4);

  const categories = [...new Set(ENDPOINTS.map(e => e.category))];

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="container mx-auto px-4 py-12 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                <Code className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Bonz Shop API</h1>
                <p className="text-muted-foreground">Tích hợp dữ liệu Bonz Shop vào ứng dụng của bạn</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 flex-wrap">
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <Zap className="w-3.5 h-3.5" /> REST API
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <Shield className="w-3.5 h-3.5" /> API Key Auth
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <BookOpen className="w-3.5 h-3.5" /> 15+ Endpoints
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Rate Limiting
              </Badge>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="docs">📖 Tài liệu</TabsTrigger>
              <TabsTrigger value="keys">🔑 API Keys</TabsTrigger>
              <TabsTrigger value="logs">📊 Lịch sử</TabsTrigger>
              <TabsTrigger value="playground">🧪 Playground</TabsTrigger>
            </TabsList>

            {/* DOCS TAB */}
            <TabsContent value="docs" className="space-y-6">
              {/* Quick Start */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" /> Bắt đầu nhanh
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    1. Tạo API Key trong tab <strong>"API Keys"</strong><br/>
                    2. Gửi request với header <code className="bg-muted px-1.5 py-0.5 rounded text-xs">x-api-key: YOUR_KEY</code><br/>
                    3. Truyền <code className="bg-muted px-1.5 py-0.5 rounded text-xs">endpoint</code> qua query param hoặc body
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto border">
                    <div className="text-muted-foreground mb-2"># Ví dụ với cURL</div>
                    <div className="text-foreground whitespace-pre-wrap">
{`curl -X POST "${API_BASE}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: bz_your_api_key_here" \\
  -d '{"endpoint": "products.list", "params": {"limit": 10}}'`}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto border">
                    <div className="text-muted-foreground mb-2">// JavaScript / Fetch</div>
                    <div className="text-foreground whitespace-pre-wrap">
{`const response = await fetch("${API_BASE}?endpoint=products.list&limit=10", {
  headers: { "x-api-key": "bz_your_api_key_here" }
});
const data = await response.json();
console.log(data.products);`}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto border">
                    <div className="text-muted-foreground mb-2"># Python</div>
                    <div className="text-foreground whitespace-pre-wrap">
{`import requests

resp = requests.post("${API_BASE}", json={
    "endpoint": "products.list",
    "params": {"limit": 10}
}, headers={"x-api-key": "bz_your_api_key_here"})
print(resp.json())`}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Endpoints by category */}
              {categories.map(cat => (
                <Card key={cat}>
                  <CardHeader>
                    <CardTitle className="text-lg">{cat}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {ENDPOINTS.filter(e => e.category === cat).map(ep => (
                        <div key={ep.endpoint} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Badge variant="secondary" className="text-xs shrink-0">{ep.method}</Badge>
                            <code className="text-sm font-semibold text-primary truncate">{ep.endpoint}</code>
                          </div>
                          <p className="text-sm text-muted-foreground flex-1">{ep.desc}</p>
                          {ep.params && (
                            <div className="flex gap-1 flex-wrap shrink-0">
                              {ep.params.split(', ').map(p => (
                                <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Error Codes */}
              <Card>
                <CardHeader><CardTitle>Mã lỗi</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm">
                    {[
                      ['401', 'MISSING_API_KEY / INVALID_API_KEY', 'API key không hợp lệ hoặc thiếu'],
                      ['404', 'UNKNOWN_ENDPOINT', 'Endpoint không tồn tại'],
                      ['429', 'RATE_LIMITED', 'Vượt quá giới hạn request/ngày'],
                      ['500', 'INTERNAL_ERROR', 'Lỗi server'],
                    ].map(([code, name, desc]) => (
                      <div key={code} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                        <Badge variant={code === '401' || code === '500' ? 'destructive' : 'secondary'}>{code}</Badge>
                        <code className="text-xs">{name}</code>
                        <span className="text-muted-foreground">{desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* KEYS TAB */}
            <TabsContent value="keys" className="space-y-6">
              {!user ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Đăng nhập để tạo API Key</p>
                    <Button onClick={() => window.location.href = '/auth'}>Đăng nhập</Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Tạo API Key mới
                      </CardTitle>
                      <CardDescription>Mỗi key có giới hạn 100 request/ngày</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-3">
                      <Input
                        placeholder="Tên key (vd: My App)"
                        value={newKeyName}
                        onChange={e => setNewKeyName(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button onClick={createKey} disabled={isCreating}>
                        <Key className="w-4 h-4 mr-1" /> Tạo Key
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {apiKeys.map(key => (
                      <Card key={key.id} className={!key.is_active ? 'opacity-60' : ''}>
                        <CardContent className="py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{key.name}</span>
                                <Badge variant={key.is_active ? 'default' : 'secondary'}>
                                  {key.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded truncate">
                                  {showKeys[key.id] ? key.api_key : maskKey(key.api_key)}
                                </code>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowKeys(p => ({ ...p, [key.id]: !p[key.id] }))}>
                                  {showKeys[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(key.api_key)}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Hôm nay: {key.requests_today}/{key.rate_limit}</span>
                                <span>Tổng: {key.requests_total.toLocaleString()}</span>
                                {key.last_used_at && <span>Dùng lần cuối: {new Date(key.last_used_at).toLocaleString('vi')}</span>}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" variant="outline" onClick={() => toggleKey(key.id, key.is_active)}>
                                {key.is_active ? 'Tắt' : 'Bật'}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteKey(key.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {apiKeys.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Chưa có API Key nào. Tạo key đầu tiên ở trên!</p>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* LOGS TAB */}
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Lịch sử Request</CardTitle>
                    <Button size="sm" variant="outline" onClick={fetchLogs}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!user ? (
                    <p className="text-center text-muted-foreground py-8">Đăng nhập để xem lịch sử</p>
                  ) : logs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Chưa có request nào</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-2 text-left">Thời gian</th>
                            <th className="py-2 text-left">Endpoint</th>
                            <th className="py-2 text-left">Method</th>
                            <th className="py-2 text-left">Status</th>
                            <th className="py-2 text-left">Thời gian phản hồi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map(log => (
                            <tr key={log.id} className="border-b border-border/50">
                              <td className="py-2 text-xs">{new Date(log.created_at).toLocaleString('vi')}</td>
                              <td className="py-2"><code className="text-xs">{log.endpoint}</code></td>
                              <td className="py-2"><Badge variant="outline" className="text-[10px]">{log.method}</Badge></td>
                              <td className="py-2">
                                <Badge variant={log.status_code < 400 ? 'default' : 'destructive'} className="text-[10px]">
                                  {log.status_code}
                                </Badge>
                              </td>
                              <td className="py-2 text-xs">{log.response_time_ms}ms</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* PLAYGROUND TAB */}
            <TabsContent value="playground">
              <PlaygroundTab apiKeys={apiKeys} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}

function PlaygroundTab({ apiKeys }: { apiKeys: ApiKey[] }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [endpoint, setEndpoint] = useState('products.list');
  const [paramsStr, setParamsStr] = useState('{"limit": 5}');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const runRequest = async () => {
    setLoading(true);
    setResult('');
    try {
      let parsedParams = {};
      try { parsedParams = JSON.parse(paramsStr); } catch { /* ignore */ }

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': selectedKey,
        },
        body: JSON.stringify({ endpoint, params: parsedParams }),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setResult(err instanceof Error ? err.message : 'Error');
    }
    setLoading(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">API Key</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value)}
            >
              <option value="">Chọn API Key...</option>
              {apiKeys.filter(k => k.is_active).map(k => (
                <option key={k.id} value={k.api_key}>{k.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Endpoint</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
            >
              {ENDPOINTS.map(ep => (
                <option key={ep.endpoint} value={ep.endpoint}>{ep.endpoint} - {ep.desc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Params (JSON)</label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono h-24"
              value={paramsStr}
              onChange={e => setParamsStr(e.target.value)}
            />
          </div>
          <Button onClick={runRequest} disabled={loading || !selectedKey} className="w-full">
            {loading ? 'Đang gửi...' : '🚀 Gửi Request'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Response</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted/50 border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[500px] whitespace-pre-wrap">
            {result || 'Kết quả sẽ hiển thị ở đây...'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
