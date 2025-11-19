// serv.test.js
import { jest } from "@jest/globals";

// -------------------------
// 1. Mongoose Mock (MUST come first)
// -------------------------
jest.unstable_mockModule("mongoose", () => {
  const modelMock = jest.fn((name, schema) => {
    class Model {
      constructor(doc = {}) {
        Object.assign(this, doc);
        this.save = jest.fn(async () => {
          if (!this._id) {
            this._id = "mocked-id-123";
          }
          return this;
        });
      }
    }

    Model.findOne = jest.fn();
    Model.create = jest.fn();
    Model.find = jest.fn();
    Model.findById = jest.fn();
    Model.findByIdAndUpdate = jest.fn();

    return Model;
  });

  return {
    default: {
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(true),
      model: modelMock,
      Schema: jest.fn(),
    },
  };
});

// -------------------------
// 2. Mock AI Summary adapter
// -------------------------
jest.unstable_mockModule("./AISummaryAdapter.js", () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      generate: jest.fn().mockResolvedValue("Mocked AI summary text"),
    })),
  };
});

// -------------------------
// 3. Mock RabbitMQ publisher
// -------------------------
jest.unstable_mockModule("./rabbitmqConfig.js", () => {
  return {
    publishPDFTask: jest.fn().mockResolvedValue(true),
  };
});

// -------------------------
// 4. Import after mocks are ready
// -------------------------
const mongoose = (await import("mongoose")).default;
const { default: app } = await import("./server.js");

import request from "supertest";
import bcrypt from "bcryptjs";

const modelMockFn = mongoose.model;
const ApplicationModel = modelMockFn.mock.results[0].value;
const AdminModel = modelMockFn.mock.results[1].value;

// -------------------------
// TEST SUITE
// -------------------------
describe("KYC Backend API Tests", () => {
  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("GET /api/health should return OK", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("POST /api/admin/login should return token for valid credentials", async () => {
    const hashed = await bcrypt.hash("admin123", 10);

    const fakeAdmin = {
      _id: "admin-id-1",
      username: "admin",
      password: hashed,
    };

    AdminModel.findOne.mockResolvedValue(fakeAdmin);

    const res = await request(app)
      .post("/api/admin/login")
      .send({ username: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.username).toBe("admin");
    expect(AdminModel.findOne).toHaveBeenCalledWith({ username: "admin" });
  });

  test("POST /api/applications should create application", async () => {
    const payload = {
      fullName: "John Doe",
      dateOfBirth: "1999-01-01",
      email: "test@example.com",
      phone: "0123456789",
      profession: "Engineer",
      address: "Dhaka",
      idNumber: "ABCD1234",
      idType: "passport",
    };

    // Ensure instances of Application have save mocked in prototype
    ApplicationModel.prototype.save = jest.fn(async function () {
      this._id = "mocked-id-123";
      return this;
    });

    const res = await request(app).post("/api/applications").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Application submitted successfully");
    expect(res.body.applicationId).toBe("mocked-id-123");

    // Just assert save was called somewhere
    expect(ApplicationModel.prototype.save).toHaveBeenCalled();
  });
});
