const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const {
  MongoClient,
  ServerApiVersion,
  Collection,
  ObjectId,
} = require("mongodb");

// Load environment variables from .env file
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// console.log("Stripe Key:", process.env.STRIPE_SECRET_KEY);
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.get("/", (req, res) => {
  res.send(`alhamdulillah, Food website its working on ${PORT}`);
});

const decodedKey = Buffer.from(process.env.FB_PRIVATE_KEY, "base64").toString(
  "utf8",
);
const serviceAccount = JSON.parse(decodedKey);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
console.log("Firebase Admin initialized");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.frt4x83.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    ////////////:::: All Collection Here ::::////////////

    const cartCollection = client.db("food").collection("foodOrder");
    const allFoodItem = client.db("food").collection("allFoodItem");
    const categoryCollection = client.db("food").collection("category");
    const userCollection = client.db("food").collection("user");
    const orderedCollection = client.db("food").collection("ordered");
    const paymentCollection = client.db("food").collection("payment");
    const reviewCollection = client.db("food").collection("review");
    const coverageCollection = client.db("food").collection("coverage");
    const reviewRequestCollection = client
      .db("food")
      .collection("reviewRequest");
    const paymentHistoryCollection = client
      .db("food")
      .collection("paymentHistory");

    // verify //////
    const verifyFBToken = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).send({ message: "unauthorized access" });
        }

        const token = authHeader.split(" ")[1];
