// In-memory mock of the campus-os-backend for local development.
// Enables the full DocDesk flow (login, admin student creation, docdesk lifecycle)
// without the organiser-provided backend. Enable via VITE_MOCK_BACKEND=1 in .env.

const TEAM_DOMAIN = "team8.com";
const TEAM_ID = "team8";

function now() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

const initialUsers = [
  {
    role: "admin",
    name: "Team 8 Admin",
    email_id: "admin@team8.com",
    team_id: TEAM_ID,
    designation: "CampusOS Admin",
  },
  {
    role: "student",
    name: "Riya Sharma",
    email_id: "riya@team8.com",
    team_id: TEAM_ID,
    usn: "1NT22CS001",
    dept: "CSE",
    phone_number: "9876543210",
  },
  {
    role: "student",
    name: "Arjun Rao",
    email_id: "arjun@team8.com",
    team_id: TEAM_ID,
    usn: "1NT22CS002",
    dept: "CSE",
    phone_number: "9876543211",
  },
  {
    role: "office_staff",
    name: "Deepa Menon",
    email_id: "sa@team8.com",
    team_id: TEAM_ID,
    dept: "Student Affairs",
    designation: "Student Affairs Officer",
    phone_number: "9876543212",
  },
  {
    role: "faculty",
    name: "Prof. Kiran Iyer",
    email_id: "faculty@team8.com",
    team_id: TEAM_ID,
    designation: "Professor",
    phone_number: "9876543213",
  },
  {
    role: "office_staff",
    name: "Kumar Gowda",
    email_id: "cm@team8.com",
    team_id: TEAM_ID,
    dept: "Campus Maintenance",
    designation: "Supervisor",
    phone_number: "9876543215",
  },
];

function seedState() {
  return {
    users: Object.fromEntries(initialUsers.map((u) => [u.email_id, { ...u }])),
    tokens: new Map(),
    counter: 1,
    requests: [],
    docTypes: [
      { doc_type_id: "dt-transcript", name: "Official Transcript", description: "Semester-wise marks transcript", status: "active", created_by: "sa@team8.com", created_at: now(), updated_at: now() },
      { doc_type_id: "dt-bonafide", name: "Bonafide Certificate", description: "Proof of student status", status: "active", created_by: "sa@team8.com", created_at: now(), updated_at: now() },
      { doc_type_id: "dt-idcard", name: "Duplicate ID Card", description: "Replacement student ID", status: "active", created_by: "sa@team8.com", created_at: now(), updated_at: now() },
      { doc_type_id: "dt-feereceipt", name: "Fee Receipt", description: "Paid fee receipt copy", status: "active", created_by: "sa@team8.com", created_at: now(), updated_at: now() },
    ],
    finditPosts: [],
    finditClaims: [],
    lostRequests: [],
    notices: [],
    doubts: [],
    tickets: [],
    issueTypes: [],
    files: {},
  };
}

function isoDateDaysFromNow(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

function seedCampusData(state) {
  const cm = state.users["cm@team8.com"];
  const riya = state.users["riya@team8.com"];
  const sa = state.users["sa@team8.com"];
  const faculty = state.users["faculty@team8.com"];
  const t = now();

  // FindIt: sample found posts and a lost request
  state.finditPosts = [
    {
      post_id: makeId("FND"), title: "Blue water bottle", description: "Steel, blue lid",
      location_found: "Library 2nd floor", found_on: isoDateDaysFromNow(-2), status: "active",
      resolved: false, images: [], created_by: cm.email_id, created_by_name: cm.name, created_at: t, updated_at: t,
    },
    {
      post_id: makeId("FND"), title: "Car keys with red keychain", description: "Found near the canteen entrance",
      location_found: "Canteen entrance", found_on: isoDateDaysFromNow(-1), status: "active",
      resolved: false, images: [], created_by: sa.email_id, created_by_name: sa.name, created_at: t, updated_at: t,
    },
    {
      post_id: makeId("FND"), title: "Physics lab notebook", description: "Name inside the front cover",
      location_found: "Main auditorium", found_on: isoDateDaysFromNow(-6), status: "archived",
      resolved: false, images: [], created_by: cm.email_id, created_by_name: cm.name, created_at: t, updated_at: t,
    },
  ];
  state.lostRequests = [
    {
      request_id: makeId("LST"), title: "Black umbrella", description: "Folding, wooden handle",
      location_lost: "Canteen", lost_on: isoDateDaysFromNow(-3), status: "active",
      created_by: riya.email_id, created_by_name: riya.name, created_by_role: "student",
      created_by_phone_number: riya.phone_number, created_at: t, updated_at: t,
    },
  ];

  // NoticeHub: sample notices and doubts
  state.notices = [
    {
      notice_id: makeId("NTC"), title: "Mid-term timetable", body: "Mid-terms start on 10 November. Check your seat allocation on the notice board.",
      status: "active", pinned: true, attachment: null,
      created_by: faculty.email_id, created_by_name: faculty.name, created_by_role: "faculty", created_at: t, updated_at: t,
    },
    {
      notice_id: makeId("NTC"), title: "Library hours extended", body: "The city campus library will stay open until 10 PM during the exam season.",
      status: "active", pinned: false, attachment: null,
      created_by: sa.email_id, created_by_name: sa.name, created_by_role: "office_staff", created_at: t, updated_at: t,
    },
    {
      notice_id: makeId("NTC"), title: "Workshop: Resume building", body: "A resume-building workshop is scheduled for next week. Registrations open soon.",
      status: "scheduled", pinned: false, publish_at: new Date(Date.now() + 3 * 86400000).toISOString(),
      created_by: faculty.email_id, created_by_name: faculty.name, created_by_role: "faculty", created_at: t, updated_at: t,
    },
  ];
  state.doubts = [
    {
      doubt_id: makeId("DBT"), notice_id: state.notices[0].notice_id,
      question: "Is the lab exam in the same week?",
      asked_by: riya.email_id, asked_by_name: riya.name, asked_by_role: "student",
      answered: true,
      response: { message: "No, lab exams are the week after.", responded_by: faculty.email_id, responded_by_name: faculty.name, responded_by_role: "faculty", responded_at: t, updated_at: t },
      created_at: t, updated_at: t,
    },
    {
      doubt_id: makeId("DBT"), notice_id: state.notices[0].notice_id,
      question: "Do we need the hall ticket cardboard copy?",
      asked_by: riya.email_id, asked_by_name: riya.name, asked_by_role: "student",
      answered: false, response: null,
      created_at: t, updated_at: t,
    },
  ];

  // FixIt: issue types and tickets
  state.issueTypes = [
    { issue_type_id: makeId("ITY"), name: "Electrical", description: "Fans, lights, switches, sockets", created_by: cm.email_id, created_at: t, updated_at: t },
    { issue_type_id: makeId("ITY"), name: "Plumbing", description: "Taps, leaks, blocked drains, washrooms", created_by: cm.email_id, created_at: t, updated_at: t },
    { issue_type_id: makeId("ITY"), name: "Furniture", description: "Broken benches, chairs, desks, doors", created_by: cm.email_id, created_at: t, updated_at: t },
    { issue_type_id: makeId("ITY"), name: "IT & Network", description: "Wi-Fi, projectors, lab computers", created_by: cm.email_id, created_at: t, updated_at: t },
  ];
  state.tickets = [
    {
      ticket_id: makeId("TKT"), issue_type_id: state.issueTypes[0].issue_type_id, issue_type_name: state.issueTypes[0].name,
      title: "Fan not working", description: "Room 204, Block B: ceiling fan does not start.",
      status: "open", photo: null, tat: null, overdue: false, update: null,
      reported_by: riya.email_id, reported_by_name: riya.name, reported_by_role: "student",
      reported_by_dept: riya.dept, reported_by_phone_number: riya.phone_number, created_at: t, updated_at: t, acknowledged_at: null,
    },
    {
      ticket_id: makeId("TKT"), issue_type_id: state.issueTypes[1].issue_type_id, issue_type_name: state.issueTypes[1].name,
      title: "Leaking tap in washroom", description: "Ground floor washroom, Block C: the washbasin tap keeps leaking.",
      status: "resolved", photo: null,
      tat: { expected_by: isoDateDaysFromNow(-1), note: "Fixed same day.", updated_by: cm.email_id, updated_at: t },
      overdue: false,
      update: { note: "Washer replaced, verified leak stopped.", updated_by: cm.email_id, updated_by_name: cm.name, updated_at: t },
      reported_by: riya.email_id, reported_by_name: riya.name, reported_by_role: "student",
      reported_by_dept: riya.dept, reported_by_phone_number: riya.phone_number, created_at: t, updated_at: t, acknowledged_at: null,
    },
  ];
}

function publicProfile(user) {
  return {
    role: user.role,
    team_id: user.team_id,
    name: user.name,
    email_id: user.email_id,
    ...(user.usn ? { usn: user.usn } : {}),
    ...(user.dept ? { dept: user.dept } : {}),
    ...(user.designation ? { designation: user.designation } : {}),
    ...(user.phone_number ? { phone_number: user.phone_number } : {}),
    institution_name: "CampusOS Team 8",
  };
}

function isStudentAffairs(user) {
  return user.role === "office_staff" && (user.dept ?? "") === "Student Affairs";
}

function canSeeAllRequests(user) {
  return user.role === "admin" || isStudentAffairs(user);
}

function normalizeDeptName(dept) {
  return String(dept ?? "").trim().toLowerCase().replace(/[\s-]*(dept|department)$/i, "").trim();
}

function isOfficeStaff(user) {
  return user.role === "office_staff";
}

function isCampusMaintenance(user) {
  return user.role === "office_staff" && normalizeDeptName(user.dept) === "campus maintenance";
}

function isPublisher(user) {
  return ["admin", "faculty", "office_staff"].includes(user.role);
}

function requireAuth(state, req) {
  const header = req.headers.authorization || "";
  const bearer = /^Bearer\s+(.+)$/i.exec(header);
  const token = bearer ? bearer[1] : null;
  const email = token ? state.tokens.get(token) : null;
  const user = email ? state.users[email] : null;
  return user || null;
}

function sendError(res, status, code, message, details) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({
    error: { code, message, ...(details ? { details } : {}) },
    request_id: makeId("req"),
  }));
}

