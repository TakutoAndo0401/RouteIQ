import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  expresswayRoute,
  localRoute,
  tollUnavailableRoute
} from "../../../stories/fixtures";
import { RouteCard } from "./RouteCard";

const meta = {
  title: "Widgets/RouteSummary/RouteCard",
  component: RouteCard,
  decorators: [
    (Story) => (
      <div className="storybook-component-frame storybook-component-frame--narrow">
        <Story />
      </div>
    )
  ],
  parameters: {
    docs: {
      description: {
        component:
          "高速優先／一般道それぞれの時間、費用、距離、交通状況を同じ形式で比較するカードです。"
      }
    }
  },
  args: {
    routeType: "expressway",
    route: expresswayRoute,
    recommended: true
  }
} satisfies Meta<typeof RouteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExpresswayRecommended: Story = {};

export const ExpresswayComparison: Story = {
  args: {
    recommended: false
  }
};

export const LocalRecommended: Story = {
  args: {
    routeType: "local",
    route: localRoute,
    recommended: true
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("総額").closest(".metric")).toHaveClass("metric--neutral");
    await expect(canvas.getByText("有料道路料金").closest(".metric")).toHaveClass(
      "metric--neutral"
    );
    await expect(canvas.getByText("0円")).toBeVisible();
  }
};

export const TollUnavailable: Story = {
  args: {
    route: tollUnavailableRoute,
    recommended: false
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("総額").closest(".metric")).toHaveClass("metric--warn");
    await expect(canvas.getByText("有料道路料金").closest(".metric")).toHaveClass(
      "metric--warn"
    );
    await expect(canvas.getAllByText("未確認")).toHaveLength(2);
    await expect(
      canvas.getByText("有料道路料金を取得できなかったため、総額は未確認です。")
    ).toBeVisible();
  }
};
