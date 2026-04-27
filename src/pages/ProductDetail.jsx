import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../Layouts";
import { useState } from "react";
import reefer6 from "../assets/images/reefer6.jpg";
import reefer1 from "../assets/images/1.jpg";
import reefer2 from "../assets/images/reefer2.png";
import reefer7 from "../assets/images/reefer7.jpg";
import reefer8 from "../assets/images/reefer8.jpg";
import reefer5 from "../assets/images/reefer5.jpg";
import reefer3 from "../assets/images/reefer3.jpg";
import reefer4 from "../assets/images/reefer4.jpg";

// Product database with different images for each product
const productDatabase = {
  1: {
    id: 1,
    category: "T Shirt",
    name: "LIFE TO BE",
    price: 365.00,
    originalPrice: 650.00,
    description: "Introducing the 'Life To Be' Signature Tee from REEFER, a perfect blend of high-concept art and modern streetwear. Featuring a unique extraterrestrial take on the Vitruvian Man, this shirt is designed for those who appreciate a bold, mysterious aesthetic. Crafted from premium, heavy-weight cotton, it offers a soft touch and a relaxed fit, making it the ideal choice for every... more",
    sizes: ["S", "M", "L", "XL"],
    images: [reefer6, reefer6, reefer6],
    thumbnails: [reefer6, reefer6, reefer6]
  },
  2: {
    id: 2,
    category: "T Shirt",
    name: "THE PRAYER",
    price: 365.00,
    originalPrice: 650.00,
    description: "The Prayer Tee from REEFER represents a fusion of spirituality and street culture. This premium t-shirt features bold graphics that make a statement. Made from high-quality cotton for maximum comfort and durability.",
    sizes: ["S", "M", "L", "XL"],
    images: [reefer7, reefer7, reefer7],
    thumbnails: [reefer7, reefer7, reefer7]
  },
  3: {
    id: 3,
    category: "T Shirt",
    name: "PROFESSOR",
    price: 307.12,
    originalPrice: 550.00,
    description: "The Professor Tee showcases REEFER's commitment to unique design and quality craftsmanship. This shirt combines comfort with style, perfect for those who want to stand out.",
    sizes: ["S", "M", "L", "XL"],
    images: [reefer8, reefer8, reefer8],
    thumbnails: [reefer8, reefer8, reefer8]
  },
  4: {
    id: 4,
    category: "T Shirt",
    name: "HIGH TOP",
    price: 307.12,
    originalPrice: 550.00,
    description: "High Top Tee from REEFER brings elevated streetwear to your wardrobe. Designed with attention to detail and crafted from premium materials for lasting quality.",
    sizes: ["S", "M", "L", "XL"],
    images: [reefer5, reefer5, reefer5],
    thumbnails: [reefer5, reefer5, reefer5]
  }
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState("M");
  const [mainImage, setMainImage] = useState(0);

  // Get product from database or use default
  const product = productDatabase[id] || productDatabase[1];

  // Mock recommendation products
  const recommendations = [
    {
      id: 1,
      name: "PROFESSOR",
      category: "Shirt",
      price: 327.12,
      image: reefer8,
      isNew: true
    },
    {
      id: 2,
      name: "KALI (SUBLI)",
      category: "Shorts",
      price: 299.00,
      image: reefer5,
      isNew: false
    },
    {
      id: 3,
      name: "HIGH TOP",
      category: "Shirt",
      price: 327.12,
      image: reefer7,
      isNew: true
    },
    {
      id: 4,
      name: "Wilderness Cream",
      category: "Bosy Daze Hoodie",
      price: 369.60,
      image: reefer6,
      isNew: false
    }
  ].filter(rec => rec.id !== parseInt(id)); // Don't show current product in recommendations

  const handleAddToCart = () => {
    // Get existing cart from localStorage
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Create cart item
    const cartItem = {
      id: product.id,
      name: product.name,
      size: selectedSize,
      price: product.price,
      quantity: 1,
      image: product.images[0]
    };
    
    // Check if item already exists in cart
    const existingItemIndex = existingCart.findIndex(
      item => item.id === product.id && item.size === selectedSize
    );
    
    if (existingItemIndex > -1) {
      // Update quantity if item exists
      existingCart[existingItemIndex].quantity += 1;
    } else {
      // Add new item
      existingCart.push(cartItem);
    }
    
    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(existingCart));
    
    // Redirect to cart page
    navigate('/cart');
  };

  const handleCheckout = () => {
    handleAddToCart();
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
        {/* UPPER PART - Product Showcase */}
        <div className="pt-24 pb-16 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-12 gap-8">
              {/* Left - Thumbnails */}
              <div className="col-span-1 flex flex-col gap-4">
                {product.thumbnails.map((thumb, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMainImage(idx)}
                    className={`w-20 h-20 border-2 rounded-lg overflow-hidden transition-all flex-shrink-0 bg-white ${
                      mainImage === idx
                        ? "border-black"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={thumb}
                      alt={`View ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Center - Main Image */}
              <div className="col-span-5 bg-white rounded-2xl border-2 border-gray-200 p-8 flex items-center justify-center">
                <img
                  src={product.images[mainImage]}
                  alt={product.name}
                  className="w-full h-auto object-contain max-h-[450px]"
                />
              </div>

              {/* Right - Product Info */}
              <div className="col-span-6 flex flex-col pl-8">
                <div className="flex-1">
                  {/* Category & Title */}
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{product.category}</p>
                  <h1 className="text-4xl font-bold mb-6 leading-tight">{product.name}</h1>

                  {/* Price */}
                  <div className="flex items-center gap-3 mb-8">
                    <span className="text-3xl font-bold text-red-500">
                      ₱{product.price.toFixed(2)}
                    </span>
                    <span className="text-lg text-gray-400 line-through">
                      ₱{product.originalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="mb-8">
                    <h3 className="font-bold text-gray-900 mb-3 text-sm">Descriptions</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Size Selection */}
                  <div className="mb-8">
                    <div className="flex gap-3">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`w-12 h-12 border-2 rounded-lg font-semibold text-sm transition-all ${
                            selectedSize === size
                              ? "border-black bg-black text-white"
                              : "border-gray-300 text-gray-700 hover:border-gray-500"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity & Favorites */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center border-2 border-gray-300 rounded-lg">
                      <button className="px-4 py-2 text-gray-600 hover:text-black">−</button>
                      <span className="px-4 py-2 border-x-2 border-gray-300">1</span>
                      <button className="px-4 py-2 text-gray-600 hover:text-black">+</button>
                    </div>
                    <button className="border-2 border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:border-gray-500 transition-colors flex items-center gap-2">
                      Favorites <span>♡</span>
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    className="w-full border-2 border-black text-black py-3 rounded-lg font-semibold hover:bg-black hover:text-white transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER PART - Recommendations Section */}
        <div className="bg-black text-white py-16 px-8">
          <div className="max-w-7xl mx-auto">
            {/* Section Title */}
            <h2 className="text-4xl font-bold mb-12 uppercase tracking-wider">RECOMMENDATION</h2>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => {
                    navigate(`/product/${rec.id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="bg-white overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                >
                  {/* Product Image Container */}
                  <div className="relative bg-white aspect-square overflow-hidden flex flex-col items-center justify-center p-8">
                    {rec.isNew && (
                      <div className="absolute top-3 left-3 bg-black text-white text-xs font-bold px-3 py-1 z-10">
                        NEW
                      </div>
                    )}
                    
                    {/* REEFER Logo at top */}
                    <div className="absolute top-6 left-0 right-0 text-center">
                      <div className="text-orange-500 font-bold text-xl tracking-wider">
                        REEFER
                      </div>
                    </div>

                    {/* Product Image centered */}
                    <img
                      src={rec.image}
                      alt={rec.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform mt-8"
                    />

                    {/* Orange tag at bottom */}
                    <div className="absolute bottom-3 right-3">
                      <div className="bg-orange-500 w-6 h-6"></div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4 bg-white">
                    <h3 className="font-bold text-black text-base mb-1 uppercase">{rec.name}</h3>
                    <p className="text-gray-500 text-xs mb-2">{rec.category}</p>
                    <p className="text-red-500 font-bold text-lg">
                      ₱{rec.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
