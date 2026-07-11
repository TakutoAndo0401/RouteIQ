import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleDollarSign } from "lucide-react";
import { Metric } from "./Metric";

const meta = {
  title: "Shared/Metric",
  component: Metric,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "時間・費用・距離など、ラベルと値の組をトーン付きで表示します。"
      }
    }
  },
  args: {
    label: "所要時間",
    value: "1時間15分",
    tone: "neutral"
  },
  argTypes: {
    icon: {
      control: false
    }
  }
} satisfies Meta<typeof Metric>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Good: Story = {
  args: {
    label: "合計",
    value: "3,046円",
    tone: "good"
  }
};

export const Warning: Story = {
  args: {
    label: "有料道路料金",
    value: "1,800円",
    tone: "warn"
  }
};

export const WithIcon: Story = {
  args: {
    label: "追加費用",
    value: "1,943円",
    icon: <CircleDollarSign aria-hidden="true" size={14} />
  }
};

export const ToneGallery: Story = {
  render: () => (
    <div className="storybook-inline-gallery">
      <Metric label="時間" value="1時間15分" />
      <Metric label="総額" value="3,046円" tone="good" />
      <Metric label="有料道路料金" value="1,800円" tone="warn" />
    </div>
  )
};
