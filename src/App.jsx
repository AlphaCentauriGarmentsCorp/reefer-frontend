import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import "./index.css";
import About from "./pages/About";
import AboutProfile from "./pages/AboutProfile";
import AboutVideos from "./pages/AboutVideos";
import AboutContact from "./pages/AboutContact";
import Landing from "./pages/Landing";
import HowToOrder from "./pages/HowToOrder";
import Cart from "./pages/Cart";
import ProductDetail from "./pages/ProductDetail";
import Shop from "./pages/Shop";
import Sale from "./pages/Sale";
import AllCollections from "./pages/AllCollections";
import SummerVibes from "./pages/SummerVibes";
import Accessories from "./pages/Accessories";
import Lookbook from "./pages/Lookbook";
import FAQ from "./pages/FAQ";
import SizeChart from "./pages/SizeChart";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-red">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/about/profile" element={<AboutProfile />} />
        <Route path="/about/videos" element={<AboutVideos />} />
        <Route path="/about/contact" element={<AboutContact />} />
        <Route path="/lookbook" element={<Lookbook />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/size-chart" element={<SizeChart />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/all" element={<AllCollections />} />
        <Route path="/shop/summer-vibes" element={<SummerVibes />} />
        <Route path="/shop/accessories" element={<Accessories />} />
        <Route path="/shop/sale" element={<Sale />} />
        <Route path="/how-to-order" element={<HowToOrder />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        
        {/* Auth/account hidden for coming-soon launch. Restore these routes + their
            imports (Login, Signup, OTP, Profile) when the backend is live. Until then,
            any direct hit on those paths falls through to the catch-all redirect below. */}

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
