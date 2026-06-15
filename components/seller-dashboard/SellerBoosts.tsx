import { useState } from "react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Zap } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

/** Demo placeholders only — real boosts are stored in `public.boosts` and shown on My Listings with real dates. */
const mockBoosts = [
  {
    id: 1,
    listingId: 1,
    listingTitle: "Labrador Retriever Puppies",
    boostType: "Gold",
    startDate: "2025-03-15",
    endDate: "2025-05-15",
    status: "active",
    paymentStatus: "paid",
    price: "£19.99"
  },
  {
    id: 2,
    listingId: 3,
    listingTitle: "French Bulldog Puppies",
    boostType: "Premium",
    startDate: "2025-03-01",
    endDate: "2025-04-01",
    status: "expired",
    paymentStatus: "paid",
    price: "£14.99"
  },
  {
    id: 3,
    listingId: 5,
    listingTitle: "Border Collie Puppies",
    boostType: "Basic",
    startDate: "2025-04-01",
    endDate: "2025-05-01",
    status: "active",
    paymentStatus: "paid",
    price: "£9.99"
  },
  {
    id: 4,
    listingId: 7,
    listingTitle: "Pomeranian Puppies",
    boostType: "Gold",
    startDate: "2025-02-15",
    endDate: "2025-03-15",
    status: "expired",
    paymentStatus: "paid",
    price: "£19.99"
  },
  {
    id: 5,
    listingId: 8,
    listingTitle: "German Shepherd Puppies",
    boostType: "Premium",
    startDate: "2025-02-01",
    endDate: "2025-03-01",
    status: "expired",
    paymentStatus: "failed",
    price: "£14.99"
  }
];

// Mock active listings that could be boosted
const mockListingsForBoost = [
  {
    id: 1,
    title: "Labrador Retriever Puppies",
    boostEligible: false, // Already boosted
    currentBoost: "Gold",
    expiryDate: "2025-05-15"
  },
  {
    id: 2,
    title: "Golden Retriever - Stud Service",
    boostEligible: true,
    currentBoost: null,
    expiryDate: "2025-06-01"
  },
  {
    id: 5,
    title: "Border Collie Puppies",
    boostEligible: false, // Already boosted
    currentBoost: "Basic",
    expiryDate: "2025-05-01"
  },
  {
    id: 6,
    title: "Cocker Spaniel Puppies",
    boostEligible: true,
    currentBoost: null,
    expiryDate: "2025-05-20"
  }
];

// Boost package options
const boostOptions = [
  {
    id: "basic",
    name: "Basic Boost",
    price: "£9.99",
    duration: "30 days",
    benefits: [
      "Featured in search results",
      "Highlighted listing card",
      "Basic analytics"
    ],
    color: "bg-blue-500"
  },
  {
    id: "premium",
    name: "Premium Boost",
    price: "£14.99",
    duration: "30 days",
    benefits: [
      "Everything in Basic",
      "Top of category placement",
      "Social media promotion",
      "Detailed visitor analytics"
    ],
    recommended: true,
    color: "bg-purple-500"
  },
  {
    id: "gold",
    name: "Gold Boost",
    price: "£19.99",
    duration: "30 days",
    benefits: [
      "Everything in Premium",
      "Homepage feature rotation",
      "Email newsletter inclusion",
      "Extended listing duration (+15 days)",
      "Priority customer support"
    ],
    color: "bg-yellow-500"
  }
];

