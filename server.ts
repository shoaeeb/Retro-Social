import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";

const app = express();
const PORT = 3000;
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

// Set up MongoDB Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String },
  mood: { type: String, default: "happy" },
  customMood: { type: String },
  interests: {
    general: { type: String, default: "" },
    music: { type: String, default: "" },
    movies: { type: String, default: "" },
  },
  showHitCount: { type: Boolean, default: true },
  hitCount: { type: Number, default: 0 },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});
const User = mongoose.models.User || mongoose.model<any>("User", UserSchema);

const PostSchema = new mongoose.Schema({
  authorPath: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Post = mongoose.models.Post || mongoose.model<any>("Post", PostSchema);

const FriendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  fromName: String,
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["pending", "accepted", "denied"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});
const FriendRequest =
  mongoose.models.FriendRequest ||
  mongoose.model<any>("FriendRequest", FriendRequestSchema);

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});
const Message =
  mongoose.models.Message || mongoose.model<any>("Message", MessageSchema);

const BlogSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Blog = mongoose.models.Blog || mongoose.model<any>("Blog", BlogSchema);

const GuestbookSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  authorName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Guestbook =
  mongoose.models.Guestbook ||
  mongoose.model<any>("Guestbook", GuestbookSchema);

const EventSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: false },
  date: { type: Date, required: true },
  location: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});
const EventModel =
  mongoose.models.Event || mongoose.model<any>("Event", EventSchema);

// Dummy state for preview without database
const dummyEvents: any[] = [];
const dummyGuestbook: any[] = [];

const dummyBlogs: any[] = [
  {
    _id: "1",
    author: "1",
    title: "My first post",
    content: "This is my first retro blog post! Welcome to my space.",
    createdAt: new Date(),
  },
];

const dummyPosts: any[] = [
  {
    _id: "1",
    authorName: "CyberDude99",
    content: "Just uploaded new pics from the concert! Check them out!",
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    _id: "2",
    authorName: "MusicLover88",
    content: "Anyone have the new Green Day album yet? It's amazing!",
    createdAt: new Date(Date.now() - 7200000),
  },
];

