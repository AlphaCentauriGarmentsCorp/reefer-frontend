import HeroSection from "../features/landing/HeroSection";
import BestSellerCollection from "../features/landing/BestSellerCollection";
import GoalBanner from "../features/landing/GoalBanner";
import ProductCollections from "../features/landing/ProductCollections";
import ReviewsSection from "../features/landing/ReviewsSection";
import PartnershipBanner from "../features/landing/PartnershipBanner";
import FavouritesTab from "../features/profile/FavouritesTab";
import { LandingLayout } from "../Layouts";

export default function Landing() {
  return (
    <LandingLayout>
      <HeroSection />
      <BestSellerCollection />
      <GoalBanner />
      <ProductCollections />
      
      {/* Favourites Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-16 tracking-tight">
            Your Favourites
          </h2>
          <FavouritesTab />
        </div>
      </section>
      
      <ReviewsSection />
      <PartnershipBanner />
    </LandingLayout>
  );
}
