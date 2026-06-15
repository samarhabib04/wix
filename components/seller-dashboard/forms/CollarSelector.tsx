import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface CollarColor {
  value: string;
  label: string;
  color: string;
}

interface CollarSelectorProps {
  useCollarCodes: boolean;
  onUseCollarCodesChange: (use: boolean) => void;
  selectedColors: string[];
  onColorsChange: (colors: string[]) => void;
  identifiers: string;
  onIdentifiersChange: (text: string) => void;
}

export const CollarSelector = ({
  useCollarCodes,
  onUseCollarCodesChange,
  selectedColors,
  onColorsChange,
  identifiers,
  onIdentifiersChange
}: CollarSelectorProps) => {
  
  const collarColors: CollarColor[] = [
    { value: "light-grey", label: "Light Grey", color: "#D1D5DB" },
    { value: "grey", label: "Grey", color: "#6B7280" },
    { value: "gold", label: "Gold", color: "#F59E0B" },
    { value: "yellow", label: "Yellow", color: "#FACC15" },
    { value: "brown", label: "Brown", color: "#A16207" },
    { value: "black", label: "Black", color: "#1F2937" },
    { value: "orange", label: "Orange", color: "#F97316" },
    { value: "red", label: "Red", color: "#ea384c" },
    { value: "purple", label: "Purple", color: "#8B5CF6" },
    { value: "blue", label: "Blue", color: "#0EA5E9" },
    { value: "light-blue", label: "Light Blue", color: "#7DD3FC" },
    { value: "green", label: "Green", color: "#16A34A" },
    { value: "other", label: "Other", color: "#FFFFFF" },
  ];

  const toggleColor = (color: string) => {
    if (selectedColors.includes(color)) {
      onColorsChange(selectedColors.filter(c => c !== color));
    } else {
      onColorsChange([...selectedColors, color]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Have you used our colour-coded collars?</Label>
        <RadioGroup
          value={useCollarCodes ? "yes" : "no"}
          onValueChange={(value) => onUseCollarCodesChange(value === "yes")}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="yes-collar" />
            <label
              htmlFor="yes-collar"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Yes
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="no-collar" />
            <label
              htmlFor="no-collar"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              No
            </label>
          </div>
        </RadioGroup>
      </div>

      {useCollarCodes ? (
        <div className="space-y-4">
          <Label>Select collar colors used</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {collarColors.map((color) => (
              <div
                key={color.value}
                className={`flex items-center space-x-2 p-2 rounded-md border ${
                  selectedColors.includes(color.value)
                    ? "border-gray-400 bg-gray-50"
                    : "border-gray-200"
                }`}
              >
                <Checkbox
                  id={`collar-${color.value}`}
                  checked={selectedColors.includes(color.value)}
                  onCheckedChange={() => toggleColor(color.value)}
                />
                <Label
                  htmlFor={`collar-${color.value}`}
                  className="flex items-center space-x-2 cursor-pointer flex-1"
                >
                  <span
                    className="w-5 h-5 rounded-full inline-block"
                    style={{ backgroundColor: color.color }}
                  ></span>
                  <span>{color.label}</span>
                </Label>
              </div>
            ))}
          </div>
          
          <p className="text-sm text-gray-500">
            Add photos for each puppy with their collar in the images section
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="identifiers">
            Optional identifiers (e.g., black patch on tail)
          </Label>
          <Textarea
            id="identifiers"
            placeholder="Describe any identifying marks or features to tell puppies apart"
            value={identifiers}
            onChange={(e) => onIdentifiersChange(e.target.value)}
            rows={3}
          />
        </div>
      )}
    </div>
  );
};
