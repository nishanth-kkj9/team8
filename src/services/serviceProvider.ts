import { campusOsDocDeskService } from "./api/campusOsDocDeskService";

/**
 * Direct production service export.
 * DocDesk connects directly to official CampusOS backend APIs.
 * Runtime mock services and mock branching are completely removed.
 */
export const docDeskService = campusOsDocDeskService;
export { campusOsDocDeskService };
