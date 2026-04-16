import { useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function ProfileTab() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "GUEST NAME",
    email: "guest@email.com",
    phone: "+63 912 345 6789",
    address: "123 Street, Quezon City, Philippines"
  });

  return (
    <div className="p-8">
      {/* Profile Header */}
      <div className="flex items-center gap-6 mb-12 pb-8 border-b border-gray-200">
        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-3xl text-gray-400">👤</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-1">{profile.name}</h2>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">PROFILE INFO</h3>
        <p className="text-sm text-gray-500">Set your Profile details data</p>
      </div>

      {/* Profile Form */}
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Address
          </label>
          <textarea
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            disabled={!isEditing}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-600"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition font-semibold"
            >
              <FiEdit2 size={18} />
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition font-semibold"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
