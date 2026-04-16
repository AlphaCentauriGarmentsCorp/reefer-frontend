export default function OrdersTab() {
  const orders = [
    {
      id: "ORD-001",
      date: "2026-04-10",
      status: "Delivered",
      total: 1250.00,
      items: 3
    },
    {
      id: "ORD-002",
      date: "2026-04-05",
      status: "In Transit",
      total: 890.00,
      items: 2
    },
    {
      id: "ORD-003",
      date: "2026-03-28",
      status: "Processing",
      total: 1590.00,
      items: 4
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-700";
      case "In Transit":
        return "bg-blue-100 text-blue-700";
      case "Processing":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-8">
      <h3 className="text-2xl font-bold mb-6">Order History</h3>
      
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No orders yet</p>
          <p className="text-gray-400 text-sm mt-2">Start shopping to see your orders here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-lg">{order.id}</h4>
                  <p className="text-sm text-gray-500">{order.date}</p>
                </div>
                <span className={`px-4 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {order.items} {order.items === 1 ? "item" : "items"}
                </div>
                <div className="text-lg font-bold text-orange-500">
                  ₱{order.total.toFixed(2)}
                </div>
              </div>
              
              <button className="mt-4 text-sm text-orange-500 font-semibold hover:text-orange-600">
                View Details →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
