import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, UserCheck, UserX, MessageCircle, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FriendsListProps {
  onSelectFriend?: (userId: string) => void;
}

export function FriendsList({ onSelectFriend }: FriendsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFriends();
      subscribeToFriendships();
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;
    
    try {
      // Fetch accepted friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendsError) throw friendsError;

      // Fetch pending requests (where I'm the friend_id - people who want to be my friend)
      const { data: pendingData, error: pendingError } = await supabase
        .from('friendships')
        .select('*')
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Get profiles for all users
      const allUserIds = [
        ...new Set([
          ...(friendsData?.map(f => f.user_id === user.id ? f.friend_id : f.user_id) || []),
          ...(pendingData?.map(f => f.user_id) || [])
        ])
      ];

      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', allUserIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

        const friendsWithProfiles = friendsData?.map(f => ({
          ...f,
          profile: profileMap.get(f.user_id === user.id ? f.friend_id : f.user_id)
        })) || [];

        const pendingWithProfiles = pendingData?.map(f => ({
          ...f,
          profile: profileMap.get(f.user_id)
        })) || [];

        setFriends(friendsWithProfiles);
        setPendingRequests(pendingWithProfiles);
      } else {
        setFriends([]);
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToFriendships = () => {
    if (!user) return;

    const channel = supabase
      .channel('friendships-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAcceptFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: '✅ Đã chấp nhận lời mời kết bạn!',
      });
    } catch (error) {
      console.error('Error accepting friend:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể chấp nhận lời mời',
        variant: 'destructive'
      });
    }
  };

  const handleRejectFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: 'Đã từ chối lời mời kết bạn',
      });
    } catch (error) {
      console.error('Error rejecting friend:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Users className="h-5 w-5" />
          {pendingRequests.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive">
              {pendingRequests.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong border-primary/20 w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bạn bè
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="friends" className="mt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="friends" className="gap-1">
              <UserCheck className="h-4 w-4" />
              Bạn bè ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1 relative">
              <UserPlus className="h-4 w-4" />
              Lời mời ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 space-y-2">
            {friends.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Chưa có bạn bè nào</p>
                <p className="text-sm">Nhấn vào avatar người dùng để kết bạn</p>
              </div>
            ) : (
              friends.map((friend) => (
                <Card key={friend.id} className="p-3 flex items-center gap-3 bg-secondary/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {(friend.profile?.display_name || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {friend.profile?.display_name || 'Người dùng'}
                    </p>
                  </div>
                  {onSelectFriend && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const friendUserId = friend.user_id === user?.id ? friend.friend_id : friend.user_id;
                        onSelectFriend(friendUserId);
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4 space-y-2">
            {pendingRequests.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Không có lời mời kết bạn</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id} className="p-3 bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-accent/20 text-accent">
                        {(request.profile?.display_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {request.profile?.display_name || 'Người dùng'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Muốn kết bạn với bạn
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleAcceptFriend(request.id)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Chấp nhận
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRejectFriend(request.id)}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Từ chối
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
