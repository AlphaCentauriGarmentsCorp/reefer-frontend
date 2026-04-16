import HeroSection from "../features/landing/HeroSection";
import BestSellerCollection from "../features/landing/BestSellerCollection";
import GoalBanner from "../features/landing/GoalBanner";
import ProductCollections from "../features/landing/ProductCollections";
import ReviewsSection from "../features/landing/ReviewsSection";
import PartnershipBanner from "../features/landing/PartnershipBanner";
import { LandingLayout } from "../Layouts";

export default function Landing() {
  return (
    <LandingLayout>
      <HeroSection />
      <BestSellerCollection />
      <GoalBanner />
      <ProductCollections />
      <ReviewsSection />
      <PartnershipBanner />
    </LandingLayout>
  );
}