async function startServer() {
  // Connect to DB (soft fail for preview if not provided)
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log("Connected to MongoDB.");
    } catch (err) {
      console.error("Failed to connect to MongoDB:", err);
    }
  } else {
    console.warn("MONGODB_URI not provided. Auth will fail.");
  }

  // API Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      if (!mongoUri)
        return res.status(500).json({ error: "Database not configured" });

      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ error: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ name, email, password: hashedPassword });
      await user.save();

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || "changeme123",
        { expiresIn: "1d" }
      );
      res.json({ token, user: { name: user.name, email: user.email } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      if (!mongoUri)
        return res.status(500).json({ error: "Database not configured" });

      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ error: "Invalid credentials" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || "changeme123",
        { expiresIn: "1d" }
      );
      res.json({ token, user: { name: user.name, email: user.email } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      if (!process.env.MONGODB_URI) {
        return res.json({
          _id: "123",
          name: "User123",
          email: "user@example.com",
          mood: "coding",
          customMood: "",
        });
      }

      const user = await User.findById(decoded.userId).select("-password");
      if (!user) return res.status(404).json({ error: "User not found" });

      // Increment hit count if we view our own profile? No, usually it's for public.
      // But for demo, we'll just return it.

      res.json(user);
    } catch (err) {
      res.status(401).json({ error: "Unauthorized" });
    }
  });

  app.get("/api/users/me/friends", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ error: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      if (!process.env.MONGODB_URI) return res.json([]);
      const user = await User.findById(decoded.userId).populate(
        "friends",
        "name displayName"
      );
      res.json(user?.friends || []);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  app.put("/api/users/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      const { displayName, mood, customMood, interests, showHitCount } =
        req.body;

      const user = await User.findByIdAndUpdate(
        decoded.userId,
        { displayName, mood, customMood, interests, showHitCount },
        { new: true }
      ).select("-password");

      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/users/me/hit", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      const user = await User.findByIdAndUpdate(
        decoded.userId,
        { $inc: { hitCount: 1 } },
        { new: true }
      ).select("-password");
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      if (!process.env.MONGODB_URI) {
        // Return dummy posts if no DB
        return res.json(
          [...dummyPosts].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          )
        );
      }
      const posts = await Post.find().sort({ createdAt: -1 }).limit(20);
      res.json(posts);
    } catch (err) {
      res.status(500).json({ error: "Failed fetching posts" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      if (!process.env.MONGODB_URI) {
        const newPost = {
          _id: Date.now().toString(),
          authorName: "Demo User",
          content: req.body.content,
          createdAt: new Date(),
        };
        dummyPosts.push(newPost);
        return res.json(newPost);
      }

      const user = await User.findById(decoded.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const post = new Post({
        authorPath: user._id,
        authorName: user.displayName || user.name,
        content: req.body.content,
      });
      await post.save();

      res.json(post);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/blogs/:userId", async (req, res) => {
    try {
      if (!process.env.MONGODB_URI) {
        return res.json(
          dummyBlogs
            .filter((b) => b.author === req.params.userId || b.author === "1")
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        );
      }
      const blogs = await Blog.find({ author: req.params.userId }).sort({
        createdAt: -1,
      });
      res.json(blogs);
    } catch (err) {
      console.error("BLOG GET ERROR:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/blogs", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      if (!process.env.MONGODB_URI) {
        const newBlog = {
          _id: Date.now().toString(),
          author: decoded.userId,
          title: req.body.title,
          content: req.body.content,
          createdAt: new Date(),
        };
        dummyBlogs.push(newBlog);
        return res.json(newBlog);
      }

      const blog = new Blog({
        author: decoded.userId,
        title: req.body.title,
        content: req.body.content,
      });
      await blog.save();

      // Auto-create a Post to announce the blog
      const user = await User.findById(decoded.userId);
      if (user) {
        const post = new Post({
          authorPath: user._id,
          authorName: user.displayName || user.name,
          content: `I just published a new blog entry: "${req.body.title}"! Check it out on my profile.`,
        });
        await post.save();
      }

      res.json(blog);
    } catch (err) {
      console.error("BLOG POST ERROR:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/events/:userId", async (req, res) => {
    try {
      if (!process.env.MONGODB_URI) {
        return res.json(
          dummyEvents
            .filter((e) => e.ownerId === req.params.userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        );
      }
      const events = await EventModel.find({ ownerId: req.params.userId }).sort(
        { createdAt: -1 }
      );
      res.json(events);
    } catch (err) {
      console.error("EVENT GET ERROR:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/events/:userId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      if (req.params.userId !== decoded.userId) {
        return res
          .status(403)
          .json({
            error:
              "Forbidden. You can only create events for your own profile.",
          });
      }

      if (!process.env.MONGODB_URI) {
        const newEvent = {
          _id: Date.now().toString(),
          ownerId: req.params.userId,
          title: req.body.title,
          description: req.body.description,
          date: req.body.date,
          location: req.body.location,
          createdAt: new Date(),
        };
        dummyEvents.push(newEvent);
        return res.json(newEvent);
      }

      const event = new EventModel({
        ownerId: req.params.userId,
        title: req.body.title,
        description: req.body.description,
        date: req.body.date,
        location: req.body.location,
      });
      await event.save();

      // Auto-create a Post to announce the event
      const user = await User.findById(decoded.userId);
      if (user) {
        const post = new Post({
          authorPath: user._id,
          authorName: user.displayName || user.name,
          content: `I just created a new event: "${
            req.body.title
          }" on ${new Date(
            req.body.date
          ).toLocaleDateString()}! Check my profile for details.`,
        });
        await post.save();
      }

      res.json(event);
    } catch (err) {
      console.error("EVENT POST ERROR:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/guestbook/:userId", async (req, res) => {
    try {
      if (!process.env.MONGODB_URI) {
        return res.json(
          dummyGuestbook
            .filter((g) => g.ownerId === req.params.userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        );
      }
      const entries = await Guestbook.find({ ownerId: req.params.userId }).sort(
        { createdAt: -1 }
      );
      res.json(entries);
    } catch (err) {
      console.error("GUESTBOOK GET ERROR:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/guestbook/:userId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      const authorId = decoded.userId;

      if (!process.env.MONGODB_URI) {
        const newEntry = {
          _id: Date.now().toString(),
          ownerId: req.params.userId,
          authorId,
          authorName: req.body.authorName || "Demo User",
          content: req.body.content,
          createdAt: new Date(),
        };
        dummyGuestbook.push(newEntry);
        return res.json(newEntry);
      }

      const user = await User.findById(authorId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const entry = new Guestbook({
        ownerId: req.params.userId,
        authorId: user._id,
        authorName: user.displayName || user.name,
        content: req.body.content,
      });
      await entry.save();

      // Optionally auto-post if you post on someone else's guestbook
      if (req.params.userId !== authorId.toString()) {
        const ownerUser = await User.findById(req.params.userId);
        if (ownerUser) {
          const post = new Post({
            authorPath: user._id,
            authorName: user.displayName || user.name,
            content: `I just signed ${
              ownerUser.displayName || ownerUser.name
            }'s guestbook! ✍️`,
          });
          await post.save();
        }
      }

      res.json(entry);
    } catch (err) {
      console.error("GUESTBOOK POST ERROR:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/users/featured", async (req, res) => {
    try {
      if (!process.env.MONGODB_URI) {
        return res.json({
          _id: "dummy",
          name: "CoolCat",
          displayName: "CoolCat",
        });
      }
      const featured = await User.findOne()
        .sort({ hitCount: -1 })
        .select("name displayName hitCount");
      if (!featured) return res.status(404).json({ error: "No user found" });
      res.json(featured);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/users/search", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!process.env.MONGODB_URI) {
        // Return dummy data if no DB
        return res.json([
          {
            _id: "1",
            name: "GamerKid05",
            displayName: "GamerKid05",
            interests: { general: "Halo 2, MSN Messenger, Neopets" },
          },
          {
            _id: "2",
            name: "MusicLover88",
            displayName: "MusicLover88",
            interests: { general: "Britney Spears, iPod, Napster" },
          },
          {
            _id: "3",
            name: "Sk8erBoi",
            displayName: "Sk8erBoi",
            interests: { general: "Tony Hawk, Skateboarding, Blink-182" },
          },
        ]);
      }

      const { keyword, type } = req.query;
      let query: any = {};

      if (keyword) {
        const regex = new RegExp(keyword as string, "i");
        if (type === "interests") {
          query = {
            $or: [
              { "interests.general": regex },
              { "interests.music": regex },
              { "interests.movies": regex },
            ],
          };
        } else {
          query = {
            $or: [{ name: regex }, { displayName: regex }],
          };
        }
      }

      const users = await User.find(query)
        .select("name displayName interests")
        .limit(20);
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "Failed to search" });
    }
  });

  app.get("/api/messages/:userId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      const otherUserId = req.params.userId;

      if (!process.env.MONGODB_URI) {
        return res.json([]);
      }

      const messages = await Message.find({
        $or: [
          { sender: decoded.userId, receiver: otherUserId },
          { sender: otherUserId, receiver: decoded.userId },
        ],
      })
        .sort({ createdAt: 1 })
        .populate("sender", "name displayName");

      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select("-password")
        .populate("friends", "name displayName");
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/friends/requests", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ error: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      if (!process.env.MONGODB_URI) {
        return res.json({
          incoming: [
            {
              _id: "dummy1",
              fromName: "CoolCat (Dummy)",
              to: decoded.userId,
              status: "pending",
            },
          ],
          sent: [
            {
              _id: "dummy2",
              to: { name: "Sk8erBoi", displayName: "Sk8erBoi" },
              status: "pending",
            },
          ],
        });
      }

      const incoming = await FriendRequest.find({
        to: decoded.userId,
        status: "pending",
      });
      const sent = await FriendRequest.find({
        from: decoded.userId,
        status: "pending",
      }).populate("to", "name displayName");
      res.json({ incoming, sent });
    } catch (err) {
      res.status(500).json({ error: "Failed to get requests" });
    }
  });

  app.post("/api/friends/request/:paramId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ error: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      if (!process.env.MONGODB_URI) return res.json({ success: true });

      const fromUser = await User.findById(decoded.userId);
      if (!fromUser) return res.status(404).json({ error: "User not found" });

      // Check if already requested
      const existing = await FriendRequest.findOne({
        from: decoded.userId,
        to: req.params.paramId,
        status: "pending",
      });
      if (existing) return res.status(400).json({ error: "Already requested" });

      const reqst = new FriendRequest({
        from: decoded.userId,
        fromName: fromUser.displayName || fromUser.name,
        to: req.params.paramId,
      });
      await reqst.save();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.put("/api/friends/handle/:requestId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ error: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "changeme123"
      ) as { userId: string };

      if (!process.env.MONGODB_URI) return res.json({ success: true });

      const { action } = req.body; // 'accept' or 'deny'
      const freq = await FriendRequest.findById(req.params.requestId);
      if (!freq || freq.to.toString() !== decoded.userId)
        return res.status(404).json({ error: "Not found" });

      freq.status = action === "accept" ? "accepted" : "denied";
      await freq.save();

      if (action === "accept") {
        const u1 = await User.findById(freq.from);
        const u2 = await User.findById(freq.to);
        if (u1 && !u1.friends.includes(u2._id)) {
          u1.friends.push(u2._id);
          await u1.save();
        }
        if (u2 && !u2.friends.includes(u1._id)) {
          u2.friends.push(u1._id);
          await u2.save();
        }
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Socket.io connection handling
  io.on("connection", (socket) => {
    let currentUserId: string | null = null;

    socket.on("authenticate", (token: string) => {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "changeme123"
        ) as { userId: string };
        currentUserId = decoded.userId;
        socket.join(`user:${decoded.userId}`);
      } catch (err) {
        console.error("Socket authentication failed:", err);
      }
    });

    socket.on(
      "sendMessage",
      async (data: { recipientId: string; content: string }) => {
        if (!currentUserId || !process.env.MONGODB_URI) return;

        try {
          const message = new Message({
            sender: currentUserId,
            receiver: data.recipientId,
            content: data.content,
          });
          await message.save();

          const populatedMessage = await message.populate(
            "sender",
            "name displayName"
          );

          io.to(`user:${data.recipientId}`).emit(
            "newMessage",
            populatedMessage
          );

          // Also emit to sender so they can see the message in their own view across tabs, etc.
          // or just local state update in the client for sender, but here we emit back to confirm.
          io.to(`user:${currentUserId}`).emit("messageSent", populatedMessage);
        } catch (err) {
          console.error("Failed to send message:", err);
        }
      }
    );

    socket.on("disconnect", () => {});
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
