import { useEffect, useState } from "react";
import {
  getAllAdminDecisions,
  subscribeAdminDecisions,
  type AdminDecisionMap,
} from "../services/adminDecisions";

/** Live view of the frontend-only Admin approval decisions. */
export function useAdminDecisions(): AdminDecisionMap {
  const [decisions, setDecisions] = useState<AdminDecisionMap>(() =>
    getAllAdminDecisions(),
  );

  useEffect(() => {
    const update = () => setDecisions(getAllAdminDecisions());
    update();
    return subscribeAdminDecisions(update);
  }, []);

  return decisions;
}
