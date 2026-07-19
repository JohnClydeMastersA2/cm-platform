export function MetricCard({
  label,
  value,
  variant = "bordered"
}: {
  label: string;
  value: number | string;
  variant?: "bordered" | "card";
}) {
  if (variant === "card") {
    return (
      <div className="col-sm-6 col-xl-3">
        <div className="card h-100 shadow-sm">
          <div className="card-body">
            <div className="text-muted small">{label}</div>
            <div className="fs-3 fw-semibold">{value}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-sm-6 col-lg">
      <div className="border rounded p-3 h-100">
        <div className="text-muted small">{label}</div>
        <div className="fs-3 fw-semibold">{value}</div>
      </div>
    </div>
  );
}
