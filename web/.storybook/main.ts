import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    {
      name: "@storybook/addon-mcp",
      options: {
        toolsets: {
          dev: true,
          docs: true,
          test: false
        }
      }
    }
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: {
        viteConfigPath: ".storybook/vite.config.ts"
      }
    }
  },
  staticDirs: ["./public"],
  features: {
    componentsManifest: true
  },
  typescript: {
    reactDocgen: "react-docgen-typescript"
  },
  docs: {
    defaultName: "Documentation"
  }
};

export default config;
