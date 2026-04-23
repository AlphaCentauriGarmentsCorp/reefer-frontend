import HeroSection from "../features/landing/HeroSection";
import AllProductsSection from "../features/landing/AllProductsSection";
import CategorySection from "../features/landing/CategorySection";
import BestSellerCollection from "../features/landing/BestSellerCollection";
import ReviewsSection from "../features/landing/ReviewsSection";
import PartnershipBanner from "../features/landing/PartnershipBanner";
import { LandingLayout } from "../Layouts";

export default function Landing() {
  return (
    <LandingLayout>
      <HeroSection />
      <AllProductsSection />
      <CategorySection />
      <BestSellerCollection />
      <ReviewsSection />
      <PartnershipBanner />
    </LandingLayout>
  );
}
