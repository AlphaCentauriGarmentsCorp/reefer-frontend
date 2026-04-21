import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../Layouts";
import { useState } from "react";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState("M");
  const [mainImage, setMainImage] = useState(0);

  // Mock product data
  const product = {
    id: id,
    category: "T Shirt",
    name: "LIFE TO BE",
    price: 369.60,
    originalPrice: 650.00,
    description: "Introducing the 'Life To Be' Signature Tee from REEFER, a perfect blend of high-concept art and modern streetwear. Featuring a unique extraterrestrial take on the Vitruvian Man, this shirt is designed for those who appreciate a bold, mysterious aesthetic. Crafted from premium, heavy-weight cotton, it offers a soft touch and a relaxed fit, making it the ideal choice for every... more",
    sizes: ["S", "M", "L", "XL"],
    images: [
      "https://via.placeholder.com/400x500?text=Black+Tee+Front",
      "https://via.placeholder.com/400x500?text=Black+Tee+Back",
      "https://via.placeholder.com/400x500?text=Black+Tee+Detail"
    ],
    thumbnails: [
      "https://via.placeholder.com/80x100?text=Black",
      "https://via.placeholder.com/80x100?text=Blue",
      "https://via.placeholder.com/80x100?text=White"
    ]
  };

  // Mock recommendation products
  const recommendations = [
    {
      id: 1,
      name: "PROFESSOR",
      category: "Shirt",
      price: 327.12,
      image: "https://via.placeholder.com/200x250?text=Professor",
      isNew: true
    },
    {
      id: 2,
      name: "KALI (SUBLI)",
      category: "Shorts",
      price: 299.00,
      image: "https://via.placeholder.com/200x250?text=Kali+Shorts",
      isNew: false
    },
    {
      id: 3,
      name: "HIGH TOP",
      category: "Shirt",
      price: 327.12,
      image: "https://via.placeholder.com/200x250?text=High+Top",
      isNew: true
    },
    {
      id: 4,
      name: "Wilderness Cream",
      category: "Bosy Daze Hoodie",
      price: 369.60,
      image: "https://via.placeholder.com/200x250?text=Wilderness",
      isNew: false
    }
  ];

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
    
    // Trigger cart update event
    window.dispatchEvent(new Event('cartUpdated'));
    
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
        <div className="pt-20 pb-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-12 gap-8">
              {/* Left - Thumbnails */}
              <div className="col-span-1 flex flex-col gap-4">
                {product.thumbnails.map((thumb, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMainImage(idx)}
                    className={`w-24 h-28 border-2 rounded-lg overflow-hidden transition-all flex-shrink-0 ${
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
              <div className="col-span-5 bg-gray-100 rounded-2xl p-8 flex items-center justify-center border border-gray-300">
                <img
                  src={product.images[mainImage]}
                  alt={product.name}
                  className="w-full h-auto object-cover max-h-96"
                />
              </div>

              {/* Right - Product Info */}
              <div className="col-span-6 flex flex-col justify-between">
                <div>
                  {/* Category & Title */}
                  <p className="text-sm text-gray-600 mb-1">{product.category}</p>
                  <h1 className="text-5xl font-bold mb-6 leading-tight">{product.name}</h1>

                  {/* Price */}
                  <div className="flex items-center gap-4 mb-8">
                    <span className="text-4xl font-bold text-red-500">
                      ₱{product.price.toFixed(2)}
                    </span>
                    <span className="text-xl text-gray-400 line-through">
                      ₱{product.originalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-3 text-base">Descriptions</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
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
                          className={`w-14 h-14 border-2 rounded-lg font-semibold text-base transition-all ${
                            selectedSize === size
                              ? "border-black bg-black text-white"
                              : "border-gray-400 text-gray-900 hover:border-gray-600"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  {/* Favorites Button */}
                  <button className="w-3/10 border-2 border-gray-400 text-gray-900 py-3 rounded-full font-semibold hover:border-gray-600 transition-colors flex items-center justify-center gap-2 text-base">
                    <span>♡</span> Favorites
                  </button>

                  {/* Add to Cart & Checkout */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleAddToCart}
                      className="border-2 border-gray-400 text-gray-900 py-3 rounded-lg font-semibold hover:border-gray-600 transition-colors text-base"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={handleCheckout}
                      className="bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-base"
                    >
                      Checkout Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER PART - Recommendations Section */}
        <div className="bg-black text-white py-16 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Section Title */}
            <h2 className="text-4xl font-bold mb-12">RECOMMENDATION</h2>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.map((product) => (
                <div
                  key={product.id}
                  className="bg-white overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-4 border-black"
                >
                  {/* Product Image Container */}
                  <div className="relative bg-gray-50 aspect-square overflow-hidden flex flex-col items-center justify-center p-6">
                    {product.isNew && (
                      <div className="absolute top-2 left-2 bg-black text-white text-xs font-bold px-2 py-1 z-10">
                        NEW
                      </div>
                    )}
                    
                    {/* REEFER Logo at top */}
                    <div className="absolute top-6 left-0 right-0 text-center">
                      <div className="text-orange-500 font-bold text-2xl">
                        REEFER
                      </div>
                    </div>

                    {/* Product Image centered */}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-3/4 h-3/4 object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="p-4 bg-white border-t-4 border-black">
                    <div className="flex justify-between items-center">
                      <div>
                        {/* Product Name */}
                        <h3 className="font-bold text-black text-lg mb-1">{product.name}</h3>

                        {/* Category */}
                        <p className="text-gray-700 text-sm">{product.category}</p>
                      </div>

                      {/* Price */}
                      <p className="text-red-500 font-bold text-lg">
                        ₱{product.price.toFixed(2)}
                      </p>
                    </div>
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
