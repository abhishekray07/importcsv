import { useEffect, useState } from "react";
import { InputOption } from "../../../components/Input/types";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../../components/ui/select";

type DropdownFieldsProps = {
  options: { [key: string]: InputOption };
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  selectedValues: { key: string; selected: boolean | undefined }[];
  updateSelectedValues: (updatedValues: { key: string; selected: boolean | undefined }[]) => void;
};

export default function DropdownFields({ 
  options, 
  value, 
  placeholder, 
  onChange, 
  selectedValues, 
  updateSelectedValues 
}: DropdownFieldsProps) {
  const [selectedOption, setSelectedOption] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<{ [key: string]: InputOption }>({});

  useEffect(() => {
    setSelectedOption(value);
  }, [selectedValues]);

  useEffect(() => {
    filterOptions();
  }, [options, selectedValues]);

  const handleValueChange = (newValue: string) => {
    // Handle special values
    if (newValue === "__placeholder__" || newValue === "__empty__") {
      // If placeholder or empty selection, treat it as an empty string 
      const updatedSelectedValues = selectedValues.map((item) => {
        if (item.key === selectedOption) {
          return { ...item, selected: false };
        }
        return item;
      });
      
      setSelectedOption("");
      updateSelectedValues([...updatedSelectedValues]);
      onChange("");
      return;
    }
    
    const updatedSelectedValues = selectedValues.map((item) => {
      if (item.key === selectedOption) {
        return { ...item, selected: false };
      } else if (item.key === newValue) {
        return { ...item, selected: true };
      }
      return item;
    });
    
    setSelectedOption(newValue);
    updateSelectedValues([...updatedSelectedValues]);
    onChange(newValue);
  };

  const filterOptions = () => {
    const newFilteredOptions: { [key: string]: InputOption } = {};
    for (const key in options) {
      const option = options[key];
      const isSelected = selectedValues.some((item) => item.key === option?.value && item.selected && option.value !== value);
      if (!isSelected) {
        newFilteredOptions[key] = option;
      }
    }
    setFilteredOptions(newFilteredOptions);
  };

  const isEmpty = Object.keys(filteredOptions).length === 0;

  return (
    <Select 
      value={selectedOption} 
      onValueChange={handleValueChange}
      disabled={isEmpty}
    >
      <SelectTrigger className="h-8 text-sm bg-background border-input focus:ring-0 focus:ring-offset-0">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">
          {placeholder}
        </SelectItem>
        {Object.entries(filteredOptions).map(([key, option]) => (
          <SelectItem key={String(option.value)} value={String(option.value || "__empty__")}>
            {key}{option.required && <span className="text-destructive ml-1">*</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}