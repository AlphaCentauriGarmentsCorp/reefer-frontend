import ProductCard from "../../components/Product/ProductCard";

export default function FavouritesTab() {
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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
