import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, FolderOpen, Search, Package } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  slug: string;
}

export function ChildCategories() {
  const { slug } = useParams<{ slug: string }>();
  const { primaryColor, secondaryColor } = useChildWebsite();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase())
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
            <FolderOpen className="h-4 w-4" style={{ color: primaryColor }} />
            <span className="text-sm font-medium" style={{ color: primaryColor }}>Danh mục</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Danh mục <span style={{ color: primaryColor }}>sản phẩm</span>
          </h1>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm danh mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-16 w-16 mx-auto mb-4" style={{ color: primaryColor + '50' }} />
            <p className="text-muted-foreground">Chưa có danh mục nào</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCategories.map((category) => (
              <Link
                key={category.id}
                to={`/store/${slug}/accounts?category=${category.slug}`}
              >
                <Card 
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                  style={{ borderColor: primaryColor + '20' }}
                >
                  <CardContent className="p-6 text-center">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}30)` }}
                    >
                      {category.icon ? (
                        <span className="text-2xl">{category.icon}</span>
                      ) : (
                        <Package className="h-8 w-8" style={{ color: primaryColor }} />
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
