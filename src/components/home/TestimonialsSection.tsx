import { motion } from 'framer-motion';
import { Star, Quote, MessageSquare } from 'lucide-react';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';

const testimonials = [
  {
    name: 'Minh T.',
    avatar: '🧑‍💻',
    role: 'Web Developer',
    content: 'Mua source code ở đây rất nhanh, giao hàng tức thì. Chất lượng code rất tốt, tiết kiệm rất nhiều thời gian!',
    rating: 5,
  },
  {
    name: 'Hương N.',
    avatar: '👩‍🎓',
    role: 'Sinh viên IT',
    content: 'Giá rẻ hơn nhiều so với các nền tảng khác. Hỗ trợ nhanh, mã giảm giá thường xuyên!',
    rating: 5,
  },
  {
    name: 'Đức P.',
    avatar: '👨‍💼',
    role: 'Freelancer',
    content: 'Đã mua hơn 20 sản phẩm, tất cả đều hoạt động tốt. Seller uy tín, giao dịch an toàn 100%.',
    rating: 5,
  },
  {
    name: 'Linh V.',
    avatar: '👩‍💻',
    role: 'Mobile Developer',
    content: 'Tài khoản premium giá tốt, kích hoạt nhanh. Đặc biệt thích hệ thống xu, mua bán rất tiện!',
    rating: 4,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-12 md:py-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] bg-accent/5 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto relative">
        <ScrollReveal variant="fadeUp">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 px-4 py-1.5 mb-4">
              <MessageSquare className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning">Phản hồi từ khách hàng</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Khách hàng nói gì về <span className="text-gradient">BonzShop</span>?
            </h2>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.1}>
          {testimonials.map((t, i) => (
            <StaggerItem key={i}>
              <motion.div
                className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 h-full flex flex-col"
                whileHover={{ y: -6, boxShadow: '0 20px 50px -15px hsl(280 85% 65% / 0.15)' }}
              >
                <Quote className="h-6 w-6 text-primary/30 mb-3" />
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.content}"</p>
                <div className="flex items-center gap-1 my-3">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className={`h-4 w-4 ${j < t.rating ? 'text-warning fill-warning' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                  <span className="text-2xl">{t.avatar}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
