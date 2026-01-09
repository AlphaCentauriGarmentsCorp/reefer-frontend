import { useState } from "react";
import { loginService } from "./auth.service";
import { useAuth } from "../../hooks/useAuth";
import AuthLayout from "../../layouts/AuthLayout";
import { Input, PhoneInput } from "../../components/Input";

export default function Login() {
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contact: "",
    street: "",
    province: "",
    postalCode: "",
    barangay: "",
    city: "",
    frontend: "ash",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const data = await loginService(form);
      localStorage.setItem("token", data.token);
      setUser(data.user);
      setErrors({});
    } catch (err) {
      const response = err.response?.data;

      if (response?.errors) {
        setErrors(response.errors);
      } else {
        setErrors({ general: response?.message || "Login failed" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout image={"/Auth/BG2.png"}>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 xl:p-16">
        <div className="w-full max-w-lg md:max-w-3xl">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-black font-bebas text-center">
              create an account
            </h1>
            <p className="text-gray-600 font-worksans mt-2 text-center text-sm sm:text-base px-2">
              Be the first to catch the next big drop.
            </p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-6 lg:mb-8">
            <h1 className="uppercase font-bebas text-5xl lg:text-6xl xl:text-7xl text-black leading-tight">
              create an account
            </h1>
            <h2 className="text-lg lg:text-xl text-gray-800 font-ibmplex">
              Be the first to catch the next big drop.
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
            <div className="border border-gray-200 h-[58vh] overflow-auto scrollbar-thin-primary rounded-md">
              <div className="p-4 sm:p-6 lg:p-6 xl:p-5 rounded-lg space-y-5 lg:space-y-6">
                <h1 className="font-worksans font-semibold text-gray-600 text-base lg:text-lg">
                  PERSONAL INFORMATION
                </h1>

                {/* First & Last Name */}
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 px-2">
                  <Input
                    id="firstName"
                    name="firstName"
                    label="First name"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                    error={errors?.firstName}
                    required
                    containerClassName="flex-1"
                  />
                  <Input
                    id="lastName"
                    name="lastName"
                    label="Last Name"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                    error={errors?.lastName}
                    required
                    containerClassName="flex-1"
                  />
                </div>

                {/* Email */}
                <div className="px-2">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    label="E-mail"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    error={errors?.email}
                    required
                  />
                </div>

                {/* Contact Number */}
                <div className="px-2">
                  <PhoneInput
                    id="contact"
                    name="contact"
                    value={form.contact}
                    onChange={handleChange}
                    error={errors?.contact}
                  />
                </div>

                {/* Address Section */}
                <h1 className="font-worksans font-semibold text-gray-600 text-base lg:text-lg pt-2">
                  ADDRESS
                </h1>

                {/* Street */}
                <div className="px-2">
                  <Input
                    id="street"
                    name="street"
                    label="Street"
                    value={form.street}
                    onChange={handleChange}
                    placeholder="Enter your street"
                    error={errors?.street}
                    required
                  />
                </div>

                {/* Province & Postal Code */}
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 px-2">
                  <Input
                    id="province"
                    name="province"
                    label="Province"
                    value={form.province}
                    onChange={handleChange}
                    placeholder="Enter your province"
                    error={errors?.province}
                    required
                    containerClassName="flex-1"
                  />
                  <Input
                    id="postalCode"
                    name="postalCode"
                    label="Postal Code"
                    value={form.postalCode}
                    onChange={handleChange}
                    placeholder="Enter your postal code"
                    error={errors?.postalCode}
                    required
                    containerClassName="flex-1"
                  />
                </div>

                {/* Barangay & City */}
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 px-2">
                  <Input
                    id="barangay"
                    name="barangay"
                    label="Barangay"
                    value={form.barangay}
                    onChange={handleChange}
                    placeholder="Enter your barangay"
                    error={errors?.barangay}
                    required
                    containerClassName="flex-1"
                  />
                  <Input
                    id="city"
                    name="city"
                    label="City"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Enter your city"
                    error={errors?.city}
                    required
                    containerClassName="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-full transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed font-worksans text-base lg:text-lg shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                "Next"
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 lg:mt-8 text-center space-y-3 lg:space-y-4">
            <p className="text-gray-600 font-worksans text-xs sm:text-sm lg:text-base px-2">
              By continuing, you agree to our{" "}
              <a
                href="#"
                className="font-medium text-primary hover:text-primary/80 transition-colors underline"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="font-medium text-primary hover:text-primary/80 transition-colors underline"
              >
                Privacy Policy
              </a>
            </p>
            <p className="text-gray-600 font-worksans text-xs sm:text-sm lg:text-base">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors underline"
              >
                Log in
              </a>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
