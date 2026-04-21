import ProductCard from "../../components/Product/ProductCard";
import { useNavigate } from "react-router-dom";

export default function FavouritesTab() {
  const navigate = useNavigate();
  
  const favourites = [
    {
      id: 1,
      name: "LIFE TO BE",
      type: "Shirt",
      price: 365.00,
      image: "https://via.placeholder.com/400x400/1a1a1a/ffffff?text=LIFE+TO+BE",
      badge: "Bestseller"
    },
    {
      id: 2,
      name: "THE PRAYER",
      type: "Shirt",
      price: 365.00,
      image: "https://via.placeholder.com/400x400/2a2a2a/ffffff?text=THE+PRAYER",
      badge: "Bestseller"
    }
  ];

  const handleAddToCart = (product) => {
    // Get existing cart from localStorage
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Create cart item
    const cartItem = {
      id: product.id,
      name: product.name,
      size: "M", // Default size
      price: product.price,
      quantity: 1,
      image: product.image
    };
    
    // Check if item already exists in cart
    const existingItemIndex = existingCart.findIndex(
      item => item.id === product.id && item.size === "M"
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

  return (
    <div className="p-8">
      <h3 className="text-2xl font-bold mb-6">My Favourites</h3>
      
      {favourites.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No favourites yet</p>
          <p className="text-gray-400 text-sm mt-2">Add items to your favourites to see them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favourites.map((product) => (
            <div key={product.id} className="relative">
              <ProductCard product={product} />
              <button
                onClick={() => handleAddToCart(product)}
                className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition font-semibold text-sm"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
