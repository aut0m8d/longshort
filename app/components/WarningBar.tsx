import { AlertTriangle } from "lucide-react";

export function WarningBar() {
  return (
    <div className="bg-red-500 text-white p-2 text-center flex items-center justify-center">
      <AlertTriangle className="w-5 h-5 mr-2" />
      <span className="text-sm font-medium">
        Alpha version: Not audited. Use at your own risk.
      </span>
    </div>
  );
}
