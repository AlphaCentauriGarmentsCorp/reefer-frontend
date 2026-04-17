import { MainLayout } from "../Layouts";
import FavouritesTab from "../features/profile/FavouritesTab";
import { useNavigate } from "react-router-dom";

export default function Favourites() {
  const navigate = useNavigate();

  const tabs = [
    { id: "profile", label: "Profile", path: "/profile" },
    { id: "orders", label: "Orders", path: "/orders" },
    { id: "favourites", label: "Favourites", path: "/favourites" },
    { id: "settings", label: "Settings", path: "/settings" }
  ];

  return (
    <MainLayout>
      <div className="pt-20 pb-16 px-4 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* Tabs Navigation */}
          <div className="flex gap-8 mb-8 border-b border-gray-300">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`pb-3 text-sm font-semibold tracking-wide transition-colors relative ${
                  tab.id === "favourites"
                    ? "text-black"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
                {tab.id === "favourites" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm">
            <FavouritesTab />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
