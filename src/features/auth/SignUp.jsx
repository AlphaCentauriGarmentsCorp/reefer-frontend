import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import AuthLayout from "../../layouts/AuthLayout";
import { Input, PasswordInput } from "../../components/Input";

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Client-side checks the backend can't infer from a single field.
    if (form.password.length < 6) {
      setErrors({ password: "Password must be at least 6 characters long." });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const name = `${form.firstName} ${form.lastName}`.trim();
      await authApi.register({
        name,
        email: form.email,
        password: form.password,
      });

      // Registration sends an OTP by email; verify on the next page.
      navigate("/otp-verification", { state: { email: form.email } });
    } catch (err) {
      const response = err.response?.data;
      if (response?.errors) {
        setErrors(response.errors);
      } else {
        setErrors({ general: response?.message || "Registration failed" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout image={"/Auth/BG2.png"}>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 xl:p-16">
        <div className="w-full max-w-lg md:max-w-2xl">
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
            {errors.general && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600 text-center">{errors.general}</p>
              </div>
            )}

            <div className="border border-gray-200 rounded-md">
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
                    label="Last name"
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

                {/* Password */}
                <div className="px-2">
                  <PasswordInput
                    id="password"
                    name="password"
                    label="Password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    error={errors?.password}
                    required
                  />
                </div>

                {/* Confirm Password */}
                <div className="px-2">
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    error={errors?.confirmPassword}
                    required
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
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
              <a href="#" className="font-medium text-primary hover:text-primary/80 transition-colors underline">Terms</a>{" "}
              and{" "}
              <a href="#" className="font-medium text-primary hover:text-primary/80 transition-colors underline">Privacy Policy</a>
            </p>
            <p className="text-gray-600 font-worksans text-xs sm:text-sm lg:text-base">
              Already have an account?{" "}
              <a href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors underline">Log in</a>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
