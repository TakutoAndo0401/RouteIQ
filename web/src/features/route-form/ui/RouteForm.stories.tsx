import type { Meta, StoryObj } from "@storybook/react-vite";
import { http } from "msw/core/http";
import { expect, fn, userEvent, within } from "storybook/test";
import { defaultRouteInput } from "../../../stories/fixtures";
import { RouteForm } from "./RouteForm";

const meta = {
  title: "Features/RouteForm",
  component: RouteForm,
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
          "出発地・目的地・燃費・燃料単価・車両条件を収集し、入力検証後に経路比較を依頼するフォームです。"
      }
    }
  },
  args: {
    disabled: false,
    onDraftChange: fn(),
    onFocusRequestConsumed: fn(),
    onMapPickerRequestConsumed: fn(),
    onSubmit: fn()
  }
} satisfies Meta<typeof RouteForm>;

export default meta;
type Story = StoryObj<typeof meta>;

async function showValidationErrors(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button", { name: "比較" }));
  await expect(canvas.findByText("出発地を入力してください。")).resolves.toBeTruthy();
  await expect(canvas.findByText("目的地を入力してください。")).resolves.toBeTruthy();
  await userEvent.type(canvas.getByLabelText("出発地"), defaultRouteInput.origin);
  await userEvent.type(canvas.getByLabelText("目的地"), defaultRouteInput.destination);
  await userEvent.click(canvas.getByText("詳細条件"));
  const fuelEfficiencyInput = canvas.getByLabelText("燃費 km/L");
  const fuelPriceInput = canvas.getByLabelText("ガソリン円/L");
  await userEvent.clear(fuelEfficiencyInput);
  await userEvent.type(fuelEfficiencyInput, "0");
  await userEvent.clear(fuelPriceInput);
  await userEvent.type(fuelPriceInput, "-1");
  await userEvent.click(canvas.getByRole("button", { name: "比較" }));
  await expect(fuelEfficiencyInput).toHaveAttribute("aria-invalid", "true");
  await expect(fuelPriceInput).toHaveAttribute("aria-invalid", "true");

  return { canvas, fuelEfficiencyInput, fuelPriceInput };
}

export const Empty: Story = {};

export const Prefilled: Story = {
  args: {
    initialValues: defaultRouteInput
  }
};

export const Disabled: Story = {
  args: {
    disabled: true,
    initialValues: defaultRouteInput
  }
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const { canvas, fuelEfficiencyInput, fuelPriceInput } =
      await showValidationErrors(canvasElement);

    await userEvent.clear(fuelEfficiencyInput);
    await expect(fuelEfficiencyInput).toHaveAttribute("aria-invalid", "false");
    await expect(
      canvas.queryByText("燃費は0より大きい数値を入力してください。")
    ).toBeNull();
    await userEvent.type(fuelEfficiencyInput, "15");
    await userEvent.clear(fuelPriceInput);
    await expect(fuelPriceInput).toHaveAttribute("aria-invalid", "false");
    await expect(
      canvas.queryByText("ガソリン価格は0以上の数値を入力してください。")
    ).toBeNull();
    await userEvent.type(fuelPriceInput, "175");
    await expect(fuelEfficiencyInput).toHaveAttribute("aria-invalid", "false");
    await expect(fuelPriceInput).toHaveAttribute("aria-invalid", "false");
  }
};

export const DarkValidationErrors: Story = {
  globals: {
    theme: "dark"
  },
  play: async ({ canvasElement }) => {
    await showValidationErrors(canvasElement);
  }
};

export const DetailsWithFuelPrices: Story = {
  args: {
    initialValues: defaultRouteInput
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("詳細条件"));
    await expect(canvas.findByText("175.2円/L")).resolves.toBeTruthy();
  }
};

export const FuelPricesUnavailable: Story = {
  parameters: {
    msw: {
      handlers: {
        fuelPrices: http.get("/api/fuel-prices", () =>
          Response.json({ error: "Service unavailable" }, { status: 503 })
        )
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("詳細条件"));
    await expect(
      canvas.findByText(
        "全国平均価格を取得できませんでした。上の「ガソリン円/L」へ価格を手入力してください。"
      )
    ).resolves.toBeTruthy();
    await expect(canvas.findAllByText("未取得")).resolves.toHaveLength(4);
    await expect(canvas.queryByText("取得中")).toBeNull();
  }
};

export const MapPickerUnavailable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("button", { name: "出発地を地図から選択" }));
    await expect(page.findByRole("dialog", { name: "出発地を地図で選択" })).resolves.toBeTruthy();
    await expect(
      page.findByText("地図選択を利用できません。住所または施設名を入力してください。")
    ).resolves.toBeTruthy();
    await userEvent.click(await page.findByRole("button", { name: "住所を入力する" }));
    await expect(page.queryByRole("dialog", { name: "出発地を地図で選択" })).toBeNull();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await expect(canvas.getByLabelText("出発地")).toHaveFocus();
  }
};
