const { Server } = require("socket.io");
const { allowedOrigins } = require("./config/env");

let io;
const activeWorkers = new Map(); // workerId (string) -> socketId

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const normalized = origin.replace(/\/$/, "");
          if (
            allowedOrigins.includes(normalized) ||
            allowedOrigins.includes(origin) ||
            normalized.endsWith(".vercel.app")
          ) {
            return callback(null, true);
          }
          return callback(new Error("Origin not allowed by CORS"));
        },
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // ── Worker Registration ──────────────────────────────────────────
      // Workers call this right after login so we can target them for orders
      socket.on("register_worker", async (data) => {
        if (data && data.workerId) {
          activeWorkers.set(String(data.workerId), socket.id);
          try {
            const mongoose = require("mongoose");
            const Worker = require("./models/Worker.js");
            if (mongoose.Types.ObjectId.isValid(data.workerId)) {
              const workerDoc = await Worker.findOne({
                $or: [{ _id: data.workerId }, { user: data.workerId }],
              });
              if (workerDoc) {
                activeWorkers.set(String(workerDoc._id), socket.id);
                if (workerDoc.user) activeWorkers.set(String(workerDoc.user), socket.id);
                console.log(`[Socket] Registered worker socket mapping: worker ${workerDoc._id} / user ${workerDoc.user} -> socket ${socket.id}`);
              }
            }
          } catch (e) {
            console.error("[Socket] register_worker error:", e.message);
          }
        }
      });

      // ── Worker Accepts Order ─────────────────────────────────────────
      socket.on("accept_order", async (data) => {
        // data = { orderId, workerId }
        let bookingData = null;
        try {
          const mongoose = require("mongoose");
          const Booking = require("./models/Booking.js");
          const Worker = require("./models/Worker.js");

          const isObjectId = mongoose.Types.ObjectId.isValid(data.orderId);
          const query = isObjectId
            ? { $or: [{ _id: data.orderId }, { bookingNumber: data.orderId }] }
            : { bookingNumber: data.orderId };

          const existing = await Booking.findOne(query);
          if (existing) {
            let workerObj = null;
            if (data.workerId && mongoose.Types.ObjectId.isValid(data.workerId)) {
              // Try finding by Worker._id OR User._id
              workerObj = await Worker.findOne({
                $or: [{ _id: data.workerId }, { user: data.workerId }],
              }).populate("user");
            }

            if (!workerObj) {
              // Fallback to any verified worker
              workerObj = await Worker.findOne().populate("user");
            }

            if (workerObj) {
              existing.worker = workerObj._id;
              if (workerObj.cooperative) existing.cooperative = workerObj.cooperative;
              if (typeof data.lat === "number" && typeof data.lng === "number") {
                workerObj.location = {
                  lat: data.lat,
                  lng: data.lng,
                  address: workerObj.address || "",
                };
                await workerObj.save();
              }
            }

            if (typeof data.lat === "number" && typeof data.lng === "number") {
              existing.workerLiveLocation = {
                lat: data.lat,
                lng: data.lng,
                heading: data.heading || 0,
                speed: data.speed || 0,
                updatedAt: new Date(),
              };
            }

            existing.status = "ASSIGNED";
            existing.statusHistory.push({
              status: "ASSIGNED",
              note: "Order accepted by worker partner",
              timestamp: new Date(),
            });
            await existing.save();

            bookingData = await Booking.findById(existing._id)
              .populate("customer", "name phone email")
              .populate({
                path: "worker",
                populate: { path: "user", select: "name phone profilePhoto rating" },
              });
          }
        } catch (err) {
          console.error("[Socket] Error updating booking on accept:", err.message);
        }

        // Tell all other workers this order is gone — dismiss their modals
        socket.broadcast.emit("order_accepted_by_other", { orderId: data.orderId });

        // Notify the customer that their worker has been assigned
        io.emit("worker_assigned", {
          orderId: data.orderId,
          bookingNumber: bookingData?.bookingNumber || data.orderId,
          workerId: bookingData?.worker?._id || data.workerId,
          worker: bookingData?.worker || null,
          workerLiveLocation: bookingData?.workerLiveLocation || (typeof data.lat === "number" ? { lat: data.lat, lng: data.lng } : null),
          status: "ASSIGNED",
        });

        if (typeof data.lat === "number" && typeof data.lng === "number") {
          io.emit("worker_location_broadcast", {
            bookingId: data.orderId,
            workerId: data.workerId,
            lat: data.lat,
            lng: data.lng,
            heading: 0,
            speed: 0,
            timestamp: new Date().toISOString(),
          });
        }

        console.log(`[Socket] Order ${data.orderId} assigned to worker ${bookingData?.worker?.user?.name || data.workerId}`);
      });

      // ── Worker Rejects Order ─────────────────────────────────────────
      // data = { orderId, workerId, nextWorkerIds: [string, ...] }
      socket.on("reject_order", (data) => {
        console.log(`[Socket] Worker ${data.workerId} rejected order ${data.orderId}`);

        // Relay to the next worker in the matched list (if provided by frontend)
        const nextIds = Array.isArray(data.nextWorkerIds) ? data.nextWorkerIds : [];
        let relayed = false;
        for (const nextId of nextIds) {
          if (String(nextId) === String(data.workerId)) continue; // skip self
          const targetSocket = activeWorkers.get(String(nextId));
          if (targetSocket) {
            io.to(targetSocket).emit("incoming_order", data.orderPayload);
            console.log(`[Socket] Relayed order ${data.orderId} to next worker ${nextId}`);
            relayed = true;
            break;
          }
        }

        if (!relayed) {
          console.log(`[Socket] No online worker available to relay order ${data.orderId}`);
        }
      });

      // ── Live Worker Location Update (Real GPS) ────────────────────────
      socket.on("worker_location_update", async (data) => {
        // data: { bookingId, workerId, lat, lng, heading, speed }
        if (!data || typeof data.lat !== "number" || typeof data.lng !== "number") return;

        const payload = {
          bookingId: data.bookingId,
          workerId: data.workerId,
          lat: Number(data.lat),
          lng: Number(data.lng),
          heading: data.heading || 0,
          speed: data.speed || 0,
          timestamp: new Date().toISOString(),
        };

        // Broadcast real-time GPS coordinates to all listeners (customer live tracking map)
        io.emit("worker_location_broadcast", payload);

        // Asynchronously persist coordinates on active booking and worker profile
        try {
          const mongoose = require("mongoose");
          const Booking = require("./models/Booking.js");
          const Worker = require("./models/Worker.js");

          if (data.bookingId && mongoose.Types.ObjectId.isValid(data.bookingId)) {
            await Booking.findByIdAndUpdate(data.bookingId, {
              "workerLiveLocation.lat": payload.lat,
              "workerLiveLocation.lng": payload.lng,
              "workerLiveLocation.heading": payload.heading,
              "workerLiveLocation.speed": payload.speed,
              "workerLiveLocation.updatedAt": new Date(),
            });
          }

          if (data.workerId && mongoose.Types.ObjectId.isValid(data.workerId)) {
            await Worker.findOneAndUpdate(
              { $or: [{ _id: data.workerId }, { user: data.workerId }] },
              { "location.lat": payload.lat, "location.lng": payload.lng }
            );
          }
        } catch (err) {
          console.warn("[Socket] Failed saving live GPS to DB:", err.message);
        }
      });

      // ── Disconnect ───────────────────────────────────────────────────
      socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
        for (const [workerId, socketId] of activeWorkers.entries()) {
          if (socketId === socket.id) {
            activeWorkers.delete(workerId);
            console.log(`[Socket] Worker ${workerId} removed from active tracking`);
            break;
          }
        }
      });
    });

    return io;
  },

  getIo: () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  },

  getActiveWorkers: () => activeWorkers,

  /**
   * Emit an event to a targeted list of online workers only.
   * workerIds: string[] — MongoDB worker._id values
   */
  emitToMatchedWorkers: (workerIds, event, payload) => {
    if (!io) return;
    let sent = 0;
    for (const wId of workerIds) {
      const socketId = activeWorkers.get(String(wId));
      if (socketId) {
        io.to(socketId).emit(event, payload);
        sent++;
      }
    }
    console.log(`[Socket] Emitted "${event}" to ${sent}/${workerIds.length} online matched workers`);
    return sent;
  },
};
