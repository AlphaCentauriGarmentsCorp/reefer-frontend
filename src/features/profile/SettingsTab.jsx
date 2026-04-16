import { useState } from "react";

export default function SettingsTab() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    promotions: true,
    newsletter: false
  });

  const handleToggle = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="p-8">
      <h3 className="text-2xl font-bold mb-6">Account Settings</h3>
      
      <div className="max-w-2xl space-y-6">
        {/* Notifications Section */}
        <div>
          <h4 className="font-bold text-lg mb-4">Notifications</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive updates via email</p>
              </div>
              <button
                onClick={() => handleToggle("emailNotifications")}
                className={`w-12 h-6 rounded-full transition ${
                  settings.emailNotifications ? "bg-orange-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                    settings.emailNotifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold">SMS Notifications</p>
                <p className="text-sm text-gray-500">Receive updates via SMS</p>
              </div>
              <button
                onClick={() => handleToggle("smsNotifications")}
                className={`w-12 h-6 rounded-full transition ${
                  settings.smsNotifications ? "bg-orange-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                    settings.smsNotifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold">Order Updates</p>
                <p className="text-sm text-gray-500">Get notified about order status</p>
              </div>
              <button
                onClick={() => handleToggle("orderUpdates")}
                className={`w-12 h-6 rounded-full transition ${
                  settings.orderUpdates ? "bg-orange-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                    settings.orderUpdates ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Marketing Section */}
        <div>
          <h4 className="font-bold text-lg mb-4">Marketing</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold">Promotions</p>
                <p className="text-sm text-gray-500">Receive promotional offers</p>
              </div>
              <button
                onClick={() => handleToggle("promotions")}
                className={`w-12 h-6 rounded-full transition ${
                  settings.promotions ? "bg-orange-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                    settings.promotions ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold">Newsletter</p>
                <p className="text-sm text-gray-500">Subscribe to our newsletter</p>
              </div>
              <button
                onClick={() => handleToggle("newsletter")}
                className={`w-12 h-6 rounded-full transition ${
                  settings.newsletter ? "bg-orange-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                    settings.newsletter ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-6">
          <h4 className="font-bold text-lg mb-4 text-red-600">Danger Zone</h4>
          <button className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition font-semibold">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
