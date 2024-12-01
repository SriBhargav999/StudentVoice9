const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const bcrypt = require("bcrypt");

const admin = require("firebase-admin");
const account = require("./key.json");

const { MongoClient, ObjectId } = require("mongodb");
const uri = "mongodb+srv://sribhargav:sribhargav0401S@complaints.puvcj.mongodb.net/?retryWrites=true&w=majority&appName=Complaints";

const client = new MongoClient(uri);
client.connect();
const storage = client.db("dbconnect").collection("users");
console.log("connected to the database");

admin.initializeApp({
    credential: admin.credential.cert(account),
});
const db = admin.firestore();

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.get("/home", (req, res) => {
    res.render("home", { error: "" });
});

app.post("/home", (req, res) => {
    res.render("home", { error: "" });
});

app.get("/home1", async (req, res) => {
    const fetchcomplaints = await storage.find().sort({likes:-1}).toArray();
    res.render("home1", { complaints: fetchcomplaints });
});

app.post("/home1", async (req, res) => {
    try {
        const fetchcomplaints = await storage.find().sort({likes:-1}).toArray();
        res.render('home1', { complaints: fetchcomplaints });
    } catch (error) {
        const errormessage = error.message || "An unknown error occurred";
        console.error("Error fetching complaints:", error);
        res.render("home1", { error: errormessage });
    }
});

app.get("/signup", (req, res) => {
    res.render("signup", { error: "" });
});

app.post("/signup", async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    console.log(username, email, password);
    try {
        const userrecord = await admin.auth().createUser({
            email: email,
        });
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.collection("users").doc(userrecord.uid).set({
            name: username,
            email: email,
            password: hashedPassword,
        });
        console.log("successfully created", userrecord.uid);
        res.render("signin", { error: "" });
    } catch (error) {
        const errormessage = error.errorInfo.message;
        console.error("Error creating new user:", error);
        res.render("signup", { error: errormessage });
    }
});

app.get("/signin", (req, res) => {
    res.render("signin", { error: "" });
});

app.post("/signin", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    console.log(email, password);
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        const userdetails = await db.collection("users").doc(userRecord.uid).get();

        if (!userdetails.exists) {
            return res.render("signin", { error: "User not found." });
        }

        const userData = userdetails.data();
        const validPassword = await bcrypt.compare(password, userData.password);
        if (validPassword) {
            console.log("Login successful", userRecord.uid);
            res.redirect("/home1");
        } else {
            res.render("signin", { error: "Incorrect email or password" });
        }
    } catch (error) {
        const errormessage = error.message || "An unknown error occurred";
        res.render("signin", { error: errormessage });
    }
});

app.get("/complaints", (req, res) => {
    res.render("complaints", { error: "" });
});

app.post("/complaints", async (req, res) => {
    const complaints = {
        name: req.body.Name,
        reg: req.body.reg,
        ctype: req.body.ctype,
        dept: req.body.dept,
        complainttext: req.body.complaint
    };

    try {
        const duplicateComplaint = await storage.findOne({
            name: req.body.Name,
            reg: req.body.reg,
            ctype: req.body.ctype,
            dept: req.body.dept,
            complainttext: req.body.complaint
        });

        if (duplicateComplaint) {
            return res.render("complaints", { error: "Complaint already exists." });
        }

        await storage.insertOne(complaints);
        const fetchcomplaints = await storage.find().sort({likes:-1}).toArray();
        res.render("home1", { complaints: fetchcomplaints });
    } catch (error) {
        const errormessage = error.message || "An unknown error occurred";
        res.render("complaints", { error: errormessage });
    }
});

app.get("/report", async (req, res) => {
    const fetchcomplaints = await storage.find().toArray();
    res.render("report", { complaints: fetchcomplaints });
});

app.post('/liked', async (req, res) => {
    const like = req.body.like;
    try {
        const result = await storage.updateOne({ _id: new ObjectId(like) }, { $inc: { likes: 1 } });
        res.redirect('/home1');
    } catch (error) {
        console.error("Error updating likes:", error);
        res.redirect('/home1');
    }
});

app.get('/complaints/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const fetchData = await storage.findOne({ _id: new ObjectId(id) });
        res.render('complaints', { error: "", complaints: fetchData });
    } catch (error) {
        console.error(error);
        res.render('complaints', { error: "Error fetching complaint." });
    }
});

app.post("/filter", async (req, res) => {
    const filter = req.body.filtername;
    try {
        const fetchData = await storage.find().sort({likes:-1}).toArray();
        let filterData;
        if (filter == 'all') {
            filterData = fetchData;
        } else {
            filterData = fetchData.filter((complaints) => complaints.dept == filter);
        }
        res.render('home1', { complaints: filterData });
    } catch (error) {
        console.log(error);
    }
});

app.listen(8080, () => {
    console.log("Server started at: 8080");
});
