import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { FcGoogle } from "react-icons/fc";
import AuthLayout from "../../layouts/AuthLayout";
import { Input, PhoneInput, PasswordInput } from "../../components/Input";
import { registerService } from "./auth.service";

export default function Signup() {
  const { setUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Combined form state
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

    username: "",
    password: "",
    confirmPassword: "",

    frontend: "ash",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });

    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!form.firstName.trim()) newErrors.firstName = "First name is required";
    if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Invalid email format";
    if (!form.contact.trim()) newErrors.contact = "Contact number is required";
    else if (form.contact.length !== 10)
      newErrors.contact = "Contact number must be 10 digits";
    if (!form.street.trim()) newErrors.street = "Street is required";
    if (!form.province.trim()) newErrors.province = "Province is required";
    if (!form.postalCode.trim())
      newErrors.postalCode = "Postal code is required";
    if (!form.barangay.trim()) newErrors.barangay = "Barangay is required";
    if (!form.city.trim()) newErrors.city = "City is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!form.username.trim()) newErrors.username = "Username is required";
    if (!form.password) newErrors.password = "Password is required";
    else if (form.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (!form.confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!agreeTerms)
      newErrors.terms = "You must agree to the Terms and Privacy Policy";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const { confirmPassword, ...registerData } = form;

      const data = await registerService(registerData);
      localStorage.setItem("token", data.token);
      setUser(data.user);
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

  const renderStep1 = () => (
    <>
      <form onSubmit={handleNext} className="space-y-3">
        {errors.general && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600 text-center">{errors.general}</p>
          </div>
        )}

        <div className="border border-gray-200 h-[58vh] overflow-auto scrollbar-thin-primary rounded-md">
          <div className="p-4 sm:p-6 lg:p-6 xl:p-5 rounded-lg space-y-5 lg:space-y-6">
            <h1 className="font-worksans font-semibold text-gray-600 text-base lg:text-lg">
              PERSONAL INFORMATION
            </h1>

            <div className="px-2  space-y-5 lg:space-y-6">
              {/* First & Last Name */}
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
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

              {/* Contact Number */}
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
            <div className="px-2  space-y-5 lg:space-y-6">
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

              {/* Province & Postal Code */}
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
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
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
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
        </div>

        <button
          type="submit"
          className="mt-4 w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-full transition-all duration-200 font-worksans text-md lg:text-xl shadow-md hover:shadow-lg"
        >
          Next
        </button>
      </form>
    </>
  );

  const renderStep2 = () => (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        {errors.general && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600 text-center">{errors.general}</p>
          </div>
        )}
        <div className="border border-gray-200 max-h-[58vh] p-3 overflow-auto scrollbar-thin-primary rounded-md">
          <div className="p-4 sm:p-6 lg:p-6 xl:p-4 rounded-lg space-y-5 lg:space-y-6">
            <div className="space-y-4 lg:space-y-6">
              <Input
                id="username"
                name="username"
                label="Username"
                value={form.username}
                onChange={handleChange}
                placeholder="Choose a username"
                error={errors?.username}
                required
                labelClassName="text-gray-600 font-worksans mb-2"
              />

              <PasswordInput
                id="password"
                name="password"
                label="Password"
                value={form.password}
                onChange={handleChange}
                error={errors?.password}
                placeholder="Create a strong password"
                required
                labelClassName="text-gray-600 font-worksans mb-2"
              />

              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                error={errors?.confirmPassword}
                placeholder="Re-enter your password"
                required
                labelClassName="text-gray-600 font-worksans mb-2"
                showToggle={true}
              />

              <div className=" space-x-3 ">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-1"
                />
                <label
                  htmlFor="agreeTerms"
                  className="text-sm text-gray-700 font-worksans"
                >
                  I agree to the{" "}
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
                </label>
                {errors?.terms && (
                  <p className=" text-sm text-red-600">{errors.terms}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 lg:py-3 px-4 rounded-full transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed font-worksans text-md text-md lg:text-xl shadow-md hover:shadow-lg"
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
              "Complete"
            )}
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="flex-1 bg-transparent border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold py-2 lg:py-3 px-4 rounded-full transition-all duration-200 font-worksans text-md lg:text-xl shadow-sm hover:shadow"
          >
            Back
          </button>
        </div>
      </form>
    </>
  );

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

          {step === 1 ? renderStep1() : renderStep2()}

          <div className="mt-8 text-center">
            <p className="text-gray-600 font-worksans text-xs lg:text-base">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors underline"
              >
                Log in
              </a>
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-4">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="relative focus:outline-none group"
              >
                <div
                  className={`w-3 h-3 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step === 1
                      ? "bg-white ring-2 ring-black"
                      : "bg-white ring-1 ring-gray-300 hover:ring-gray-400"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      step === 1
                        ? "bg-black"
                        : "bg-gray-300 group-hover:bg-gray-500"
                    }`}
                  ></div>
                </div>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => step === 1 && validateStep1() && setStep(2)}
                className={`relative focus:outline-none group ${
                  step === 1 ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step === 2
                      ? "bg-white ring-2 ring-black"
                      : step === 1
                      ? "bg-white ring-1 ring-gray-300 hover:ring-gray-400"
                      : "bg-white ring-1 ring-gray-300"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      step === 2
                        ? "bg-black"
                        : step === 1
                        ? "bg-gray-300 group-hover:bg-gray-500"
                        : "bg-gray-300"
                    }`}
                  ></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
