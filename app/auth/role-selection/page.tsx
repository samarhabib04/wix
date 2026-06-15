'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AuthLayout from "@/components/auth/AuthLayout";
import { User, Building, Crown } from "lucide-react";

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const router = useRouter();

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    router.push(`/auth/register?role=${role}`);
  };

  const roles = [
    {
      id: "buyer",
      title: "I'm a Buyer",
      description: "Looking for the perfect dog companion",
      icon: User,
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    },
    {
      id: "seller",
      title: "I'm a Seller (Breeder)",
      description: "Breeding and selling quality dogs",
      icon: Crown,
      color: "bg-green-50 hover:bg-green-100 border-green-200",
    },
    {
      id: "business",
      title: "I'm a Business",
      description: "Vet, groomer, pet store, or other dog-related service",
      icon: Building,
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    },
  ];

  return (
    <AuthLayout 
      title="What brings you to Dog Quest?" 
      description="Choose your role to get started"
    >
      <div className="space-y-4">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Card
              key={role.id}
              className={`cursor-pointer transition-all ${role.color} ${
                selectedRole === role.id ? 'ring-2 ring-brand-dark-green' : ''
              }`}
              onClick={() => handleRoleSelect(role.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Icon className="h-6 w-6" />
                  {role.title}
                </CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </AuthLayout>
  );
}
































