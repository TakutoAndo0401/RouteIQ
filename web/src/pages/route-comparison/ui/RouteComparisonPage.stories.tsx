import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay } from "msw";
import { http } from "msw/core/http";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  defaultRouteInput,
  failedAnalysis,
  successfulAnalysis
} from "../../../stories/fixtures";
import { RouteComparisonPage } from "./RouteComparisonPage";

const HISTORY_STORAGE_KEY = "routeiq-route-history";
let refreshRequestCount = 0;

function clearHistory() {
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  return {};
}

async function submitDefaultRoute(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const origin = canvas.getByLabelText("出発地");
  const destination = canvas.getByLabelText("目的地");
  await userEvent.clear(origin);
  await userEvent.type(origin, defaultRouteInput.origin);
  await userEvent.clear(destination);
  await userEvent.type(destination, defaultRouteInput.destination);
  await userEvent.click(canvas.getByRole("button", { name: "比較" }));
  return canvas;
}

const meta = {
  title: "Pages/RouteComparison",
  component: RouteComparisonPage,
  loaders: [clearHistory],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "入力、履歴、比較結果、地図、失敗時の回復導線を組み合わせた RouteIQ のメインページです。"
      }
    }
  },
  args: {
    isDarkMode: false,
    onToggleTheme: fn()
  }
} satisfies Meta<typeof RouteComparisonPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {};

export const DarkInitial: Story = {
  globals: {
    theme: "dark"
  },
  args: {
    isDarkMode: true
  }
};

export const SidebarClosed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "検索条件を閉じる" }));
    const inputButton = await canvas.findByRole("button", { name: "条件を入力する" });
    await userEvent.click(inputButton);
    await expect(canvas.getByLabelText("出発地")).toHaveFocus();
  }
};

export const WithHistory: Story = {
  loaders: [
    () => {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify([
          {
            id: "storybook-history-1",
            key: "storybook-history-key-1",
            searchedAt: "2026-07-11T09:30:00.000Z",
            input: defaultRouteInput
          },
          {
            id: "storybook-history-2",
            key: "storybook-history-key-2",
            searchedAt: "2026-07-10T23:45:00.000Z",
            input: {
              ...defaultRouteInput,
              origin: "東京駅",
              destination: "横浜駅",
              fuelEfficiencyKmPerLiter: 18
            }
          }
        ])
      );
      return {};
    }
  ]
};

export const ComparisonResult: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    await expect(
      canvas.findByRole("heading", { name: /高速優先で進むのが良さそうです/ })
    ).resolves.toBeTruthy();
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "経路比較結果を更新しました。"
    );
  }
};

export const DarkComparisonResult: Story = {
  ...ComparisonResult,
  globals: {
    theme: "dark"
  },
  args: {
    isDarkMode: true
  }
};

export const RefreshFailureHidesPreviousResult: Story = {
  loaders: [
    () => {
      refreshRequestCount = 0;
      return {};
    }
  ],
  parameters: {
    msw: {
      handlers: {
        routeAnalysis: http.post("/api/route-analysis", async () => {
          refreshRequestCount += 1;
          if (refreshRequestCount === 1) return Response.json(successfulAnalysis);

          await delay(100);
          return Response.json(
            { error: "道路状況の再確認に失敗しました。" },
            { status: 503 }
          );
        })
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    await expect(
      canvas.findByRole("heading", { name: /高速優先で進むのが良さそうです/ })
    ).resolves.toBeTruthy();

    await userEvent.click(canvas.getByRole("button", { name: "比較" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("道路状況を確認しています。");
    await expect(
      canvas.queryByRole("heading", { name: /高速優先で進むのが良さそうです/ })
    ).toBeNull();

    await expect(canvas.findByRole("alert")).resolves.toHaveTextContent(
      "道路状況の再確認に失敗しました。"
    );
    await expect(
      canvas.queryByRole("heading", { name: /高速優先で進むのが良さそうです/ })
    ).toBeNull();
  }
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: {
        routeAnalysis: http.post("/api/route-analysis", async () => {
          await delay("infinite");
          return Response.json(successfulAnalysis);
        })
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    const resultRegion = canvas.getByRole("region", { name: "道路状況の確認結果" });
    const status = await canvas.findByRole("status");

    await expect(resultRegion).toHaveAttribute("aria-busy", "true");
    await expect(status).toHaveTextContent("道路状況を確認しています");
    await expect(canvas.getAllByRole("status")).toHaveLength(1);
    await expect(
      canvas.queryByRole("heading", { name: "比較結果はここに表示されます" })
    ).toBeNull();
  }
};

export const RequestError: Story = {
  parameters: {
    msw: {
      handlers: {
        routeAnalysis: http.post("/api/route-analysis", () =>
          Response.json({ error: "道路状況の確認に失敗しました。" }, { status: 503 })
        )
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    const alert = await canvas.findByRole("alert");
    const resultRegion = canvas.getByRole("region", { name: "道路状況の確認結果" });

    await expect(alert).toHaveTextContent("道路状況の確認に失敗しました。");
    await expect(resultRegion).toHaveAttribute("aria-busy", "false");
    await expect(
      canvas.queryByRole("heading", { name: "比較結果はここに表示されます" })
    ).toBeNull();
  }
};

export const AnalysisFailure: Story = {
  parameters: {
    msw: {
      handlers: {
        routeAnalysis: http.post("/api/route-analysis", () => Response.json(failedAnalysis))
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    await expect(
      canvas.findByRole("heading", { name: "地図で経路を確認しながら入力を整えてください" })
    ).resolves.toBeTruthy();
  }
};

export const DarkAnalysisFailureDetails: Story = {
  globals: {
    theme: "dark"
  },
  args: {
    isDarkMode: true
  },
  parameters: AnalysisFailure.parameters,
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    await expect(
      canvas.findByRole("heading", { name: "地図で経路を確認しながら入力を整えてください" })
    ).resolves.toBeTruthy();
    await userEvent.click(canvas.getByText("確認メモを表示"));
    await expect(canvas.getByText(/Google Routes API did not include a route/)).toBeVisible();
  }
};
