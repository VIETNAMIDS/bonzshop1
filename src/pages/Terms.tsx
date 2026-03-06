import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, FileText, AlertTriangle, Ban, RefreshCw, Scale } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageWrapper } from "@/components/layout/PageWrapper";

const termsSections = [
  {
    id: "general",
    icon: FileText,
    title: "1. Điều khoản chung",
    content: `Khi sử dụng dịch vụ của BonzShop, bạn đồng ý tuân thủ các điều khoản sau đây. BonzShop là nền tảng trung gian kết nối người mua và người bán tài khoản game, sản phẩm số. Chúng tôi có quyền thay đổi điều khoản bất cứ lúc nào mà không cần thông báo trước.`,
  },
  {
    id: "account",
    icon: Shield,
    title: "2. Tài khoản người dùng",
    content: `• Mỗi người chỉ được đăng ký 1 tài khoản duy nhất.\n• Bạn chịu trách nhiệm bảo mật thông tin đăng nhập.\n• Không được chia sẻ, mua bán tài khoản BonzShop.\n• Tài khoản vi phạm sẽ bị khóa vĩnh viễn mà không hoàn tiền.`,
  },
  {
    id: "trading",
    icon: Scale,
    title: "3. Quy định giao dịch",
    content: `• Tất cả giao dịch sử dụng đơn vị Xu (Coin) nội bộ.\n• Sau khi mua, tài khoản/sản phẩm sẽ được giao tự động.\n• Người mua có trách nhiệm kiểm tra sản phẩm ngay sau khi nhận.\n• Khiếu nại phải được gửi trong vòng 24 giờ kể từ lúc mua.\n• BonzShop không chịu trách nhiệm nếu người mua tự ý thay đổi thông tin sản phẩm.`,
  },
  {
    id: "seller",
    icon: RefreshCw,
    title: "4. Quy định người bán",
    content: `• Người bán phải xác minh danh tính trước khi đăng bán.\n• Sản phẩm đăng bán phải chính xác, không gian lận.\n• Người bán chịu trách nhiệm về chất lượng sản phẩm.\n• BonzShop thu phí hoa hồng trên mỗi giao dịch thành công.\n• Vi phạm sẽ bị khóa quyền bán và giữ lại số dư.`,
  },
  {
    id: "prohibited",
    icon: Ban,
    title: "5. Hành vi bị cấm",
    content: `• Lừa đảo, scam dưới mọi hình thức.\n• Sử dụng bot, hack hoặc khai thác lỗ hổng hệ thống.\n• Spam, quấy rối người dùng khác.\n• Đăng nội dung vi phạm pháp luật.\n• Tạo nhiều tài khoản để trục lợi (multi-account).\n• Giao dịch ngoài hệ thống BonzShop.`,
  },
  {
    id: "liability",
    icon: AlertTriangle,
    title: "6. Giới hạn trách nhiệm",
    content: `• BonzShop là nền tảng trung gian, không phải chủ sở hữu sản phẩm.\n• Chúng tôi không đảm bảo sản phẩm hoạt động vĩnh viễn sau khi mua.\n• BonzShop không chịu trách nhiệm về thiệt hại gián tiếp.\n• Trong mọi trường hợp, mức bồi thường tối đa bằng giá trị giao dịch.`,
  },
];

export default function Terms() {
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
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-gradient">Điều khoản sử dụng</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Vui lòng đọc kỹ trước khi sử dụng dịch vụ của BonzShop.
            </p>
          </div>
        </section>

        <section className="pb-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <Accordion type="multiple" defaultValue={["general"]} className="space-y-3">
              {termsSections.map((s) => (
                <AccordionItem key={s.id} value={s.id} className="border rounded-lg px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <s.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-left font-semibold">{s.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed pl-11">
                      {s.content}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <Card className="mt-8 border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')} — Bằng việc tiếp tục sử dụng, bạn đồng ý với các điều khoản trên.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
        <Footer />
      </PageWrapper>
    </div>
  );
}
