import { useState } from 'react';
import { Search, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AdvancedSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories: { id: string; name: string }[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalResults: number;
}

export function AdvancedSearch({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  sortBy,
  onSortChange,
  totalResults,
}: AdvancedSearchProps) {
  const [showFilters, setShowFilters] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  const hasActiveFilters = selectedCategory !== 'all' || priceRange[0] > 0 || priceRange[1] < 10000000 || sortBy !== 'newest';

  const clearFilters = () => {
    onCategoryChange('all');
    onPriceRangeChange([0, 10000000]);
    onSortChange('newest');
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm kiếm sản phẩm, tài khoản..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="icon"
          className="h-11 w-11 flex-shrink-0 relative"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {hasActiveFilters && (
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
          )}
        </Button>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && !showFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Bộ lọc:</span>
          {selectedCategory !== 'all' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onCategoryChange('all')} />
            </Badge>
          )}
          {(priceRange[0] > 0 || priceRange[1] < 10000000) && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onPriceRangeChange([0, 10000000])} />
            </Badge>
          )}
          <button onClick={clearFilters} className="text-xs text-primary hover:underline">
            Xóa tất cả
          </button>
        </div>
      )}

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-card border border-border">
              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Danh mục</label>
                <Select value={selectedCategory} onValueChange={onCategoryChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Giá: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])} xu
                </label>
                <Slider
                  value={priceRange}
                  onValueChange={(val) => onPriceRangeChange(val as [number, number])}
                  min={0}
                  max={10000000}
                  step={10000}
                  className="mt-3"
                />
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Sắp xếp</label>
                <Select value={sortBy} onValueChange={onSortChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Mới nhất</SelectItem>
                    <SelectItem value="price_asc">Giá tăng dần</SelectItem>
                    <SelectItem value="price_desc">Giá giảm dần</SelectItem>
                    <SelectItem value="popular">Phổ biến nhất</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Tìm thấy <span className="font-semibold text-foreground">{totalResults}</span> kết quả
        </p>
      </div>
    </div>
  );
}
