import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, Search, Eye, Heart, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Post {
  id: string;
  title: string;
  description: string | null;
  content: string;
  image_url: string | null;
  views: number;
  created_at: string;
}

export function ChildPosts() {
  const { slug } = useParams<{ slug: string }>();
  const { primaryColor, secondaryColor } = useChildWebsite();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(search.toLowerCase()) ||
    post.description?.toLowerCase().includes(search.toLowerCase())
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
          <div 
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-4"
            style={{ 
              background: `linear-gradient(to right, ${primaryColor}10, ${secondaryColor}10)`,
              borderColor: primaryColor + '30'
            }}
          >
            <FileText className="h-4 w-4" style={{ color: primaryColor }} />
            <span className="text-sm font-medium" style={{ color: primaryColor }}>Blog & Tin tức</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Bài viết <span style={{ color: primaryColor }}>mới nhất</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cập nhật tin tức, thủ thuật và hướng dẫn hữu ích
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm bài viết..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: primaryColor + '50' }} />
            <p className="text-muted-foreground">Chưa có bài viết nào</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <Card 
                key={post.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
                style={{ borderColor: primaryColor + '20' }}
              >
                {post.image_url && (
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={post.image_url} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                  </div>
                )}
                
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(post.created_at), 'dd/MM/yyyy', { locale: vi })}
                    <span className="mx-1">•</span>
                    <Eye className="h-3 w-3" />
                    {post.views} lượt xem
                  </div>
                  
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  
                  {post.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {post.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
