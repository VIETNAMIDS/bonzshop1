import { Navbar } from "@/components/Navbar";
import { AboutSection } from "@/components/home/AboutSection";
import { HeroSection } from "@/components/home/HeroSection";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 hero-pattern" />
        <div className="container mx-auto relative z-10 text-center">
          <Button asChild variant="ghost" className="mb-8">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Về trang chủ
            </Link>
          </Button>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Về BonzShop</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Nền tảng mua bán tài khoản game và sản phẩm số uy tín hàng đầu Việt Nam .
          </p>
        </div>
      </section>

      {/* About content */}
      <AboutSection />

      {/* Contact section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Liên hệ với chúng tôi</h2>
            <p className="text-muted-foreground">Bạn có thắc mắc? Hãy liên hệ ngay nhé!</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <Card className="glass p-6 text-center card-hover">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Email</h3>
              <p className="text-muted-foreground text-sm">support@bonzshop.com</p>
            </Card>

            <Card className="glass p-6 text-center card-hover">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Hotline</h3>
              <p className="text-muted-foreground text-sm">1900 xxxx</p>
            </Card>

            <Card className="glass p-6 text-center card-hover">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Địa chỉ</h3>
              <p className="text-muted-foreground text-sm">Việt Nam</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
