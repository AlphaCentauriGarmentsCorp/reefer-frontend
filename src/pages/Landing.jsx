import { Link } from "react-router-dom";
import HeroSection from "../components/Landing/HeroSection";
import BestSellerCollection from "../components/Landing/BestSellerCollection";
import GoalBanner from "../components/Landing/GoalBanner";
import ProductCollections from "../components/Landing/ProductCollections";
import ReviewsSection from "../components/Landing/ReviewsSection";
import PartnershipBanner from "../components/Landing/PartnershipBanner";
import Footer from "../components/Landing/Footer";
import Navbar from "../components/Landing/Navbar";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <BestSellerCollection />
      <GoalBanner />
      <ProductCollections />
      <ReviewsSection />
      <PartnershipBanner />
      <Footer />
    </div>
  );
}
