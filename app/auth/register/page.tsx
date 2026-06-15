'use client';

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BuyerRegister from "../BuyerRegister";
import SellerRegister from "../SellerRegister";
import BusinessRegister from "../BusinessRegister";

function RegisterInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get("role");

  useEffect(() => {
    // If no role is specified, redirect to role selection
    if (!role) {
      router.replace("/auth/role-selection");
      return;
    }

    // If invalid role, redirect to role selection
    if (!["buyer", "seller", "business"].includes(role)) {
      router.replace("/auth/role-selection");
      return;
    }
  }, [role, router]);

  // Show appropriate registration form based on role
  switch (role) {
    case "buyer":
      return <BuyerRegister />;
    case "seller":
      return <SellerRegister />;
    case "business":
      return <BusinessRegister />;
    default:
      return null;
  }
}

export default function Register() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#E1E8E0]">
          <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
            <h1 className="text-2xl font-bold text-center mb-6">Loading...</h1>
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-brand-dark-green border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-center mt-6 text-gray-600">
              Preparing the registration page...
            </p>
          </div>
        </div>
      }
    >
      <RegisterInner />
    </Suspense>
  );
}