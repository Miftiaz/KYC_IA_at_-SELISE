// pdf.test.js
import { jest } from "@jest/globals";

// -------------------------
// 1. Mocks (must come first)
// -------------------------

// Track write streams by path
const writeStreams = {};

// fs mock
jest.unstable_mockModule("fs", () => {
  return {
    default: {
      existsSync: jest.fn(() => true),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn((filePath) => {
        const listeners = {};
        const stream = {
          on: (event, cb) => {
            listeners[event] = cb;
            return stream;
          },
          emit: (event, ...args) => {
            if (listeners[event]) listeners[event](...args);
          }
        };
        writeStreams[filePath] = stream;
        return stream;
      })
    }
  };
});

// path mock – track join calls
let lastPathJoin = "";
jest.unstable_mockModule("path", () => {
  return {
    default: {
      join: jest.fn((...parts) => {
        const result = parts.join("/");
        lastPathJoin = result;
        return result;
      }),
    }
  };
});

// pdfkit mock
const pipeMock = jest.fn();
const endMock = jest.fn();
const textMock = jest.fn().mockReturnThis();
const moveDownMock = jest.fn().mockReturnThis();
const fontSizeMock = jest.fn().mockReturnThis();

const PDFDocumentMock = jest.fn().mockImplementation(() => ({
  pipe: pipeMock,
  end: endMock,
  text: textMock,
  moveDown: moveDownMock,
  fontSize: fontSizeMock
}));

jest.unstable_mockModule("pdfkit", () => ({
  default: PDFDocumentMock
}));

// mongoose mock
const findByIdMock = jest.fn();
const findByIdAndUpdateMock = jest.fn();

jest.unstable_mockModule("mongoose", () => {
  return {
    default: {
      connect: jest.fn().mockResolvedValue(true),
      Schema: jest.fn(),
      model: jest.fn(() => ({
        findById: findByIdMock,
        findByIdAndUpdate: findByIdAndUpdateMock,
      })),
    }
  };
});

// rabbitmqConfig mock (same folder as pdfWorker.js)
const consumePDFTasksMock = jest.fn();
jest.unstable_mockModule("./rabbitmqConfig.js", () => ({
  consumePDFTasks: consumePDFTasksMock
}));

// -------------------------
// 2. Import module under test
// -------------------------
const mongoose = (await import("mongoose")).default;
const fs = (await import("fs")).default;

const { generatePDF } = await import("./pdfWorker.js");

// -------------------------
// 3. Tests
// -------------------------
describe("PDF Worker - generatePDF", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(writeStreams)) delete writeStreams[k];
  });

  afterAll(async () => {
    if (mongoose.disconnect) {
      await mongoose.disconnect();
    }
  });

  test("creates PDF and updates application when approved", async () => {
    const appDoc = {
      _id: "abc123",
      status: "approved",
      fullName: "John Doe",
      dateOfBirth: new Date("1990-01-01"),
      email: "john@example.com",
      phone: "0123456789",
      profession: "Engineer",
      address: "Dhaka",
      idType: "passport",
      idNumber: "ABCD1234",
      summary: "Sample summary text",
      submittedAt: new Date("2025-01-01T10:00:00Z"),
      processedAt: new Date("2025-01-01T12:00:00Z"),
    };

    findByIdMock.mockResolvedValue(appDoc);

    const promise = generatePDF("abc123");

    // Give it time to call createWriteStream
    await new Promise(resolve => setTimeout(resolve, 10));

    // Find the stream that was created (key should contain kyc-abc123.pdf)
    const streamKeys = Object.keys(writeStreams);
    const streamKey = streamKeys.find(k => k.includes("kyc-abc123.pdf"));
    const stream = writeStreams[streamKey];

    expect(stream).toBeDefined();

    // Let generatePDF attach listeners
    await Promise.resolve();
    // Simulate finishing the write stream
    stream.emit("finish");

    await promise;

    // PDFDocument created
    expect(PDFDocumentMock).toHaveBeenCalledWith({ margin: 50 });
    expect(pipeMock).toHaveBeenCalled();

    // Some text calls
    expect(fontSizeMock).toHaveBeenCalled();
    expect(textMock).toHaveBeenCalled();

    // DB updated
    expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
      "abc123",
      expect.objectContaining({
        pdfGenerated: true,
        pdfPath: expect.any(String)
      })
    );

    expect(endMock).toHaveBeenCalled();
  });

  test("skips PDF generation if application not approved", async () => {
    findByIdMock.mockResolvedValue({
      _id: "xyz789",
      status: "pending"
    });

    await generatePDF("xyz789");

    expect(PDFDocumentMock).not.toHaveBeenCalled();
    expect(findByIdAndUpdateMock).not.toHaveBeenCalled();
  });

  test("logs and returns when application not found", async () => {
    findByIdMock.mockResolvedValue(null);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await generatePDF("missing-id");

    expect(PDFDocumentMock).not.toHaveBeenCalled();
    expect(findByIdAndUpdateMock).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
