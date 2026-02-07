import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChildWebsite {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primary_color: string;
  secondary_color: string;
  banner_url: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_qr_url: string | null;
  owner_id: string;
}

interface ChildWebsiteContextType {
  website: ChildWebsite | null;
  isLoading: boolean;
  error: string | null;
  primaryColor: string;
  secondaryColor: string;
}

const ChildWebsiteContext = createContext<ChildWebsiteContextType | undefined>(undefined);

export function ChildWebsiteProvider({ 
  slug, 
  children 
}: { 
  slug: string; 
  children: ReactNode 
}) {
  const [website, setWebsite] = useState<ChildWebsite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchWebsite();
    }
  }, [slug]);

  const fetchWebsite = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: err } = await supabase
        .from('child_websites')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      
      if (err) {
        if (err.code === 'PGRST116') {
          setError('Không tìm thấy website này');
        } else {
          throw err;
        }
        return;
      }
      
      setWebsite(data);
    } catch (err: any) {
      console.error('Error fetching website:', err);
      setError('Có lỗi xảy ra khi tải website');
    } finally {
      setIsLoading(false);
    }
  };

  const primaryColor = website?.primary_color || '#8B5CF6';
  const secondaryColor = website?.secondary_color || '#D946EF';

  return (
    <ChildWebsiteContext.Provider value={{ 
      website, 
      isLoading, 
      error,
      primaryColor,
      secondaryColor
    }}>
      {children}
    </ChildWebsiteContext.Provider>
  );
}

export function useChildWebsite() {
  const context = useContext(ChildWebsiteContext);
  if (context === undefined) {
    throw new Error('useChildWebsite must be used within a ChildWebsiteProvider');
  }
  return context;
}
