# RouteIQ

RouteIQ は、車移動の判断材料を整理する Web アプリです。

出発地、目的地、燃費、燃料単価、車両条件を入力すると、RouteIQ が経路、所要時間、料金、燃料費を取得し、現在の条件で高速道路と一般道のどちらを選ぶべきかを説明します。

RouteIQ はナビアプリではありません。Google Maps のように移動中の案内をするのではなく、移動前に「なぜそのルートを選ぶのか」を判断するための材料をまとめます。

無料で使える構成を優先し、RouteIQ の server が Google Routes API などの実データを取得して、固定ロジックで回答文を生成します。LLM は使わず、取得できない情報は推測しません。

## 何を解決するか

車で移動するとき、Google Maps だけでも経路や所要時間は確認できます。ただし、業務で車移動を判断する場合は、次のような情報も必要になります。

- 高速道路を使うことで何分短縮できるか
- その時間短縮に対して高速料金と燃料費を払う価値があるか
- 一般道を選んだ場合の費用差はどれくらいか
- 混雑傾向として取得できている情報があるか
- 取得できていない情報や、断定できない情報は何か

RouteIQ は、これらを1つの画面にまとめます。経路を選ぶための「地図」ではなく、ルート判断を説明するための「確認結果」を作ることが目的です。

## Google Maps との違い

Google Maps は、個人が目的地まで移動するためのナビゲーションに強いサービスです。現在地、目的地、経路、交通状況、徒歩や公共交通を含む移動手段などを幅広く扱えます。

RouteIQ は、Google Maps の代替ではなく、Google Routes API などを使って車移動の判断に必要な情報を業務向けに整理するアプリです。

| 観点 | Google Maps | RouteIQ |
| --- | --- | --- |
| 主な目的 | 移動中のナビゲーション | 移動前のルート判断 |
| 経路表示 | 地図上で経路を案内 | Google マップで経路を確認 |
| 費用判断 | 主に料金や時間を個別に確認 | 高速料金、燃料費、総額を比較 |
| 判断理由 | ユーザーが自分で読み取る | RouteIQ が固定ロジックで説明 |
| 根拠データ | Google 側の表示が中心 | Google Routes API の経路、所要時間、料金、渋滞傾向を表示 |
| 不明情報の扱い | 画面から読み取る必要がある | 取得不可や未確定を明示 |

たとえば、Google Maps は「早い経路」を見つけるのに向いています。RouteIQ は「高速代を払ってまで早い経路を選ぶべきか」を説明するのに向いています。

## 説明用の短い紹介文

RouteIQ は、車移動のルート判断を支援する Web アプリです。Google Maps で取得できる経路情報に加えて、燃費、燃料単価、高速料金を組み合わせ、高速道路と一般道のどちらを選ぶべきかを説明します。移動中のナビではなく、移動前に判断理由と根拠を確認するために使います。

## 想定する利用シーン

RouteIQ は、移動そのものよりも、移動判断の説明や共有が必要な場面に向いています。

- 営業車や社用車で、高速道路を使うべきか確認したい
- 配送や現場移動で、時間優先か費用優先かを判断したい
- ルート選択の根拠を、担当者以外にも説明できる形にしたい
- Google Routes API の渋滞傾向を見ながら、混雑の兆候を確認したい
- 取得できない情報を推測せず、不明として扱いたい

## できること

RouteIQ はブラウザで開いて使います。

1. フォームで出発地、目的地、燃費、車両などを入力します。
2. 出発地は手入力、地図選択、現在地取得から指定できます。
3. RouteIQ が道路状況や経路比較に必要な API データを取得します。
4. 高速優先ルートと一般道ルートの所要時間、距離、料金、燃料費、総額を比較します。
5. Google マップで経路を表示します。

## できないこと

RouteIQ は、取得できるデータの範囲を超えて判断しません。

