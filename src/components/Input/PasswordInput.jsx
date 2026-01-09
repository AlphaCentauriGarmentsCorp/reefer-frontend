import { useState } from "react";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import Input from "./Input";

const PasswordInput = ({ showToggle = true, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const suffix = showToggle ? (
    <button
      type="button"
      onClick={togglePasswordVisibility}
      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
    >
      {showPassword ? (
        <AiFillEyeInvisible className="h-5 w-5" />
      ) : (
        <AiFillEye className="h-5 w-5" />
      )}
    </button>
  ) : null;

  return (
    <Input
      type={showPassword ? "text" : "password"}
      suffix={suffix}
      className="pr-10"
      {...props}
    />
  );
};

export default PasswordInput;
