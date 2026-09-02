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

export const RefreshFailureKeepsPreviousResult: Story = {
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
      canvas.getByRole("heading", { name: /高速優先で進むのが良さそうです/ })
    ).toBeVisible();

    await expect(canvas.findByRole("alert")).resolves.toHaveTextContent(
      "サーバー側で処理を完了できませんでした。"
    );
    await expect(
      canvas.getByRole("heading", { name: /高速優先で進むのが良さそうです/ })
    ).toBeVisible();
  }
};

export const StaleAfterEditingConditions: Story = {
  parameters: {
    msw: {
      handlers: {
        routeAnalysis: http.post("/api/route-analysis", () => Response.json(successfulAnalysis))
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    await expect(
      canvas.findByRole("heading", { name: /高速優先で進むのが良さそうです/ })
    ).resolves.toBeTruthy();

    await userEvent.type(canvas.getByLabelText("目的地"), "駅");

    await expect(
      canvas.getByRole("heading", { name: /高速優先で進むのが良さそうです/ })
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "条件を変更しました。下の結果は変更前のものです。再比較すると更新します。"
      )
    ).toBeVisible();
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
          Response.json({ error: "Route analysis failed." }, { status: 503 })
        )
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    const alert = await canvas.findByRole("alert");
    const resultRegion = canvas.getByRole("region", { name: "道路状況の確認結果" });

    await expect(alert).toHaveTextContent("サーバー側で処理を完了できませんでした。");
    await expect(alert).toHaveTextContent("時間をおいて再試行してください。");
    await expect(within(alert).getByRole("button", { name: "再試行" })).toBeVisible();
    await expect(resultRegion).toHaveAttribute("aria-busy", "false");
    await expect(
      canvas.queryByRole("heading", { name: "比較結果はここに表示されます" })
    ).toBeNull();
  }
};

export const RateLimitError: Story = {
  parameters: {
    msw: {
      handlers: {
        routeAnalysis: http.post("/api/route-analysis", () =>
          Response.json(
            { error: "Too many route analysis requests. Please retry later." },
            { status: 429 }
          )
        )
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    const alert = await canvas.findByRole("alert");

    await expect(alert).toHaveTextContent("リクエストが集中しています。");
    await expect(alert).not.toHaveTextContent("Too many route analysis requests");

    await userEvent.click(within(alert).getByText("確認メモを表示"));
    await expect(
      within(alert).getByText(/Too many route analysis requests/)
    ).toBeVisible();
  }
};

export const UnparsableErrorResponse: Story = {
  parameters: {
    msw: {
      handlers: {
        routeAnalysis: http.post(
          "/api/route-analysis",
          () =>
            new Response("<!DOCTYPE html><html><body>502 Bad Gateway</body></html>", {
              status: 502,
              headers: { "Content-Type": "text/html" }
            })
        )
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitDefaultRoute(canvasElement);
    const alert = await canvas.findByRole("alert");

    await expect(alert).toHaveTextContent("サーバー側で処理を完了できませんでした。");
    await expect(alert).not.toHaveTextContent("Unexpected token");
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
