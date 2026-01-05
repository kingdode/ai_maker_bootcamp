import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
config({ path: resolve(__dirname, ".env") });

export default {
  datasource: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
};

