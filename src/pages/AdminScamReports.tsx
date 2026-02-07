import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadInput } from '@/components/ui/image-upload-input';
import { Loader2, Plus, Pencil, Trash2, Skull, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ScamReport {
  id: string;
  title: string;
  scammer_name: string | null;
  scammer_contact: string | null;
  description: string;
  evidence_urls: string[];
  image_url: string | null;
  severity: string;
  status: string;
  created_at: string;
}

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Thấp', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'medium', label: 'Trung bình', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'high', label: 'Cao', color: 'bg-red-500/20 text-red-400' },
  { value: 'critical', label: 'Nghiêm trọng', color: 'bg-destructive/20 text-destructive' },
];

export default function AdminScamReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScamReport | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    scammer_name: '',
    scammer_contact: '',
    description: '',
    evidence_urls: '',
    image_url: '',
    severity: 'medium',
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('scam_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching scam reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      scammer_name: '',
      scammer_contact: '',
      description: '',
      evidence_urls: '',
      image_url: '',
      severity: 'medium',
    });
    setEditingReport(null);
  };

  const openEditDialog = (report: ScamReport) => {
    setEditingReport(report);
    setFormData({
      title: report.title,
      scammer_name: report.scammer_name || '',
      scammer_contact: report.scammer_contact || '',
      description: report.description,
      evidence_urls: report.evidence_urls?.join('\n') || '',
      image_url: report.image_url || '',
      severity: report.severity,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const evidenceUrls = formData.evidence_urls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const reportData = {
        title: formData.title,
        scammer_name: formData.scammer_name || null,
        scammer_contact: formData.scammer_contact || null,
        description: formData.description,
        evidence_urls: evidenceUrls,
        image_url: formData.image_url || null,
        severity: formData.severity,
        created_by: user.id,
      };

      if (editingReport) {
        const { error } = await supabase
          .from('scam_reports')
          .update(reportData)
          .eq('id', editingReport.id);

        if (error) throw error;
        toast({ title: '✅ Đã cập nhật báo cáo scam!' });
      } else {
        const { error } = await supabase
          .from('scam_reports')
          .insert(reportData);

        if (error) throw error;
        toast({ title: '✅ Đã thêm báo cáo scam mới!' });
      }

      setDialogOpen(false);
      resetForm();
      fetchReports();
    } catch (error: any) {
      console.error('Error saving scam report:', error);
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (report: ScamReport) => {
    try {
      const newStatus = report.status === 'active' ? 'resolved' : 'active';
      const { error } = await supabase
        .from('scam_reports')
        .update({ status: newStatus })
        .eq('id', report.id);

      if (error) throw error;
      toast({ title: newStatus === 'active' ? '✅ Đã kích hoạt' : '✅ Đã ẩn' });
      fetchReports();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa báo cáo này?')) return;

    try {
      const { error } = await supabase
        .from('scam_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: '✅ Đã xóa báo cáo' });
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Skull className="h-6 w-6 text-destructive" />
              <h1 className="text-2xl font-bold">Quản Lý Scam Reports</h1>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm báo cáo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Skull className="h-5 w-5 text-destructive" />
                  {editingReport ? 'Sửa báo cáo' : 'Thêm báo cáo Scam'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Tiêu đề *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Cảnh báo scam từ user ABC"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tên scammer</Label>
                    <Input
                      value={formData.scammer_name}
                      onChange={(e) => setFormData({ ...formData, scammer_name: e.target.value })}
                      placeholder="Tên hoặc nick"
                    />
                  </div>
                  <div>
                    <Label>Liên hệ scammer</Label>
                    <Input
                      value={formData.scammer_contact}
                      onChange={(e) => setFormData({ ...formData, scammer_contact: e.target.value })}
                      placeholder="SĐT, FB, Zalo..."
                    />
                  </div>
                </div>
                <div>
                  <Label>Mô tả chi tiết *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả hành vi lừa đảo..."
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <Label>Link bằng chứng (mỗi link 1 dòng)</Label>
                  <Textarea
                    value={formData.evidence_urls}
                    onChange={(e) => setFormData({ ...formData, evidence_urls: e.target.value })}
                    placeholder="https://example.com/evidence1&#10;https://example.com/evidence2"
                    rows={3}
                  />
                </div>
                <ImageUploadInput
                  value={formData.image_url}
                  onChange={(value) => setFormData({ ...formData, image_url: value })}
                  label="Ảnh minh họa"
                  placeholder="https://..."
                  bucket="images"
                  folder="scam-reports"
                />
                <div>
                  <Label>Mức độ nghiêm trọng</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingReport ? 'Cập nhật' : 'Thêm báo cáo'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card className="glass-strong border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Scammer</TableHead>
                <TableHead>Mức độ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Chưa có báo cáo nào
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => {
                  const severity = SEVERITY_OPTIONS.find(s => s.value === report.severity);
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.title}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.scammer_name && <p>{report.scammer_name}</p>}
                          {report.scammer_contact && (
                            <p className="text-muted-foreground text-xs">{report.scammer_contact}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border-0", severity?.color)}>
                          {severity?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'active' ? 'default' : 'secondary'}>
                          {report.status === 'active' ? 'Hiển thị' : 'Đã ẩn'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: vi })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleStatus(report)}
                            title={report.status === 'active' ? 'Ẩn' : 'Hiện'}
                          >
                            {report.status === 'active' ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(report)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteReport(report.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
