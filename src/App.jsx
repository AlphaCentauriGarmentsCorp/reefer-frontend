import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import "./index.css";
import Login from "./features/auth/Login";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Landing from "./pages/Landing";
import Profile from "./pages/Profile";
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
import Signup from "./features/auth/Signup";
import OTP from "./features/auth/OTP";
import ScrollToTop from "./components/ScrollToTop";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

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
        <Route path="/lookbook" element={<Lookbook />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/size-chart" element={<SizeChart />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/all" element={<AllCollections />} />
        <Route path="/shop/summer-vibes" element={<SummerVibes />} />
        <Route path="/shop/accessories" element={<Accessories />} />
        <Route path="/shop/sale" element={<Sale />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/how-to-order" element={<HowToOrder />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/otp-verification" element={<OTP />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<div>Page Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
