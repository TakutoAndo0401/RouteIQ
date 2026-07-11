import type { Meta, StoryObj } from "@storybook/react-vite";
import { http } from "msw/core/http";
import { defaultRouteInput } from "../../../stories/fixtures";
import { GoogleRouteMap } from "./GoogleRouteMap";

const meta = {
  title: "Widgets/GoogleRouteMap",
  component: GoogleRouteMap,
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
          "出発地と目的地を確認し、アプリ内地図または Google マップへのリンクを表示します。カタログでは実 API key を使わず、安全な fallback 状態を既定にしています。"
      }
    }
  },
  args: {
    input: defaultRouteInput
  }
} satisfies Meta<typeof GoogleRouteMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MapUnavailable: Story = {};

export const ConfigLoading: Story = {
  parameters: {
    msw: {
      handlers: {
        clientConfig: http.get(
          "/api/client-config",
          () => new Promise<Response>(() => undefined)
        )
      }
    }
  }
};

export const LongWaypointLabels: Story = {
  args: {
    input: {
      ...defaultRouteInput,
      origin: "日本、〒100-0005 東京都千代田区丸の内1丁目 東京駅丸の内中央口",
      destination: "日本、〒412-0023 静岡県御殿場市深沢1312 御殿場プレミアム・アウトレット"
    }
  }
};
