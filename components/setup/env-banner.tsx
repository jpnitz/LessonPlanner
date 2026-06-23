type EnvBannerProps = {
  configured: boolean;
};

export function EnvBanner({ configured }: EnvBannerProps) {
  if (configured) return null;

  return (
    <div className="border-b border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      <strong>Setup needed:</strong> Copy <code>.env.example</code> to{" "}
      <code>.env.local</code> and add your Supabase URL and publishable key.
      If the file looks greyed out in Cursor, edit it in the terminal with{" "}
      <code>nano .env.local</code>, then run <code>npm run dev:clean</code>.
    </div>
  );
}
