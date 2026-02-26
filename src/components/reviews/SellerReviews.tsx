import { useState, useEffect } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  buyer_id: string;
  buyer_name?: string;
}

interface SellerReviewsProps {
  sellerId: string;
  sellerName?: string;
  canReview?: boolean;
  orderId?: string;
}

export function SellerReviews({ sellerId, sellerName, canReview, orderId }: SellerReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [sellerId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('seller_reviews')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const reviewsData = (data || []) as any[];

      // Fetch buyer names
      const buyerIds = [...new Set(reviewsData.map((r: any) => r.buyer_id))];
      let profileMap = new Map<string, string>();
      
      if (buyerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', buyerIds);
        profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || 'Ẩn danh']));
      }

      const reviewsWithNames: Review[] = reviewsData.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        buyer_id: r.buyer_id,
        buyer_name: profileMap.get(r.buyer_id) || 'Ẩn danh',
      }));

      setReviews(reviewsWithNames);

      if (reviewsWithNames.length > 0) {
        const avg = reviewsWithNames.reduce((sum, r) => sum + r.rating, 0) / reviewsWithNames.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);

    try {
      const { error } = await (supabase as any).from('seller_reviews').insert({
        seller_id: sellerId,
        buyer_id: user.id,
        order_id: orderId || null,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Bạn đã đánh giá đơn hàng này rồi');
          return;
        }
        throw error;
      }

      toast.success('Đánh giá thành công! ⭐');
      setComment('');
      setRating(5);
      fetchReviews();
    } catch (err) {
      console.error('Review error:', err);
      toast.error('Không thể gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, interactive = false }: { value: number; interactive?: boolean }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-5 w-5 transition-colors',
            (interactive ? (hoverRating || rating) : value) >= star
              ? 'text-primary fill-primary'
              : 'text-muted-foreground/30',
            interactive && 'cursor-pointer hover:scale-110 transition-transform'
          )}
          onClick={() => interactive && setRating(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        />
      ))}
    </div>
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary fill-primary" />
            Đánh giá {sellerName ? `- ${sellerName}` : ''}
          </span>
          {reviews.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {averageRating}/5 ({reviews.length} đánh giá)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canReview && user && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium">Đánh giá của bạn</p>
            <StarRating value={rating} interactive />
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhận xét về người bán (không bắt buộc)..."
              className="resize-none"
              maxLength={500}
              rows={2}
            />
            <Button onClick={handleSubmit} disabled={submitting} size="sm" className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi đánh giá
            </Button>
          </div>
        )}

        {loading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Chưa có đánh giá nào</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {reviews.map((review) => (
              <div key={review.id} className="flex gap-3 p-3 rounded-lg bg-card border border-border/50">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                  {review.buyer_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{review.buyer_name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(review.created_at)}</span>
                  </div>
                  <StarRating value={review.rating} />
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
