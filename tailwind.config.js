module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12181A",
        surface: "#1B2326",
        "surface-raised": "#222C2F",
        hairline: "#2E393C",
        bone: "#EDEAE2",
        muted: "#8B9598",
        moss: "#8FB08A",
        rust: "#C3714E",
        gold: "#D3A653",
      },
      fontFamily: {
        mono: [
          '"SF Mono"',
          "Monaco",
          '"Cascadia Code"',
          '"Roboto Mono"',
          "Consolas",
          '"Courier New"',
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
