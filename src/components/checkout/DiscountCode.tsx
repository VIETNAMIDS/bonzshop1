import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Ticket, X, Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DiscountCodeProps {
  originalPrice: number;
  onApply: (discountAmount: number, code: string, codeId: string) => void;
  onRemove: () => void;
  appliedCode: string | null;
  discountAmount: number;
}

export function DiscountCode({ 
  originalPrice, 
  onApply, 
  onRemove, 
  appliedCode, 
  discountAmount 
}: DiscountCodeProps) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    setError('');
    
    const upperCode = code.toUpperCase().trim();
    
    try {
      // Fetch the discount code from database
      const { data: discountData, error: fetchError } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', upperCode)
        .eq('is_active', true)
        .single();
      
      if (fetchError || !discountData) {
        setError('Mã giảm giá không hợp lệ hoặc đã hết hạn');
        setLoading(false);
        return;
      }

      // Check if expired
      if (discountData.expires_at && new Date(discountData.expires_at) < new Date()) {
        setError('Mã giảm giá đã hết hạn');
        setLoading(false);
        return;
      }

      // Check max uses
      if (discountData.max_uses && discountData.used_count >= discountData.max_uses) {
        setError('Mã giảm giá đã hết lượt sử dụng');
        setLoading(false);
        return;
      }

      // Check min order amount
      if (discountData.min_order_amount && originalPrice < discountData.min_order_amount) {
        setError(`Đơn hàng tối thiểu ${discountData.min_order_amount} xu`);
        setLoading(false);
        return;
      }

      // Check if code is targeted to a specific user
      if (discountData.target_user_id && discountData.target_user_id !== user?.id) {
        setError('Mã giảm giá này không dành cho bạn');
        setLoading(false);
        return;
      }

      // Check if user already used this code
      if (user) {
        const { data: usedData } = await supabase
          .from('discount_code_uses')
          .select('id')
          .eq('code_id', discountData.id)
          .eq('user_id', user.id)
          .single();
        
        if (usedData) {
          setError('Bạn đã sử dụng mã này rồi');
          setLoading(false);
          return;
        }
      }

      // Calculate discount
      let discountValue = 0;
      if (discountData.discount_type === 'percent') {
        discountValue = Math.floor(originalPrice * (discountData.discount_amount / 100));
      } else {
        discountValue = Math.min(discountData.discount_amount, originalPrice);
      }
      
      onApply(discountValue, upperCode, discountData.id);
    } catch (err) {
      setError('Có lỗi xảy ra, vui lòng thử lại');
    }
    
    setLoading(false);
  };

  if (appliedCode) {
    return (
      <div className="p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500 text-white border-0">
                  {appliedCode}
                </Badge>
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-xs text-green-600">
                Giảm {discountAmount.toLocaleString()} xu
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nhập mã giảm giá (VD: BONZ10K)"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            className={cn(
              "pl-10 uppercase",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={!code.trim() || loading}
          variant="outline"
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Áp dụng'
          )}
        </Button>
      </div>
      
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}