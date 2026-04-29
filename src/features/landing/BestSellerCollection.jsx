import { useState } from "react";
import ProductCard from "../../components/Product/ProductCard";
import reefer6 from "../../assets/images/reefer6.jpg";
import reefer7 from "../../assets/images/reefer7.jpg";
import reefer8 from "../../assets/images/reefer8.jpg";
import reefer5 from "../../assets/images/reefer5.jpg";

const bestSellers = [
  {
    id: 1,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: "Bestseller"
  },
  {
    id: 2,
    name: "THE PRAYER",
    type: "Shirt",
    price: 365.00,
    image: reefer7,
    badge: "Bestseller"
  },
  {
    id: 3,
    name: "PROFESSOR",
    type: "Shirt",
    price: 307.12,
    image: reefer8,
    badge: "Bestseller"
  },
  {
    id: 4,
    name: "HIGH TOP",
    type: "Shirt",
    price: 307.12,
    image: reefer5,
    badge: "Bestseller"
  }
];

export default function BestSellerCollection() {
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  return (
    <section className="py-20 px-4 bg-white relative">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-bold text-center mb-3 tracking-tight">
          Best Seller Collection
        </h2>
        <p className="text-center text-gray-400 text-sm tracking-widest mb-16">
          SHOP OUR BEST SELLER
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product}
              onQuickView={setQuickViewProduct}
              isQuickViewOpen={quickViewProduct?.id === product.id}
            />
          ))}
        </div>

        {/* Quick View Overlay */}
        {quickViewProduct && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 overflow-y-auto">
            <div className="bg-white w-full max-w-5xl mx-4 rounded-lg shadow-2xl">
              <div className="p-8">
                <button
                  onClick={() => setQuickViewProduct(null)}
                  className="float-right text-gray-400 hover:text-black text-3xl leading-none"
                >
                  ×
                </button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                  {/* Left - Product Image */}
                  <div className="bg-gray-50 rounded-lg p-8 flex items-center justify-center">
                    <img
                      src={quickViewProduct.image}
                      alt={quickViewProduct.name}
                      className="w-full h-auto object-contain max-h-96"
                    />
                  </div>

                  {/* Right - Product Info */}
                  <QuickViewContent product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Quick View Content Component
function QuickViewContent({ product, onClose }) {
  const [selectedSize, setSelectedSize] = useState("SMALL");
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    const cartItem = {
      id: product.id,
      name: product.name,
      size: selectedSize,
      price: product.price,
      quantity: quantity,
      image: product.image
    };
    
    const existingItemIndex = existingCart.findIndex(
      item => item.id === product.id && item.size === selectedSize
    );
    
    if (existingItemIndex > -1) {
      existingCart[existingItemIndex].quantity += quantity;
    } else {
      existingCart.push(cartItem);
    }
    
    localStorage.setItem('cart', JSON.stringify(existingCart));
    onClose();
    alert('Added to cart!');
  };

  return (
    <div className="flex flex-col justify-center">
      <h2 className="text-3xl font-bold mb-2 uppercase tracking-wide">{product.name}</h2>
      <p className="text-sm text-gray-500 mb-4">{product.type}</p>
      
      <div className="text-2xl font-bold mb-6">
        ₱{product.price.toFixed(2)}
      </div>

      {/* Size Selection */}
      <div className="mb-6">
        <label className="block text-xs font-bold mb-3 uppercase tracking-wider">Size</label>
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className="w-full border-2 border-gray-300 rounded px-4 py-2 text-sm focus:border-black focus:outline-none"
        >
          <option value="SMALL">SMALL</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LARGE">LARGE</option>
          <option value="X-LARGE">X-LARGE</option>
        </select>
      </div>

      {/* Quantity */}
      <div className="mb-6">
        <label className="block text-xs font-bold mb-3 uppercase tracking-wider">Quantity</label>
        <select
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          className="w-full border-2 border-gray-300 rounded px-4 py-2 text-sm focus:border-black focus:outline-none"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        className="w-full bg-black text-white py-3 rounded font-semibold hover:bg-gray-800 transition-colors"
      >
        Add To Cart
      </button>
    </div>
  );
}