const BoostPackageCard = ({ boost, onSelect, isSelected }: any) => {
  return (
    <Card className={`${isSelected ? "ring-2 ring-brand-dark-green" : ""} hover:shadow-md transition-shadow`}>
      {boost.recommended && (
        <div className="absolute top-0 right-0 bg-brand-dark-green text-white text-xs font-bold py-1 px-3 rounded-bl-lg">
          Most Popular
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${boost.color}`}></div>
          <CardTitle>{boost.name}</CardTitle>
        </div>
        <CardDescription>
          {boost.price} for {boost.duration}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-2">
          {boost.benefits.map((benefit: string, index: number) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-brand-soft-green" />
              {benefit}
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={() => onSelect(boost)}
          variant={isSelected ? "default" : "outline"}
          className={isSelected ? "w-full bg-brand-dark-green hover:bg-opacity-90" : "w-full"}
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      </CardFooter>
    </Card>
  );
};

const SellerBoosts = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [selectedBoost, setSelectedBoost] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredBoosts = mockBoosts.filter(boost => {
    if (searchTerm) {
      return boost.listingTitle.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });
  
  const handleBoostListing = () => {
    if (selectedListing && selectedBoost) {
      toast({
        title: "Boost purchased",
        description: `${selectedBoost.name} applied to "${selectedListing.title}"`,
      });
      setShowBoostDialog(false);
      setSelectedListing(null);
      setSelectedBoost(null);
    } else {
      toast({
        title: "Please select",
        description: "Please select both a listing and a boost package",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "active") return "bg-green-100 text-green-800";
    if (status === "expired") return "bg-gray-100 text-gray-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    if (status === "paid") return "bg-emerald-100 text-emerald-800";
    if (status === "failed") return "bg-red-100 text-red-800";
    if (status === "pending") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-800";
  };
  
  const resetSelection = () => {
    setSelectedListing(null);
    setSelectedBoost(null);
  };

  // Responsive modal content that's shared between desktop dialog and mobile drawer
  const BoostModalContent = () => (
    <ScrollArea className="h-[60vh] md:h-auto pr-4">
      <div className="py-4">
        <h4 className="font-semibold mb-2">1. Select listing to boost</h4>
        <div className="max-h-48 overflow-y-auto border rounded-md overflow-x-auto touch-pan-x">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Listing</TableHead>
                <TableHead className="w-1/3">Current Status</TableHead>
                <TableHead className="w-1/6">Expires</TableHead>
                <TableHead className="w-1/6">Select</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockListingsForBoost.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium truncate max-w-[150px]">{listing.title}</TableCell>
                  <TableCell>
                    {listing.currentBoost ? (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {listing.currentBoost} Boost Active
                      </span>
                    ) : "Not Boosted"}
                  </TableCell>
                  <TableCell>{new Date(listing.expiryDate).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={selectedListing?.id === listing.id ? "default" : "outline"}
                      disabled={!listing.boostEligible}
                      onClick={() => setSelectedListing(listing)}
                      className={`${selectedListing?.id === listing.id ? "bg-brand-dark-green" : ""} w-full`}
                    >
                      {selectedListing?.id === listing.id ? "Selected" : "Select"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <h4 className="font-semibold mt-6 mb-2">2. Choose boost package</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {boostOptions.map((boost) => (
            <BoostPackageCard
              key={boost.id}
              boost={boost}
              onSelect={setSelectedBoost}
              isSelected={selectedBoost?.id === boost.id}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-berkshire text-brand-dark-green mb-1">My Boosts</h2>
          <p className="text-gray-600">Increase visibility for your listings</p>
        </div>
        
        <Button
          onClick={() => setShowBoostDialog(true)}
          className="mt-4 md:mt-0 bg-brand-dark-green hover:bg-opacity-90"
        >
          <Zap className="mr-1 h-4 w-4" />
          Boost a Listing
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by listing name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listing</TableHead>
                <TableHead>Boost Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBoosts.length > 0 ? (
                filteredBoosts.map((boost) => (
                  <TableRow key={boost.id}>
                    <TableCell className="font-medium">{boost.listingTitle}</TableCell>
                    <TableCell>{boost.boostType}</TableCell>
                    <TableCell>{new Date(boost.startDate).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell>{new Date(boost.endDate).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(boost.status)}`}>
                        {boost.status.charAt(0).toUpperCase() + boost.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(boost.paymentStatus)}`}>
                        {boost.paymentStatus.charAt(0).toUpperCase() + boost.paymentStatus.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{boost.price}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                    No boosts found.
                    {searchTerm && (
                      <Button 
                        variant="link" 
                        onClick={() => setSearchTerm("")}
                        className="ml-2"
                      >
                        Clear search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Responsive Modal Implementation */}
      {isMobile ? (
        <Drawer open={showBoostDialog} onOpenChange={(open) => {
          setShowBoostDialog(open);
          if (!open) resetSelection();
        }}>
          <DrawerContent className="px-4 max-h-[85vh] w-[90vw]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Boost a Listing</DrawerTitle>
              <DrawerDescription>
                Boost your listing to increase visibility and reach more potential buyers.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 overflow-hidden">
              <BoostModalContent />
            </div>
            <DrawerFooter className="pt-2">
              <Button
                onClick={handleBoostListing}
                disabled={!selectedListing || !selectedBoost}
                className="bg-brand-dark-green hover:bg-opacity-90"
              >
                Purchase Boost
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" onClick={resetSelection}>
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog 
          open={showBoostDialog} 
          onOpenChange={(open) => {
            setShowBoostDialog(open);
            if (!open) resetSelection();
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Boost a Listing</DialogTitle>
              <DialogDescription>
                Boost your listing to increase visibility and reach more potential buyers.
              </DialogDescription>
            </DialogHeader>
            <BoostModalContent />
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowBoostDialog(false);
                resetSelection();
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleBoostListing}
                disabled={!selectedListing || !selectedBoost}
                className="bg-brand-dark-green hover:bg-opacity-90"
              >
                Purchase Boost
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SellerBoosts;
