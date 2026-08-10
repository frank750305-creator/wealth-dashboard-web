# BigQuery Market Data Scale Plan

本文件定義市場資料平台大量新增資料時的安全更新方式。現階段網頁仍以 `daily_prices` 為主要來源，不會自動修改 BigQuery 真實資料表。

## 目前讀取方式

- 價格資料來源：`BIGQUERY_PROJECT_ID.BIGQUERY_DATASET.BIGQUERY_PRICE_TABLE`
- 預設資料表：`fund-war-room.fund_database.daily_prices`
- 網頁進入「市場資料平台 > 今日行情」時，自動讀取第一頁行情。
- 後端 API 支援 `category`、`q`、`limit`、`offset`，大量新增標的後不需要一次載入全部資料。

## 建議新增主檔表

未來資料量變大後，建議新增 `assets_master`，讓分類、顯示名稱、交易所與幣別由主檔管理，不再只靠 symbol 推斷。

建議欄位：

```sql
CREATE TABLE `fund-war-room.fund_database.assets_master` (
  symbol STRING NOT NULL,
  display_name STRING,
  category STRING NOT NULL,
  exchange STRING,
  currency STRING,
  country STRING,
  source STRING,
  is_active BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

建議 `category` 固定值：

- `tw_etf`: 台股 ETF
- `us_etf`: 美股 ETF
- `stock`: 股票
- `fund`: 基金
- `fx`: 匯率
- `index`: 指數
- `other`: 其他

## 大量新增資料流程

1. 先把新標的寫入 `daily_prices`，至少包含 `symbol`、`date`、`raw_price` 或 `adj_price`。
2. 同步更新 `assets_master`，填好分類與顯示名稱。
3. 回到網頁「今日行情」，按「重新讀取」或直接切換分類。
4. 若新增很多標的，用分頁檢查是否都能看到。
5. 若某些標的沒有價格，先查 `daily_prices` 是否有正數價格與最新日期。

## 下一步

等你確認要建立 `assets_master` 後，再執行真實 BigQuery DDL。那一步屬於高影響操作，執行前需要再次確認。
