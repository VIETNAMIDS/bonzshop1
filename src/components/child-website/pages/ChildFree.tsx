import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Gift, Download, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface FreeResource {
  id: string;
  title: string;
  description: string | null;
  content: string;
  icon: string | null;
  type: string;
  claim_limit: number | null;
  claimed_count: number | null;
}

export function ChildFree() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { primaryColor, secondaryColor } = useChildWebsite();
  const navigate = useNavigate();
  
  const [resources, setResources] = useState<FreeResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimedIds, setClaimedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchResources();
    if (user) {
      fetchClaimedResources();
    }
  }, [user]);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('free_resources')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimedResources = async () => {
    const { data } = await supabase
      .from('resource_claims')
      .select('resource_id')
      .eq('user_id', user?.id);
    
    if (data) {
      setClaimedIds(data.map(c => c.resource_id));
    }
  };

  const handleClaim = async (resource: FreeResource) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (claimedIds.includes(resource.id)) {
      toast.info('Bạn đã nhận tài nguyên này rồi!');
      return;
    }

    try {
      await supabase
        .from('resource_claims')
        .insert({
          user_id: user.id,
          resource_id: resource.id
        });

      await supabase
        .from('free_resources')
        .update({ claimed_count: (resource.claimed_count || 0) + 1 })
        .eq('id', resource.id);

      setClaimedIds(prev => [...prev, resource.id]);
      toast.success('Nhận thành công! Kiểm tra nội dung bên dưới.');
    } catch (error) {
      console.error('Error claiming:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

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
          <div 
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-4"
            style={{ 
              background: `linear-gradient(to right, ${primaryColor}10, ${secondaryColor}10)`,
              borderColor: primaryColor + '30'
            }}
          >
            <Gift className="h-4 w-4" style={{ color: primaryColor }} />
            <span className="text-sm font-medium" style={{ color: primaryColor }}>Miễn phí</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Tài nguyên <span style={{ color: primaryColor }}>miễn phí</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Nhận các tài nguyên, tài khoản miễn phí mỗi ngày!
          </p>
        </div>

        {/* Resources Grid */}
        {resources.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="h-16 w-16 mx-auto mb-4" style={{ color: primaryColor + '50' }} />
            <p className="text-muted-foreground">Chưa có tài nguyên miễn phí nào</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => {
              const isClaimed = claimedIds.includes(resource.id);
              
              return (
                <Card 
                  key={resource.id}
                  className="overflow-hidden"
                  style={{ borderColor: primaryColor + '20' }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}30)` }}
                      >
                        {resource.icon ? (
                          <span className="text-xl">{resource.icon}</span>
                        ) : (
                          <Gift className="h-6 w-6" style={{ color: primaryColor }} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{resource.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {resource.type}
                        </Badge>
                      </div>
                    </div>

                    {resource.description && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {resource.description}
                      </p>
                    )}

                    {isClaimed && (
                      <div className="mb-4 p-3 rounded-lg bg-secondary/50 text-sm font-mono">
                        {resource.content}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {resource.claimed_count || 0} đã nhận
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleClaim(resource)}
                        disabled={isClaimed}
                        style={!isClaimed ? { 
                          background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` 
                        } : {}}
                      >
                        {isClaimed ? (
                          <>
                            <Sparkles className="h-4 w-4 mr-1" />
                            Đã nhận
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Nhận ngay
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
