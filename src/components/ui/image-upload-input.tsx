import * as React from 'react';
import { useState } from 'react';
import { Upload, Link as LinkIcon, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  bucket?: string;
  folder?: string;
  className?: string;
}

type InputMode = 'url' | 'upload';

export function ImageUploadInput({
  value,
  onChange,
  label = 'Hình ảnh',
  placeholder = 'https://...',
  bucket = 'images',
  folder = 'uploads',
  className,
}: ImageUploadInputProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<InputMode>('url');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn file ảnh (jpg, png, gif, webp...)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Lỗi',
        description: 'Kích thước file tối đa là 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast({ title: '✅ Tải ảnh lên thành công!' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Lỗi tải ảnh',
        description: error.message || 'Không thể tải ảnh lên',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
        <Button
          type="button"
          variant={mode === 'url' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-3 text-xs gap-1.5"
          onClick={() => setMode('url')}
        >
          <LinkIcon className="h-3 w-3" />
          URL
        </Button>
        <Button
          type="button"
          variant={mode === 'upload' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-3 text-xs gap-1.5"
          onClick={() => setMode('upload')}
        >
          <Upload className="h-3 w-3" />
          Upload
        </Button>
      </div>

      {/* Input Area */}
      {mode === 'url' ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11"
        />
      ) : (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Chọn ảnh từ máy
              </>
            )}
          </Button>
        </div>
      )}

      {/* Preview */}
      {value && (
        <div className="relative rounded-lg overflow-hidden border border-border bg-secondary/30">
          <img
            src={value}
            alt="Preview"
            className="w-full h-32 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden w-full h-32 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
