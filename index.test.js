const axios = require("axios");
const WebSocket = require("ws");

// Load environment variables
const HTTP_URL = process.env.HTTP_URL || "http://localhost:3000/api/v1";
const WS_URL = process.env.WS_URL || "ws://localhost:3000";

describe("HTTP API Tests", () => {
  let userToken;
  let sessionId;

  // Test the signup endpoint
  it("should sign up a new user", async () => {
    const response = await axios.post(`${HTTP_URL}/signup`, {
      email: "user@example.com",
      password: "password123",
      username: "john_doe",
    });

    expect(response.status).toBe(201);
    expect(response.data.message).toBe("User created successfully");
    expect(response.data.userId).toBeDefined();
    expect(response.data.email).toBe("user@example.com");

    // Store userId to be used in future tests
    userToken = response.data.userId;
  });

  it("should return 400 statuscode on invalid input", async () => {
    try {
      await axios.post(`${HTTP_URL}/signin`, {
        email: "user",
        password: "password123",
        username: "john_doe",
      });
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });

  it("should return 409 on creation of conflicting userdata", async () => {
    try {
      await axios.post(`${HTTP_URL}/signup`, {
        email: "user@example.com",
        password: "password123",
        username: "john_doe",
      });
    } catch (error) {
      expect(error.response.status).toBe(409);
    }
  });

  // Test the signin endpoint
  it("should sign in an existing user", async () => {
    const response = await axios.post(`${HTTP_URL}/signin`, {
      email: "user@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();

    // Store the token for WebSocket testing
    userToken = response.data.token;
  });

  it("should return 401 on invalid creds", async () => {
    try {
      await axios.post(`${HTTP_URL}/signin`, {
        email: "user@example.com",
        password: "secret",
      });
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  it("should return 400 on invalid creds", async () => {
    try {
      await axios.post(`${HTTP_URL}/signin`, {
        email: "user@example.com",
      });
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });

  // Test create session
  it("should create a new session", async () => {
    const response = await axios.post(
      `${HTTP_URL}/session`,
      { title: "Full Stack cohort class #1" },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.sessionId).toMatch(/^[a-z]{3}-[a-z]{3}-[a-z]{3}$/);
    sessionId = response.data.sessionId;
  });

  it("should return 401 on unauthorized", async () => {
    try {
      await axios.post(
        `${HTTP_URL}/session`,
        { title: "Full Stack cohort class #2" },
        {
          headers: {
            Authorization: `Bearer ${userToken}invalid`,
          },
        },
      );
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  it("should return 500 on server error", async () => {
    try {
      await axios.post(
        `${HTTP_URL}/session`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );
    } catch (error) {
      expect(response.status).toBe(500);
    }
  });

  // Test get all sessions
  it("should get all sessions", async () => {
    const response = await axios.get(`${HTTP_URL}/sessions`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data[0]).toHaveProperty("sessionId");
    expect(response.data[0]).toHaveProperty("title");
  });

  it("should return 401 on unauthorized", async () => {
    try {
      await axios.get(`${HTTP_URL}/sessions`, {
        headers: {
          Authorization: `Bearer ${userToken}invalid`,
        },
      });
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  // Test start a session
  it("should return 401 on unauthorized", async () => {
    try {
      await axios.post(
        `${HTTP_URL}/session/${sessionId}/start`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userToken}invalid`,
          },
        },
      );
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  it("should start a session", async () => {
    const response = await axios.post(
      `${HTTP_URL}/session/${sessionId}/start`,
      {},
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.message).toBe("Session started successfully");
  });

  it("should return 404 on invalid session id", async () => {
    try {
      await axios.post(
        `${HTTP_URL}/session/nonexistingsession/start`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });

  it("should return 400 on starting a session that is already started", async () => {
    try {
      await axios.post(
        `${HTTP_URL}/session/${sessionId}/start`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });

  // Test end a session
  it("should end a session", async () => {
    const response = await axios.post(
      `${HTTP_URL}/session/${sessionId}/end`,
      {},
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.message).toBe("Session ended successfully");
  });

  it("should return 404 on not found", async () => {
    try {
      await axios.post(
        `${HTTP_URL}/session/nonexistingsession/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });

  it("should return 400 on bad request", async () => {
    const res1 = await axios.post(
      `${HTTP_URL}/session`,
      { title: "Full Stack cohort class #2" },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    );

    try {
      await axios.post(
        `${HTTP_URL}/session/${res1.data.sessionId}/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
});

describe("WebSocket Tests", () => {
  let ws;
  let userToken;
  let sessionId;

  // Before all tests, sign up, sign in, and create a session
  beforeAll(async () => {
    // Sign up a user
    await axios.post(`${HTTP_URL}/signup`, {
      email: "user@example.com",
      password: "password123",
      username: "john_doe",
    });

    // Sign in to get the token
    const signinResponse = await axios.post(`${HTTP_URL}/signin`, {
      email: "user@example.com",
      password: "password123",
    });
    userToken = signinResponse.data.token;

    // Create a new session
    const sessionResponse = await axios.post(
      `${HTTP_URL}/session`,
      { title: "Full Stack cohort class #1" },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    );
    sessionId = sessionResponse.data.sessionId;
  });

  // WebSocket test for subscribing and sending messages
  it("should connect to WebSocket server and send messages", (done) => {
    // Connect to the WebSocket server with the token in the URL
    ws = new WebSocket(`${WS_URL}?token=${userToken}`);

    ws.on("open", () => {
      console.log("WebSocket connected");

      // Subscribe to the room
      const subscribeMessage = {
        type: "SUBSCRIBE",
        payload: { roomId: sessionId },
      };
      ws.send(JSON.stringify(subscribeMessage));

      // Send a chat message
      const chatMessage = {
        type: "CHAT_MESSAGE",
        payload: { message: "Hello, World!" },
      };

      // Expect the message to be received
      ws.on("message", (data) => {
        const response = JSON.parse(data.toString());
        if (response.type === "CHAT_MESSAGE") {
          expect(response.payload.message).toBe("Hello, World!");
          done();
        }
      });
      ws.send(JSON.stringify(chatMessage));
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
      done(err);
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });
  });

  // Test sending a stroke event
  it("should send a stroke event to all clients", (done) => {
    ws = new WebSocket(`${WS_URL}?token=${userToken}`);

    ws.on("open", () => {
      const subscribeMessage = {
        type: "SUBSCRIBE",
        payload: { roomId: sessionId },
      };
      ws.send(JSON.stringify(subscribeMessage));
      const strokeMessage = {
        type: "STROKE",
        payload: { x: 100, y: 150, color: "#ff0000", size: 2 },
      };

      ws.on("message", (data) => {
        const response = JSON.parse(data.toString());
        if (response.type === "STROKE") {
          expect(response.payload.color).toBe("#ff0000");
          done();
        }
      });
      ws.send(JSON.stringify(strokeMessage));
    });
  });

  // Test clearing a slide
  it("should clear the slide for all clients", (done) => {
    ws = new WebSocket(`${WS_URL}?token=${userToken}`);

    ws.on("open", () => {
      const subscribeMessage = {
        type: "SUBSCRIBE",
        payload: { roomId: sessionId },
      };
      ws.send(JSON.stringify(subscribeMessage));

      const clearMessage = {
        type: "CLEAR_SLIDE",
        sessionId,
      };

      ws.on("message", (data) => {
        const response = JSON.parse(data.toString());
        if (response.type === "CLEAR_SLIDE") {
          expect(response.sessionId).toBe(sessionId);
          done();
        }
      });
      ws.send(JSON.stringify(clearMessage));
    });
  });
});

describe("WebSocket Tests", () => {
  let ownerToken;
  let nonOwnerToken;
  let sessionId;

  beforeAll(async () => {
    await axios.post(`${HTTP_URL}/signup`, {
      email: "owner@example.com",
      password: "password123",
      username: "john_doe",
    });

    const ownerSigninResponse = await axios.post(`${HTTP_URL}/signin`, {
      email: "owner@example.com",
      password: "password123",
    });
    ownerToken = ownerSigninResponse.data.token;

    await axios.post(`${HTTP_URL}/signup`, {
      email: "user@example.com",
      password: "password123",
      username: "janedoe",
    });

    const nonOwnerSigninResponse = await axios.post(`${HTTP_URL}/signin`, {
      email: "user@example.com",
      password: "password123",
    });
    nonOwnerToken = nonOwnerSigninResponse.data.token;

    // Create a session for the owner
    const sessionResponse = await axios.post(
      `${HTTP_URL}/session`,
      { title: "Full Stack cohort class #1" },
      {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      },
    );
    sessionId = sessionResponse.data.sessionId;
  });

  it("should ensure WebSocket events reach all subscribers", (done) => {
    const ownerWs = new WebSocket(`${WS_URL}?token=${ownerToken}`);
    const nonOwnerWs = new WebSocket(`${WS_URL}?token=${nonOwnerToken}`);

    let messageReceived = false;

    ownerWs.on("open", () => {
      // Owner subscribes to the room
      const subscribeMessage = {
        type: "SUBSCRIBE",
        payload: { roomId: sessionId },
      };
      ownerWs.send(JSON.stringify(subscribeMessage));

      nonOwnerWs.on("open", () => {
        // Non-owner subscribes to the room
        const subscribeMessage = {
          type: "SUBSCRIBE",
          payload: { roomId: sessionId },
        };
        nonOwnerWs.send(JSON.stringify(subscribeMessage));

        // Owner sends a stroke event
        const strokeMessage = {
          type: "STROKE",
          payload: { x: 200, y: 250, color: "#ff0000", size: 3 },
        };

        // Non-owner should receive the stroke event
        nonOwnerWs.on("message", (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === "STROKE") {
            expect(response.payload.color).toBe("#ff0000");
            messageReceived = true;
          }

          if (messageReceived) {
            done();
          }
        });
        ownerWs.send(JSON.stringify(strokeMessage));
      });
    });

    ownerWs.on("error", (err) => {
      console.error("WebSocket error:", err);
      done(err);
    });

    nonOwnerWs.on("error", (err) => {
      console.error("WebSocket error:", err);
      done(err);
    });
  });
});
