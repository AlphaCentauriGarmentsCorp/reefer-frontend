import { useState, useEffect } from "react";
import Input from "./Input";

const PhoneInput = ({
  value = "",
  onChange,
  error,
  label = "Contact number",
  required = true,
  ...props
}) => {
  const [phoneNumber, setPhoneNumber] = useState(value);

  useEffect(() => {
    if (value !== phoneNumber) {
      setPhoneNumber(value);
    }
  }, [value]);

  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(rawValue);
    const syntheticEvent = {
      target: {
        name: props.name || "contact",
        value: rawValue,
      },
    };

    if (onChange) {
      onChange(syntheticEvent);
    }
  };

  const phonePrefix = (
    <span className="flex items-center gap-1 text-gray-600 text-sm">
      🇵🇭 <span className="font-medium">+63</span>
      <span className="mx-1 text-gray-400">|</span>
    </span>
  );

  return (
    <Input
      label={label}
      type="tel"
      value={phoneNumber}
      onChange={handleChange}
      placeholder="9XXXXXXXXX"
      prefix={phonePrefix}
      error={error}
      required={required}
      {...props}
    />
  );
};

export default PhoneInput;
