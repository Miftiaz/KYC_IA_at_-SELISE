// serv.test.js
import { jest } from "@jest/globals";

// -------------------------
// 1. Mongoose Mock (MUST come first)
// -------------------------
jest.unstable_mockModule("mongoose", () => {
  let applicationModel;
  let adminModel;

  const modelMock = jest.fn((name, schema) => {
    if (name === "Application") {
      applicationModel = jest.fn(function(doc = {}) {
        Object.assign(this, doc);
        this.save = jest.fn(async () => {
          if (!this._id) {
            this._id = "mocked-id-123";
          }
          return this;
        });
      });
      applicationModel.findOne = jest.fn();
      applicationModel.create = jest.fn();
      applicationModel.find = jest.fn();
      applicationModel.findById = jest.fn();
      applicationModel.findByIdAndUpdate = jest.fn();
      return applicationModel;
    } else if (name === "Admin") {
      adminModel = jest.fn(function(doc = {}) {
        Object.assign(this, doc);
      });
      adminModel.findOne = jest.fn();
      adminModel.create = jest.fn();
      return adminModel;
    }
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

    // Get AdminModel from mongoose.model mock
    const AdminModel = mongoose.model.mock.results[1].value;
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

    // Get ApplicationModel from mongoose.model mock
    const ApplicationModel = mongoose.model.mock.results[0].value;
    const mockInstance = new ApplicationModel(payload);
    mockInstance._id = "mocked-id-123";
    mockInstance.save.mockResolvedValue(mockInstance);

    const res = await request(app).post("/api/applications").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Application submitted successfully");
    expect(res.body.applicationId).toBe("mocked-id-123");
  });
});
