import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSessionHeartbeat, deactivateCurrentSession } from '@/hooks/useSessionManager';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface SellerProfile {
  id: string;
  display_name: string;
  is_profile_complete: boolean;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_qr_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  sellerProfile: SellerProfile | null;
  needsSellerSetup: boolean;
  userProfile: Profile | null;
  displayName: string | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSellerProfile: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [needsSellerSetup, setNeedsSellerSetup] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('Error in checkAdminRole:', err);
      return false;
    }
  };

  const checkSellerProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('id, display_name, is_profile_complete, bank_name, bank_account_name, bank_account_number, bank_qr_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking seller profile:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error in checkSellerProfile:', err);
      return null;
    }
  };

  const checkUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, phone')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking user profile:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error in checkUserProfile:', err);
      return null;
    }
  };

  const updateRoleAndSellerState = async (currentUser: User | null) => {
    if (!currentUser) {
      setIsAdmin(false);
      setSellerProfile(null);
      setNeedsSellerSetup(false);
      setUserProfile(null);
      return;
    }

    const [isAdminResult, profile, uProfile] = await Promise.all([
      checkAdminRole(currentUser.id),
      checkSellerProfile(currentUser.id),
      checkUserProfile(currentUser.id)
    ]);

    setIsAdmin(isAdminResult);
    setSellerProfile(profile);
    setUserProfile(uProfile);
    // Only require seller setup if admin doesn't have a seller profile at all
    // If profile exists (even incomplete), don't force setup - they can update later
    setNeedsSellerSetup(false);
  };

  const refreshSellerProfile = async () => {
    if (!user) return;
    const profile = await checkSellerProfile(user.id);
    setSellerProfile(profile);
    setNeedsSellerSetup(isAdmin && (!profile || !profile.is_profile_complete));
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    const profile = await checkUserProfile(user.id);
    setUserProfile(profile);
  };

  // Compute display name from multiple sources
  const displayName = userProfile?.display_name 
    || user?.user_metadata?.full_name 
    || user?.user_metadata?.name 
    || user?.user_metadata?.display_name
    || user?.email?.split('@')[0] 
    || null;

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);
        updateRoleAndSellerState(currentUser);

        // Handle new OAuth sign-ups
        if (event === 'SIGNED_IN' && currentUser) {
          const provider = currentUser.app_metadata?.provider;
          // Check if this is a new user (created in last 30 seconds)
          const createdAt = new Date(currentUser.created_at);
          const now = new Date();
          const isNewUser = (now.getTime() - createdAt.getTime()) < 30000;

          if (provider === 'google' && isNewUser) {
            // Update profile with Google display name
            const googleName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name;
            const displayName = googleName || 'Người dùng Google';
            
            setTimeout(async () => {
              // Update display name if available
              if (googleName) {
                await supabase
                  .from('profiles')
                  .update({ display_name: googleName })
                  .eq('user_id', currentUser.id);
                
                // Refresh profile after update
                const profile = await checkUserProfile(currentUser.id);
                setUserProfile(profile);
              }

              // Send Telegram notification for new Google registration
              try {
                await supabase.functions.invoke('send-telegram-notification', {
                  body: {
                    type: 'new_registration',
                    userEmail: currentUser.email,
                    userName: displayName
                  }
                });
              } catch (telegramError) {
                console.log('Telegram notification failed (non-critical):', telegramError);
              }
               
              // Check for referral code in localStorage (saved before OAuth redirect)
              const savedReferralCode = localStorage.getItem('pending_referral_code');
              if (savedReferralCode) {
                try {
                 console.log('Processing referral for Google OAuth user, code:', savedReferralCode);
                  await processReferralReward(savedReferralCode, currentUser.id, displayName);
                  localStorage.removeItem('pending_referral_code');
                } catch (refError) {
                  console.log('Referral processing failed:', refError);
                }
              }
           }, 1500);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      updateRoleAndSellerState(currentUser);
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

   // Process referral reward helper
   const processReferralReward = async (code: string, newUserId: string, newUserName: string) => {
     try {
       console.log('processReferralReward called with:', { code, newUserId, newUserName });
       
       // Wait a bit more to ensure profile is created
       await new Promise(resolve => setTimeout(resolve, 2000));
       
       // Find referrer by code
       const { data: referrerProfile } = await supabase
         .from('profiles')
         .select('user_id, display_name')
         .eq('referral_code', code.toUpperCase())
         .single();
       
       if (!referrerProfile) {
         console.log('Referral code not found:', code);
         return;
       }
       
       // Don't allow self-referral
       if (referrerProfile.user_id === newUserId) {
         console.log('Self-referral not allowed');
         return;
       }
       
       // Check if already referred
       const { data: existingReferral } = await supabase
         .from('referrals')
         .select('id')
         .eq('referred_id', newUserId)
         .single();
       
       if (existingReferral) {
         console.log('User already has a referral record');
         return;
       }
       
       console.log('Found referrer:', referrerProfile);
       
       // Create referral record
       const { error: refError } = await supabase
         .from('referrals')
         .insert({
           referrer_id: referrerProfile.user_id,
           referred_id: newUserId, 
           referral_code: code.toUpperCase(),
           coins_rewarded: 5,
           is_rewarded: true,
           rewarded_at: new Date().toISOString()
         });
       
       if (refError) {
         console.error('Error creating referral:', refError);
         return;
       }
       
       console.log('Referral record created');
       
       // Add coins to referrer
       const { data: referrerCoins } = await supabase
         .from('user_coins')
         .select('balance')
         .eq('user_id', referrerProfile.user_id)
         .single();
       
       if (referrerCoins) {
         await supabase
           .from('user_coins')
           .update({ balance: referrerCoins.balance + 5 })
           .eq('user_id', referrerProfile.user_id);
       } else {
         await supabase
           .from('user_coins')
           .insert({ user_id: referrerProfile.user_id, balance: 5 });
       }
       
       console.log('Added 5 coins to referrer');
       
       // Create notification for referrer
       await supabase.from('notifications').insert({
         user_id: referrerProfile.user_id,
         title: '🎉 Mời bạn thành công!',
         message: `Bạn đã mời thành công người dùng: ${newUserName || 'Người dùng mới'}. Bạn đã nhận được 5 xu thưởng!`,
         type: 'referral',
       });
       
       console.log('Referral notification created for:', referrerProfile.user_id);
       
       // Also send Telegram notification about successful referral
       try {
         await supabase.functions.invoke('send-telegram-notification', {
           body: {
             type: 'new_registration',
             userEmail: `Referral: ${newUserName || 'Người dùng mới'} đã đăng ký qua mã mời của ${referrerProfile.display_name}`,
             userName: `+5 xu cho ${referrerProfile.display_name}`
           }
         });
       } catch (e) {
         console.log('Telegram referral notification failed');
       }
     } catch (error) {
       console.error('Error processing referral:', error);
     }
   };
 
  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await deactivateCurrentSession();
    await supabase.auth.signOut();
    setIsAdmin(false);
    setSellerProfile(null);
    setNeedsSellerSetup(false);
    setUserProfile(null);
  };

  // Session heartbeat - keeps session alive and detects kicks
  useSessionHeartbeat(user?.id ?? null);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isAdmin, 
      isLoading, 
      sellerProfile, 
      needsSellerSetup, 
      userProfile,
      displayName,
      signUp, 
      signIn, 
      signOut,
      refreshSellerProfile,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
