import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AppHeader } from "./AppHeader";

const meta = {
  title: "Widgets/AppHeader",
  component: AppHeader,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "アプリ名、検索条件サイドバーの開閉、ライト／ダーク切り替えをまとめたヘッダーです。"
      }
    }
  },
  args: {
    isDarkMode: false,
    isSidebarOpen: true,
    onToggleSidebar: fn(),
    onToggleTheme: fn()
  }
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SidebarOpen: Story = {};

export const SidebarClosed: Story = {
  args: {
    isSidebarOpen: false
  }
};

export const Dark: Story = {
  globals: {
    theme: "dark"
  },
  args: {
    isDarkMode: true
  }
};