// console.log(token);
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();
      } catch (error) {
        console.error("verifyFBToken error:", error.message);
        return res.status(403).send({ message: "forbidden access" });
      }
    };

    const adminVerify = async (req, res, next) => {
      if (!req.decoded?.email) {
        return res.status(403).send({ message: "Forbidden" });
      }
      const email = req.decoded.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      console.log(user.role);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    ////////////:::: all food related APIs ::::////////////

    ////////////:::: category related APIs ::::////////////
    app.get("/category", async (req, res) => {
      const categoryList = await categoryCollection.find().toArray();
      res.send(categoryList);
    });

    app.post("/category", verifyFBToken, adminVerify, async (req, res) => {
      const newCategory = req.body;
      const result = await categoryCollection.insertOne(newCategory);
      res.send(result);
    });

    app.delete(
      "/category/:id",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await categoryCollection.deleteOne(query);
        res.send(result);
      },
    );

    app.patch("/category/:id", verifyFBToken, adminVerify, async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: body.name,
          img: body.img,
        },
      };
      const result = await categoryCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    ////////////:::: allFoodItem related APIs ::::////////////
    // app.get("/foodItem", async (req, res) => {
    //   const allFoodList = await allFoodItem.find().toArray();
    //   res.send(allFoodList);
    // });

    app.get("/foodItem", verifyFBToken, adminVerify, async (req, res) => {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const type = req.query.type;
      const menuSection = req.query.menuSection;
      const search = req.query.search;
      if (!page || !limit) {
        const allFoodList = await allFoodItem.find().toArray();
        return res.send(allFoodList);
      }
      const skip = (page - 1) * limit;
      const query = {};
      if (type && type !== "All") {
        query.type = type;
      }
      if (menuSection && menuSection !== "All") {
        query.menuSection = menuSection;
      }
      if (search && search.length > 0) {
        query.name = { $regex: search, $options: "i" };
      }

      const total = await allFoodItem.countDocuments(query);
      const totalPage = Math.ceil(total / limit);
      const allItems = await allFoodItem
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ added_at: -1 })
        .toArray();
      res.send({
        allItems,
        total,
        totalPage,
      });
    });

    // food item by type
    app.get("/foodItem/:type", async (req, res) => {
      const query = req.params.type;
      //   console.log(query);
      const result = await allFoodItem
        .find({ type: { $regex: query, $options: "i" } })
        .toArray();
      res.send(result);
    });

    // food item by menuSection
    app.get("/foodItems/:menuSection", async (req, res) => {
      const query = req.params.menuSection;
      //   console.log(query);
      const result = await allFoodItem
        .find({ menuSection: { $regex: query, $options: "i" } })
        .toArray();
      res.send(result);
    });

    ///////////:::: add new food item APIs ::::////////////
    app.post("/foodItem", verifyFBToken, adminVerify, async (req, res) => {
      const newFoodItem = req.body;
      const result = await allFoodItem.insertOne(newFoodItem);
      res.send(result);
    });

    ////////////:::: food find by id APIs ::::////////////
    app.get("/foodItemId/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await allFoodItem.findOne(query);
      res.send(result);
    });

    ////////////:::: delete food item by id APIs ::::////////////
    app.delete(
      "/foodItemId/:id",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await allFoodItem.deleteOne(query);
        res.send(result);
      },
    );

    ////////////:::: update food item by id APIs ::::////////////
    app.patch(
      "/foodItemId/:id",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const id = req.params.id;
        const body = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            name: body.name,
            realPrice: body.realPrice,
            img: body.img,
            type: body.type,
            menuSection: body.menuSection,
            cookingTime: body.cookingTime,
            location: body.location,
            additionalNote: body.additionalNote,
            ingredients: body.ingredients,
            specialOffer: body.specialOffer,
          },
        };
        const result = await allFoodItem.updateOne(filter, updateDoc);
        res.send(result);
      },
    );
    //     await paymentHistoryCollection.updateMany(
    //   {},
    //   {
    //     $set: {
    //       "orderedItems.$[].menuSection": "regular"
    //     }
    //   }
    // );
    ////////////:::: user related APIs ::::////////////

    // find all users
    // app.get("/users", async (req, res) => {
    //   const userList = await userCollection.find().toArray();
    //   res.send(userList);
    // });
    app.get("/users", verifyFBToken,adminVerify, async (req, res) => {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const role = req.query.role;
      const search = req.query.search;

      if (!page || !limit) {
        const allUserList = await userCollection.find().toArray();
        return res.send(allUserList);
      }
      const skip = (page - 1) * limit;
      const query = {};
      if (role && role !== "All" && (role === "admin" || role === "user")) {
        query.role = role;
      }
      if (role && role !== "All" && (role === "active" || role === "blocked")) {
        query.status = role;
      }

      if (search && search.length > 0) {
        query.name = { $regex: search, $options: "i" };
      }

      const total = await userCollection.countDocuments(query);
      const totalPage = Math.ceil(total / limit);
      const allUsers = await userCollection
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 })
        .toArray();
      res.send({
        allUsers,
        total,
        totalPage,
      });
    });

    // find user by email
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const userList = await userCollection.findOne({ email });
      res.send(userList);
    });

    app.delete("/user/:id", verifyFBToken,adminVerify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      //  console.log(query);
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/user", verifyFBToken, async (req, res) => {
      const email = req.query.email;
      const body = req.body;
      // console.log(email, body);
      const filter = { email: email };
      const updateData = {};
      if (body.name !== undefined && body.name !== null)
        updateData.name = body.name;
      if (body.address !== undefined && body.address !== null)
        updateData.address = body.address;
      if (body.phone !== undefined && body.phone !== null)
        updateData.phone = body.phone;
      if (body.role !== undefined && body.role !== null)
        updateData.role = body.role;
      if (body.status !== undefined && body.status !== null)
        updateData.status = body.status;
      // console.log(updateData);
      const result = await userCollection.updateOne(filter, {
        $set: updateData,
      });
      res.send(result);
    });

    // find user by email and post it
    app.post("/user", async (req, res) => {
      const email = req.body.email;
      const existingUser = await userCollection.findOne({ email });
      if (existingUser) {
        return res
          .status(200)
          .send({ message: "User already exists", inserted: false });
      }
      const newUser = req.body;
      // console.log(newUser);
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

app.get(
  "/user/admin/:email",
  verifyFBToken,
  async (req, res) => {
    const email = req.params.email;
    const tokenEmail = req.decoded?.email;
console.log(email, tokenEmail);
    if (!tokenEmail || email !== tokenEmail) {
      return res.status(403).send({ message: "forbidden access" });
    }

    const user = await userCollection.findOne({ email });

    const admin = user?.role === "admin";
    res.send({ admin });
  }
);

    ////////////:::: review related APIs ::::////////////
    app.get("/review", async (req, res) => {
      const email = req.query.email;
      const query = email ? { email } : {};
      const reviewList = await reviewCollection.find(query).toArray();
      res.send(reviewList);
    });

    app.post("/review", verifyFBToken, adminVerify, async (req, res) => {
      const newReview = req.body;
      const result = await reviewCollection.insertOne(newReview);
      res.send(result);
    });

    app.delete("/review/:id", verifyFBToken, adminVerify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/reviewRequest",verifyFBToken, async (req, res) => {
      const email = req.query.email;
      const query = email ? { email } : {};
      const reviewRequestList = await reviewRequestCollection
        .find(query)
        .toArray();
      console.log(email, reviewRequestList);
      res.send(reviewRequestList);
    });

    app.post("/reviewRequest",verifyFBToken, async (req, res) => {
      const newReviewRequest = req.body;
      const result = await reviewRequestCollection.insertOne(newReviewRequest);
      res.send(result);
    });

    app.delete("/reviewRequest/:id",verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewRequestCollection.deleteOne(query);
      res.send(result);
    });

    app.patch(
      "/reviewRequest",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const { id, status } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateReviewStatus = await reviewRequestCollection.updateOne(
          filter,
          { $set: { status } },
        );
        if (status === "Approved") {
          const approvedReview = await reviewRequestCollection.findOne(filter);
          const insertApprovedReview =
            await reviewCollection.insertOne(approvedReview);
          const deleteReview = await reviewRequestCollection.deleteOne(filter);
          return res.send({
            updateReviewStatus,
            insertApprovedReview,
            deleteReview,
          });
        }
        if (status === "Rejected") {
          const deleteReview = await reviewRequestCollection.deleteOne(filter);
          return res.send({
            updateReviewStatus,
            deleteReview,
          });
        }

        res.send({ updateReviewStatus });
      },
    );

    ////////////:::: cart related APIs ::::////////////

    // app.get("/orderFood", async (req, res) => {
    //   const cartList = await cartCollection.find().toArray();
    //   res.send(cartList);
    // });

    // get cart items by email
    app.get("/orderFood", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const cartList = await cartCollection.find({ email }).toArray();
      res.send(cartList);
    });

    // add to cart
    app.post("/orderFood", verifyFBToken, async (req, res) => {
      const newOrder = req.body;
      const result = await cartCollection.insertOne(newOrder);
      res.send(result);
    });

    // delete all cart item by email
    app.delete("/orderFood", verifyFBToken,  async (req, res) => {
      const email = req.query.email;
      const result = await cartCollection.deleteMany({ email });
      res.send(result);
    });

    // delete cart item by id
    app.delete(
      "/orderFood/:id",
      verifyFBToken,
      async (req, res) => {
        const id = req.params.id;
        //   console.log(id);
        const query = { _id: new ObjectId(id) };
        const result = await cartCollection.deleteOne(query);
        res.send(result);
      },
    );

    // update cart item status by id
    app.patch(
      "/orderFood/:id",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const id = req.params.id;
        const body = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: body.status,
          },
        };
        const result = await cartCollection.updateOne(filter, updateDoc);
      },
    );

    ////////////:::: ordered related APIs ::::////////////
    app.get("/ordered", verifyFBToken, adminVerify, async (req, res) => {
      const orderedList = await orderedCollection
        .find()
        .sort({ date: -1 })
        .toArray();
      res.send(orderedList);
    });

    ////////////:::: payment related APIs ::::////////////
    app.post("/create-payment-intent",verifyFBToken, async (req, res) => {
      const { price } = req.body;

      const amount = Math.round(Number(price) * 100);
      if (amount > 99999999) {
        return res.status(400).send({ error: "Amount exceeds Stripe limit" });
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // all payment
    app.get("/payments", verifyFBToken, adminVerify, async (req, res) => {
      const paymentList = await paymentCollection.find().toArray();
      res.send(paymentList);
    });

    ////////////:::: order related APIs ::::////////////

    app.get("/save-order",verifyFBToken, async (req, res) => {
      const orderList = await orderedCollection.find().toArray();
      res.send(orderList);
    });

    app.patch(
      "/save-order/:id",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const id = req.params.id;
        const body = req.body;
        // console.log(id, body.newStatus);
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: body.newStatus,
          },
        };
        const result = await orderedCollection.updateOne(filter, updateDoc);
        res.send(result);
      },
    );

    app.patch(
      "/save-order/paymentStatus/:id",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const id = req.params.id;
        const body = req.body;
        // console.log(id, body.newStatus);
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            paymentStatus: body.newStatus,
          },
        };
        const result = await orderedCollection.updateOne(filter, updateDoc);
        res.send(result);
      },
    );

    // new order post
    app.post("/save-order", verifyFBToken, async (req, res) => {
      const order = req.body;
      // console.log(order.map((id) => new ObjectId(id._id)));
      const result = await orderedCollection.insertOne(order);
      res.send(result);
    });

    // get order by email
    app.get("/save-order/:email",verifyFBToken, async (req, res) => {
      const query = { email: req.params.email };
      // if (req.params.email !== req.user.email) {
      //     console.log(query)
      //     return res.status(403).send({ message: "forbidden access" })
      // }
      const result = await orderedCollection.find(query).toArray();
      // console.log(result)
      res.send(result);
    });

    app.delete(
      "/completeOrder",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const { paymentStatus } = req.body;

        if (paymentStatus === "Completed") {
          const orders = await orderedCollection
            .find({
              status: "Completed",
              paymentStatus: paymentStatus,
            })
            .toArray();

          if (orders.length === 0) {
            return res.status(404).send({
              message: "No completed orders found",
            });
          }
          if (orders.length > 0) {
            const paymentHistory =
              await paymentHistoryCollection.insertMany(orders);
            const deleteOrder = await orderedCollection.deleteMany({
              status: "Completed",
              paymentStatus: paymentStatus,
            });
            res.send({ deleteOrder, paymentHistory });
          }
        }

        if (paymentStatus === "Failed") {
          const orders = await orderedCollection
            .find({
              paymentStatus: paymentStatus,
            })
            .toArray();

          if (orders.length === 0) {
            return res.status(404).send({
              message: "No failed orders found",
            });
          }
          if (orders.length > 0) {
            const paymentHistory =
              await paymentHistoryCollection.insertMany(orders);
            const deleteOrder = await orderedCollection.deleteMany({
              paymentStatus: paymentStatus,
            });
            res.send({ deleteOrder, paymentHistory });
          }
        }
      },
    );

    app.get("/paymentHistory", async (req, res) => {
      const email = req.query.email;
      const query = email ? { email } : {};
      const paymentHistory = await paymentHistoryCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(paymentHistory);
    });

    app.post(
      "/paymentHistory",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const paymentHistory = req.body;
        const result = await paymentHistoryCollection.insertOne(paymentHistory);
        res.send(result);
      },
    );

    app.delete(
      "/paymentHistory",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const { ids } = req.body;
        console.log(ids);
        if (!ids || !ids.length) {
          return res.status(404).send({ message: "No orders selected" });
        }
        const objectIds = ids.map((id) => new ObjectId(id));

        const result = await paymentHistoryCollection.deleteMany({
          _id: { $in: objectIds },
        });
        res.send(result);
      },
    );

    app.get(
      "/revenueMonthlySummary",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const now = new Date();

        const lastMonthStart = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
          0,
          0,
          0,
          0,
        );
        const lastMonthEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999,
        );

        const thisMonthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
          0,
          0,
          0,
          0,
        );
        const thisMonthEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        const result = await paymentHistoryCollection
          .aggregate([
            { $addFields: { dateObj: { $toDate: "$date" } } },

            { $match: { paymentStatus: "Completed" } },

            {
              $facet: {
                lastMonth: [
                  {
                    $match: {
                      dateObj: { $gte: lastMonthStart, $lte: lastMonthEnd },
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      totalRevenue: { $sum: "$price" }, 
                      totalOrders: { $sum: 1 }, 
                      totalUsers: { $addToSet: "$email" }, 
                      orderedItemsArrays: { $push: "$orderedItems" },
                    },
                  },
                  {
                    $addFields: {
                      totalItemsSold: {
                        $sum: {
                          $map: {
                            input: "$orderedItemsArrays",
                            as: "items",
                            in: { $sum: "$$items.quantity" },
                          },
                        },
                      },
                    },
                  },
                ],
                thisMonth: [
                  {
                    $match: {
                      dateObj: { $gte: thisMonthStart, $lte: thisMonthEnd },
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      totalRevenue: { $sum: "$price" },
                      totalOrders: { $sum: 1 },
                      totalUsers: { $addToSet: "$email" },
                      orderedItemsArrays: { $push: "$orderedItems" },
                    },
                  },
                  {
                    $addFields: {
                      totalItemsSold: {
                        $sum: {
                          $map: {
                            input: "$orderedItemsArrays",
                            as: "items",
                            in: { $sum: "$$items.quantity" },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          ])
          .toArray();

        const last = result[0].lastMonth[0] || {};
        const current = result[0].thisMonth[0] || {};

        res.send({
          lastMonth: {
            totalRevenue: last.totalRevenue || 0,
            totalItemsSold: last.totalItemsSold || 0,
            totalOrders: last.totalOrders || 0,
            totalUsers: last.totalUsers?.length || 0,
          },
          thisMonth: {
            totalRevenue: current.totalRevenue || 0,
            totalItemsSold: current.totalItemsSold || 0,
            totalOrders: current.totalOrders || 0,
            totalUsers: current.totalUsers?.length || 0,
          },
        });
      },
    );

    app.get("/revenueWeekly", verifyFBToken, adminVerify, async (req, res) => {
      const today = new Date();
      const last7Days = new Date();
      last7Days.setDate(today.getDate() - 6);

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      const data = await paymentHistoryCollection
        .aggregate([
          { $addFields: { dateObj: { $toDate: "$date" } } },
          {
            $match: {
              paymentStatus: "Completed",
              dateObj: { $gte: last7Days, $lte: today },
            },
          },
          {
            $group: {
              _id: {
                day: { $dayOfWeek: "$dateObj" },
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$dateObj" },
                },
              },
              dailyRevenue: { $sum: "$price" },
            },
          },
          { $sort: { "_id.date": 1 } },
        ])
        .toArray();

      const result = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        const dateStr = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const found = data.find((item) => item._id.date === dateStr);
        result.push({
          day: dayNames[d.getDay()],
          dailyRevenue: found?.dailyRevenue || 0,
        });
      }

      res.send(result);
    });

    app.get(
      "/soldItemsSummary",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        const result = await paymentHistoryCollection
          .aggregate([
            {
              $match: {
                paymentStatus: "Completed",
              },
            },
            { $unwind: "$orderedItems" },
            {
              $facet: {
                byItem: [
                  {
                    $group: {
                      _id: "$orderedItems.name",
                      totalQuantity: { $sum: "$orderedItems.quantity" },
                    },
                  },
                  { $sort: { totalQuantity: -1 } },
                ],
                byType: [
                  {
                    $group: {
                      _id: "$orderedItems.type",
                      totalQuantity: { $sum: "$orderedItems.quantity" },
                    },
                  },
                  { $sort: { totalQuantity: -1 } },
                ],
                byMenuSection: [
                  {
                    $group: {
                      _id: "$orderedItems.menuSection",
                      totalQuantity: { $sum: "$orderedItems.quantity" },
                    },
                  },
                  { $sort: { totalQuantity: -1 } },
                ],
              },
            },
          ])
          .toArray();

        res.send(result[0]);
      },
    );

    app.get(
      "/ordersByPaymentMethod",
      verifyFBToken,
      adminVerify,
      async (req, res) => {
        try {
          const result = await paymentHistoryCollection
            .aggregate([
              {
                $match: { paymentStatus: "Completed" },
              },
              {
                $group: {
                  _id: "$payment", 
                  totalOrders: { $sum: 1 }, 
                  totalRevenue: { $sum: "$price" }, 
                },
              },

              { $sort: { totalOrders: -1 } },
            ])
            .toArray();

          const chartData = {
            Cash: result.find((r) => r._id === "Cash")?.totalOrders || 0,
            Stripe: result.find((r) => r._id === "Paid")?.totalOrders || 0,
            revenueCash:
              result.find((r) => r._id === "Cash")?.totalRevenue || 0,
            revenueStripe:
              result.find((r) => r._id === "Paid")?.totalRevenue || 0,
          };

          res.send(chartData);
        } catch (err) {
          console.error(err);
          res.status(500).send({ message: "Server error" });
        }
      },
    );

    app.get("/coverage", async (req, res) => {
      const result = await coverageCollection.find().toArray();
      res.send(result);
    });

    //////////:::: end of all APIs ::::////////////

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Start the server
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
