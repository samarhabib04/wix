'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown, Trophy } from "lucide-react";
import Link from "next/link";
import NavigationSection from "@/components/NavigationSection";
import {
  boostTierPublicTitle,
  useBoostConfig,
  STANDARD_BOOST_CARD_LABEL,
} from "@/hooks/useBoostConfig";

/** Fixed slot so prices line up; Standard uses seasonal title or Standard Boost fallback. */
const BOOST_CARD_TITLE_SLOT_CLASS =
  "text-2xl font-berkshire h-28 sm:h-32 text-center leading-snug text-balance line-clamp-3 px-1";

export default function BoostInfoPage() {
  const boostNames = useBoostConfig();

  const boostTypes = [
    {
      name: "Gold",
      price: "€20",
      icon: <Crown className="h-8 w-8 text-yellow-500" />,
      color: "bg-gradient-to-r from-yellow-400 to-yellow-600",
      badge: "MAXIMUM VISIBILITY",
      features: [
        "Shown at top of homepage in the evening window (7:00 PM-11:00 PM)",
        "Maximum 5 listings at once",
        "Highest search rankings",
        "Premium placement guarantee",
        "4-hour guaranteed evening visibility"
      ],
      description: "The ultimate boost for maximum exposure and sales"
    },
    {
      name: "Elite",
      price: "€12.50",
      icon: <Trophy className="h-8 w-8 text-purple-500" />,
      color: "bg-gradient-to-r from-purple-500 to-purple-700",
      badge: "PREMIUM CHOICE",
      features: [
        "Homepage carousel 1 placement",
        "Top of category listings",
        "Enhanced search visibility",
        "Priority in breed searches",
        "Featured listing badge"
      ],
      description: "Perfect balance of visibility and value"
    },
    {
      name: "Premium",
      price: "€10",
      icon: <Zap className="h-8 w-8 text-blue-500" />,
      color: "bg-gradient-to-r from-blue-500 to-blue-700",
      badge: "POPULAR",
      features: [
        "Homepage carousel 2 placement",
        "Top of category listings",
        "Improved search rankings",
        "Category page priority",
        "Boost visibility badge"
      ],
      description: "Great visibility at an affordable price"
    },
    {
      name: "Standard",
      price: "€5",
      icon: <Star className="h-8 w-8 text-green-500" />,
      color: "bg-gradient-to-r from-green-500 to-green-700",
      badge: "STARTER",
      features: [
        "Top of category placement",
        "Basic search boost",
        "Category priority",
        "Standard boost badge",
        "Entry-level visibility"
      ],
      description: "Cost-effective way to stand out"
    }
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/10">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <div className="mb-8">
              <Badge variant="secondary" className="mb-4 text-lg px-4 py-2">
                MAXIMIZE YOUR SALES
              </Badge>
              <h1 className="text-4xl md:text-6xl font-berkshire text-primary mb-6">
                Boost Your Listings
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Give your puppies the visibility they deserve with our premium boost options. 
                Get more views, more inquiries, and faster sales with guaranteed placement.
              </p>
            </div>
          </div>
        </section>

        {/* Boost Options Grid */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {boostTypes.map((boost) => {
                const tier =
                  boost.name === "Gold"
                    ? "gold"
                    : boost.name === "Elite"
                      ? "elite"
                      : boost.name === "Premium"
                        ? "premium"
                        : "standard";
                const displayTitle = boostTierPublicTitle(tier, boostNames);
                const cardHeading =
                  displayTitle ?? (tier === 'standard' ? STANDARD_BOOST_CARD_LABEL : null);
                return (
                <Card key={boost.name} className="relative flex h-full flex-col overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
                  <div className={`absolute top-0 left-0 right-0 h-2 ${boost.color}`} />
                  
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      {boost.icon}
                    </div>
                    <Badge variant="outline" className="mb-2 text-xs font-semibold">
                      {boost.badge}
                    </Badge>
                    <CardTitle className={BOOST_CARD_TITLE_SLOT_CLASS}>
                      {cardHeading ?? boost.name}
                    </CardTitle>
                    <CardDescription className="text-3xl font-bold text-primary mt-0">
                      {boost.price}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground mt-2">
                      {boost.description}
                    </p>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col">
                    <ul className="space-y-3">
                      {boost.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4 bg-accent/5">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-berkshire text-center text-primary mb-12">
              How Boosts Work
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Choose Your Boost</h3>
                <p className="text-muted-foreground">
                  Select the boost level that fits your budget and visibility goals.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Instant Activation</h3>
                <p className="text-muted-foreground">
                  Your listing is immediately moved to premium placement positions.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Watch Sales Grow</h3>
                <p className="text-muted-foreground">
                  Get more views, inquiries, and faster sales with guaranteed visibility.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-berkshire text-primary mb-6">
              Ready to Boost Your Listings?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start boosting your listings today and see the difference in visibility and sales.
            </p>
            <Button asChild size="lg" className="bg-brand-soft-green hover:bg-brand-dark-green">
              <Link href="/boost-listing">Get Started</Link>
            </Button>
          </div>
        </section>
      </div>
      
      <NavigationSection />
    </>
  );
}

