import type { DocDeskService } from "./docDeskService.types";
import { mockDocDeskService } from "./mockDocDeskService";
import { campusOsDocDeskService } from "./api/campusOsDocDeskService";

/**
 * Production-first mode checker.
 * Set VITE_ENABLE_MOCK_DATA=true ONLY when running offline unit tests or mock fixtures.
 * By default in production release, VITE_ENABLE_MOCK_DATA=false and talks directly
 * to real CampusOS API endpoints.
 */
export const isMockMode = (): boolean => {
  return import.meta.env.VITE_ENABLE_MOCK_DATA === "true";
};

/**
 * Proxy-based service provider (ARCHITECTURE.md §7.3).
 * Delegates requests to `campusOsDocDeskService` in production (or when VITE_ENABLE_MOCK_DATA=false),
 * or `mockDocDeskService` when VITE_ENABLE_MOCK_DATA=true.
 */
export const docDeskService: DocDeskService = new Proxy({} as DocDeskService, {
  get(_target, prop: keyof DocDeskService) {
    const activeService = isMockMode() ? mockDocDeskService : campusOsDocDeskService;
    const member = activeService[prop];
    if (typeof member === "function") {
      return member.bind(activeService);
    }
    return member;
  },
});

export { mockDocDeskService, campusOsDocDeskService };