- 移動中のターンバイターンナビゲーションはしない
- 事故、通行止め、規制理由を断定しない
- Google Routes API で取得できない道路状況を推測しない
- Google Routes API が料金を返さない場合に、料金を0円として扱わない
- 翌日以降の道路状況を、現在の情報から正確に予測しない

## 回答方針

RouteIQ の回答は、ChatGPT や LLM が返答するものではありません。RouteIQ server の固定ロジックが返答します。

- Google Routes API など、取得した実データを根拠にする
- 経路、所要時間、料金、渋滞傾向などの根拠を表示する
- 事故、通行止め、規制理由は現在の判定対象にしない
- API が未設定または失敗した場合は、mock に切り替えず「取得不可」と返す

## 経路比較ロジック

RouteIQ は、まず Google Routes API から高速優先ルートと一般道ルートの2候補を取得します。高速優先ルートは通常の車ルート、一般道ルートは `avoidTolls` と `avoidHighways` を指定した車ルートです。Google Routes API の回避指定は完全除外ではないため、RouteIQ では「有料道路と高速道路を避ける条件で取得した候補」を一般道ルートとして扱います。

各ルートの総額は、取得できた有料道路料金と燃料費で計算します。

- 燃料費 = 距離 ÷ 燃費 × ガソリン単価
- 総額 = 有料道路料金 + 燃料費
- 時間差 = 一般道ルートの所要時間 - 高速優先ルートの所要時間
- 追加費用 = 高速優先ルートの総額 - 一般道ルートの総額
- 1分短縮あたり = 追加費用 ÷ 時間差

有料道路料金が取得できない場合は、料金を0円とは扱わず、総額と追加費用を未確認として扱います。

おすすめルートは `prioritize` の値で決まります。現在の画面フォームは `balanced` を使います。

- `time`: 所要時間が短いルートを選びます。
- `cost`: 総額が安いルートを選びます。料金が未確認の場合は、確認できる所要時間を優先します。
- `balanced`: 高速優先ルートが時間短縮になり、1分短縮あたりの追加費用が80円以下なら高速優先ルートを選びます。それ以外で一般道ルートの方が安い場合は一般道ルートを選びます。料金が未確認で費用判断できない場合は、確認できる所要時間を優先します。

## ローカルセットアップ

```sh
pnpm install
cp .env.example .env
pnpm build
pnpm dev
```

開発中はブラウザで `http://127.0.0.1:5173/` を開きます。Vite dev server が画面を配信し、`/api` は `127.0.0.1:8787` の RouteIQ server に転送します。React 側の変更は HMR で反映され、server 側の変更は `tsx watch` で再起動されます。

ビルド済みの画面を確認する場合は `pnpm build` 後に `pnpm start` を実行し、`http://localhost:8787/` を開きます。`/preview` でも同じ画面を表示できますが、通常は `/` を使います。

## 構成

RouteIQ は pnpm workspace で構成しています。

| ディレクトリ | 役割 |
| --- | --- |
| `packages/contracts` | Web と server が共有する API schema / TypeScript 型。Zod schema を単一の契約として使います。pnpm workspace です。 |
| `web` | React / Vite の画面。single-file build で server または Cloudflare Pages から配信します。pnpm workspace です。 |
| `server` | 経路比較、回答文生成、API handler を担当します。Node server と Cloudflare Pages Functions の両方から同じ処理を使います。pnpm workspace です。 |
| `functions` | Cloudflare Pages Functions 用の API entry。`/api/*` を `server` の共通 handler に渡します。pnpm workspace ではなく、デプロイ時に `server/dist` を直接参照します。 |

## 実運用するには

実運用では、Cloudflare Pages と Cloudflare Access を使う構成を推奨します。Cloudflare Pages は `web/dist` を配信し、`functions/api/[[path]].js` が `/api/*` を処理します。Cloudflare Access で自分のメールアドレスだけを許可すると、アプリ側にパスワード画面を作らずに閲覧制限できます。

