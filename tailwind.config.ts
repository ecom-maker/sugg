// tailwind.config.ts
// Note: TailwindCSS v4 configuration moved to src/app/globals.css using @theme
// This file exists for compatibility with tooling that expects it

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
