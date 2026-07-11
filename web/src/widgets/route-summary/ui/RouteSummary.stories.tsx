import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { CompareRoutesResult } from "../../../entities/route/model";
import {
  expresswayRecommendedResult,
  localRecommendedResult,
  resultWithApiFailures,
  resultWithUnavailableToll
} from "../../../stories/fixtures";
import { RouteSummary } from "./RouteSummary";

const negativeDifferencesResult = {
  ...expresswayRecommendedResult,
  input: {
    ...expresswayRecommendedResult.input,
    prioritize: "cost"
  },
  recommendedRoute: "expressway",
  recommendationReason: "高速優先の方が総額が安いため、費用を重視しておすすめします。",
  expresswayRoute: {
    ...expresswayRecommendedResult.expresswayRoute,
    durationMinutes: 95,
    tollYen: 400,
    fuelCostYen: 600,
    totalCostYen: 1000
  },
  localRoute: {
    ...expresswayRecommendedResult.localRoute,
    durationMinutes: 80,
    fuelCostYen: 1300,
    totalCostYen: 1300
  },
  comparison: {
    timeDifferenceMinutes: -15,
    costDifferenceYen: -300,
    valueOfTimeSavedYenPerMinute: null
  }
} satisfies CompareRoutesResult;

const meta = {
  title: "Widgets/RouteSummary",
  component: RouteSummary,
  decorators: [
    (Story) => (
      <div className="storybook-component-frame">
        <Story />
      </div>
    )
  ],
  parameters: {
    docs: {
      description: {
        component:
          "おすすめの判断、比較の要点、各ルートの詳細、未確認項目をひとまとまりで表示します。"
      }
    }
  },
  args: {
    result: expresswayRecommendedResult
  }
} satisfies Meta<typeof RouteSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExpresswayRecommended: Story = {};

export const LocalRecommended: Story = {
  args: {
    result: localRecommendedResult
  }
};

export const WithUnconfirmedItems: Story = {
  args: {
    result: resultWithApiFailures
  }
};

export const TollUnavailable: Story = {
  args: {
    result: resultWithUnavailableToll
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/費用差は未確認です。/)).toBeVisible();
    await expect(canvas.queryByText(/未確認余計/)).not.toBeInTheDocument();

    const costDifferenceMetric = canvas.getByText("費用差").parentElement;
    await expect(costDifferenceMetric).toHaveTextContent(/費用差\s*未確認/);

    const warningBlock = canvas.getByRole("heading", { name: "未確認の項目" }).closest("section");
    const routeDetails = canvas.getByLabelText("各ルートの詳細");
    await expect(warningBlock).toHaveClass("list-block--warning");
    await expect(routeDetails.previousElementSibling).toBe(warningBlock);
  }
};

export const NegativeDifferences: Story = {
  args: {
    result: negativeDifferencesResult
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        "今回は高速優先がおすすめです。一般道は高速優先より15分短時間です。高速優先は一般道より300円安くなります。"
      )
    ).toBeVisible();

    await expect(canvas.getByText("時間差").parentElement).toHaveTextContent(
      /時間差\s*一般道が15分短い/
    );
    await expect(canvas.getByText("費用差").parentElement).toHaveTextContent(
      /費用差\s*高速が300円安い/
    );
    await expect(canvas.queryByText(/-[\d,]+(?:分|円)/)).not.toBeInTheDocument();
  }
};
