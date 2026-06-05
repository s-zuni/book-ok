import MobileBottomNav from "@shared/ui/MobileBottomNav";
import AIChatbot from "@widgets/chatbot/AIChatbot";
import Footer from "@shared/ui/Footer";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <Footer />
      <AIChatbot />
      <div className="lg:hidden">
        <MobileBottomNav />
      </div>
    </>
  );
}
