import express, { json } from "express";
import { writeFile } from "fs";
import cors from "cors";

const app = express();
const port = 5000;

app.use(json());
app.use(cors());

app.post("/write", (req, res) => {
  const { data } = req.body;
  console.log(data);
  writeFile(
    "./public/default-view.json",
    JSON.stringify(data, null, 2),
    (err) => {
      if (err) {
        res.status(500).send("Error writing to file");
      } else {
        res.status(200).send("Data written to file");
      }
    }
  );
});

app.get("/test", (req, res) => {
  res.status(200).send("Hit test!");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
