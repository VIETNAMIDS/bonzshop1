import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Globe, 
  Search, 
  Loader2, 
  Eye, 
  ExternalLink, 
  Settings, 
  Trash2,
  Users,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ChildWebsite {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
  created_at: string;
  owner_email?: string;
  owner_name?: string;
}

export default function AdminChildWebsites() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [websites, setWebsites] = useState<ChildWebsite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState<ChildWebsite | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchWebsites();
    }
  }, [isAdmin]);

  const fetchWebsites = async () => {
    setIsLoading(true);
    try {
      // Fetch all websites
      const { data: websitesData, error } = await supabase
        .from('child_websites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch owner info for each website
      const ownerIds = [...new Set(websitesData?.map(w => w.owner_id) || [])];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', ownerIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.display_name]) || []);
      
      const websitesWithOwners = websitesData?.map(website => ({
        ...website,
        owner_name: profilesMap.get(website.owner_id) || 'N/A',
      })) || [];
      
      setWebsites(websitesWithOwners);
    } catch (error) {
      console.error('Error fetching websites:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách website',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWebsiteStatus = async (website: ChildWebsite) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('child_websites')
        .update({ is_active: !website.is_active })
        .eq('id', website.id);
      
      if (error) throw error;

      toast({
        title: website.is_active ? 'Đã tắt website' : 'Đã bật website',
        description: `Website "${website.name}" đã được ${website.is_active ? 'tắt' : 'bật'}.`,
      });

      fetchWebsites();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
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

      fetchWebsites();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredWebsites = websites.filter(website =>
    website.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    website.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    website.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !isAdmin) {
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
      <div className="container py-6 md:py-8 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Globe className="h-7 w-7 text-primary" />
              Quản lý Web Con
            </h1>
            <p className="text-muted-foreground mt-1">
              Quản lý tất cả các website con của người dùng
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm website..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{websites.length}</p>
                  <p className="text-sm text-muted-foreground">Tổng website</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {websites.filter(w => w.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(websites.map(w => w.owner_id)).size}
                  </p>
                  <p className="text-sm text-muted-foreground">Chủ website</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {websites.filter(w => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(w.created_at) > weekAgo;
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Tuần này</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredWebsites.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có website nào'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Người dùng chưa tạo website nào.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Website</TableHead>
                    <TableHead>Chủ sở hữu</TableHead>
                    <TableHead>Màu sắc</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWebsites.map((website) => (
                    <TableRow key={website.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{website.name}</p>
                          <p className="text-xs text-muted-foreground">/store/{website.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{website.owner_name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-full border"
                            style={{ background: website.primary_color }}
                            title="Màu chính"
                          />
                          <div 
                            className="w-5 h-5 rounded-full border"
                            style={{ background: website.secondary_color }}
                            title="Màu phụ"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(website.created_at), 'dd/MM/yyyy', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={website.is_active ? 'default' : 'secondary'}
                          className={website.is_active ? 'bg-green-500' : ''}
                        >
                          {website.is_active ? 'Hoạt động' : 'Tắt'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/store/${website.slug}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleWebsiteStatus(website)}
                            disabled={isUpdating}
                          >
                            {website.is_active ? 'Tắt' : 'Bật'}
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
