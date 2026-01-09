import { forwardRef } from "react";

const Input = forwardRef(
  (
    {
      label,
      error,
      prefix,
      suffix,
      type = "text",
      placeholder,
      className = "",
      containerClassName = "",
      labelClassName = "",
      errorClassName = "",
      required = false,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`space-y-2 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={props.id || props.name}
            className={`block text-base font-medium text-gray-500 font-worksans ${labelClassName}`}
          >
            {required ? "* " : ""}
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            placeholder={placeholder}
            className={`w-full px-4 py-2.5 lg:py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-worksans text-sm lg:text-base ${
              error
                ? "border-red-500 "
                : "border-gray-300 hover:border-gray-400"
            } ${prefix ? "pl-24" : ""} ${suffix ? "pr-10" : ""} ${className}`}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p className={`mt-1 text-sm text-red-600 ${errorClassName}`}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
