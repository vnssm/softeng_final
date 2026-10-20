const bcrypt = require("bcryptjs");

async function createHash() {
  const password = "password123"; // change this if you want
  const hashed = await bcrypt.hash(password, 10);
  console.log("Hashed password:", hashed);
}

createHash();