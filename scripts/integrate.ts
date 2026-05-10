import { integrateNodes } from "../lib/integration";

integrateNodes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("整合失败:", err);
    process.exit(1);
  });
