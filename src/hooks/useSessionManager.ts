import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceInfo } from '@/lib/deviceFingerprint';

const SESSION_TOKEN_KEY = 'bonz_session_token';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

function getSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

export interface ActiveSession {
  id: string;
  deviceName: string;
  os: string;
  browser: string;
  lastActiveAt: string;
  sessionToken: string;
}

// Check if user has active session on another device
export async function checkExistingSession(userId: string): Promise<ActiveSession | null> {
  const currentToken = getSessionToken();
  
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .neq('session_token', currentToken)
    .order('last_active_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error || !data) return null;
  
  // Only consider sessions active in the last 2 minutes
  const lastActive = new Date(data.last_active_at).getTime();
  const twoMinutesAgo = Date.now() - 120000;
  
  if (lastActive < twoMinutesAgo) {
    // Session is stale, deactivate it
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', data.id);
    return null;
  }
  
  return {
    id: data.id,
    deviceName: data.device_name || 'Unknown',
    os: data.os || 'Unknown',
    browser: data.browser || 'Unknown',
    lastActiveAt: data.last_active_at,
    sessionToken: data.session_token,
  };
}

// Register current session as active
export async function registerSession(userId: string): Promise<void> {
  const device = await getDeviceInfo();
  const sessionToken = getSessionToken();
  
  // Deactivate all other sessions for this user
  await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .neq('session_token', sessionToken);
  
  // Upsert current session
  const { data: existing } = await supabase
    .from('user_sessions')
    .select('id')
    .eq('session_token', sessionToken)
    .maybeSingle();
  
  if (existing) {
    await supabase
      .from('user_sessions')
      .update({
        is_active: true,
        last_active_at: new Date().toISOString(),
        device_fingerprint: device.fingerprint,
        device_name: device.deviceName,
        os: device.os,
        browser: device.browser,
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        device_fingerprint: device.fingerprint,
        device_name: device.deviceName,
        os: device.os,
        browser: device.browser,
        is_active: true,
      });
  }
}

// Force deactivate a specific session
export async function forceDeactivateSession(sessionId: string): Promise<void> {
  await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('id', sessionId);
}

// Deactivate current session (on logout)
export async function deactivateCurrentSession(): Promise<void> {
  const sessionToken = getSessionToken();
  await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('session_token', sessionToken);
}

// Check if device already registered an account
export async function checkDeviceRegistration(): Promise<{ registered: boolean; userId?: string }> {
  const device = await getDeviceInfo();
  
  const { data, error } = await supabase
    .from('device_registrations')
    .select('user_id')
    .eq('device_fingerprint', device.fingerprint)
    .maybeSingle();
  
  if (error || !data) return { registered: false };
  return { registered: true, userId: data.user_id };
}

// Register device for a new account
export async function registerDevice(userId: string): Promise<void> {
  const device = await getDeviceInfo();
  
  await supabase
    .from('device_registrations')
    .insert({
      device_fingerprint: device.fingerprint,
      user_id: userId,
      device_name: device.deviceName,
      os: device.os,
      browser: device.browser,
      user_agent: device.userAgent,
    });
}

// Hook: keeps session alive with heartbeat and listens for kicks
export function useSessionHeartbeat(userId: string | null) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const heartbeat = useCallback(async () => {
    if (!userId) return;
    const sessionToken = getSessionToken();
    
    await supabase
      .from('user_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('session_token', sessionToken)
      .eq('is_active', true);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Initial heartbeat
    heartbeat();
    
    // Set interval
    intervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    // Listen for session deactivation via realtime
    const channel = supabase
      .channel(`session-kick-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          const sessionToken = getSessionToken();
          
          // If OUR session was deactivated by someone else
          if (updated.session_token === sessionToken && updated.is_active === false) {
            // Force sign out
            await supabase.auth.signOut();
            window.location.href = '/auth?kicked=true';
          }
        }
      )
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId, heartbeat]);
}
