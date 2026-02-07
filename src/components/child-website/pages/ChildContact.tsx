import { useChildWebsite } from '@/contexts/ChildWebsiteContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, MapPin, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ChildContact() {
  const { website, primaryColor, secondaryColor } = useChildWebsite();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Tin nhắn đã được gửi! Chúng tôi sẽ liên hệ lại sớm.');
  };

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-4"
            style={{ 
              background: `linear-gradient(to right, ${primaryColor}10, ${secondaryColor}10)`,
              borderColor: primaryColor + '30'
            }}
          >
            <MessageCircle className="h-4 w-4" style={{ color: primaryColor }} />
            <span className="text-sm font-medium" style={{ color: primaryColor }}>Liên hệ</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Liên hệ <span style={{ color: primaryColor }}>{website?.name}</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Có câu hỏi hoặc cần hỗ trợ? Hãy liên hệ với chúng tôi!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <Card style={{ borderColor: primaryColor + '20' }}>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}30)` }}
                  >
                    <Mail className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <p className="text-muted-foreground">support@bonzshop.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}30)` }}
                  >
                    <Phone className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Hotline</h3>
                    <p className="text-muted-foreground">0123 456 789</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}30)` }}
                  >
                    <MapPin className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Địa chỉ</h3>
                    <p className="text-muted-foreground">Việt Nam</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card style={{ borderColor: primaryColor + '20' }}>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Họ tên</label>
                  <Input placeholder="Nhập họ tên của bạn" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input type="email" placeholder="email@example.com" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Nội dung</label>
                  <Textarea placeholder="Nhập nội dung tin nhắn..." rows={5} required />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Gửi tin nhắn
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
