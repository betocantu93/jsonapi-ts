import { HttpStatusCode, JsonApiError, ResourceAttributes } from "./types";

const jsonApiErrors = {
  UnhandledError: (): JsonApiError => ({
    status: HttpStatusCode.InternalServerError,
    code: "unhandled_error"
  }),

  AccessDenied: (): JsonApiError => ({
    status: HttpStatusCode.Forbidden,
    code: "access_denied"
  }),

  Unauthorized: (): JsonApiError => ({
    status: HttpStatusCode.Unauthorized,
    code: "unauthorized"
  }),

  RecordNotExists: (): JsonApiError => ({
    status: HttpStatusCode.NotFound,
    code: "not_found"
  }),

  InvalidPayload: ({ detail }: { detail: string }): JsonApiError => ({
    detail,
    status: HttpStatusCode.BadRequest,
    code: "invalid_payload"
  })
};

export default jsonApiErrors;
