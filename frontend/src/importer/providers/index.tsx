import { ProvidersProps } from "./types";
import ThemeContextProvider from "./Theme";

export interface ProvidersWithThemeProps extends ProvidersProps {
  primaryColor?: string;
}

export default function Providers({ children, primaryColor }: ProvidersWithThemeProps) {
  return <ThemeContextProvider primaryColor={primaryColor}>{children}</ThemeContextProvider>;
}
