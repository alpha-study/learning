/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Vendor REST API base URL (no trailing slash), e.g. https://dev.alpha.study/vendor */
  readonly VITE_API_BASE_URL?: string;
  /**
   * Optional public base for relative image paths from GET /me (no trailing slash).
   * Use when files are not under `/vendor`, e.g. https://dev.alpha.study or https://cdn.example.com
   */
  readonly VITE_VENDOR_MEDIA_BASE_URL?: string;
  /**
   * When `VITE_API_BASE_URL` is a dev proxy path (`/vendor-api`), set this to the API host origin
   * so `users_avtars/...` images load from the real server (optional).
   */
  readonly VITE_VENDOR_ASSET_ORIGIN?: string;
  /** Prefix for public course media paths (default: /assets). `courses/...` → `{origin}{prefix}/courses/...`. */
  readonly VITE_COURSE_MEDIA_ASSETS_PREFIX?: string;
  /** Multipart field name for POST /api/account/update_profile_picture (default: avtarFile). */
  readonly VITE_PROFILE_PICTURE_UPLOAD_FIELD?: string;
  /**
   * POST path for intro video and cover thumbnail (multipart). Same route for both.
   * Defaults to `/api/course/upload_assets`.
   */
  readonly VITE_COURSE_MEDIA_UPLOAD_PATH?: string;
  /** Multipart file field on upload_assets (Postman: assetFile). */
  readonly VITE_COURSE_MEDIA_UPLOAD_FIELD?: string;
  /** JSON property for promotion video file id on POST /api/course/create (default: promotionVideoFileId). */
  readonly VITE_COURSE_CREATE_PROMOTION_VIDEO_FILE_ID_JSON_KEY?: string;
  /** JSON property for cover thumbnail file id on POST /api/course/create (default: coverThumbnailFileId). */
  readonly VITE_COURSE_CREATE_COVER_FILE_ID_JSON_KEY?: string;
  /** JSON key for course description on POST /api/course/create (default: desc). */
  readonly VITE_COURSE_CREATE_JSON_DESC_FIELD?: string;
  /** POST path for saving basic info + media file ids (default: /api/course/create). */
  readonly VITE_COURSE_CREATE_PATH?: string;
  /** GET path for vendor course list (default: /api/course/listing). */
  readonly VITE_COURSE_LISTING_PATH?: string;
  /** GET path for dashboard course counts (default: /api/course/counts). */
  readonly VITE_COURSE_COUNTS_PATH?: string;
  /** GET path for dashboard revenue graph (default: /api/course/revenue_graph). */
  readonly VITE_COURSE_REVENUE_GRAPH_PATH?: string;
  /** GET path for dashboard upload graph (default: /api/course/upload_graph). */
  readonly VITE_COURSE_UPLOAD_GRAPH_PATH?: string;
  /** GET path for single course; use `{id}` (default: /api/course/get/{id}). */
  readonly VITE_COURSE_GET_PATH?: string;
  /** DELETE path for course; use `{id}` (default: /api/course/delete/{id}). */
  readonly VITE_COURSE_DELETE_PATH?: string;
  /** PUT path for course update; use `{id}` (default: /api/course/update/{id}). */
  readonly VITE_COURSE_UPDATE_PATH?: string;
  /** Max promotion / intro video (bytes). Default in app: 1 GB (`1073741824`). */
  readonly VITE_COURSE_PROMO_VIDEO_MAX_BYTES?: string;
  /** Max chapter lecture video (bytes). Default in app: 10 GB (`10737418240`). */
  readonly VITE_COURSE_LECTURE_VIDEO_MAX_BYTES?: string;
  /** Max cover thumbnail (bytes). Default in app: 10 MB. */
  readonly VITE_COURSE_THUMBNAIL_MAX_BYTES?: string;
  /** @deprecated Use VITE_COURSE_THUMBNAIL_MAX_BYTES — fallback for thumbnail only. */
  readonly VITE_COURSE_MEDIA_MAX_FILE_BYTES?: string;
  /**
   * Optional: max combined size in bytes (intro video + thumbnail) before POST /api/course/create.
   * Match this to your API / nginx `client_max_body_size` to fail fast with a clear message.
   */
  readonly VITE_COURSE_CREATE_MAX_TOTAL_BYTES?: string;
  /** POST path for lecture create after upload_assets (default: /api/course/lecture/create). */
  readonly VITE_COURSE_LECTURE_CREATE_PATH?: string;
  /** PUT path for lecture update; use `{id}` (default: /api/course/lecture/update/{id}). */
  readonly VITE_COURSE_LECTURE_UPDATE_PATH?: string;
  /** JSON: course id field on lecture create (default: courseId). */
  readonly VITE_COURSE_LECTURE_CREATE_JSON_COURSE_ID_FIELD?: string;
  /** JSON: lecture title field on lecture create (default: title). */
  readonly VITE_COURSE_LECTURE_CREATE_JSON_CHAPTER_TITLE_FIELD?: string;
  /** JSON: uploaded video file id on lecture create/update (default: assetFileId). */
  readonly VITE_COURSE_LECTURE_CREATE_JSON_VIDEO_FILE_ID_FIELD?: string;
  /** DELETE lecture path; use `{id}` or trailing path + id (default: /api/course/lecture/delete/{id}). */
  readonly VITE_COURSE_LECTURE_DELETE_PATH?: string;
  /**
   * GET lectures for a course; use `{id}` for course id.
   * Default: `/api/course/{id}/lectures`
   */
  readonly VITE_COURSE_LECTURE_LIST_PATH?: string;
  /**
   * GET study materials for a course; use `{id}` for course id.
   * Default: `/api/course/{id}/study_materials`
   */
  readonly VITE_COURSE_STUDY_MATERIAL_LIST_PATH?: string;
  /**
   * GET assessments for a course; use `{id}` for course id.
   * Default: `/api/course/{id}/assessments`
   */
  readonly VITE_COURSE_ASSESSMENT_LIST_PATH?: string;
  /** POST path for assessment create (default: /api/course/assessment/create). */
  readonly VITE_COURSE_ASSESSMENT_CREATE_PATH?: string;
  /** DELETE assessment path; use `{id}` or trailing path + id (default: /api/course/assessment/delete/{id}). */
  readonly VITE_COURSE_ASSESSMENT_DELETE_PATH?: string;
  /** JSON `type` for chapter assessments (default: 1). */
  readonly VITE_COURSE_ASSESSMENT_TYPE?: string;
  /** JSON `type` for graduation exam on assessment create (default: 2). */
  readonly VITE_COURSE_ASSESSMENT_TYPE_GRADUATION?: string;
  /** POST study material create (default: /api/course/study_material/create). */
  readonly VITE_COURSE_STUDY_MATERIAL_CREATE_PATH?: string;
  /** DELETE study material; use `{id}` or path + id (default: /api/course/study_material/delete/{id}). */
  readonly VITE_COURSE_STUDY_MATERIAL_DELETE_PATH?: string;
  /** PATCH request review; use `{id}` (default: /api/courses/{id}/request_review). */
  readonly VITE_COURSE_REQUEST_REVIEW_PATH?: string;
  readonly VITE_RAZORPAY_KEY_ID?: string;
  /** Hosted KYC URL from your backend (Razorpay onboarding / verification link) */
  readonly VITE_RAZORPAY_KYC_URL?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SUPPORT_PHONE?: string;
  readonly VITE_SUPPORT_HOURS?: string;
}
