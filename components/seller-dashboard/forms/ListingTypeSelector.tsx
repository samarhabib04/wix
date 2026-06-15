
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ListingTypeSelectorProps {
  value: "single" | "litter";
  onChange: (value: "single" | "litter") => void;
}

export const ListingTypeSelector = ({ value, onChange }: ListingTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <h3 className="text-md font-semibold">What would you like to list?</h3>
      <RadioGroup
        value={value}
        onValueChange={onChange as (value: string) => void}
        className="flex space-x-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="single" id="r-single" />
          <label
            htmlFor="r-single"
            className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Single Puppy
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="litter" id="r-litter" />
          <label
            htmlFor="r-litter"
            className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Litter of Puppies
          </label>
        </div>
      </RadioGroup>
    </div>
  );
};
