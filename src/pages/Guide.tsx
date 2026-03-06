import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, UserPlus, Coins, ShoppingCart, Store, MessageCircle, Gift, BookOpen } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";

const steps = [
  {
    icon: UserPlus,
    title: "Đăng ký tài khoản",
    desc: "Tạo tài khoản bằng email. Xác minh email để kích hoạt tài khoản và bắt đầu sử dụng.",
    tips: ["Sử dụng email thật để nhận thông báo", "Đặt mật khẩu mạnh, ít nhất 8 ký tự"],
  },
  {
    icon: Coins,
    title: "Nạp Xu (Coin)",
    desc: "Nạp xu qua chuyển khoản ngân hàng hoặc thẻ cào. Xu được dùng để mua sản phẩm trên BonzShop.",
    tips: ["Chuyển khoản đúng nội dung để được duyệt nhanh", "Thẻ cào sẽ bị chiết khấu theo nhà mạng"],
  },
  {
    icon: ShoppingCart,
    title: "Mua sản phẩm",
    desc: "Duyệt danh mục, chọn sản phẩm phù hợp và thanh toán bằng xu. Thông tin tài khoản sẽ được giao ngay.",
    tips: ["Kiểm tra kỹ thông tin sản phẩm trước khi mua", "Đổi mật khẩu ngay sau khi nhận tài khoản"],
  },
  {
    icon: Store,
    title: "Trở thành người bán",
    desc: "Đăng ký làm người bán để đăng sản phẩm và kiếm thu nhập. Cần xác minh danh tính.",
    tips: ["Mô tả sản phẩm chi tiết, trung thực", "Phản hồi khiếu nại nhanh chóng"],
  },
  {
    icon: Gift,
    title: "Nhận thưởng hàng ngày",
    desc: "Điểm danh mỗi ngày, hoàn thành nhiệm vụ và quay thưởng để nhận xu miễn phí.",
    tips: ["Điểm danh liên tục để nhận streak bonus", "Kiểm tra nhiệm vụ hàng ngày trong mục Phần thưởng"],
  },
  {
    icon: MessageCircle,
    title: "Chat & Cộng đồng",
    desc: "Tham gia chat cộng đồng, kết bạn và trao đổi thông tin với người dùng khác.",
    tips: ["Báo cáo scam nếu phát hiện lừa đảo", "Đọc bài viết để cập nhật tin tức"],
  },
];

export default function Guide() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageWrapper>
        <section className="py-16 px-4 relative overflow-hidden">
          <div className="absolute inset-0 hero-pattern" />
          <div className="container mx-auto relative z-10 text-center">
            <Button asChild variant="ghost" className="mb-6">
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Về trang chủ</Link>
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 mb-4">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Hướng dẫn</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-gradient">Hướng dẫn sử dụng</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Các bước cơ bản để bắt đầu mua bán trên BonzShop.
            </p>
          </div>
        </section>

        <section className="pb-16 px-4">
          <div className="container mx-auto max-w-3xl space-y-4">
            {steps.map((step, i) => (
              <Card key={i} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <step.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-xs font-bold text-primary/50">#{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                      <p className="text-muted-foreground text-sm mb-3">{step.desc}</p>
                      <div className="space-y-1">
                        {step.tips.map((tip, j) => (
                          <p key={j} className="text-xs text-muted-foreground/70 flex items-start gap-2">
                            <span className="text-primary mt-0.5">💡</span>
                            {tip}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        <Footer />
      </PageWrapper>
    </div>
  );
}
