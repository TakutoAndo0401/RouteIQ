import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingSpinner } from "./LoadingSpinner";

const meta = {
  title: "Shared/LoadingSpinner",
  component: LoadingSpinner,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "処理中であることをアイコンとアクセシブルなラベルで伝えるスピナーです。"
      }
    }
  },
  args: {
    label: "読み込み中",
    size: 16
  }
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: 12
  }
};

export const Large: Story = {
  args: {
    label: "道路状況を確認中",
    size: 32
  }
};