### Cloudflare Pages にデプロイする場合

Cloudflare Pages の GitHub 連携でこの repository を選び、以下を設定します。

| 項目 | 値 |
| --- | --- |
| Framework preset | `None` |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build:cloudflare` |
| Build output directory | `web/dist` |
| Root directory | repository root |
| Functions directory | `functions` |

Cloudflare Pages の environment variables / secrets には以下を設定します。

| Variable | 値 |
| --- | --- |
| `ROUTE_PROVIDER` | `google` |
| `GOOGLE_MAPS_API_KEY` | server 用 Google Maps API key |
| `GOOGLE_MAPS_BROWSER_API_KEY` | browser 用 Google Maps API key |
| `ROUTEIQ_ALLOWED_ORIGINS` | Cloudflare Pages の公開 origin。例: `https://routeiq.pages.dev` |
| `DEFAULT_FUEL_PRICE_YEN_PER_LITER` | 任意。燃料価格の取得に失敗した場合の fallback 単価 |

Cloudflare Access は、Pages の production domain に対して Application を作成し、自分のメールアドレスだけを許可します。Access を有効にすると、画面と `/api/*` の両方が Cloudflare のログインで保護されます。

### Node server として運用する場合

VPS や Node 対応 hosting を使う場合は、RouteIQ server を固定の HTTPS ドメインで公開します。

1. Google Cloud で Routes API を有効にし、`GOOGLE_MAPS_API_KEY` を設定します。
2. 画面内に Google マップの経路を埋め込み、フォームで地図選択を使う場合は、Maps Embed API、Maps JavaScript API、Geocoding API を有効にし、`GOOGLE_MAPS_BROWSER_API_KEY` を設定します。地図選択の Google Maps JavaScript API は、ユーザーが「地図」を押した場合だけ読み込まれます。
3. 公開ドメインを `ROUTEIQ_ALLOWED_ORIGINS` に設定します。複数ある場合は comma 区切りにします。
4. 経路比較も行う場合は、`ROUTE_PROVIDER=google` を設定します。`GOOGLE_MAPS_API_KEY` が未設定の場合、server は mock に切り替えずエラーにします。
5. アプリをビルドします。

```sh
pnpm install --frozen-lockfile
pnpm build
```

6. サーバーを起動します。

```sh
pnpm start
```

7. reverse proxy などで HTTPS 公開します。

現在のサーバーは `127.0.0.1` で listen します。VPS などで運用する場合は、同一ホスト上の nginx / Caddy などから `127.0.0.1:8787` に転送する構成が適しています。

公開運用では、RouteIQ server 側の制限だけでなく、Cloudflare Access または reverse proxy 側でも rate limit、HTTPS、アクセスログを設定してください。`/api/route-analysis` は Google Routes API の利用量に直結するため、Google Cloud 側の quota / budget alert も必ず設定します。

Google Maps API key は、server 用と browser 用で分けて制限します。

| Key | 用途 | Google Cloud の Application restriction | Google Cloud の API restriction |
| --- | --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | RouteIQ server / Cloudflare Pages Functions から Google Routes API を呼び出す | 固定 outbound IP がある hosting では `IP addresses`。Cloudflare Pages Functions では固定 IP 制限が難しいため、API restriction と quota / budget alert を必ず併用します。 | `Routes API` のみに限定します。 |
| `GOOGLE_MAPS_BROWSER_API_KEY` | browser で地図埋め込み、地図選択、住所検索を使う | `Websites`。例: `https://routeiq.example.com/*`。staging がある場合は staging の URL も追加します。 | `Maps Embed API`、`Maps JavaScript API`、`Geocoding API` のみに限定します。 |

`GOOGLE_MAPS_API_KEY` は server から使う Web Service API 用の key なので、browser 用 key とは分けます。固定 outbound IP を持たない hosting 環境では IP 制限が難しいため、Google Cloud 側の quota / budget alert と、RouteIQ server / Cloudflare Access / reverse proxy 側の rate limit を必ず併用します。