function sendJson(res, status, data, headers) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers || {})) res.setHeader(k, v);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function asWebRequest(req, body) {
  return new Request(`http://middleware.local${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: body.length > 0 ? body : undefined,
    ...(body.length > 0 ? { duplex: "half" } : {}),
  });
}

function parseJsonOrNull(body) {
  if (!body || body.length === 0) return {};
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    return null;
  }
}

async function storeFormFile(state, formData, field, prefixId) {
  const file = formData?.get(field);
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  const fileId = makeId(prefixId);
  const meta = {
    file_id: fileId,
    filename: file.name || "file",
    content_type: file.type || "application/octet-stream",
    size_bytes: bytes.length,
  };
  state.files[fileId] = { meta, bytes };
  return { ...meta, url: `/api/v1/files/${fileId}` };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function applyResolution(state, post, claim, note, resolvedBy) {
  const stamp = now();
  for (const other of state.finditClaims.filter((c) => c.post_id === post.post_id)) {
    other.decision = other.claim_id === claim.claim_id ? "approved" : "rejected";
    other.status = "archived";
    other.updated_at = stamp;
  }
  post.resolved = true;
  post.status = "archived";
  post.resolution = {
    claim_id: claim.claim_id,
    claimant_email: claim.claimant_email,
    ...(note ? { note } : {}),
    resolved_by: resolvedBy ?? "",
    resolved_at: stamp,
    updated_at: stamp,
  };
  post.updated_at = stamp;
}

function serializeTicket(state, ticket) {
  const overdue = !!ticket.tat
    && ticket.status === "open"
    && String(ticket.tat.expected_by) < todayIso();
  return { ...ticket, overdue, acknowledged_at: ticket.acknowledged_at ?? null };
}

export default function mockCampusOsBackend({ otp = "246810" } = {}) {
  const TEAM_OTP = String(otp).trim();
  const state = seedState();
  seedCampusData(state);

  async function issueToken(res, user) {
    const token = `mock.${Buffer.from(user.email_id).toString("base64url")}.${Date.now()}`;
    state.tokens.set(token, user.email_id);
    if (state.tokens.size > 500) {
      const first = state.tokens.keys().next();
      if (!first.done) state.tokens.delete(first.value);
    }
    return token;
  }

  return {
    name: "mock-campus-os-backend",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/v1/")) return next();
        const url = new URL(req.url, "http://mock.local");
        const path = url.pathname.slice("/api/v1".length);
        const method = req.method || "GET";
        const body = await readBody(req);
        const contentType = req.headers["content-type"] || "";
        let jsonBody = {};
        let formData = null;
        if (/application\/json/i.test(contentType)) {
          const parsed = parseJsonOrNull(body);
          if (parsed === null) return sendError(res, 400, "VALIDATION_ERROR", "Malformed JSON body.");
          jsonBody = parsed;
        } else if (/multipart\/form-data/i.test(contentType)) {
          try {
            formData = await (await asWebRequest(req, body)).formData();
          } catch {
            return sendError(res, 400, "VALIDATION_ERROR", "Malformed multipart body.");
          }
        }

        // ---- Auth ----
        if (method === "POST" && path === "/auth/login") {
          const email = String(jsonBody.email_id ?? "").trim().toLowerCase();
          const otp = String(jsonBody.otp ?? "").trim();
          const user = state.users[email];
          if (!user) return sendError(res, 401, "INVALID_CREDENTIALS", "Wrong email or OTP.");
          if (user.role === "admin") return sendError(res, 400, "USE_ADMIN_LOGIN", "This is an admin email. Use /auth/admin/login.");
          if (otp !== TEAM_OTP) return sendError(res, 401, "INVALID_CREDENTIALS", "Wrong email or OTP.");
          const token = await issueToken(res, user);
          return sendJson(res, 200, {
            access_token: token,
            token_type: "bearer",
            expires_in: 43200,
            profile: publicProfile(user),
          });
        }

        if (method === "POST" && path === "/auth/admin/login") {
          const email = String(jsonBody.email_id ?? "").trim().toLowerCase();
          const otp = String(jsonBody.otp ?? "").trim();
          const user = state.users[email];
          if (!user || user.role !== "admin") return sendError(res, 401, "INVALID_CREDENTIALS", "Wrong admin email or OTP.");
          if (otp !== TEAM_OTP) return sendError(res, 401, "INVALID_CREDENTIALS", "Wrong admin email or OTP.");
          const token = await issueToken(res, user);
          return sendJson(res, 200, {
            access_token: token,
            token_type: "bearer",
            expires_in: 43200,
            profile: publicProfile(user),
          });
        }

        // ---- Profiles ----
        if (path === "/users/me" || path === "/admin/me") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          if (path === "/admin/me" && user.role !== "admin") return sendError(res, 403, "FORBIDDEN", "Admin access required.");
          return sendJson(res, 200, publicProfile(user));
        }

        // ---- Admin user management ----
        if (path === "/admin/users") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          if (user.role !== "admin") return sendError(res, 403, "FORBIDDEN", "Only the admin can manage users.");

          if (method === "GET") {
            const role = url.searchParams.get("role");
            const limit = Number(url.searchParams.get("limit") ?? 50);
            const all = Object.values(state.users)
              .filter((u) => (role ? u.role === role : true))
              .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 50);
            return sendJson(res, 200, {
              items: all.map((u) => ({ ...publicProfile(u), otp: TEAM_OTP })),
              count: all.length,
              next_cursor: null,
            });
          }

          if (method === "POST") {
            const role = String(jsonBody.role ?? "student").toLowerCase();
            const fieldMap = {
              student: ["name", "usn", "dept", "email_id", "phone_number"],
              faculty: ["name", "designation", "email_id", "phone_number"],
              office_staff: ["name", "dept", "designation", "email_id", "phone_number"],
            };
            const required = fieldMap[role];
            if (!required) {
              return sendError(res, 422, "VALIDATION_ERROR", "Unknown role.", [{ field: "role", message: "role must be student, faculty or office_staff" }]);
            }
            const record = { role, team_id: TEAM_ID };
            for (const field of required) {
              const value = String(jsonBody[field] ?? "").trim();
              if (!value) {
                return sendError(res, 422, "VALIDATION_ERROR", `Missing required field: ${field}`, [{ field, message: "This field is required." }]);
              }
              record[field] = value;
            }
            const email = record.email_id.toLowerCase();
            if (!email.endsWith(`@${TEAM_DOMAIN}`)) {
              return sendError(res, 422, "EMAIL_DOMAIN_MISMATCH", `Email must use the @${TEAM_DOMAIN} domain.`, [{ field: "email_id", message: `Only @${TEAM_DOMAIN} addresses are accepted.` }]);
            }
            if (state.users[email]) {
              return sendError(res, 409, "CONFLICT", "A user with this email already exists.");
            }
            delete record.email_id;
            record.email_id = email;
            state.users[email] = record;
            const profile = publicProfile(record);
            return sendJson(res, 201, { ...profile, otp: TEAM_OTP });
          }
        }

        if (method === "POST" && /^\/admin\/users\/[^/]+\/regenerate-otp$/.test(path)) {
          const user = requireAuth(state, req);
          if (!user || user.role !== "admin") return sendError(res, 403, "FORBIDDEN", "Only the admin can manage users.");
          const email = decodeURIComponent(path.split("/")[3] || "").toLowerCase();
          const target = state.users[email];
          if (!target) return sendError(res, 404, "NOT_FOUND", "User does not exist.");
          return sendJson(res, 200, { ...publicProfile(target), otp: TEAM_OTP });
        }

        // ---- DocDesk: request lifecycle ----
        if (path === "/docdesk/requests" && method === "POST") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          if (user.role === "admin") return sendError(res, 403, "FORBIDDEN", "Admin is read-only in DocDesk.");
          const docTypeId = String(jsonBody.doc_type_id ?? "").trim();
          const reason = String(jsonBody.reason ?? "").trim();
          const docType = state.docTypes.find((dt) => dt.doc_type_id === docTypeId);
          if (!docType || docType.status !== "active") return sendError(res, 422, "VALIDATION_ERROR", "Unknown doc_type_id.", [{ field: "doc_type_id", message: "Pick an active document type." }]);
          if (reason.length < 4 || reason.length > 500) return sendError(res, 422, "VALIDATION_ERROR", "Reason must be 4-500 characters.", [{ field: "reason", message: "Reason must be 4-500 characters." }]);
          const stamp = now();
          const request = {
            request_id: makeId("DR"),
            doc_type_id: docTypeId,
            doc_type_name: docType.name,
            reason,
            status: "pending",
            requested_by: user.email_id,
            requested_by_name: user.name,
            requested_by_role: user.role,
            ...(user.dept ? { requested_by_dept: user.dept } : {}),
            ...(user.phone_number ? { requested_by_phone_number: user.phone_number } : {}),
            created_at: stamp,
            updated_at: stamp,
          };
          state.requests.unshift(request);
          return sendJson(res, 201, request);
        }

        if (path === "/docdesk/requests" && method === "GET") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const status = url.searchParams.get("status");
          const docTypeId = url.searchParams.get("doc_type_id");
          const mine = url.searchParams.get("mine");
          let items = state.requests;
          if (!canSeeAllRequests(user) || mine === "1") {
            items = items.filter((r) => r.requested_by === user.email_id);
          }
          if (status) items = items.filter((r) => r.status === status);
          if (docTypeId) items = items.filter((r) => r.doc_type_id === docTypeId);
          return sendJson(res, 200, { items, count: items.length, next_cursor: null });
        }

        const requestMatch = /^\/docdesk\/requests\/([^/]+)(\/(answer|acknowledge|tat|document|filled-form))?$/.exec(path);
        if (requestMatch) {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const requestId = requestMatch[1];
          const sub = requestMatch[3] || null;
          const request = state.requests.find((r) => r.request_id === requestId);
          if (!request) return sendError(res, 404, "NOT_FOUND", "Request does not exist.");
          const isOwner = request.requested_by === user.email_id;
          const isSa = isStudentAffairs(user);

          if (!sub && method === "GET") {
            if (!isOwner && !canSeeAllRequests(user)) return sendError(res, 403, "FORBIDDEN", "You can view only your own requests.");
            return sendJson(res, 200, request);
          }

          if (!sub && method === "PATCH") {
            if (!isOwner) return sendError(res, 403, "FORBIDDEN", "Only the requester can edit this request.");
            if (request.status !== "pending") return sendError(res, 409, "NOT_PENDING", "Only pending requests can be edited.");
            if (jsonBody.doc_type_id !== undefined) {
              const docType = state.docTypes.find((dt) => dt.doc_type_id === jsonBody.doc_type_id);
              if (!docType || docType.status !== "active") return sendError(res, 422, "VALIDATION_ERROR", "Unknown doc_type_id.");
              request.doc_type_id = docType.doc_type_id;
              request.doc_type_name = docType.name;
            }
            if (jsonBody.reason !== undefined) {
              const reason = String(jsonBody.reason).trim();
              if (reason.length < 4 || reason.length > 500) return sendError(res, 422, "VALIDATION_ERROR", "Reason must be 4-500 characters.");
              request.reason = reason;
            }
            request.updated_at = now();
            return sendJson(res, 200, request);
          }

          if (!sub && method === "DELETE") {
            if (!isOwner) return sendError(res, 403, "FORBIDDEN", "Only the requester can withdraw this request.");
            if (request.status !== "pending") return sendError(res, 409, "NOT_PENDING", "Only pending requests can be withdrawn.");
            state.requests = state.requests.filter((r) => r.request_id !== requestId);
            return sendJson(res, 200, { ...request, status: "pending", withdrawn: true });
          }

          if (sub === "answer" && method === "POST") {
            if (!isSa) return sendError(res, 403, "FORBIDDEN", "Only Student Affairs can answer requests.");
            if (request.status !== "pending") return sendError(res, 409, "NOT_PENDING", "Only pending requests can be answered.");
            const message = String(formData?.get("message") ?? "").trim();
            if (!message) return sendError(res, 422, "VALIDATION_ERROR", "An answer message is required.", [{ field: "message", message: "This field is required." }]);
            const file = formData?.get("document");
            request.answer = {
              message,
              answered_by: user.email_id,
              answered_by_name: user.name,
              answered_at: now(),
            };
            if (file && typeof file === "object" && "arrayBuffer" in file) {
              const buffer = Buffer.from(await file.arrayBuffer());
              request.document = {
                file_id: makeId("DOC"),
                filename: file.name || "document.pdf",
                content_type: file.type || "application/octet-stream",
                size_bytes: buffer.length,
              };
              request._documentBytes = buffer;
            }
            request.status = "answered";
            request.updated_at = now();
            return sendJson(res, 200, request);
          }

          if (sub === "answer" && method === "PATCH") {
            if (!isSa) return sendError(res, 403, "FORBIDDEN", "Only Student Affairs can update answers.");
            if (request.status !== "answered") return sendError(res, 409, "NOT_ANSWERED", "Only answered requests have an answer to update.");
            const message = formData?.get("message");
            if (message) request.answer.message = String(message).trim();
            const file = formData?.get("document");
            if (file && typeof file === "object" && "arrayBuffer" in file) {
              const buffer = Buffer.from(await file.arrayBuffer());
              request.document = {
                file_id: makeId("DOC"),
                filename: file.name || "document.pdf",
                content_type: file.type || "application/octet-stream",
                size_bytes: buffer.length,
              };
              request._documentBytes = buffer;
            }
            const removeDocument = formData?.get("remove_document");
            if (String(removeDocument) === "true") {
              delete request.document;
              delete request._documentBytes;
            }
            request.answer.updated_at = now();
            request.updated_at = now();
            return sendJson(res, 200, request);
          }

          if (sub === "answer" && method === "DELETE") {
            if (!isSa) return sendError(res, 403, "FORBIDDEN", "Only Student Affairs can withdraw answers.");
            if (request.status !== "answered") return sendError(res, 409, "NOT_ANSWERED", "Only answered requests have an answer to withdraw.");
            delete request.answer;
            delete request.document;
            delete request._documentBytes;
            request.status = "pending";
            request.updated_at = now();
            return sendJson(res, 200, request);
          }

          if (sub === "acknowledge" && method === "POST") {
            if (!isOwner) return sendError(res, 403, "FORBIDDEN", "Only the requester can acknowledge.");
            if (request.status !== "answered") return sendError(res, 409, "NOT_ANSWERED", "Only answered requests can be acknowledged.");
            request.status = "acknowledged";
            request.acknowledged_at = now();
            request.updated_at = now();
            return sendJson(res, 200, request);
          }

          if (sub === "tat" && method === "PUT") {
            if (!isSa) return sendError(res, 403, "FORBIDDEN", "Only Student Affairs can set turnaround time.");
            if (request.status === "acknowledged") return sendError(res, 409, "NOT_ACKNOWLEDGED", "Acknowledged requests cannot be updated.");
            const expectedBy = String(jsonBody.expected_by ?? "").trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedBy)) {
              return sendError(res, 422, "VALIDATION_ERROR", "expected_by must be a YYYY-MM-DD date.", [{ field: "expected_by", message: "Use YYYY-MM-DD." }]);
            }
            request.tat = {
              expected_by: expectedBy,
              ...(jsonBody.note ? { note: String(jsonBody.note).trim() } : {}),
              updated_by: user.email_id,
              updated_at: now(),
            };
            request.updated_at = now();
            return sendJson(res, 200, request);
          }

          if (sub === "document" && method === "GET") {
            if (!isOwner && !isSa && user.role !== "admin") return sendError(res, 403, "FORBIDDEN", "Not allowed to download this document.");
            if (!request.document) return sendError(res, 404, "NOT_FOUND", "No document was sent with the answer.");
            const bytes = request._documentBytes ?? Buffer.from(`Mock document for ${request.request_id}`);
            res.statusCode = 200;
            res.setHeader("Content-Type", request.document.content_type);
            res.setHeader("Content-Disposition", `attachment; filename="${request.document.filename.replace(/"/g, "")}"`);
            return res.end(bytes);
          }

          if (sub === "filled-form") {
            if (method === "PUT") {
              if (!isOwner) return sendError(res, 403, "FORBIDDEN", "Only the requester can upload the filled form.");
              if (request.status !== "answered") return sendError(res, 409, "NOT_ANSWERED", "Upload the filled form only after the request is answered.");
              const file = formData?.get("file");
              if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
                return sendError(res, 422, "VALIDATION_ERROR", "A file is required.", [{ field: "file", message: "Attach the completed form." }]);
              }
              const buffer = Buffer.from(await file.arrayBuffer());
              request.filled_form = {
                file_id: makeId("FORM"),
                filename: file.name || "filled-form.pdf",
                content_type: file.type || "application/octet-stream",
                size_bytes: buffer.length,
              };
              request._filledFormBytes = buffer;
              request.updated_at = now();
              return sendJson(res, 200, request);
            }
            if (method === "GET") {
              if (!isOwner && !isSa && user.role !== "admin") return sendError(res, 403, "FORBIDDEN", "Not allowed to download this form.");
              if (!request.filled_form) return sendError(res, 404, "NOT_FOUND", "No filled form has been uploaded.");
              const bytes = request._filledFormBytes ?? Buffer.from(`Mock filled form for ${request.request_id}`);
              res.statusCode = 200;
              res.setHeader("Content-Type", request.filled_form.content_type);
              res.setHeader("Content-Disposition", `attachment; filename="${request.filled_form.filename.replace(/"/g, "")}"`);
              return res.end(bytes);
            }
            if (method === "DELETE") {
              if (!isOwner && !isSa) return sendError(res, 403, "FORBIDDEN", "Only the requester or Student Affairs can remove the form.");
              const wasAcknowledged = request.status === "acknowledged" && isSa && !isOwner;
              if (request.status === "acknowledged" && !wasAcknowledged) return sendError(res, 409, "NOT_ACKNOWLEDGED", "Acknowledged requests cannot be updated.");
              delete request.filled_form;
              delete request._filledFormBytes;
              request.updated_at = now();
              return sendJson(res, 200, request);
            }
          }
        }

        if (path === "/docdesk/requests/bulk-tat" && method === "POST") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          if (!isStudentAffairs(user)) return sendError(res, 403, "FORBIDDEN", "Only Student Affairs can bulk-update TAT.");
          const ids = Array.isArray(jsonBody.request_ids) ? jsonBody.request_ids.map(String) : [];
          const expectedBy = String(jsonBody.expected_by ?? "").trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedBy)) {
            return sendError(res, 422, "VALIDATION_ERROR", "expected_by must be a YYYY-MM-DD date.");
          }
          const targets = ids.map((id) => state.requests.find((r) => r.request_id === id));
          if (targets.some((t) => !t)) return sendError(res, 404, "NOT_FOUND", "One or more requests do not exist.");
          if (targets.some((t) => t.status === "acknowledged")) return sendError(res, 409, "NOT_ACKNOWLEDGED", "Acknowledged requests cannot be updated (all-or-nothing).");
          const stamp = now();
          for (const target of targets) {
            target.tat = {
              expected_by: expectedBy,
              ...(jsonBody.note ? { note: String(jsonBody.note).trim() } : {}),
              updated_by: user.email_id,
              updated_at: stamp,
            };
            target.updated_at = stamp;
          }
          return sendJson(res, 200, { items: targets, count: targets.length, next_cursor: null });
        }

        // ---- DocDesk: document types ----
        if (path === "/docdesk/doc-types" && method === "GET") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const status = url.searchParams.get("status");
          let items = state.docTypes;
          if (status) items = items.filter((dt) => dt.status === status);
          return sendJson(res, 200, { items, count: items.length, next_cursor: null });
        }

        if (path === "/docdesk/doc-types" && method === "POST") {
          const user = requireAuth(state, req);
          if (!isStudentAffairs(user)) return sendError(res, 403, "FORBIDDEN", "Only Student Affairs can manage document types.");
          const name = String(jsonBody.name ?? "").trim();
          if (name.length < 2 || name.length > 100) return sendError(res, 422, "VALIDATION_ERROR", "Name must be 2-100 characters.", [{ field: "name", message: "Name must be 2-100 characters." }]);
          const stamp = now();
          const docType = {
            doc_type_id: makeId("DT"),
            name,
            ...(jsonBody.description ? { description: String(jsonBody.description).trim() } : {}),
            status: "active",
            created_by: user.email_id,
            created_at: stamp,
            updated_at: stamp,
          };
          state.docTypes.push(docType);
          return sendJson(res, 201, docType);
        }

        const docTypeMatch = /^\/docdesk\/doc-types\/([^/]+)$/.exec(path);
        if (docTypeMatch) {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const docTypeId = decodeURIComponent(docTypeMatch[1]);
          const docType = state.docTypes.find((dt) => dt.doc_type_id === docTypeId);
          if (method === "GET") {
            if (!docType) return sendError(res, 404, "NOT_FOUND", "Document type does not exist.");
            return sendJson(res, 200, docType);
          }
          if (!isStudentAffairs(user)) return sendError(res, 403, "FORBIDDEN", "Only Student Affairs can manage document types.");
          if (!docType) return sendError(res, 404, "NOT_FOUND", "Document type does not exist.");
          if (method === "PATCH") {
            if (jsonBody.name !== undefined) {
              const name = String(jsonBody.name).trim();
              if (name.length < 2 || name.length > 100) return sendError(res, 422, "VALIDATION_ERROR", "Name must be 2-100 characters.");
              docType.name = name;
            }
            if (jsonBody.description !== undefined) docType.description = String(jsonBody.description).trim();
            if (jsonBody.status !== undefined) {
              const status = String(jsonBody.status).toLowerCase();
              if (!["active", "archived"].includes(status)) return sendError(res, 422, "VALIDATION_ERROR", "status must be active or archived.");
              docType.status = status;
            }
            docType.updated_at = now();
            return sendJson(res, 200, docType);
          }
          if (method === "DELETE") {
            if (state.requests.some((r) => r.doc_type_id === docTypeId && r.status === "pending")) {
              return sendError(res, 409, "CONFLICT", "This type has pending requests. Archive it instead.");
            }
            state.docTypes = state.docTypes.filter((dt) => dt.doc_type_id !== docTypeId);
            return sendJson(res, 204, {});
          }
        }

        // ---- Direct file links (mock-only convenience; mirrors pre-signed url) ----
        const fileMatch = /^\/files\/([^/]+)$/.exec(path);
        if (fileMatch && method === "GET") {
          const stored = state.files[fileMatch[1]];
          if (!stored) return sendError(res, 404, "NOT_FOUND", "File does not exist.");
          res.statusCode = 200;
          res.setHeader("Content-Type", stored.meta.content_type);
          return res.end(stored.bytes);
        }

        // ---- Admin: manage one user (GET / PATCH / DELETE) ----
        const adminUserMatch = /^\/admin\/users\/([^/]+)$/.exec(path);
        if (adminUserMatch) {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          if (user.role !== "admin") return sendError(res, 403, "FORBIDDEN", "Only the admin can manage users.");
          const email = decodeURIComponent(adminUserMatch[1]).toLowerCase();
          const target = state.users[email];
          if (!target) return sendError(res, 404, "NOT_FOUND", "User does not exist.");
          if (method === "GET") return sendJson(res, 200, { ...publicProfile(target), otp: TEAM_OTP });
          if (method === "PATCH") {
            for (const field of ["name", "usn", "dept", "designation", "phone_number"]) {
              if (jsonBody[field] !== undefined) target[field] = String(jsonBody[field]).trim();
            }
            if (jsonBody.email_id !== undefined) {
              const nextEmail = String(jsonBody.email_id).trim().toLowerCase();
              if (!nextEmail.endsWith(`@${TEAM_DOMAIN}`)) {
                return sendError(res, 422, "EMAIL_DOMAIN_MISMATCH", `Email must use the @${TEAM_DOMAIN} domain.`);
              }
              if (nextEmail !== email && state.users[nextEmail]) {
                return sendError(res, 409, "ALREADY_EXISTS", "A user with this email already exists.");
              }
              delete state.users[email];
              target.email_id = nextEmail;
              state.users[nextEmail] = target;
            }
            return sendJson(res, 200, { ...publicProfile(target), otp: TEAM_OTP });
          }
          if (method === "DELETE") {
            delete state.users[email];
            return sendJson(res, 200, { message: `User ${email} deleted.` });
          }
        }

        // =========================================================
        // ---- FindIt ----
        // =========================================================
        if (path === "/findit/posts" && method === "GET") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const status = url.searchParams.get("status") || "active";
          const items = state.finditPosts.filter((p) => p.status === status);
          return sendJson(res, 200, { items, count: items.length, next_cursor: null });
        }

        if (path === "/findit/posts" && method === "POST") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          if (!isOfficeStaff(user)) return sendError(res, 403, "FORBIDDEN", "Only office staff can post found items.");
          const title = String(formData?.get("title") ?? "").trim();
          if (title.length < 3 || title.length > 100) {
            return sendError(res, 422, "VALIDATION_ERROR", "Title must be 3-100 characters.", [{ field: "title", message: "Title must be 3-100 characters." }]);
          }
          const files = formData ? formData.getAll("images").filter((f) => f && typeof f === "object" && "arrayBuffer" in f) : [];
          if (files.length > 5) return sendError(res, 422, "TOO_MANY_IMAGES", "A post can hold up to 5 images.");
          const images = [];
          for (const f of files) {
            const stored = await storeFormFile(state, { get: () => f }, "images", "IMG");
            if (stored) images.push(stored);
          }
          const stamp = now();
          const post = {
            post_id: makeId("FND"), title,
            description: String(formData?.get("description") ?? "").trim(),
            location_found: String(formData?.get("location_found") ?? "").trim(),
            found_on: String(formData?.get("found_on") ?? "").trim(),
            images, status: "active", resolved: false, resolution: null,
            created_by: user.email_id, created_by_name: user.name, created_at: stamp, updated_at: stamp,
          };
          state.finditPosts.unshift(post);
          return sendJson(res, 201, post);
        }

        const finditPostMatch = /^\/findit\/posts\/([^/]+)(\/(claims|resolution))?$/.exec(path);
        if (finditPostMatch) {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const post = state.finditPosts.find((p) => p.post_id === finditPostMatch[1]);
          if (!post) return sendError(res, 404, "NOT_FOUND", "Found post does not exist.");
          const sub = finditPostMatch[3] || null;
          const isStaff = isOfficeStaff(user);

          if (!sub && method === "GET") {
            if (!isStaff && post.resolution) {
              return sendJson(res, 200, { ...post, resolution: undefined });
            }
            return sendJson(res, 200, post);
          }

          if (!sub && method === "PATCH") {
            if (!isStaff) return sendError(res, 403, "FORBIDDEN", "Only office staff can edit found posts.");
            const stamp = now();
            if (formData?.get("title") != null && String(formData.get("title")).trim() !== "") post.title = String(formData.get("title")).trim();
            if (formData?.get("description") != null) post.description = String(formData.get("description")).trim();
            if (formData?.get("location_found") != null) post.location_found = String(formData.get("location_found")).trim();
            if (formData?.get("found_on") != null) post.found_on = String(formData.get("found_on")).trim();
            const statusField = String(formData?.get("status") ?? "").trim();
            if (statusField) {
              if (statusField === "active" && post.resolved) {
                return sendError(res, 409, "POST_RESOLVED", "A resolved post cannot be reopened. Undo the resolution instead.");
              }
              if (statusField === "archived") {
                for (const claim of state.finditClaims.filter((c) => c.post_id === post.post_id)) {
                  claim.status = "archived";
                }
              }
              if (statusField === "active") {
                for (const claim of state.finditClaims.filter((c) => c.post_id === post.post_id && c.decision === "pending")) {
                  claim.status = "active";
                }
              }
              post.status = statusField;
            }
            const removeImages = String(formData?.get("remove_images") ?? "") === "true";
            if (removeImages) post.images = [];
            const files = formData ? formData.getAll("images").filter((f) => f && typeof f === "object" && "arrayBuffer" in f) : [];
            if (files.length > 5) return sendError(res, 422, "TOO_MANY_IMAGES", "A post can hold up to 5 images.");
            if (files.length > 0) {
              const images = [];
              for (const f of files) {
                const stored = await storeFormFile(state, { get: () => f }, "images", "IMG");
                if (stored) images.push(stored);
              }
              post.images = images;
            }
            post.updated_at = stamp;
            return sendJson(res, 200, post);
          }

          if (!sub && method === "DELETE") {
            if (!isStaff) return sendError(res, 403, "FORBIDDEN", "Only office staff can delete found posts.");
            if (state.finditClaims.some((c) => c.post_id === post.post_id && c.decision === "pending" && c.status === "active")) {
              return sendError(res, 409, "POST_HAS_PENDING_CLAIMS", "A claim is still waiting for a decision. Resolve the post first.");
            }
            state.finditPosts = state.finditPosts.filter((p) => p.post_id !== post.post_id);
            return sendJson(res, 200, { message: "Post deleted." });
          }

          if (sub === "claims") {
            if (method === "POST") {
              if (user.role === "admin") return sendError(res, 403, "FORBIDDEN", "Admin cannot claim items.");
              if (post.status !== "active" || post.resolved) return sendError(res, 409, "POST_NOT_ACTIVE", "This post no longer takes claims.");
              const message = String(jsonBody.message ?? "").trim();
              if (message.length < 10 || message.length > 1000) {
                return sendError(res, 422, "VALIDATION_ERROR", "Message must be 10-1000 characters.", [{ field: "message", message: "Describe proof that the item is yours (10-1000 characters)." }]);
              }
              if (state.finditClaims.some((c) => c.post_id === post.post_id && c.claimant_email === user.email_id && c.status === "active")) {
                return sendError(res, 409, "ALREADY_EXISTS", "You already have a claim on this post.");
              }
              const stamp = now();
              const claim = {
                claim_id: makeId("CLM"), post_id: post.post_id,
                claimant_email: user.email_id, claimant_name: user.name, claimant_role: user.role,
                claimant_phone_number: user.phone_number, message,
                status: "active", decision: "pending", created_at: stamp, updated_at: stamp,
              };
              state.finditClaims.unshift(claim);
              return sendJson(res, 201, claim);
            }
            if (method === "GET") {
              let claims = state.finditClaims.filter((c) => c.post_id === post.post_id);
              if (!isStaff) claims = claims.filter((c) => c.claimant_email === user.email_id);
              return sendJson(res, 200, { items: claims, count: claims.length, next_cursor: null });
            }
          }

          if (sub === "resolution") {
            if (method === "POST") {
              if (!isStaff) return sendError(res, 403, "FORBIDDEN", "Only office staff can resolve posts.");
              if (post.resolved) return sendError(res, 409, "ALREADY_RESOLVED", "The post already has a resolution. Use PATCH to change it.");
              if (post.status !== "active") return sendError(res, 409, "POST_NOT_ACTIVE", "Archived posts cannot be resolved.");
              const claimId = String(jsonBody.claim_id ?? "").trim();
              const claim = state.finditClaims.find((c) => c.claim_id === claimId && c.post_id === post.post_id);
              if (!claim) return sendError(res, 404, "NOT_FOUND", "That claim does not exist on this post.");
              applyResolution(state, post, claim, jsonBody.note ? String(jsonBody.note).trim() : "", user.email_id);
              return sendJson(res, 201, post);
            }
            if (method === "GET") {
              const approved = state.finditClaims.find((c) => c.post_id === post.post_id && c.decision === "approved");
              const allowed = isStaff || (approved && approved.claimant_email === user.email_id);
              if (!allowed) return sendError(res, 403, "FORBIDDEN", "Not allowed to view this resolution.");
              if (!post.resolved || !post.resolution) return sendError(res, 404, "NOT_FOUND", "The post is not resolved yet.");
              return sendJson(res, 200, post.resolution);
            }
            if (method === "PATCH") {
              if (!isStaff) return sendError(res, 403, "FORBIDDEN", "Only office staff can change the resolution.");
              if (!post.resolved || !post.resolution) return sendError(res, 404, "NOT_FOUND", "The post is not resolved yet.");
              if (jsonBody.claim_id !== undefined) {
                const nextClaim = state.finditClaims.find((c) => c.claim_id === String(jsonBody.claim_id) && c.post_id === post.post_id);
                if (!nextClaim) return sendError(res, 404, "NOT_FOUND", "That claim does not exist on this post.");
                post.resolution.claim_id = nextClaim.claim_id;
                post.resolution.claimant_email = nextClaim.claimant_email;
              }
              if (jsonBody.note !== undefined) post.resolution.note = String(jsonBody.note).trim();
              post.resolution.updated_at = now();
              post.updated_at = post.resolution.updated_at;
              for (const claim of state.finditClaims.filter((c) => c.post_id === post.post_id)) {
                claim.decision = claim.claim_id === post.resolution.claim_id ? "approved" : "rejected";
                claim.updated_at = post.resolution.updated_at;
              }
              return sendJson(res, 200, post);
            }
            if (method === "DELETE") {
              if (!isStaff) return sendError(res, 403, "FORBIDDEN", "Only office staff can undo the resolution.");
              if (!post.resolved) return sendError(res, 404, "NOT_FOUND", "The post is not resolved yet.");
              const stamp = now();
              post.resolved = false;
              post.resolution = null;
              post.status = "active";
              for (const claim of state.finditClaims.filter((c) => c.post_id === post.post_id)) {
                claim.status = "active";
                claim.decision = "pending";
                claim.updated_at = stamp;
              }
              post.updated_at = stamp;
              return sendJson(res, 200, post);
            }
          }
        }

        if (path === "/findit/claims/me" && method === "GET") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const items = state.finditClaims.filter((c) => c.claimant_email === user.email_id);
          return sendJson(res, 200, { items, count: items.length, next_cursor: null });
        }

        const claimMatch = /^\/findit\/claims\/([^/]+)$/.exec(path);
        if (claimMatch) {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const claim = state.finditClaims.find((c) => c.claim_id === claimMatch[1]);
          if (!claim) return sendError(res, 404, "NOT_FOUND", "Claim does not exist.");
          if (claim.claimant_email !== user.email_id && !isOfficeStaff(user)) {
            return sendError(res, 403, "FORBIDDEN", "You can view only your own claims.");
          }
          if (method === "GET") return sendJson(res, 200, claim);
          if (method === "DELETE") {
            if (claim.claimant_email !== user.email_id) return sendError(res, 403, "FORBIDDEN", "Only the claimant can withdraw a claim.");
            if (claim.decision !== "pending" || claim.status !== "active") {
              return sendError(res, 409, "CLAIM_LOCKED", "The claim is already decided or archived.");
            }
            state.finditClaims = state.finditClaims.filter((c) => c.claim_id !== claim.claim_id);
            return sendJson(res, 200, { message: "Claim withdrawn." });
          }
        }

        if (path.startsWith("/findit/lost-requests")) {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          if (path === "/findit/lost-requests" && method === "GET") {
            const status = url.searchParams.get("status") || "active";
            const mine = url.searchParams.get("mine") === "true";
            let items = state.lostRequests.filter((r) => r.status === status);
            if (!isOfficeStaff(user) || mine) items = items.filter((r) => r.created_by === user.email_id);
            return sendJson(res, 200, { items, count: items.length, next_cursor: null });
          }
          if (path === "/findit/lost-requests" && method === "POST") {
            if (user.role === "admin") return sendError(res, 403, "FORBIDDEN", "Admin cannot report lost items.");
            const title = String(jsonBody.title ?? "").trim();
            if (title.length < 3 || title.length > 100) {
              return sendError(res, 422, "VALIDATION_ERROR", "Title must be 3-100 characters.", [{ field: "title", message: "Title must be 3-100 characters." }]);
            }
            const stamp = now();
            const lost = {
              request_id: makeId("LST"), title,
              description: jsonBody.description ? String(jsonBody.description).trim() : undefined,
              location_lost: jsonBody.location_lost ? String(jsonBody.location_lost).trim() : undefined,
              lost_on: jsonBody.lost_on ? String(jsonBody.lost_on).trim() : undefined,
              status: "active",
              created_by: user.email_id, created_by_name: user.name, created_by_role: user.role,
              created_by_phone_number: user.phone_number, created_at: stamp, updated_at: stamp,
            };
            state.lostRequests.unshift(lost);
            return sendJson(res, 201, lost);
          }
          const lostMatch = /^\/findit\/lost-requests\/([^/]+)$/.exec(path);
          if (lostMatch) {
            const lost = state.lostRequests.find((r) => r.request_id === lostMatch[1]);
            if (!lost) return sendError(res, 404, "NOT_FOUND", "Lost request does not exist.");
            if (lost.created_by !== user.email_id && !isOfficeStaff(user)) {
              return sendError(res, 403, "FORBIDDEN", "You can view only your own lost reports.");
            }
            if (method === "GET") return sendJson(res, 200, lost);
            if (method === "PATCH") {
              if (lost.created_by !== user.email_id) return sendError(res, 403, "FORBIDDEN", "Only the owner can edit this report.");
              for (const field of ["title", "description", "location_lost", "lost_on"]) {
                if (jsonBody[field] !== undefined) lost[field] = String(jsonBody[field]).trim();
              }
              if (jsonBody.status !== undefined) {
                const status = String(jsonBody.status).toLowerCase();
                if (!["active", "archived"].includes(status)) return sendError(res, 422, "VALIDATION_ERROR", "status must be active or archived.");
                lost.status = status;
              }
              lost.updated_at = now();
              return sendJson(res, 200, lost);
            }
            if (method === "DELETE") {
              if (lost.created_by !== user.email_id) return sendError(res, 403, "FORBIDDEN", "Only the owner can delete this report.");
              state.lostRequests = state.lostRequests.filter((r) => r.request_id !== lost.request_id);
              return sendJson(res, 200, { message: "Lost request deleted." });
            }
          }
        }

        // =========================================================
        // ---- NoticeHub ----
        // =========================================================
        if (path === "/noticehub/notices" && method === "GET") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const status = url.searchParams.get("status") || "active";
          const pinned = url.searchParams.get("pinned");
          const mine = url.searchParams.get("mine") === "true";
          let items = state.notices.filter((n) => n.status === status);
          if (status !== "active" && user.role !== "admin") {
            items = items.filter((n) => n.created_by === user.email_id);
          }
          if (mine && user.role !== "admin") items = items.filter((n) => n.created_by === user.email_id);
          if (pinned === "true") items = items.filter((n) => n.pinned);
          if (pinned === "false") items = items.filter((n) => !n.pinned);
          return sendJson(res, 200, { items, count: items.length, next_cursor: null });
        }

        if (path === "/noticehub/notices" && method === "POST") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          if (!isPublisher(user)) return sendError(res, 403, "FORBIDDEN", "Only admin, faculty and office staff can post notices.");
          const title = String(formData?.get("title") ?? "").trim();
          if (title.length < 3 || title.length > 150) {
            return sendError(res, 422, "VALIDATION_ERROR", "Title must be 3-150 characters.", [{ field: "title", message: "Title must be 3-150 characters." }]);
          }
          const body = String(formData?.get("body") ?? "").trim();
          if (body.length < 1 || body.length > 5000) {
            return sendError(res, 422, "VALIDATION_ERROR", "Body must be 1-5000 characters.", [{ field: "body", message: "Body must be 1-5000 characters." }]);
          }
          const pinned = String(formData?.get("pinned") ?? "false") === "true";
          const publishAtRaw = String(formData?.get("publish_at") ?? "").trim();
          const attachment = await storeFormFile(state, formData, "attachment", "ATT");
          const stamp = now();
          let status = "active";
          let publishAtValue;
          if (publishAtRaw) {
            publishAtValue = new Date(publishAtRaw).toISOString();
            if (publishAtValue > stamp) status = "scheduled";
          }
          const notice = {
            notice_id: makeId("NTC"), title, body, status, pinned,
            ...(publishAtRaw ? { publish_at: publishAtValue } : {}),
            attachment, created_by: user.email_id, created_by_name: user.name,
            created_by_role: user.role, created_at: stamp, updated_at: stamp,
          };
          state.notices.unshift(notice);
          return sendJson(res, 201, notice);
        }

        const noticeMatch = /^\/noticehub\/notices\/([^/]+)(\/(doubts|attachment))?$/.exec(path);
        if (noticeMatch) {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const notice = state.notices.find((n) => n.notice_id === noticeMatch[1]);
          if (!notice) return sendError(res, 404, "NOT_FOUND", "Notice does not exist.");
          const sub = noticeMatch[3] || null;
          const isCreator = notice.created_by === user.email_id;
          const isAdmin = user.role === "admin";
          const canManage = isCreator || isAdmin;
          const canSee = notice.status === "active" || canManage;

          if (!sub && method === "GET") {
            if (!canSee) return sendError(res, 403, "FORBIDDEN", "Scheduled notices are visible to their publisher and the admin.");
            return sendJson(res, 200, notice);
          }

          if (!sub && method === "PATCH") {
            if (!canManage) return sendError(res, 403, "FORBIDDEN", "Only the publisher or admin can edit this notice.");
            if (formData?.get("title") != null && String(formData.get("title")).trim() !== "") notice.title = String(formData.get("title")).trim();
            if (formData?.get("body") != null && String(formData.get("body")).trim() !== "") notice.body = String(formData.get("body")).trim();
            const pinnedField = formData?.get("pinned");
            if (pinnedField != null && String(pinnedField) !== "") notice.pinned = String(pinnedField) === "true";
            const statusField = String(formData?.get("status") ?? "").trim();
            if (statusField) {
              if (!["scheduled", "active", "archived"].includes(statusField)) {
                return sendError(res, 422, "VALIDATION_ERROR", "status must be scheduled, active or archived.");
              }
              notice.status = statusField === "active" && notice.publish_at && new Date(notice.publish_at) > new Date() ? "scheduled" : statusField;
            }
            const publishAtRaw = String(formData?.get("publish_at") ?? "").trim();
            if (publishAtRaw) {
              if (notice.status !== "scheduled") return sendError(res, 409, "NOTICE_ALREADY_PUBLISHED", "publish_at can only change while the notice is scheduled.");
              notice.publish_at = new Date(publishAtRaw).toISOString();
            }
            if (String(formData?.get("remove_attachment") ?? "") === "true") notice.attachment = null;
            const replaced = await storeFormFile(state, formData, "attachment", "ATT");
            if (replaced) notice.attachment = replaced;
            notice.updated_at = now();
            return sendJson(res, 200, notice);
          }

          if (!sub && method === "DELETE") {
            if (!canManage) return sendError(res, 403, "FORBIDDEN", "Only the publisher or admin can delete this notice.");
            state.notices = state.notices.filter((n) => n.notice_id !== notice.notice_id);
            state.doubts = state.doubts.filter((d) => d.notice_id !== notice.notice_id);
            return sendJson(res, 200, { message: "Notice deleted." });
          }

          if (sub === "attachment" && method === "GET") {
            if (!notice.attachment) return sendError(res, 404, "NOT_FOUND", "This notice has no attachment.");
            const stored = state.files[notice.attachment.attachment_id];
            if (!stored) return sendError(res, 404, "NOT_FOUND", "Attachment file is missing.");
            res.statusCode = 200;
            res.setHeader("Content-Type", notice.attachment.content_type);
            res.setHeader("Content-Disposition", `attachment; filename="${notice.attachment.filename.replace(/"/g, "")}"`);
            return res.end(stored.bytes);
          }

          if (sub === "doubts") {
            if (method === "POST") {
              if (user.role === "admin") return sendError(res, 403, "FORBIDDEN", "Admin cannot ask doubts.");
              if (notice.status !== "active") return sendError(res, 409, "NOTICE_NOT_ACTIVE", "Doubts can only be asked on active notices.");
              const question = String(jsonBody.question ?? "").trim();
              if (question.length < 5 || question.length > 1000) {
                return sendError(res, 422, "VALIDATION_ERROR", "Question must be 5-1000 characters.", [{ field: "question", message: "Question must be 5-1000 characters." }]);
              }
              const stamp = now();
              const doubt = {
                doubt_id: makeId("DBT"), notice_id: notice.notice_id, question,
                asked_by: user.email_id, asked_by_name: user.name, asked_by_role: user.role,
                answered: false, response: null, created_at: stamp, updated_at: stamp,
              };
              state.doubts.unshift(doubt);
              return sendJson(res, 201, doubt);
            }
            if (method === "GET") {
              const answeredParam = url.searchParams.get("answered");
              let items = state.doubts.filter((d) => d.notice_id === notice.notice_id);
              if (answeredParam === "false") items = items.filter((d) => !d.answered);
              if (answeredParam === "true") items = items.filter((d) => d.answered);
              return sendJson(res, 200, { items, count: items.length, next_cursor: null });
            }
          }
        }

        const doubtMatch = /^\/noticehub\/doubts\/([^/]+)(\/response)?$/.exec(path);
        if (doubtMatch) {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const doubt = state.doubts.find((d) => d.doubt_id === doubtMatch[1]);
          if (!doubt) return sendError(res, 404, "NOT_FOUND", "Doubt does not exist.");
          const notice = state.notices.find((n) => n.notice_id === doubt.notice_id);
          const isAsker = doubt.asked_by === user.email_id;
          const isAdmin = user.role === "admin";
          const isNoticePublisher = !!notice && notice.created_by === user.email_id;

          if (!doubtMatch[2]) {
            if (method === "GET") return sendJson(res, 200, doubt);
            if (method === "PATCH") {
              if (!isAsker) return sendError(res, 403, "FORBIDDEN", "Only the asker can edit this doubt.");
              if (doubt.answered) return sendError(res, 409, "DOUBT_ANSWERED", "An answered doubt can no longer be edited.");
              const question = String(jsonBody.question ?? "").trim();
              if (question.length < 5 || question.length > 1000) {
                return sendError(res, 422, "VALIDATION_ERROR", "Question must be 5-1000 characters.");
              }
              doubt.question = question;
              doubt.updated_at = now();
              return sendJson(res, 200, doubt);
            }
            if (method === "DELETE") {
              if (!isAsker && !isAdmin) return sendError(res, 403, "FORBIDDEN", "Only the asker or admin can delete this doubt.");
              state.doubts = state.doubts.filter((d) => d.doubt_id !== doubt.doubt_id);
              return sendJson(res, 200, { message: "Doubt deleted." });
            }
          }

          if (doubtMatch[2]) {
            if (method === "POST") {
              if (!isNoticePublisher && !isAdmin) return sendError(res, 403, "FORBIDDEN", "Only the notice publisher or admin can answer doubts.");
              if (doubt.answered) return sendError(res, 409, "ALREADY_ANSWERED", "The doubt already has a response. Use PATCH to change it.");
              const message = String(jsonBody.message ?? "").trim();
              if (message.length < 1 || message.length > 2000) {
                return sendError(res, 422, "VALIDATION_ERROR", "Message must be 1-2000 characters.");
              }
              const stamp = now();
              doubt.response = {
                message, responded_by: user.email_id, responded_by_name: user.name,
                responded_by_role: user.role, responded_at: stamp, updated_at: stamp,
              };
              doubt.answered = true;
              doubt.updated_at = stamp;
              return sendJson(res, 201, doubt);
            }
            if (method === "GET") {
              if (!doubt.response) return sendError(res, 404, "NOT_FOUND", "The doubt has no response yet.");
              return sendJson(res, 200, doubt.response);
            }
            if (method === "PATCH") {
              if (!doubt.response) return sendError(res, 404, "NOT_FOUND", "The doubt has no response yet.");
              if (doubt.response.responded_by !== user.email_id && !isAdmin) return sendError(res, 403, "FORBIDDEN", "Only the responder or admin can edit the response.");
              const message = String(jsonBody.message ?? "").trim();
              if (message.length < 1 || message.length > 2000) return sendError(res, 422, "VALIDATION_ERROR", "Message must be 1-2000 characters.");
              doubt.response.message = message;
              doubt.response.updated_at = now();
              doubt.updated_at = doubt.response.updated_at;
              return sendJson(res, 200, doubt);
            }
            if (method === "DELETE") {
              if (!doubt.response) return sendError(res, 404, "NOT_FOUND", "The doubt has no response yet.");
              if (doubt.response.responded_by !== user.email_id && !isAdmin) return sendError(res, 403, "FORBIDDEN", "Only the responder or admin can remove the response.");
              doubt.response = null;
              doubt.answered = false;
              doubt.updated_at = now();
              return sendJson(res, 200, doubt);
            }
          }
        }

        // =========================================================
        // ---- FixIt ----
        // =========================================================
        if (path === "/fixit/tickets" && method === "GET") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const status = url.searchParams.get("status");
          const issueTypeId = url.searchParams.get("issue_type_id");
          const mine = url.searchParams.get("mine") === "true";
          let items = state.tickets;
          if (user.role !== "admin" && !isCampusMaintenance(user) && !mine) {
            items = items.filter((t) => t.reported_by === user.email_id);
          }
          if (mine) items = items.filter((t) => t.reported_by === user.email_id);
          if (status) items = items.filter((t) => t.status === status);
          if (issueTypeId) items = items.filter((t) => t.issue_type_id === issueTypeId);
          items = items.map((t) => serializeTicket(state, t));
          return sendJson(res, 200, { items, count: items.length, next_cursor: null });
        }

        if (path === "/fixit/tickets" && method === "POST") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          if (user.role === "admin") return sendError(res, 403, "FORBIDDEN", "Admin cannot raise tickets.");
          const issueTypeId = String(formData?.get("issue_type_id") ?? "").trim();
          const issueType = state.issueTypes.find((it) => it.issue_type_id === issueTypeId);
          if (!issueType) return sendError(res, 422, "VALIDATION_ERROR", "Unknown issue_type_id.", [{ field: "issue_type_id", message: "Pick an issue type." }]);
          const title = String(formData?.get("title") ?? "").trim();
          if (title.length < 3 || title.length > 120) {
            return sendError(res, 422, "VALIDATION_ERROR", "Title must be 3-120 characters.", [{ field: "title", message: "Title must be 3-120 characters." }]);
          }
          const description = String(formData?.get("description") ?? "").trim();
          if (description.length < 5 || description.length > 2000) {
            return sendError(res, 422, "VALIDATION_ERROR", "Description must be 5-2000 characters.", [{ field: "description", message: "Describe where the problem is (5-2000 characters)." }]);
          }
          const photo = await storeFormFile(state, formData, "photo", "PHO");
          const stamp = now();
          const ticket = {
            ticket_id: makeId("TKT"), issue_type_id: issueTypeId, issue_type_name: issueType.name,
            title, description, status: "open", photo, tat: null,
            update: null, reported_by: user.email_id, reported_by_name: user.name,
            reported_by_role: user.role, reported_by_dept: user.dept,
            reported_by_phone_number: user.phone_number, created_at: stamp, updated_at: stamp,
          };
          state.tickets.unshift(ticket);
          return sendJson(res, 201, serializeTicket(state, ticket));
        }

        const ticketMatch = /^\/fixit\/tickets\/([^/]+)(\/(status|acknowledge|tat|photo))?$/.exec(path);
        if (ticketMatch) {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          const ticket = state.tickets.find((t) => t.ticket_id === ticketMatch[1]);
          if (!ticket) return sendError(res, 404, "NOT_FOUND", "Ticket does not exist.");
          const sub = ticketMatch[3] || null;
          const isReporter = ticket.reported_by === user.email_id;
          const isCm = isCampusMaintenance(user);
          const isAdmin = user.role === "admin";

          if (!sub && method === "GET") {
            if (!isReporter && !isCm && !isAdmin) return sendError(res, 403, "FORBIDDEN", "You can view only your own tickets.");
            return sendJson(res, 200, serializeTicket(state, ticket));
          }

          if (!sub && method === "PATCH") {
            if (!isReporter) return sendError(res, 403, "FORBIDDEN", "Only the reporter can edit this ticket.");
            if (ticket.status !== "open") return sendError(res, 409, "TICKET_NOT_OPEN", "The reporter can only edit a ticket while it is open.");
            if (formData?.get("title") != null && String(formData.get("title")).trim() !== "") ticket.title = String(formData.get("title")).trim();
            if (formData?.get("description") != null && String(formData.get("description")).trim() !== "") ticket.description = String(formData.get("description")).trim();
            const issueTypeId = String(formData?.get("issue_type_id") ?? "").trim();
            if (issueTypeId) {
              const issueType = state.issueTypes.find((it) => it.issue_type_id === issueTypeId);
              if (!issueType) return sendError(res, 422, "VALIDATION_ERROR", "Unknown issue_type_id.");
              ticket.issue_type_id = issueTypeId;
              ticket.issue_type_name = issueType.name;
            }
            if (String(formData?.get("remove_photo") ?? "") === "true") ticket.photo = null;
            const replaced = await storeFormFile(state, formData, "photo", "PHO");
            if (replaced) ticket.photo = replaced;
            ticket.updated_at = now();
            return sendJson(res, 200, serializeTicket(state, ticket));
          }

          if (!sub && method === "DELETE") {
            const canDelete = (isReporter && ticket.status === "open") || isCm || isAdmin;
            if (!canDelete) return sendError(res, 403, "FORBIDDEN", "Not allowed to delete this ticket.");
            state.tickets = state.tickets.filter((t) => t.ticket_id !== ticket.ticket_id);
            return sendJson(res, 200, { message: "Ticket deleted." });
          }

          if (sub === "photo" && method === "GET") {
            if (!isReporter && !isCm && !isAdmin) return sendError(res, 403, "FORBIDDEN", "Not allowed to download this photo.");
            if (!ticket.photo) return sendError(res, 404, "NOT_FOUND", "This ticket has no photo.");
            const stored = state.files[ticket.photo.file_id];
            if (!stored) return sendError(res, 404, "NOT_FOUND", "Photo file is missing.");
            res.statusCode = 200;
            res.setHeader("Content-Type", ticket.photo.content_type);
            res.setHeader("Content-Disposition", `attachment; filename="${ticket.photo.filename.replace(/"/g, "")}"`);
            return res.end(stored.bytes);
          }

          if (sub === "status" && method === "PUT") {
            if (!isCm) return sendError(res, 403, "FORBIDDEN", "Only Campus Maintenance can update the status.");
            if (ticket.status === "acknowledged") return sendError(res, 409, "ALREADY_ACKNOWLEDGED", "The ticket is closed.");
            const status = String(jsonBody.status ?? "").trim().toLowerCase();
            if (!["open", "resolved"].includes(status)) return sendError(res, 422, "VALIDATION_ERROR", "status must be open or resolved.");
            const note = String(jsonBody.note ?? "").trim();
            if (note.length < 1 || note.length > 280) {
              return sendError(res, 422, "VALIDATION_ERROR", "Note must be 1-280 characters.", [{ field: "note", message: "A short progress note is required (1-280 characters)." }]);
            }
            const stamp = now();
            ticket.status = status;
            ticket.update = { note, updated_by: user.email_id, updated_by_name: user.name, updated_at: stamp };
            ticket.updated_at = stamp;
            return sendJson(res, 200, serializeTicket(state, ticket));
          }

          if (sub === "acknowledge" && method === "POST") {
            if (!isReporter) return sendError(res, 403, "FORBIDDEN", "Only the reporter can acknowledge the fix.");
            if (ticket.status === "resolved") {
              ticket.status = "acknowledged";
              ticket.acknowledged_at = now();
              ticket.updated_at = ticket.acknowledged_at;
              return sendJson(res, 200, serializeTicket(state, ticket));
            }
            if (ticket.status === "acknowledged") return sendError(res, 409, "ALREADY_ACKNOWLEDGED", "The ticket is closed.");
            return sendError(res, 409, "NOT_RESOLVED", "Nothing to acknowledge yet.");
          }

          if (sub === "tat" && method === "PUT") {
            if (!isCm) return sendError(res, 403, "FORBIDDEN", "Only Campus Maintenance can set the turnaround time.");
            if (ticket.status === "resolved" || ticket.status === "acknowledged") {
              return sendError(res, 409, "TICKET_RESOLVED", "A closed or resolved ticket cannot get a turnaround time. Reopen it first.");
            }
            const expectedBy = String(jsonBody.expected_by ?? "").trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedBy) || expectedBy < todayIso()) {
              return sendError(res, 422, "VALIDATION_ERROR", "expected_by must be a YYYY-MM-DD date, today or later.", [{ field: "expected_by", message: "Use YYYY-MM-DD, today or later." }]);
            }
            ticket.tat = {
              expected_by: expectedBy,
              ...(jsonBody.note ? { note: String(jsonBody.note).trim() } : {}),
              updated_by: user.email_id, updated_at: now(),
            };
            ticket.updated_at = now();
            return sendJson(res, 200, serializeTicket(state, ticket));
          }
        }

        if (path === "/fixit/issue-types" && method === "GET") {
          const user = requireAuth(state, req);
          if (!user) return sendError(res, 401, "INVALID_TOKEN", "Provide a valid Bearer token.");
          return sendJson(res, 200, { items: state.issueTypes, count: state.issueTypes.length, next_cursor: null });
        }

        if (path === "/fixit/issue-types" && method === "POST") {
          const user = requireAuth(state, req);
          if (!isCampusMaintenance(user)) return sendError(res, 403, "FORBIDDEN", "Only Campus Maintenance can manage issue types.");
          const name = String(jsonBody.name ?? "").trim();
          if (name.length < 3 || name.length > 80) return sendError(res, 422, "VALIDATION_ERROR", "Name must be 3-80 characters.");
          if (state.issueTypes.some((it) => it.name.toLowerCase() === name.toLowerCase())) {
            return sendError(res, 409, "ALREADY_EXISTS", "An issue type with this name already exists.");
          }
          const stamp = now();
          const issueType = {
            issue_type_id: makeId("ITY"), name,
            ...(jsonBody.description ? { description: String(jsonBody.description).trim() } : {}),
            created_by: user.email_id, created_at: stamp, updated_at: stamp,
          };
          state.issueTypes.push(issueType);
          return sendJson(res, 201, issueType);
        }

        const issueTypeMatch = /^\/fixit\/issue-types\/([^/]+)$/.exec(path);
        if (issueTypeMatch) {
          const user = requireAuth(state, req);
          if (!isCampusMaintenance(user)) return sendError(res, 403, "FORBIDDEN", "Only Campus Maintenance can manage issue types.");
          const issueType = state.issueTypes.find((it) => it.issue_type_id === issueTypeMatch[1]);
          if (!issueType) return sendError(res, 404, "NOT_FOUND", "Issue type does not exist.");
          if (method === "PATCH") {
            if (jsonBody.name !== undefined) {
              const name = String(jsonBody.name).trim();
              if (name.length < 3 || name.length > 80) return sendError(res, 422, "VALIDATION_ERROR", "Name must be 3-80 characters.");
              if (state.issueTypes.some((it) => it.issue_type_id !== issueType.issue_type_id && it.name.toLowerCase() === name.toLowerCase())) {
                return sendError(res, 409, "ALREADY_EXISTS", "An issue type with this name already exists.");
              }
              issueType.name = name;
            }
            if (jsonBody.description !== undefined) issueType.description = String(jsonBody.description).trim();
            issueType.updated_at = now();
            return sendJson(res, 200, issueType);
          }
          if (method === "DELETE") {
            state.issueTypes = state.issueTypes.filter((it) => it.issue_type_id !== issueType.issue_type_id);
            return sendJson(res, 204, {});
          }
        }

        return sendError(res, 404, "NOT_FOUND", `Route ${method} ${path} does not exist. See /docs for available endpoints.`);
      });
    },
  };
}
