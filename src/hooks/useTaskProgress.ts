 import { useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 
 export type ActionType = 
   | 'view_product' 
   | 'send_chat' 
   | 'view_post' 
   | 'view_notification' 
   | 'complete_profile' 
   | 'daily_login'
   | 'join_telegram';
 
 export function useTaskProgress() {
   const { user } = useAuth();
 
   const trackAction = useCallback(async (actionType: ActionType) => {
     if (!user) return;
     
     const today = new Date().toISOString().split('T')[0];
     
     try {
       // Check if action already recorded today
       const { data: existing } = await supabase
         .from('daily_action_progress')
         .select('id, action_count')
         .eq('user_id', user.id)
         .eq('action_type', actionType)
         .eq('action_date', today)
         .single();
       
       if (existing) {
         // Increment count
         await supabase
           .from('daily_action_progress')
           .update({ action_count: existing.action_count + 1 })
           .eq('id', existing.id);
       } else {
         // Create new record
         await supabase
           .from('daily_action_progress')
           .insert({
             user_id: user.id,
             action_type: actionType,
             action_count: 1,
             action_date: today
           });
       }
     } catch (error) {
       console.error('Error tracking action:', error);
     }
   }, [user]);
 
   const getProgress = useCallback(async (actionType: ActionType): Promise<number> => {
     if (!user) return 0;
     
     const today = new Date().toISOString().split('T')[0];
     
     try {
       const { data } = await supabase
         .from('daily_action_progress')
         .select('action_count')
         .eq('user_id', user.id)
         .eq('action_type', actionType)
         .eq('action_date', today)
         .single();
       
       return data?.action_count || 0;
     } catch {
       return 0;
     }
   }, [user]);
 
   const getAllProgress = useCallback(async (): Promise<Record<string, number>> => {
     if (!user) return {};
     
     const today = new Date().toISOString().split('T')[0];
     
     try {
       const { data } = await supabase
         .from('daily_action_progress')
         .select('action_type, action_count')
         .eq('user_id', user.id)
         .eq('action_date', today);
       
       const progress: Record<string, number> = {};
       data?.forEach(item => {
         progress[item.action_type] = item.action_count;
       });
       return progress;
     } catch {
       return {};
     }
   }, [user]);
 
   return { trackAction, getProgress, getAllProgress };
 }