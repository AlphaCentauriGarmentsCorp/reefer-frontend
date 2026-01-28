import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { FcGoogle } from "react-icons/fc";
import AuthLayout from "../../layouts/AuthLayout";
import { Input, PasswordInput } from "../../components/Input";
import { authApi } from "../../api/authApi";

export default function Login() {
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
    frontend: "ash",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const data = await authApi.login({
        ...form,
        remember: rememberMe,
      });

      // Save token
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
    <AuthLayout image={"/Auth/BG.png"}>
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-16">
        <div className="w-full max-w-xl md:max-w-2xl">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-bold text-black font-bebas text-center">
              READY TO RUN IT BACK?
            </h1>
            <p className="text-gray-600 font-worksans mt-2 text-center">
              Your next step in streetwear starts here.
            </p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-8 text-center px-23">
            <h1 className="uppercase font-bebas text-6xl lg:text-8xl text-black leading-20">
              ready to run it back?
            </h1>
            <h2 className="text-xl text-gray-800 font-ibmplex mt-2">
              Your next step in streetwear starts here.
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {errors.general && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600 text-center">
                  {errors.general}
                </p>
              </div>
            )}

            <div className="space-y-4 lg:space-y-8">
              <Input
                id="email"
                name="email"
                type="email"
                label="E-mail or username"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                error={errors?.email}
                required={true}
                labelClassName="text-gray-600 font-worksans mb-2"
              />

              <PasswordInput
                id="password"
                name="password"
                label="Password"
                value={form.password}
                onChange={handleChange}
                error={errors?.password}
                placeholder="Enter your password"
                required={true}
                labelClassName="text-gray-600 font-worksans mb-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-200 rounded"
                />
                <label
                  htmlFor="remember"
                  className="ml-2 block text-sm text-gray-700 font-worksans"
                >
                  Remember me
                </label>
              </div>
              <div>
                <a
                  href="#"
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors font-worksans"
                >
                  Forgot password?
                </a>
              </div>
            </div>

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
                  Logging in...
                </span>
              ) : (
                "Log in"
              )}
            </button>
          </form>

          <div className="mt-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-worksans">
                  or
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              className="mt-5 w-full bg-white relative border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-black font-medium py-3 px-4 rounded-full transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed font-worksans flex items-center justify-center gap-3 text-md lg:text-lg shadow-sm hover:shadow"
            >
              <FcGoogle className="w-6 h-6 top-50% absolute left-5" />
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 font-worksans text-xs lg:text-base mt-2">
              Don't have an account?{" "}
              <a
                href="/signup"
                className="font-medium text-primary hover:text-primary/80 transition-colors underline"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
