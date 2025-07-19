export type ThemeType = {
  value: string;
  background: string;
  title: string;
  text: string;
  circle: string;
  easy: string;
  med: string;
  hard: string;
};

export const defaultTheme = {
  value: "Light",
  background: "#f5f5f5",
  title: "#0077b6",
  text: "#222831",
  circle: "#00b4d8",
  easy: "#1faa59",
  med: "#ff9f1a",
  hard: "#d00000",
};


export const unknownTheme = {
  value: "unknown",
  background: "",
  title: "",
  text: "",
  circle: "",
  easy: "",
  med: "",
  hard: "",
};

export const themes = {
  light: defaultTheme,
  abyss: {
    value: "Abyss",
    background: "#0b3d91",
    title: "#ffffff",
    text: "#dcdcdc",
    circle: "#f39c12",
    easy: "#2ecc71",
    med: "#e67e22",
    hard: "#e74c3c",
  },
  ember: {
    value: "Ember",
    background: "#1e272e",
    title: "#ff3f34",
    text: "#d2dae2",
    circle: "#ffdd59",
    easy: "#05c46b",
    med: "#ffa801",
    hard: "#ff4757",
  },
  frost: {
    value: "Frost",
    background: "#ecf0f1",
    title: "#3498db",
    text: "#2c3e50",
    circle: "#2980b9",
    easy: "#1abc9c",
    med: "#e67e22",
    hard: "#c0392b",
  },
  dusk: {
    value: "Dusk",
    background: "#2c3e50",
    title: "#8e44ad",
    text: "#ecf0f1",
    circle: "#9b59b6",
    easy: "#16a085",
    med: "#f1c40f",
    hard: "#e74c3c",
  },
  aurora: {
    value: "Aurora",
    background: "#232526",
    title: "#ff9f43",
    text: "#f8c291",
    circle: "#e55039",
    easy: "#10ac84",
    med: "#f39c12",
    hard: "#e55039",
  },
  twilight: {
    value: "Twilight",
    background: "#1d1f2f",
    title: "#ff4757",
    text: "#ced6e0",
    circle: "#5352ed",
    easy: "#2ed573",
    med: "#ffa502",
    hard: "#ff6b81",
  },
};
