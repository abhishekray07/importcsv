import { useEffect } from "react";
import { IconContext } from "react-icons";
import { Toaster } from "../components/ui/toaster";
import { sizes } from "../settings/theme";
import { ThemeProps } from "./types";
import { applyColorPalette } from "../utils/colorUtils";

export interface ThemeProviderProps extends ThemeProps {
  primaryColor?: string;
}

export default function ThemeProvider({ children, primaryColor }: ThemeProviderProps): React.ReactElement {
  useEffect(() => {
    if (primaryColor) {
      applyColorPalette(primaryColor);
    }
  }, [primaryColor]);

  return (
    <>
      <IconContext.Provider value={{ className: "react-icon", size: sizes.icon.medium }}>
        {children}
      </IconContext.Provider>
      <Toaster />
    </>
  );
}