import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, Search, Shield, Skull, ExternalLink } from 'lucide-react';
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

const SEVERITY_CONFIG = {
  low: { label: 'Thấp', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  medium: { label: 'Trung bình', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  high: { label: 'Cao', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  critical: { label: 'Nghiêm trọng', color: 'bg-destructive/20 text-destructive border-destructive/30' },
};

export function ChildScamReports() {
  const { primaryColor } = useChildWebsite();
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('scam_reports')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching scam reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => 
    report.title.toLowerCase().includes(search.toLowerCase()) ||
    report.scammer_name?.toLowerCase().includes(search.toLowerCase()) ||
    report.scammer_contact?.toLowerCase().includes(search.toLowerCase()) ||
    report.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-destructive/20 border border-destructive/30">
              <Skull className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
              Danh Sách Scam
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cảnh báo các đối tượng lừa đảo đã được xác minh. Hãy cẩn thận khi giao dịch!
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-8 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">⚠️ Cảnh báo quan trọng</p>
            <p className="text-sm text-muted-foreground mt-1">
              Danh sách này được Admin xác minh từ các báo cáo thực tế.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên, liên hệ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Reports Grid */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="h-16 w-16 mx-auto text-primary/50 mb-4" />
            <p className="text-muted-foreground">Chưa có báo cáo scam nào</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredReports.map((report) => {
              const severity = SEVERITY_CONFIG[report.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
              
              return (
                <Card 
                  key={report.id} 
                  className="glass-strong border-destructive/20 overflow-hidden hover:border-destructive/40 transition-all"
                >
                  {report.image_url && (
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={report.image_url} 
                        alt={report.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={cn("border", severity.color)}>
                        {severity.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: vi })}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-destructive mb-2 flex items-center gap-2">
                      <Skull className="h-5 w-5" />
                      {report.title}
                    </h3>

                    {(report.scammer_name || report.scammer_contact) && (
                      <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        {report.scammer_name && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Tên:</span>{' '}
                            <span className="font-medium text-destructive">{report.scammer_name}</span>
                          </p>
                        )}
                        {report.scammer_contact && (
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">Liên hệ:</span>{' '}
                            <span className="font-medium text-foreground">{report.scammer_contact}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {report.description}
                    </p>

                    {report.evidence_urls && report.evidence_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {report.evidence_urls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs hover:underline"
                            style={{ color: primaryColor }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Bằng chứng {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
