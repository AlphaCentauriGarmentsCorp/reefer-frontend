import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import ProductCard from "../../components/Product/ProductCard";
import reefer6 from "../../assets/images/reefer6.jpg";

const allProducts = [
  {
    id: 1,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 2,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 3,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 4,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 5,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 6,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 7,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 8,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 9,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 10,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 11,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  },
  {
    id: 12,
    name: "LIFE TO BE",
    type: "Shirt",
    price: 365.00,
    image: reefer6,
    badge: null
  }
];

const ITEMS_PER_ROW = 4;

export default function AllProductsSection() {
  const [visibleCount, setVisibleCount] = useState(12);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewRowIndex, setQuickViewRowIndex] = useState(null);
  const [selectedSize, setSelectedSize] = useState("SMALL");
  const [quantity, setQuantity] = useState(1);
  const quickViewRef = useRef(null);

  const loadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  const handleQuickView = (product, index) => {
    const rowIndex = Math.floor(index / ITEMS_PER_ROW);
    setQuickViewProduct(product);
    setQuickViewRowIndex(rowIndex);
  };

  const handleAddToCart = () => {
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    const cartItem = {
      id: quickViewProduct.id,
      name: quickViewProduct.name,
      size: selectedSize,
      price: quickViewProduct.price,
      quantity: quantity,
      image: quickViewProduct.image
    };
    
    const existingItemIndex = existingCart.findIndex(
      item => item.id === quickViewProduct.id && item.size === selectedSize
    );
    
    if (existingItemIndex > -1) {
      existingCart[existingItemIndex].quantity += quantity;
    } else {
      existingCart.push(cartItem);
    }
    
    localStorage.setItem('cart', JSON.stringify(existingCart));
    setQuickViewProduct(null);
    alert('Added to cart!');
  };

  useEffect(() => {
    if (quickViewProduct && quickViewRef.current) {
      setTimeout(() => {
        quickViewRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [quickViewProduct]);

  const displayedProducts = allProducts.slice(0, visibleCount);

  // Group products by rows
  const rows = [];
  for (let i = 0; i < displayedProducts.length; i += ITEMS_PER_ROW) {
    rows.push(displayedProducts.slice(i, i + ITEMS_PER_ROW));
  }

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-bold text-center mb-16 tracking-tight">
          All Products
        </h2>
        
        <div className="space-y-6">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex}>
              {/* Product Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {row.map((product, colIndex) => {
                  const productIndex = rowIndex * ITEMS_PER_ROW + colIndex;
                  return (
                    <ProductCard 
                      key={product.id + productIndex} 
                      product={product}
                      onQuickView={() => handleQuickView(product, productIndex)}
                      isQuickViewOpen={false}
                    />
                  );
                })}
              </div>

              {/* Quick View Section - Appears after this row */}
              {quickViewProduct && quickViewRowIndex === rowIndex && (
                <div 
                  ref={quickViewRef}
                  className="bg-white p-8 mt-6"
                >
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
                    <div className="flex flex-col justify-center">
                      <h2 className="text-3xl font-bold mb-2 uppercase tracking-wide">{quickViewProduct.name}</h2>
                      <p className="text-sm text-gray-500 mb-4">{quickViewProduct.type}</p>
                      
                      <div className="text-2xl font-bold mb-6">
                        ₱{quickViewProduct.price.toFixed(2)}
                      </div>

                      {/* Size Selection */}
                      <div className="mb-4">
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wider">Size</label>
                        <select
                          value={selectedSize}
                          onChange={(e) => setSelectedSize(e.target.value)}
                          className="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:border-black focus:outline-none bg-white"
                        >
                          <option value="SMALL">SMALL</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="LARGE">LARGE</option>
                          <option value="X-LARGE">X-LARGE</option>
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="mb-6">
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wider">QTY</label>
                        <select
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value))}
                          className="w-20 border border-gray-300 rounded px-3 py-2 text-sm focus:border-black focus:outline-none bg-white"
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
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {visibleCount < allProducts.length && (
          <div className="text-center mb-8 mt-12">
            <button 
              onClick={loadMore}
              className="bg-black text-white px-8 py-3 font-semibold hover:bg-gray-800 transition"
            >
              Load More
            </button>
          </div>
        )}

        {/* Shop All Collections Button */}
        <div className="text-center mt-8">
          <Link 
            to="/shop/all"
            className="border-2 border-gray-300 text-gray-700 px-8 py-3 font-semibold hover:border-gray-500 hover:text-gray-900 transition flex items-center mx-auto w-fit"
          >
            SHOP ALL Collections
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
