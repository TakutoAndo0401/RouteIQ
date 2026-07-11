import type { Meta, StoryObj } from "@storybook/react-vite";
import { http } from "msw/core/http";
import { expect, fn, userEvent, within } from "storybook/test";
import { LocationPickerMap } from "./LocationPickerMap";

const mapEnabledHandler = http.get("/api/client-config", () =>
  Response.json({ googleMapsBrowserApiKey: "storybook-map-key" })
);

const meta = {
  title: "Features/RouteForm/LocationPickerMap",
  component: LocationPickerMap,
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
          "地図上の地点を住所へ変換し、出発地または目的地として確定する UI です。Ready stories は課金のない Storybook 専用地図 mock を使います。"
      }
    }
  },
  args: {
    disabled: false,
    origin: "東京都世田谷区用賀1丁目",
    destination: "静岡県御殿場市新橋",
    target: "origin",
    onOriginChange: fn(),
    onDestinationChange: fn(),
    onSelectComplete: fn(),
    onManualEntryRequest: fn()
  }
} satisfies Meta<typeof LocationPickerMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unavailable: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.findByText("地図選択を利用できません。住所または施設名を入力してください。")
    ).resolves.toBeTruthy();
    await userEvent.click(canvas.getByRole("button", { name: "住所を入力する" }));
    await expect(args.onManualEntryRequest).toHaveBeenCalledTimes(1);
  }
};

export const Loading: Story = {
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

export const ReadyForOrigin: Story = {
  parameters: {
    msw: {
      handlers: {
        clientConfig: mapEnabledHandler
      }
    }
  }
};

export const ReadyForDestination: Story = {
  args: {
    target: "destination"
  },
  parameters: {
    msw: {
      handlers: {
        clientConfig: mapEnabledHandler
      }
    }
  }
};

export const CandidateSelected: Story = {
  parameters: {
    msw: {
      handlers: {
        clientConfig: mapEnabledHandler
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const selectPointButton = await canvas.findByRole("button", {
      name: "東京駅付近を選択"
    });
    await userEvent.click(selectPointButton);
    await expect(canvas.findByText(/東京都千代田区丸の内1丁目/)).resolves.toBeTruthy();
  }
};