## 設定

`.env.example` を `.env` にコピーして、必要に応じて値を変更します。

| Variable | Description |
| --- | --- |
| `PORT` | server の port。デフォルトは `8787` です。 |
| `ROUTEIQ_ALLOWED_ORIGINS` | browser からの API 呼び出しを許可する origin。例: `https://routeiq.example.com`。複数指定する場合は comma 区切りです。localhost / 127.0.0.1 の開発用 origin は常に許可されます。 |
| `ROUTEIQ_RATE_LIMIT_MAX_REQUESTS` | `/api/route-analysis` の client 単位 rate limit 回数。デフォルトは `60` です。 |
| `ROUTEIQ_RATE_LIMIT_WINDOW_MS` | `/api/route-analysis` の rate limit window。デフォルトは `60000` ms です。 |
| `ROUTEIQ_MAX_JSON_BODY_BYTES` | JSON request body の最大 byte 数。デフォルトは `16384` です。 |
| `ROUTE_PROVIDER` | 経路比較 provider。`google` を使う場合のみ実経路比較します。`mock` は本番回答では使いません。 |
| `GOOGLE_MAPS_API_KEY` | server 用 Google Maps API key。Google Routes API の実経路比較に使います。Google Cloud の Application restriction は `IP addresses`、API restriction は `Routes API` のみにします。 |
| `GOOGLE_MAPS_BROWSER_API_KEY` | browser 用 Google Maps API key。画面内の Google マップ経路 iframe と、フォームの地図選択に使います。Google Cloud の Application restriction は `Websites`、API restriction は `Maps Embed API`、`Maps JavaScript API`、`Geocoding API` のみにします。 |
| `GOOGLE_MAPS_EMBED_API_KEY` | 旧 browser 用 key 名。`GOOGLE_MAPS_BROWSER_API_KEY` が未設定の場合だけ互換用に使われます。新規設定では使わないでください。 |
| `DEFAULT_FUEL_PRICE_YEN_PER_LITER` | 燃料価格の取得に失敗した場合に使う 1L あたりの fallback 価格。ユーザーが燃料価格を指定しない場合は、まず最新のレギュラー全国平均価格を取得して使います。 |
| `GOOGLE_MAPS_REGION_CODE` | Google Routes API に渡す region hint。デフォルトは `JP` です。 |
| `GOOGLE_MAPS_LANGUAGE_CODE` | Google Routes API に渡す language hint。デフォルトは `ja-JP` です。 |

## API

### `POST /api/route-analysis`

フォーム入力を受け取り、経路比較と回答文を返します。

主な入力:

```json
{
  "origin": "用賀IC",
  "destination": "御殿場IC",
  "fuelEfficiencyKmPerLiter": 15,
  "fuelPriceYenPerLiter": 175,
  "question": "現在の道路状況を確認して"
}
```

### `GET /api/fuel-prices`

燃料価格の平均値を返します。

### `GET /api/client-config`

browser 側で必要な設定（`googleMapsBrowserApiKey` など）を返します。

## Scripts

```sh
pnpm dev
pnpm build
pnpm build:cloudflare
pnpm start
pnpm typecheck
pnpm lint
pnpm test
```

## 外部 API の扱い

RouteIQ は、道路状況、事故、通行止め、料金、燃料価格の API 結果を捏造しません。

Google Routes API は、経路、所要時間、距離、高速料金、渋滞傾向の取得に使います。事故、通行止め、車線規制、工事、入口出口閉鎖などは現在の取得対象外です。

出発時刻は現在から5分後から当日中までに制限しています。翌日以降の道路状況は現在の情報と一致しないため、RouteIQ では正確な道路状況として扱いません。

`mock` provider は本番向け回答には使いません。テストや実装確認に限定します。
