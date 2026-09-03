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
      socket.on("register_worker", (data) => {
        if (data && data.workerId) {
          activeWorkers.set(String(data.workerId), socket.id);
          console.log(`[Socket] Worker ${data.workerId} registered (socket: ${socket.id})`);
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
            // Only claim if still PENDING or already assigned to this worker
            if (
              existing.status === "PENDING" ||
              (existing.worker && existing.worker.toString() === String(data.workerId))
            ) {
              existing.status = "ASSIGNED";
              if (data.workerId && mongoose.Types.ObjectId.isValid(data.workerId)) {
                const worker = await Worker.findById(data.workerId);
                existing.worker = data.workerId;
                if (worker) existing.cooperative = worker.cooperative;
              }
              existing.statusHistory.push({
                status: "ASSIGNED",
                note: "Order accepted by worker partner",
                timestamp: new Date(),
              });
              await existing.save();
            }
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
          workerId: data.workerId,
          worker: bookingData?.worker || null,
          status: "ASSIGNED",
        });

        console.log(`[Socket] Worker ${data.workerId} accepted order ${data.orderId}`);
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
