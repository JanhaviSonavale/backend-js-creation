import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Load local .env file

const connectDB = async () => {
    try {
        const con = await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected : " + con.connection.host);
    } catch (error) {
        console.log("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};

export default connectDB;
