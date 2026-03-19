require("dotenv").config();
const express = require("express");
const AWS = require("aws-sdk");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

app.get("/upload-url", async (req, res) => {
  const fileName = `${Date.now()}_${req.query.name}`;
  const key = `test/${fileName}`;

  const url = s3.getSignedUrl("putObject", {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: 120,
    ContentType: req.query.type
  });

  res.json({ uploadUrl: url, key });
});

app.post("/save", async (req, res) => {
  const { key, type } = req.body;

  await pool.execute(
    "INSERT INTO s3_media_test (media_key, media_type) VALUES (?,?)",
    [key, type]
  );

  res.json({ success: true });
});

app.get("/media", async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT * FROM s3_media_test ORDER BY id DESC"
  );

  const result = rows.map(r => ({
    ...r,
    url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${r.media_key}`
  }));

  res.json(result);
});

app.listen(process.env.PORT, () =>
  console.log("Server running")
);