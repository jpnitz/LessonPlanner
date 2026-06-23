type EnvBannerProps = {
  configured: boolean;
};

export function EnvBanner({ configured }: EnvBannerProps) {
  if (configured) return null;

  return (
    <div className="border-b border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      <strong>Setup needed:</strong> Copy <code>.env.example</code> to{" "}
      <code>.env.local</code> and add your Supabase URL and publishable key,
      then restart <code>npm run dev</code>. Sign-up and log-in will not work
      until this is done.
    </div>
  );
}
