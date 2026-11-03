import MobileBottomNav from "@shared/ui/MobileBottomNav";
import AIChatbot from "@widgets/chatbot/AIChatbot";
import Footer from "@shared/ui/Footer";
import DesktopLandingGate from "@widgets/landing/DesktopLandingGate";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DesktopLandingGate
      desktopOnly={
        <>
          <div className="hidden lg:block">
            <Footer />
          </div>
          <div className="hidden lg:block">
            <AIChatbot />
          </div>
        </>
      }
    >
      {children}
      <div className="lg:hidden">
        <MobileBottomNav />
      </div>
    </DesktopLandingGate>
  );
}
