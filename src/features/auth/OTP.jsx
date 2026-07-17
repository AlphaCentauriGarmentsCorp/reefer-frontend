import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import AuthLayout from "../../layouts/AuthLayout";

function maskEmail(email) {
  if (!email || !email.includes("@")) return email || "";
  const [name, domain] = email.split("@");
  const shown = name.slice(0, 2);
  return `${shown}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

export default function OTP() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(30);
  const [resending, setResending] = useState(false);

  // No email in navigation state means the user didn't come from signup.
  useEffect(() => {
    if (!email) navigate("/signup", { replace: true });
  }, [email, navigate]);

  // Resend cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const arr = otp.split("");
    arr[index] = value;
    setOtp(arr.join("").slice(0, 6));
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await authApi.verifyOtp({ email, otp });
      setUser(data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    setInfo("");
    try {
      await authApi.resendOtp({ email });
      setInfo("A new code has been sent to your email.");
      setCooldown(30);
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend the code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout image={"/Auth/BG2.png"}>
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-16">
        <div className="w-full max-w-xl">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-5xl font-bold text-black font-bebas text-center">
              OTP Verification
            </h1>
            <p className="text-gray-600 text-xs font-worksans mt-2 text-center">
              Please enter the OTP sent to your registered email ({maskEmail(email)}) to complete your verification.
            </p>
          </div>

          <div className="hidden lg:block mb-8">
            <h1 className="uppercase font-bebas text-6xl lg:text-7xl text-black leading-20">
              OTP Verification
            </h1>
            <h2 className="text-lg text-gray-800 font-ibmplex mt-2">
              Please enter the OTP sent to your registered email ({maskEmail(email)}) to complete your verification.
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="flex justify-center lg:justify-between gap-2 sm:gap-3 md:gap-4 mt-8 lg:mt-20">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  maxLength="1"
                  value={otp[i] || ""}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !e.target.value && i > 0) {
                      document.getElementById(`otp-${i - 1}`)?.focus();
                    }
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center text-xl sm:text-2xl md:text-3xl rounded-lg border border-gray-300 transition-all duration-200"
                  required
                  aria-label={`OTP digit ${i + 1}`}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-sm text-red-600 font-worksans">{error}</p>
            )}
            {info && (
              <p className="text-center text-sm text-green-600 font-worksans">{info}</p>
            )}

            <div className="text-center">
              <p className="text-gray-600 font-worksans text-xs lg:text-base mt-2">
                Didn't get the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className="font-medium text-primary hover:text-primary/80 transition-colors underline disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending..." : "Resend code"}
                </button>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="mt-7 w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 lg:py-3 px-4 rounded-full transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed font-worksans text-md lg:text-xl shadow-md hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify"
              )}
            </button>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
