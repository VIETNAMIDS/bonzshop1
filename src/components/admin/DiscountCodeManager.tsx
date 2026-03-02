import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Plus, Trash2, Ticket, Coins, Calendar, 
  Users, Check, X, Sparkles 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DiscountCode {
  id: string;
  code: string;
  discount_amount: number;
  discount_type: 'fixed' | 'percent';
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  target_user_id: string | null;
}

export function DiscountCodeManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [newCode, setNewCode] = useState({
    code: 'BONZ',
    discount_amount: 10,
    discount_type: 'fixed' as 'fixed' | 'percent',
    min_order_amount: 0,
    max_uses: null as number | null,
    expires_at: '',
    target_user_email: '',
  });
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUserId, setFoundUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes((data || []) as DiscountCode[]);
    } catch (error) {
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCode.code.toUpperCase().startsWith('BONZ')) {
      toast({
        title: 'Lỗi',
        description: 'Mã giảm giá phải bắt đầu bằng BONZ',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('discount_codes')
        .insert({
          code: newCode.code.toUpperCase(),
          discount_amount: newCode.discount_amount,
          discount_type: newCode.discount_type,
          min_order_amount: newCode.min_order_amount || 0,
          max_uses: 1, // Single-use by default
          expires_at: newCode.expires_at || null,
          created_by: user?.id,
          target_user_id: foundUserId || null,
        });

      if (error) throw error;

      toast({
        title: '✅ Tạo mã thành công!',
        description: `Mã ${newCode.code.toUpperCase()} đã được tạo`,
      });
      
      setDialogOpen(false);
      setNewCode({
        code: 'BONZ',
        discount_amount: 10,
        discount_type: 'fixed',
        min_order_amount: 0,
        max_uses: null,
        expires_at: '',
        target_user_email: '',
      });
      setFoundUserId(null);
      fetchCodes();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo mã giảm giá',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      setCodes(codes.map(c => c.id === id ? { ...c, is_active: !isActive } : c));
      toast({
        title: isActive ? '⏸️ Đã tắt mã' : '✅ Đã bật mã',
      });
    } catch (error) {
      console.error('Error toggling code:', error);
    }
  };

  const deleteCode = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa mã này?')) return;
    
    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCodes(codes.filter(c => c.id !== id));
      toast({
        title: '🗑️ Đã xóa mã giảm giá',
      });
    } catch (error) {
      console.error('Error deleting code:', error);
    }
  };

  // Quick create preset codes
  const createPreset = async (amount: number) => {
    const code = `BONZ${amount}K`;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('discount_codes')
        .insert({
          code,
          discount_amount: amount,
          discount_type: 'fixed',
          min_order_amount: amount * 5,
          created_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Mã đã tồn tại',
            description: `Mã ${code} đã được tạo trước đó`,
            variant: 'destructive'
          });
        } else {
          throw error;
        }
      } else {
        toast({ title: `✅ Đã tạo mã ${code}` });
        fetchCodes();
      }
    } catch (error) {
      console.error('Error creating preset:', error);
    } finally {
      setSaving(false);
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
      {/* Header */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Quản lý mã giảm giá
              </CardTitle>
              <CardDescription>
                Tạo và quản lý mã giảm giá cho khách hàng
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-accent">
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo mã mới
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Tạo mã giảm giá mới
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Mã giảm giá (bắt đầu bằng BONZ)</Label>
                    <Input
                      value={newCode.code}
                      onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                      placeholder="BONZ50K"
                      className="uppercase"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Số tiền giảm (xu)</Label>
                      <Input
                        type="number"
                        value={newCode.discount_amount}
                        onChange={(e) => setNewCode({ ...newCode, discount_amount: parseInt(e.target.value) || 0 })}
                        min={0}
                        max={200}
                      />
                    </div>
                    <div>
                      <Label>Đơn tối thiểu (xu)</Label>
                      <Input
                        type="number"
                        value={newCode.min_order_amount}
                        onChange={(e) => setNewCode({ ...newCode, min_order_amount: parseInt(e.target.value) || 0 })}
                        min={0}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Ngày hết hạn (tùy chọn)</Label>
                    <Input
                      type="datetime-local"
                      value={newCode.expires_at}
                      onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <Label>Giới hạn người dùng (tùy chọn)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Nhập email để chỉ cho phép người dùng cụ thể sử dụng mã này
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={newCode.target_user_email}
                        onChange={(e) => {
                          setNewCode({ ...newCode, target_user_email: e.target.value });
                          setFoundUserId(null);
                        }}
                        placeholder="email@example.com (để trống = ai cũng dùng được)"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!newCode.target_user_email || searchingUser}
                        onClick={async () => {
                          setSearchingUser(true);
                          try {
                            // Search by display_name in profiles
                            const { data, error } = await supabase
                              .from('profiles')
                              .select('user_id, display_name')
                              .ilike('display_name', `%${newCode.target_user_email}%`)
                              .limit(1)
                              .single();
                            
                            if (error || !data) {
                              toast({ title: 'Không tìm thấy người dùng với tên này', variant: 'destructive' });
                              setFoundUserId(null);
                            } else {
                              setFoundUserId(data.user_id);
                              toast({ title: `✅ Tìm thấy: ${data.display_name}` });
                            }
                          } catch (err) {
                            toast({ title: 'Lỗi tìm kiếm', variant: 'destructive' });
                          }
                          setSearchingUser(false);
                        }}
                      >
                        {searchingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tìm'}
                      </Button>
                    </div>
                    {foundUserId && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Đã chọn người dùng - Mã sẽ chỉ dành cho người này
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    ⚠️ Lưu ý: Mỗi mã chỉ dùng được 1 lần. Sau khi sử dụng, mã sẽ tự động bị xóa.
                  </p>

                  <Button 
                    onClick={handleCreate} 
                    disabled={saving || !newCode.code || newCode.discount_amount <= 0}
                    className="w-full bg-gradient-to-r from-primary to-accent"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Tạo mã giảm giá
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Create Presets */}
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm">Tạo nhanh mã BONZ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[10, 20, 30, 40, 50, 100, 200].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => createPreset(amount)}
                disabled={saving}
                className={amount === 200 ? 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/10' : ''}
              >
                <Coins className="h-3 w-3 mr-1" />
                BONZ{amount}K
                {amount === 200 && <Sparkles className="h-3 w-3 ml-1 text-yellow-500" />}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Codes Table */}
      <Card className="glass border-primary/20">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Giảm giá</TableHead>
                <TableHead>Đơn tối thiểu</TableHead>
                <TableHead>Đã dùng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Chưa có mã giảm giá nào
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-primary border-primary/50">
                        {code.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-500">
                        -{code.discount_amount} xu
                      </span>
                    </TableCell>
                    <TableCell>
                      {code.min_order_amount ? `${code.min_order_amount} xu` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {code.used_count}
                        {code.max_uses && `/${code.max_uses}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={code.is_active}
                          onCheckedChange={() => toggleActive(code.id, code.is_active)}
                        />
                        {code.is_active ? (
                          <Badge className="bg-green-500/20 text-green-500 border-0">
                            <Check className="h-3 w-3 mr-1" />
                            Hoạt động
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="h-3 w-3 mr-1" />
                            Tắt
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCode(code.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
