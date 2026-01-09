// src/layouts/AuthLayout.jsx
import React from "react";

export default function AuthLayout({ children, image }) {
  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {children}

      <div className="lg:w-1/3 relative overflow-hidden order-first lg:order-last">
        <div className="relative h-full min-h-27 lg:min-h-screen pl-2">
          <img
            className="shadows absolute inset-0 w-full h-full object-cover lg:rounded-tl-[100px] ml-0 lg:ml-5"
            src={image}
            alt="Streetwear background"
          />
        </div>
      </div>
      <img
        className="absolute h-12 w-12 lg:h-15 lg:w-15 z-10 top-3 right-3 lg:top-10 lg:right-10 object-cover "
        src="/Layout/Logo.png"
        alt="Streetwear background"
      />
    </div>
  );
}
