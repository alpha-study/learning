import { describe, expect, it } from "vitest";
import { buildCreateLectureRequestBody, buildUpdateLectureRequestBody } from "./course";
import {
  displayChapterTitle,
  mergeLectureListItems,
  parseLectureListResponse,
} from "./course-curriculum";

describe("parseLectureListResponse", () => {
  it("maps GET /lectures row title to chapterTitle", () => {
    const rows = [
      {
        id: 1,
        courseId: 6,
        title: "Intro",
        videoFileId: 1,
        createdAt: "2026-05-15T12:53:45.000Z",
        updatedAt: "2026-05-15T12:53:45.000Z",
        deletedAt: null,
        videoPath: { path: "courses/1/master.m3u8" },
      },
    ];
    expect(parseLectureListResponse(rows)).toEqual([
      {
        id: "1",
        chapterTitle: "Intro",
        videoPreviewUrl: expect.stringContaining("courses/1/master.m3u8"),
        videoFileId: 1,
      },
    ]);
  });

  it("unwraps { data: lectures[] } envelopes", () => {
    const rows = [{ id: 2, title: "Basics", deletedAt: null }];
    expect(parseLectureListResponse({ data: rows })).toEqual([
      expect.objectContaining({ id: "2", chapterTitle: "Basics" }),
    ]);
  });

  it("ignores empty rows when data has lectures", () => {
    const lectures = [{ id: 6, title: "Intro", deletedAt: null }];
    expect(parseLectureListResponse({ rows: [], data: lectures })).toEqual([
      expect.objectContaining({ id: "6", chapterTitle: "Intro" }),
    ]);
  });
});

describe("mergeLectureListItems", () => {
  it("fills chapterTitle from secondary when primary is empty", () => {
    const primary = [{ id: "1", chapterTitle: "" }];
    const secondary = [{ id: "1", chapterTitle: "Intro" }];
    expect(mergeLectureListItems(primary, secondary)).toEqual([
      { id: "1", chapterTitle: "Intro" },
    ]);
  });
});

describe("displayChapterTitle", () => {
  it("shows API lecture title on course view", () => {
    expect(displayChapterTitle({ chapterTitle: "Intro" }, 0)).toBe("Intro");
  });
});

describe("buildCreateLectureRequestBody", () => {
  it("sends title for POST /api/course/lecture/create", () => {
    const body = buildCreateLectureRequestBody(
      { courseId: "23", chapterTitle: "Electric Charges and Fields", video: new File([], "x.mp4") },
      42
    );
    expect(body.title).toBe("Electric Charges and Fields");
    expect(body.courseId).toBe(23);
    expect(body.assetFileId).toBe(42);
    expect(body.videoFileId).toBe(42);
  });
});

describe("buildUpdateLectureRequestBody", () => {
  it("sends title and videoFileId for PUT /api/course/lecture/update/{id}", () => {
    const body = buildUpdateLectureRequestBody({
      lectureId: "5",
      courseId: "23",
      chapterTitle: "Updated chapter",
      videoFileId: 9,
    });
    expect(body.title).toBe("Updated chapter");
    expect(body.courseId).toBe(23);
    expect(body.assetFileId).toBe(9);
    expect(body.videoFileId).toBe(9);
  });
});
