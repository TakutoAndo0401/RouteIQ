import type { Preview } from "@storybook/react-vite";
import { initialize, mswLoader } from "msw-storybook-addon";
import { defaultMswHandlers } from "../src/stories/mocks/handlers";
import { installStorybookGoogleMapsMock } from "../src/stories/mocks/googleMaps";
import "../src/lib/css/index.css";
import "../src/app/styles.css";
import "./preview.css";

initialize({ onUnhandledRequest: "bypass" });
installStorybookGoogleMapsMock();
document.documentElement.lang = "ja";

const preview: Preview = {
  tags: ["autodocs"],
  loaders: [mswLoader],
  initialGlobals: {
    theme: "light"
  },
  globalTypes: {
    theme: {
      description: "RouteIQ の表示テーマ",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "light", title: "ライト", icon: "sun" },
          { value: "dark", title: "ダーク", icon: "moon" }
        ],
        dynamicTitle: true
      }
    }
  },
  decorators: [
    (Story, context) => {
      const isDarkMode = context.globals.theme === "dark";
      document.documentElement.classList.toggle("routeiq-theme-dark", isDarkMode);
      document.documentElement.classList.toggle("routeiq-theme-light", !isDarkMode);
      document.body.classList.toggle("routeiq-theme-dark", isDarkMode);
      document.body.classList.toggle("routeiq-theme-light", !isDarkMode);
      document.body.classList.remove("is-modal-open");
      return <Story />;
    }
  ],
  parameters: {
    layout: "padded",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    docs: {
      toc: true
    },
    msw: {
      handlers: defaultMswHandlers
    },
    options: {
      storySort: {
        order: ["Overview", "Foundations", "Shared", "Features", "Widgets", "Pages"]
      }
    }
  }
};

export default preview;
