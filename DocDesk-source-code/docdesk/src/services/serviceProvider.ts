import type { DocDeskService } from "./docDeskService.types";
import { mockDocDeskService } from "./mockDocDeskService";

/**
 * Single swap point for the future real API client (ARCHITECTURE.md §7.3).
 * During API integration, implement `campusOsDocDeskService.ts` with the same
 * `DocDeskService` contract and change only this line. UI components always
 * call service methods — never seed arrays or localStorage directly.
 */
export const docDeskService: DocDeskService = mockDocDeskService;

export { mockDocDeskService };
