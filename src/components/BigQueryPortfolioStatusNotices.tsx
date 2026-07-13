type BigQueryPortfolioStatusNoticesProps = {
  hasBigQueryCredentials: boolean;
  error: string | null;
};

export function BigQueryPortfolioStatusNotices({
  hasBigQueryCredentials,
  error,
}: BigQueryPortfolioStatusNoticesProps) {
  return (
    <>
      {!hasBigQueryCredentials && (
        <div className="border border-amber-900/60 bg-amber-950/20 rounded-lg p-3 text-xs text-amber-200">
          Vercel 尚未設定 GCP_SERVICE_ACCOUNT_JSON。
        </div>
      )}

      {error && (
        <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
          {error}
        </div>
      )}
    </>
  );
}
