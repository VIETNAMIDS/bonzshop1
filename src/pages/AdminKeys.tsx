import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, Key, Edit } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { verifyAdminApi } from '@/hooks/useAdminApi';

interface KeyItem {
  id: string;
  title: string;
  key_value: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  is_sold: boolean;
  is_active: boolean;
  created_at: string;
}

export default function AdminKeys() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<KeyItem | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkKeyValues, setBulkKeyValues] = useState('');
  const [formData, setFormData] = useState({
    title: '', key_value: '', description: '', category: 'other', price: '0', image_url: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!user) { navigate('/auth'); return; }
      const isAdmin = await verifyAdminApi();
      if (!isAdmin) { toast.error('Không có quyền admin'); navigate('/'); return; }
      setIsVerifiedAdmin(true);
    };
    if (!authLoading) verify();
  }, [user, authLoading, navigate]);

  const fetchKeys = useCallback(async () => {
    const { data, error } = await supabase
      .from('keys')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Lỗi tải keys'); return; }
    setKeys(data || []);
    setIsLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("name");
    setCategories(data?.map(c => c.name) || []);
  }, []);

  useEffect(() => {
    if (isVerifiedAdmin) { fetchKeys(); fetchCategories(); }
  }, [isVerifiedAdmin, fetchKeys, fetchCategories]);

  const resetForm = () => {
    setFormData({ title: '', key_value: '', description: '', category: 'other', price: '0', image_url: '' });
    setEditingKey(null);
    setIsBulkMode(false);
    setBulkKeyValues('');
    setShowForm(false);
  };

  const handleEdit = (key: KeyItem) => {
    setEditingKey(key);
    setFormData({
      title: key.title,
      key_value: key.key_value,
      description: key.description || '',
      category: key.category,
      price: key.price.toString(),
      image_url: key.image_url || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error('Vui lòng nhập tên key');
      return;
    }

    // Bulk mode: multiple key values
    if (isBulkMode && !editingKey) {
      const keyLines = bulkKeyValues.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (keyLines.length === 0) {
        toast.error('Vui lòng nhập ít nhất 1 key');
        return;
      }

      setSubmitting(true);
      try {
        const payloads = keyLines.map(keyVal => ({
          title: formData.title,
          key_value: keyVal,
          description: formData.description || null,
          category: formData.category,
          price: parseInt(formData.price) || 0,
          image_url: formData.image_url || null,
          created_by: user?.id,
          seller_id: null,
        }));

        const { error } = await supabase.from('keys').insert(payloads);
        if (error) throw error;
        toast.success(`Đã thêm ${keyLines.length} key mới!`);
        resetForm();
        fetchKeys();
      } catch (err) {
        toast.error('Lỗi thêm key hàng loạt');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Single mode
    if (!formData.key_value) {
      toast.error('Vui lòng nhập giá trị key');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        key_value: formData.key_value,
        description: formData.description || null,
        category: formData.category,
        price: parseInt(formData.price) || 0,
        image_url: formData.image_url || null,
      };

      if (editingKey) {
        const { error } = await supabase.from('keys').update(payload).eq('id', editingKey.id);
        if (error) throw error;
        toast.success('Đã cập nhật key');
      } else {
        const { error } = await supabase.from('keys').insert({
          ...payload,
          created_by: user?.id,
          seller_id: null,
        });
        if (error) throw error;
        toast.success('Đã thêm key mới');
      }
      resetForm();
      fetchKeys();
    } catch (err) {
      toast.error('Lỗi lưu key');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa key này?')) return;
    const { error } = await supabase.from('keys').delete().eq('id', id);
    if (error) { toast.error('Lỗi xóa'); return; }
    toast.success('Đã xóa key');
    fetchKeys();
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
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Quản lý Key</h1>
              <p className="text-sm text-muted-foreground">Thêm, sửa, xóa key bản quyền</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Thêm Key
          </Button>
        </div>

        {/* Keys list */}
        <div className="space-y-3">
          {keys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Chưa có key nào</p>
            </div>
          ) : (
            keys.map((key) => (
              <div key={key.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {key.image_url ? (
                    <img src={key.image_url} alt={key.title} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{key.title}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{key.key_value}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{key.category}</Badge>
                      <span className="text-sm text-primary font-bold">{key.price} xu</span>
                      {key.is_sold && <Badge variant="destructive" className="text-[10px]">Đã bán</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(key)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(key.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingKey ? 'Sửa Key' : 'Thêm Key'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Bulk mode toggle - only for new keys */}
              {!editingKey && (
                <label 
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 cursor-pointer select-none"
                  onClick={(e) => { e.preventDefault(); setIsBulkMode(!isBulkMode); }}
                >
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isBulkMode ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {isBulkMode && <span className="text-primary-foreground text-xs font-bold">✓</span>}
                  </div>
                  <div>
                    <span className="text-sm font-medium">📦 Thêm nhiều key cùng lúc</span>
                    <p className="text-xs text-muted-foreground">Nhập mỗi key một dòng, chung tiêu đề & giá</p>
                  </div>
                </label>
              )}

              <div>
                <Label>Tên Key *</Label>
                <Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="VD: Windows 11 Pro Key" />
              </div>

              {isBulkMode && !editingKey ? (
                <div>
                  <Label>Danh sách Key (mỗi dòng 1 key) *</Label>
                  <Textarea 
                    value={bulkKeyValues} 
                    onChange={e => setBulkKeyValues(e.target.value)} 
                    placeholder={"XXXXX-XXXXX-XXXXX-XXXXX\nYYYYY-YYYYY-YYYYY-YYYYY\nZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ"}
                    rows={6}
                    className="font-mono text-sm"
                  />
                  {bulkKeyValues.trim() && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📊 {bulkKeyValues.split('\n').filter(l => l.trim()).length} key sẽ được thêm
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <Label>Giá trị Key *</Label>
                  <Input value={formData.key_value} onChange={e => setFormData(f => ({ ...f, key_value: e.target.value }))} placeholder="VD: XXXXX-XXXXX-XXXXX" />
                </div>
              )}

              <div>
                <Label>Mô tả</Label>
                <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả chi tiết..." />
              </div>
              <div>
                <Label>Danh mục</Label>
                <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="other">Khác</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Giá (xu)</Label>
                <Input type="number" value={formData.price} onChange={e => setFormData(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>URL Hình ảnh</Label>
                <Input value={formData.image_url} onChange={e => setFormData(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Hủy</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingKey ? 'Cập nhật' : isBulkMode ? `Thêm ${bulkKeyValues.split('\n').filter(l => l.trim()).length} key` : 'Thêm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
