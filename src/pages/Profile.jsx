import { useState } from "react";
import { MainLayout } from "../Layouts";
import ProfileTab from "../features/profile/ProfileTab";
import OrdersTab from "../features/profile/OrdersTab";
import FavouritesTab from "../features/profile/FavouritesTab";
import SettingsTab from "../features/profile/SettingsTab";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "orders", label: "Orders" },
    { id: "favourites", label: "Favourites" },
    { id: "settings", label: "Settings" }
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
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-semibold tracking-wide transition-colors relative ${
                  activeTab === tab.id
                    ? "text-black"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "orders" && <OrdersTab />}
            {activeTab === "favourites" && <FavouritesTab />}
            {activeTab === "settings" && <SettingsTab />}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
