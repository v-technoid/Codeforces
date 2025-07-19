import { ThemeType, themes, unknownTheme } from "../static/theme";

export const getTheme = (theme: string): ThemeType => {
  const lowerTheme = theme.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(themes, lowerTheme)) {
    return themes[lowerTheme as keyof typeof themes];
  }
  return unknownTheme;
};
