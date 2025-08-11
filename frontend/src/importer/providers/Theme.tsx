import { useEffect } from "react";
import { IconContext } from "react-icons";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import theme from "../settings/chakra";
import { sizes } from "../settings/theme";
import { ThemeProps } from "./types";
import { applyColorPalette } from "../utils/colorUtils";

export const myCache = createCache({
  key: "csv-importer",
});

const chakraTheme = extendTheme(theme);

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
    <CacheProvider value={myCache}>
      <ChakraProvider resetCSS={false} disableGlobalStyle={true} theme={chakraTheme}>
        <IconContext.Provider value={{ className: "react-icon", size: sizes.icon.medium }}>{children}</IconContext.Provider>
      </ChakraProvider>
    </CacheProvider>
  );
}
