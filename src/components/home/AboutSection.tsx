import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Shield, Zap, Users, Award, HeartHandshake, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';

const FEATURES = [
  {
    icon: Shield,
    title: 'An toàn & Bảo mật',
    description: 'Mọi giao dịch được bảo vệ với hệ thống escrow hiện đại',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Zap,
    title: 'Giao dịch nhanh chóng',
    description: 'Nhận sản phẩm ngay sau khi thanh toán thành công',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    icon: Users,
    title: 'Cộng đồng lớn mạnh',
    description: 'Hàng nghìn thành viên tin tưởng và sử dụng mỗi ngày',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: Award,
    title: 'Sản phẩm chất lượng',
    description: 'Kiểm duyệt kỹ càng, cam kết chất lượng hàng đầu',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: HeartHandshake,
    title: 'Hỗ trợ 24/7',
    description: 'Đội ngũ hỗ trợ luôn sẵn sàng giải đáp mọi thắc mắc',
    gradient: 'from-red-500 to-rose-500'
  },
  {
    icon: Clock,
    title: 'Hoàn tiền nhanh',
    description: 'Hoàn tiền trong 24h nếu sản phẩm không đúng mô tả',
    gradient: 'from-indigo-500 to-violet-500'
  }
];

export function AboutSection() {
  const [aboutContent, setAboutContent] = useState('');

  useEffect(() => {
    fetchAbout();
  }, []);

  const fetchAbout = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'about_content')
      .single();

    if (data?.value) {
      setAboutContent(data.value);
    }
  };

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 hero-pattern opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <ScrollReveal variant="fadeUp">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-gradient">Tại sao chọn BonzShop?</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {aboutContent || 'Chúng tôi cam kết mang đến trải nghiệm mua sắm an toàn và tiện lợi nhất cho bạn.'}
            </p>
          </div>
        </ScrollReveal>

        {/* Features grid */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1}>
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <StaggerItem key={index}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card 
                    className={cn(
                      "glass p-6 border-primary/10",
                      "group cursor-default h-full"
                    )}
                  >
                    <motion.div 
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center mb-4",
                        "bg-gradient-to-r",
                        feature.gradient,
                      )}
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </Card>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
