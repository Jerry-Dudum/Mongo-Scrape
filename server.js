var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require("cheerio");

var db = require("./models");

var PORT = process.env.PORT || 3000;

var app = express();

app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

app.get("/", function (req, res) {
    db.Article.find({}).then(function (response) {
        var dbResponse = {
            articles: response
        };
        res.render("index", dbResponse);
    })
        .catch(function (err) {
            console.log(err);
            res.send(err);
        });
});

app.get("/scrape", function (req, res) {
    axios.get("https://www.pcgamer.com/news/").then(function (response) {
        var $ = cheerio.load(response.data);

        $("div.content").each(function (i, element) {
            var result = {};

            result.title = $(element)
                .children("header")
                .children("h3")
                .text();

            result.summary = $(element)
                .children("p")
                .text()

            result.image = $(element)
                .parent()
                .children("div.image")
                .children()
                .data("original");

            result.link = $(element)
                .parent()
                .parent()
                .attr("href");

            db.Article.create(result)
                .then(function (dbArticle) {
                    console.log(dbArticle);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });
        res.send("Scrape Complete");
    });
});

app.get("/articles", function (req, res) {
    db.Article.find({})
        .then(function (dbArticle) {
            res.send(dbArticle);
        })
        .catch(function (err) {
            res.send(err);
        });
});

app.get("/articles/:id", function (req, res) {

    var ID = req.params.id;

    db.Article.findOne({ _id: ID })
        .populate("note")
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.send(err);
        })
});

app.post("/articles/:id", function (req, res) {

    var ID = req.params.id;

    db.Note.create(req.body)
        .then(function (dbNote) {
            return db.Article.findOneAndUpdate({ _id: ID }, { note: dbNote._id }, { new: true });
        })
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});